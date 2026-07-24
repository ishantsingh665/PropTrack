import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse';
import { normalizeAddress, convertToSqft } from './propertyService.js';
import { DuplicateEngine } from './duplicateEngine.js';
import { GeocodeService } from './geocodeService.js';

export class ImportService {
  constructor(private prisma: PrismaClient) {}

  async processImport(jobId: string, csvData: string, overrideCompanyId?: string) {
    const job = await this.prisma.importJob.findUnique({ where: { id: jobId } });
    if (!job) return;

    await this.prisma.importJob.update({
      where: { id: jobId },
      data: { status: 'processing' },
    });

    const parser = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const rows: any[] = [];
    const errors: any[] = [];
    const newPropertyIds: string[] = [];
    let successCount = 0;

    try {
      for await (const row of parser) {
        rows.push(row);
      }

      await this.prisma.importJob.update({
        where: { id: jobId },
        data: { rowCount: rows.length },
      });

      // Pre-load lookup maps
      const allPropertyTypes = await this.prisma.propertyType.findMany();
      const propertyTypeMap = new Map(allPropertyTypes.map(pt => [pt.name.toLowerCase().trim(), pt.id]));

      const allCompanies = await this.prisma.company.findMany({
        where: { deletedAt: null },
        select: { id: true, isin: true }
      });
      const isinMap = new Map(allCompanies.filter(c => c.isin).map(c => [c.isin!.toLowerCase().trim(), c.id]));

      // Process each row in its own isolated transaction
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          await this.prisma.$transaction(async (tx) => {
            // 1. Column Mapping
            const addressLine1 = row.address_line1 || row.addressLine1 || row.address;
            const gfaRaw = row.gfa_value || row.gfaValue || row.gfa || '0';
            const gfaUnit = row.gfa_unit || row.gfaUnit || 'sqft';
            const countryCode = row.country_code || row.countryCode || row.country;
            const postalCode = row.postal_code || row.postalCode || null;
            const propertyName = row['Property name'] || row.name || null;
            const rawType = row['Property Type'] || row.property_type || row.propertyType || row.propertyTypeId || row.typeId || '';

            // 2. Resolve Property Type
            let propertyTypeId: string | null = null;
            if (/^[0-9a-f-]{36}$/i.test(rawType)) {
              propertyTypeId = rawType;
            } else {
              propertyTypeId = propertyTypeMap.get(rawType.toLowerCase().trim()) || null;
            }
            if (!propertyTypeId) throw new Error(`Property Type '${rawType}' not found in system`);

            // 3. Validation
            if (!addressLine1 || !row.city || !countryCode) {
              throw new Error('Missing required fields: address_line1, city, or country_code');
            }

            // 4. Parse GFA
            const gfaInputValue = parseFloat(String(gfaRaw).replace(/,/g, '')) || null;
            const gfaSqft = gfaInputValue ? convertToSqft(gfaInputValue, gfaUnit) : null;

            // 5. Resolve Company
            let resolvedCompanyId: string | null = overrideCompanyId || null;
            const isin = (row.isin || '').trim().toLowerCase();
            if (isin) {
              if (isinMap.has(isin)) {
                resolvedCompanyId = isinMap.get(isin)!;
              } else {
                throw new Error(`ISIN '${row.isin}' not found. Add the company with this ISIN first.`);
              }
            }

            // 6. Create Property
            const property = await tx.property.create({
              data: {
                propertyTypeId: propertyTypeId,
                propertyLevel: (row.propertyLevel || row.property_level || 'building') as any,
                name: propertyName,
                addressLine1,
                addressNormalized: normalizeAddress(row.addressLatin || row.address_latin || addressLine1),
                city: row.city,
                postalCode,
                countryCode: countryCode.substring(0, 2).toUpperCase(),
                gfaSqft,
                gfaInputValue,
                gfaInputUnit: gfaUnit,
                geocodeStatus: 'pending',
              },
            });

            newPropertyIds.push(property.id);

            // 7. Link to Company
            if (resolvedCompanyId) {
              await tx.propertyCompany.create({
                data: {
                  propertyId: property.id,
                  companyId: resolvedCompanyId,
                  ownershipPct: parseFloat(row.ownershipPct || row.ownership_pct || '100'),
                  status: 'active',
                  validFrom: new Date(),
                }
              });
            }
          });
          successCount++;
        } catch (err: any) {
          errors.push({ row: i + 1, error: err.message });
        }
      }

      await this.prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: errors.length === rows.length ? 'failed' : 'completed',
          errorLog: (errors.length > 0 ? errors : null) as any,
        },
      });

      if (successCount > 0) {
        const geocodeService = new GeocodeService(this.prisma);
        for (const id of newPropertyIds) await geocodeService.queueGeocoding(id);
        const duplicateEngine = new DuplicateEngine(this.prisma);
        await duplicateEngine.scanForDuplicates(newPropertyIds);
      }
    } catch (err: any) {
      await this.prisma.importJob.update({
        where: { id: jobId },
        data: { status: 'failed', errorLog: [{ error: err.message }] },
      });
    }
  }
}
