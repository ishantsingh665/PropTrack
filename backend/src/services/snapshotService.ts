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
   */
  async takeSnapshot(month: string) {
    // 1. Get all companies
    const companies = await this.prisma.company.findMany({
      where: { deletedAt: null }
    });

    const snapshots = [];

    for (const company of companies) {
      // 2. Compute analytics for this company
      // Active stakes for this company that were valid during this month
      // For simplicity, we take CURRENT active stakes. 
      // In a real system, you'd look at the validFrom/validTo overlap with the month.
      
      const activeStakes = await this.prisma.propertyCompany.findMany({
        where: {
          companyId: company.id,
          status: 'active',
          validTo: null,
          property: { deletedAt: null }
        },
        include: {
          property: true
        }
      });

      const propertyCount = activeStakes.length;
      const totalGfaSqft = activeStakes.reduce((sum, stake) => sum + (stake.property.gfaSqft || 0), 0);
      const activeStakeCount = activeStakes.length;

      // 3. Upsert snapshot
      const snapshot = await this.prisma.companyMonthlySnapshot.upsert({
        where: {
          companyId_month: {
            companyId: company.id,
            month: month
          }
        },
        update: {
          propertyCount,
          totalGfaSqft,
          activeStakeCount,
          data: { generatedAt: new Date().toISOString() }
        },
        create: {
          companyId: company.id,
          month: month,
          propertyCount,
          totalGfaSqft,
          activeStakeCount,
          data: { generatedAt: new Date().toISOString() }
        }
      });

      snapshots.push(snapshot);
    }

    // 4. Update system setting
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

    return {
      current,
      previous,
      month,
      prevMonth
    };
  }
}
