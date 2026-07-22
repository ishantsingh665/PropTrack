import { PrismaClient } from '@prisma/client';

export class DuplicateEngine {
  constructor(private prisma: PrismaClient) {}

  /**
   * Scans properties for potential duplicates based on address keys.
   * Optionally scopes the scan to properties that share a key with newly imported IDs.
   */
  async scanForDuplicates(scopeToIds?: string[]) {
    const whereClause: any = { deletedAt: null };

    // If specific IDs provided, only load properties that share an address key
    // with at least one of the new properties — fetch new ones first
    let addressKeys: Set<string> | null = null;

    if (scopeToIds && scopeToIds.length > 0) {
      const newProps = await this.prisma.property.findMany({
        where: { id: { in: scopeToIds }, deletedAt: null },
        select: { addressNormalized: true, city: true, postalCode: true, countryCode: true }
      });

      // Build the set of address keys we care about
      addressKeys = new Set(
        newProps.map(p => `${p.addressNormalized}|${p.city}|${p.postalCode || ''}|${p.countryCode}`)
      );

      if (addressKeys.size === 0) return { pairsCreated: 0 };
    }

    const properties = await this.prisma.property.findMany({
      where: whereClause,
      include: {
        companies: {
          where: { validTo: null },
          select: { companyId: true }
        }
      }
    });

    // Group by address key
    const groups: Record<string, typeof properties> = {};
    for (const prop of properties) {
      const key = `${prop.addressNormalized}|${prop.city}|${prop.postalCode || ''}|${prop.countryCode}`;

      // If scoped, only process groups that contain a new property's address key
      if (addressKeys && !addressKeys.has(key)) continue;

      if (!groups[key]) groups[key] = [];
      groups[key].push(prop);
    }

    // Batch-fetch existing pairs to avoid per-pair DB queries
    const allPropertyIds = Object.values(groups).flat().map(p => p.id);
    const existingPairs = await this.prisma.duplicatePair.findMany({
      where: {
        OR: [
          { property1Id: { in: allPropertyIds } },
          { property2Id: { in: allPropertyIds } }
        ]
      },
      select: { property1Id: true, property2Id: true }
    });

    const existingSet = new Set(
      existingPairs.map(p => [p.property1Id, p.property2Id].sort().join('|'))
    );

    let pairsCreated = 0;
    const newPairs: any[] = [];

    for (const key in groups) {
      const group = groups[key];
      if (group.length < 2) continue;

      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const p1 = group[i];
          const p2 = group[j];
          const [id1, id2] = [p1.id, p2.id].sort();
          const pairKey = `${id1}|${id2}`;

          if (existingSet.has(pairKey)) continue;
          existingSet.add(pairKey); // prevent duplicates within this batch

          let matchLevel = 'building';
          if (p1.propertyLevel === 'unit' && p2.propertyLevel === 'unit') matchLevel = 'unit';
          else if (p1.propertyLevel !== p2.propertyLevel) matchLevel = 'cross_level';

          const companies1 = new Set(p1.companies.map(c => c.companyId));
          const companies2 = new Set(p2.companies.map(c => c.companyId));
          let scope = 'no_shared_ownership';
          if (companies1.size > 0 && companies2.size > 0) {
            const intersection = [...companies1].filter(x => companies2.has(x));
            scope = intersection.length > 0 ? 'same_company' : 'cross_company';
          }

          newPairs.push({ property1Id: id1, property2Id: id2, status: 'pending', matchLevel, scope });
          pairsCreated++;
        }
      }
    }

    // Bulk insert all new pairs in one query
    if (newPairs.length > 0) {
      await this.prisma.duplicatePair.createMany({ data: newPairs });
    }

    return { pairsCreated };
  }
}
