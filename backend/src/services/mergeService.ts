import { PrismaClient } from '@prisma/client';

export class MergeService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Merges one property into another canonical property.
   */
  async executeMerge(pairId: string, keepId: string, removeId: string, userId: string) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Verify the pair and properties
      const pair = await tx.duplicatePair.findUnique({
        where: { id: pairId }
      });

      if (!pair) throw new Error('Duplicate pair not found');
      if (pair.status === 'merged') throw new Error('Pair already merged');

      const isValidPair = 
        (pair.property1Id === keepId && pair.property2Id === removeId) ||
        (pair.property1Id === removeId && pair.property2Id === keepId);

      if (!isValidPair) throw new Error('Property IDs do not match the duplicate pair');

      // 2. Redistribute Ownership Stakes
      // Move all property_companies from removeId to keepId
      await tx.propertyCompany.updateMany({
        where: { propertyId: removeId },
        data: { propertyId: keepId }
      });

      // 3. Reassign Child Units
      // Any units pointing to removeId as parent should now point to keepId
      await tx.property.updateMany({
        where: { parentId: removeId },
        data: { parentId: keepId }
      });

      // 4. Transfer Logs
      // Change Log
      await tx.propertyChangeLog.updateMany({
        where: { propertyId: removeId },
        data: { propertyId: keepId }
      });

      // Scrape Log
      await tx.propertyScrapeLog.updateMany({
        where: { propertyId: removeId },
        data: { propertyId: keepId }
      });

      // 5. Create Merge Log
      await tx.mergeLog.create({
        data: {
          keepId,
          removeId,
          mergedBy: userId,
          details: { pairId, matchLevel: pair.matchLevel, scope: pair.scope }
        }
      });

      // 6. Resolve the Duplicate Pair
      await tx.duplicatePair.update({
        where: { id: pairId },
        data: { status: 'merged' as any }
      });

      // 7. Soft Delete the Redundant Property
      await tx.property.update({
        where: { id: removeId },
        data: { 
          deletedAt: new Date(),
          name: `[MERGED into ${keepId.substring(0,8)}] ${removeId.substring(0,8)}`
        }
      });

      return { success: true, keepId, removeId };
    });
  }
}
