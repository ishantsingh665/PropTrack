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

      // Process in batches of 100
      const BATCH_SIZE = 100;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        
        await this.prisma.$transaction(async (tx) => {
          for (const row of batch) {
            try {
              // Basic Mapping & Validation
              const propertyTypeId = row.propertyTypeId || row.typeId;
              const addressLine1 = row.addressLine1 || row.address;
              const countryCode = row.countryCode || row.country;
              const city = row.city;

              if (!propertyTypeId || !addressLine1 || !countryCode || !city) {
                throw new Error(`Missing required fields: ${JSON.stringify(row)}`);
              }

              const gfaInputValue = parseFloat(row.gfaValue || row.gfa || '0') || null;
              const gfaInputUnit = row.gfaUnit || 'sqft';
              const gfaSqft = gfaInputValue ? convertToSqft(gfaInputValue, gfaInputUnit) : null;

              const property = await tx.property.create({
                data: {
                  propertyTypeId,
                  propertyLevel: (row.propertyLevel || 'building') as any,
                  parentId: row.parentId || null,
                  name: row.name || null,
                  addressLine1,
                  addressLatin: row.addressLatin || null,
                  addressNormalized: normalizeAddress(row.addressLatin || addressLine1),
                  city,
                  postalCode: row.postalCode || null,
                  countryCode: countryCode.substring(0, 2).toUpperCase(),
                  gfaSqft,
                  gfaInputValue: gfaInputValue ? parseFloat(gfaInputValue as unknown as string) : null,
                  gfaInputUnit: gfaInputUnit,
                  geocodeStatus: 'pending',
                },
              });

              newPropertyIds.push(property.id);

              // If companyId is provided (or overridden), create ownership stake
              const companyId = overrideCompanyId || row.companyId;
              if (companyId) {
                await tx.propertyCompany.create({
                  data: {
                    propertyId: property.id,
                    companyId,
                    ownershipPct: parseFloat(row.ownershipPct || '100'),
                    status: 'active',
                    validFrom: new Date(),
                  }
                });
              }

              successCount++;
            } catch (err: any) {
              errors.push({ row: i + batch.indexOf(row) + 1, error: err.message });
            }
          }
        });
      }

      await this.prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: errors.length === rows.length ? 'failed' : 'completed',
          errorLog: (errors.length > 0 ? errors : null) as any,
        },
      });

      // Post-import actions
      if (successCount > 0) {
        // 1. Trigger Geocoding for newly created properties
        const geocodeService = new GeocodeService(this.prisma);
        for (const id of newPropertyIds) {
          await geocodeService.queueGeocoding(id);
        }

        // 2. Trigger Duplicate Scan (Scoped)
        const duplicateEngine = new DuplicateEngine(this.prisma);
        await duplicateEngine.scanForDuplicates(newPropertyIds);
      }

    } catch (err: any) {
      await this.prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorLog: [{ error: err.message }],
        },
      });
    }
  }
}
