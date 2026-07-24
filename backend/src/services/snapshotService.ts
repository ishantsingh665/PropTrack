import { PrismaClient, Snapshot, SnapshotCompany, SnapshotProperty, Company, Property } from '@prisma/client';

export class SnapshotService {
  constructor(private prisma: PrismaClient) {}

  async isGateOpen(): Promise<boolean> {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'last_snapshot_month' }
    });

    return setting?.value === currentMonth;
  }

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

    const totalGfaSqft = activeStakes.reduce((sum: number, s: any) => sum + (s.property.gfaSqft || 0), 0);

    return {
      companiesCount: companies.length,
      propertiesCount: activeStakes.length,
      totalGfaSqft
    };
  }

  async createSnapshot(name: string, year: number, userId: string) {
    const existing = await this.prisma.snapshot.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } }
    });
    if (existing) {
      throw new Error(`A snapshot named '${name}' already exists.`);
    }

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

    const propertiesByCompany = new Map<string, Property[]>();
    for (const stake of activeStakes) {
      if (!propertiesByCompany.has(stake.companyId)) {
        propertiesByCompany.set(stake.companyId, []);
      }
      propertiesByCompany.get(stake.companyId)!.push(stake.property);
    }

    return await this.prisma.$transaction(async (tx) => {
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
        const totalGfaSqft = companyProperties.reduce((sum: number, p: any) => sum + (p.gfaSqft || 0), 0);

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

      const month = new Date().toISOString().substring(0, 7);
      await tx.systemSetting.upsert({
        where: { key: 'last_snapshot_month' },
        update: { value: month },
        create: { key: 'last_snapshot_month', value: month }
      });

      return snapshot;
    });
  }

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

    return snapshots.map((s: any) => ({
      id: s.id,
      snapshotNumber: s.snapshotNumber,
      name: s.name,
      year: s.year,
      createdAt: s.createdAt,
      createdBy: s.creator.name,
      companiesIncluded: s._count.companySnapshots,
      propertiesIncluded: s._count.propertySnapshots,
      totalGfaSqft: s.companySnapshots.reduce((sum: number, cs: any) => sum + cs.totalGfaSqft, 0)
    }));
  }

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

    const companies = snapshot.companySnapshots.map((cs: any) => {
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
        properties: cs.propertySnapshots.map((ps: any) => {
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

  async getSnapshotYears() {
    const years = await this.prisma.snapshot.findMany({
      select: { year: true },
      distinct: ['year'],
      orderBy: { year: 'desc' }
    });
    return years.map(y => y.year);
  }

  async getLastSnapshotForCompany(companyId: string) {
    const sc = await this.prisma.snapshotCompany.findFirst({
      where: { companyId },
      include: { snapshot: true },
      orderBy: { snapshot: { snapshotNumber: 'desc' } }
    });

    return sc?.snapshot || null;
  }

  async getDashboardData(companyId: string, month: string) {
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

  async getLiveDashboardData(companyId: string) {
    const isAll = companyId === 'all';
    
    const whereClause = isAll 
      ? { status: 'active', validTo: null, property: { deletedAt: null } }
      : { companyId, status: 'active', validTo: null, property: { deletedAt: null } };

    const activeStakes = await this.prisma.propertyCompany.findMany({
      where: whereClause,
      include: { property: true }
    });

    const propertyCount = isAll 
      ? new Set(activeStakes.map(s => s.propertyId)).size
      : activeStakes.length;

    const totalGfaSqft = activeStakes.reduce((sum: number, s: any) => sum + (s.property.gfaSqft || 0), 0);
    const activeStakeCount = activeStakes.length;

    return {
      current: {
        month: 'Live',
        propertyCount,
        totalGfaSqft,
        activeStakeCount,
        createdAt: new Date().toISOString()
      },
      previous: null,
      trends: {
        propertyCountDelta: 0,
        gfaDelta: 0,
        stakesDelta: 0
      },
      month: 'Live',
      prevMonth: null
    };
  }
}
