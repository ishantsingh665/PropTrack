import { PrismaClient } from '@prisma/client';

export class SnapshotService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Checks if the snapshot gate is open for the current month.
   * Gate is OPEN if last_snapshot_month matches current YYYY-MM.
   */
  async isGateOpen(): Promise<boolean> {
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'last_snapshot_month' }
    });

    return setting?.value === currentMonth;
  }

  /**
   * Computes and saves snapshots for all companies for a given month.
   * Optimized to avoid N+1 queries.
   */
  async takeSnapshot(month: string) {
    const companies = await this.prisma.company.findMany({
      where: { deletedAt: null }
    });

    // ONE query for all active stakes across all companies
    const allActiveStakes = await this.prisma.propertyCompany.findMany({
      where: {
        status: 'active',
        validTo: null,
        property: { deletedAt: null }
      },
      include: { property: true }
    });

    // Group stakes by companyId in memory
    const stakesByCompany = new Map<string, typeof allActiveStakes>();
    for (const stake of allActiveStakes) {
      if (!stakesByCompany.has(stake.companyId)) {
        stakesByCompany.set(stake.companyId, []);
      }
      stakesByCompany.get(stake.companyId)!.push(stake);
    }

    // Build all snapshot upserts
    const snapshotData = companies.map(company => {
      const activeStakes = stakesByCompany.get(company.id) || [];
      const propertyCount = activeStakes.length;
      const totalGfaSqft = activeStakes.reduce((sum, s) => sum + (s.property.gfaSqft || 0), 0);

      return {
        companyId: company.id,
        month,
        propertyCount,
        totalGfaSqft,
        activeStakeCount: activeStakes.length,
        data: { generatedAt: new Date().toISOString() }
      };
    });

    // Upsert all snapshots in a single transaction
    const snapshots = await this.prisma.$transaction(
      snapshotData.map(data =>
        this.prisma.companyMonthlySnapshot.upsert({
          where: { companyId_month: { companyId: data.companyId, month } },
          update: { ...data },
          create: { ...data }
        })
      )
    );

    await this.prisma.systemSetting.upsert({
      where: { key: 'last_snapshot_month' },
      update: { value: month },
      create: { key: 'last_snapshot_month', value: month }
    });

    return snapshots;
  }

  /**
   * Gets dashboard data for a company (current month vs previous month)
   */
  async getDashboardData(companyId: string, month: string) {
    const current = await this.prisma.companyMonthlySnapshot.findUnique({
      where: { companyId_month: { companyId, month } }
    });

    // Compute previous month string
    const date = new Date(month + '-01');
    date.setMonth(date.getMonth() - 1);
    const prevMonth = date.toISOString().substring(0, 7);

    const previous = await this.prisma.companyMonthlySnapshot.findUnique({
      where: { companyId_month: { companyId, month: prevMonth } }
    });

    // Compute deltas (trends)
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
