import { PrismaClient } from '@prisma/client';

export class DuplicateEngine {
  constructor(private prisma: PrismaClient) {}

  /**
   * Scans all properties for potential duplicates based on address keys.
   */
  async scanForDuplicates() {
    // 1. Fetch all properties not soft-deleted
    const properties = await this.prisma.property.findMany({
      where: { deletedAt: null },
      include: {
        companies: {
          where: { validTo: null },
          select: { companyId: true }
        }
      }
    });

    // 2. Group by (addressNormalized, city, postalCode, countryCode)
    const groups: Record<string, typeof properties> = {};

    for (const prop of properties) {
      const key = `${prop.addressNormalized}|${prop.city}|${prop.postalCode || ''}|${prop.countryCode}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(prop);
    }

    let pairsCreated = 0;

    // 3. Process groups with more than one property
    for (const key in groups) {
      const group = groups[key];
      if (group.length < 2) continue;

      // Compare every property in the group with every other property
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const p1 = group[i];
          const p2 = group[j];

          // Determine Match Level
          let matchLevel = 'building';
          if (p1.propertyLevel === 'unit' && p2.propertyLevel === 'unit') {
            matchLevel = 'unit';
          } else if (p1.propertyLevel !== p2.propertyLevel) {
            matchLevel = 'cross_level';
          }

          // Determine Scope
          const companies1 = new Set(p1.companies.map(c => c.companyId));
          const companies2 = new Set(p2.companies.map(c => c.companyId));
          
          let scope = 'no_shared_ownership';
          if (companies1.size > 0 && companies2.size > 0) {
            const intersection = [...companies1].filter(x => companies2.has(x));
            scope = intersection.length > 0 ? 'same_company' : 'cross_company';
          } else if (companies1.size > 0 || companies2.size > 0) {
            // One has owners, other doesn't
            scope = 'no_shared_ownership';
          }

          // Check if this pair already exists (A-B or B-A)
          const [id1, id2] = [p1.id, p2.id].sort();
          
          const existingPair = await this.prisma.duplicatePair.findFirst({
            where: {
              OR: [
                { property1Id: id1, property2Id: id2 },
                { property1Id: id2, property2Id: id1 }
              ]
            }
          });

          if (!existingPair) {
            await this.prisma.duplicatePair.create({
              data: {
                property1Id: id1,
                property2Id: id2,
                status: 'pending' as any,
                matchLevel,
                scope,
              }
            });
            pairsCreated++;
          }
        }
      }
    }

    return { pairsCreated };
  }
}
