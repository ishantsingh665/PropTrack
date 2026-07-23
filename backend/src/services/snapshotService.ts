import { PrismaClient } from '@prisma/client';

export class SnapshotService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Checks if the snapshot gate is open for the current month.
   * (Keeping this for backward compatibility if needed, but the new system is more flexible)
   */
  async isGateOpen(): Promise<boolean> {
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'last_snapshot_month' }
    });

    return setting?.value === currentMonth;
  }

  /**
   * Get preview counts for a new snapshot.
   */
  async getSnapshotPreview() {
    const companies = await this.prisma.company.findMany({
      where: { 
        snapshotsEnabled: true,
        indexListed: true,
        deletedAt: null 
      }
    });

    const companyIds = companies.map(c => c.id);

    const activeStakes = await this.prisma.propertyCompany.findMany({
      where: {
        companyId: { in: companyIds },
        status: 'active',
        validTo: null,
        property: { deletedAt: null }
      },
      include: { property: true }
    });

    const totalGfaSqft = activeStakes.reduce((sum, s) => sum + (s.property.gfaSqft || 0), 0);

    return {
      companiesCount: companies.length,
      propertiesCount: activeStakes.length,
      totalGfaSqft
    };
  }

  /**
   * Creates a new snapshot with captured data.
   */
  async createSnapshot(name: string, year: number, userId: string) {
    // 1. Check if name already exists
    const existing = await this.prisma.snapshot.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } }
    });
    if (existing) {
      throw new Error(`A snapshot named '${name}' already exists.`);
    }

    // 2. Get companies and properties to include
    const companies = await this.prisma.company.findMany({
      where: { 
        snapshotsEnabled: true,
        indexListed: true,
        deletedAt: null 
      }
    });

    const companyIds = companies.map(c => c.id);

    const activeStakes = await this.prisma.propertyCompany.findMany({
      where: {
        companyId: { in: companyIds },
        status: 'active',
        validTo: null,
        property: { deletedAt: null }
      },
      include: { property: true }
    });

    // Group properties by company
    const propertiesByCompany = new Map<string, any[]>();
    for (const stake of activeStakes) {
      if (!propertiesByCompany.has(stake.companyId)) {
        propertiesByCompany.set(stake.companyId, []);
      }
      propertiesByCompany.get(stake.companyId)!.push(stake.property);
    }

    // 3. Create Snapshot in transaction
    return await this.prisma.$transaction(async (tx) => {
      // Get next snapshot number
      const lastSnapshot = await tx.snapshot.findFirst({
        orderBy: { snapshotNumber: 'desc' }
      });
      const snapshotNumber = (lastSnapshot?.snapshotNumber || 0) + 1;

      const snapshot = await tx.snapshot.create({
        data: {
          name,
          year,
          snapshotNumber,
          createdBy: userId
        }
      });

      for (const company of companies) {
        const companyProperties = propertiesByCompany.get(company.id) || [];
        const totalGfaSqft = companyProperties.reduce((sum, p) => sum + (p.gfaSqft || 0), 0);

        const sc = await tx.snapshotCompany.create({
          data: {
            snapshotId: snapshot.id,
            companyId: company.id,
            totalPropertyCount: companyProperties.length,
            totalGfaSqft
          }
        });

        for (const property of companyProperties) {
          await tx.snapshotProperty.create({
            data: {
              snapshotId: snapshot.id,
              propertyId: property.id,
              snapshotCompanyId: sc.id
            }
          });
        }
      }

      // Update system setting for the "gate" if we want to keep that logic tied to the latest snapshot
      const month = new Date().toISOString().substring(0, 7);
      await tx.systemSetting.upsert({
        where: { key: 'last_snapshot_month' },
        update: { value: month },
        create: { key: 'last_snapshot_month', value: month }
      });

      return snapshot;
    });
  }

  /**
   * List all snapshots with aggregate counts.
   */
  async listSnapshots(year?: number) {
    const snapshots = await this.prisma.snapshot.findMany({
      where: year ? { year } : undefined,
      include: {
        _count: {
          select: {
            companySnapshots: true,
            propertySnapshots: true
          }
        },
        companySnapshots: {
          select: {
            totalGfaSqft: true
          }
        },
        creator: {
          select: { name: true }
        }
      },
      orderBy: { snapshotNumber: 'desc' }
    });

    return snapshots.map(s => ({
      id: s.id,
      snapshotNumber: s.snapshotNumber,
      name: s.name,
      year: s.year,
      createdAt: s.createdAt,
      createdBy: s.creator.name,
      companiesIncluded: s._count.companySnapshots,
      propertiesIncluded: s._count.propertySnapshots,
      totalGfaSqft: s.companySnapshots.reduce((sum, cs) => sum + cs.totalGfaSqft, 0)
    }));
  }

  /**
   * Get full snapshot detail with merged/resolved data.
   */
  async getSnapshotDetail(id: string) {
    const snapshot = await this.prisma.snapshot.findUnique({
      where: { id },
      include: {
        creator: { select: { name: true } },
        companySnapshots: {
          include: {
            company: true,
            propertySnapshots: {
              include: {
                property: true
              }
            }
          }
        }
      }
    });

    if (!snapshot) throw new Error('Snapshot not found');

    const companies = snapshot.companySnapshots.map(cs => {
      const c = cs.company;
      return {
        snapshotCompanyUid: cs.snapshotCompanyUid,
        originalCompanyId: cs.companyId,
        name: cs.nameOverride ?? c.name,
        isin: cs.isinOverride ?? c.isin,
        status: cs.statusOverride ?? c.status,
        reportPropertyCount: cs.reportPropertyCountOverride ?? c.reportPropertyCount,
        totalPropertyCount: cs.totalPropertyCount,
        totalGfaSqft: cs.totalGfaSqft,
        properties: cs.propertySnapshots.map(ps => {
          const p = ps.property;
          return {
            snapshotPropertyUid: ps.snapshotPropertyUid,
            originalPropertyId: ps.propertyId,
            name: ps.nameOverride ?? p.name,
            addressLine1: ps.addressLine1Override ?? p.addressLine1,
            city: ps.cityOverride ?? p.city,
            gfaSqft: ps.gfaSqftOverride ?? p.gfaSqft,
            propertyLevel: ps.propertyLevelOverride ?? p.propertyLevel
          };
        })
      };
    });

    return {
      id: snapshot.id,
      snapshotNumber: snapshot.snapshotNumber,
      name: snapshot.name,
      year: snapshot.year,
      createdAt: snapshot.createdAt,
      createdBy: snapshot.creator.name,
      companies
    };
  }

  /**
   * Update snapshot company overrides.
   */
  async updateSnapshotCompany(snapshotCompanyId: string, data: any) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.nameOverride = data.name;
    if (data.isin !== undefined) updateData.isinOverride = data.isin;
    if (data.status !== undefined) updateData.statusOverride = data.status;
    if (data.reportPropertyCount !== undefined) updateData.reportPropertyCountOverride = data.reportPropertyCount;
    if (data.notes !== undefined) updateData.notesOverride = data.notes;

    return await this.prisma.snapshotCompany.update({
      where: { id: snapshotCompanyId },
      data: updateData
    });
  }

  /**
   * Update snapshot property overrides.
   */
  async updateSnapshotProperty(snapshotPropertyId: string, data: any) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.nameOverride = data.name;
    if (data.addressLine1 !== undefined) updateData.addressLine1Override = data.addressLine1;
    if (data.city !== undefined) updateData.cityOverride = data.city;
    if (data.gfaSqft !== undefined) updateData.gfaSqftOverride = data.gfaSqft;
    if (data.propertyLevel !== undefined) updateData.propertyLevelOverride = data.propertyLevel;
    if (data.notes !== undefined) updateData.notesOverride = data.notes;

    return await this.prisma.snapshotProperty.update({
      where: { id: snapshotPropertyId },
      data: updateData
    });
  }

  /**
   * List all years that have snapshots.
   */
  async getSnapshotYears() {
    const years = await this.prisma.snapshot.findMany({
      select: { year: true },
      distinct: ['year'],
      orderBy: { year: 'desc' }
    });
    return years.map(y => y.year);
  }

  /**
   * Gets dashboard data (keeping old logic but adapted if needed)
   * The MD doesn't explicitly mention the dashboard but it's part of the existing system.
   */
  async getDashboardData(companyId: string, month: string) {
    // For now, keeping the MonthlySnapshot logic for the dashboard
    // as it's separate from the new "Index Snapshots"
    const current = await this.prisma.companyMonthlySnapshot.findUnique({
      where: { companyId_month: { companyId, month } }
    });

    const date = new Date(month + '-01');
    date.setMonth(date.getMonth() - 1);
    const prevMonth = date.toISOString().substring(0, 7);

    const previous = await this.prisma.companyMonthlySnapshot.findUnique({
      where: { companyId_month: { companyId, month: prevMonth } }
    });

    const trends = {
      propertyCountDelta: (current?.propertyCount || 0) - (previous?.propertyCount || 0),
      gfaDelta: (current?.totalGfaSqft || 0) - (previous?.totalGfaSqft || 0),
      stakesDelta: (current?.activeStakeCount || 0) - (previous?.activeStakeCount || 0)
    };

    return {
      current,
      previous,
      trends,
      month,
      prevMonth
    };
  }
}
