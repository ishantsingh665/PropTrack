import { PrismaClient, Prisma } from '@prisma/client';

export interface TransferLegInput {
  propertyId: string;
  sourceCompanyId: string;
  targetCompanyId: string;
  ownershipPct: number;
}

export class TransferService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Executes a single transfer or a multi-leg swap within a transaction.
   */
  async executeTransferEvent(
    type: 'transfer' | 'swap' | 'reversal',
    legs: TransferLegInput[],
    notes?: string,
    originalTransferId?: string
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Create the master transfer record
      const transfer = await tx.propertyTransfer.create({
        data: {
          type: type.toLowerCase() as any,
          notes,
          reversedBy: originalTransferId ? undefined : null,
        },
      });

      // If this is a reversal, update the original transfer record
      if (type === 'reversal' && originalTransferId) {
        await tx.propertyTransfer.update({
          where: { id: originalTransferId },
          data: { reversedBy: transfer.id },
        });
      }

      for (const leg of legs) {
        // 2. Find and validate the source ownership stake
        const sourceStake = await tx.propertyCompany.findFirst({
          where: {
            propertyId: leg.propertyId,
            companyId: leg.sourceCompanyId,
            validTo: null,
          },
        });

        if (!sourceStake) {
          throw new Error(
            `Source ownership stake not found for property ${leg.propertyId} and company ${leg.sourceCompanyId}`
          );
        }

        if (sourceStake.ownershipPct < leg.ownershipPct) {
          throw new Error(
            `Insufficient ownership percentage. Company has ${sourceStake.ownershipPct}%, but ${leg.ownershipPct}% transfer requested.`
          );
        }

        const now = new Date();

        // 3. Close or adjust the source stake
        if (sourceStake.ownershipPct === leg.ownershipPct) {
          // Full transfer: Close the record
          await tx.propertyCompany.update({
            where: { id: sourceStake.id },
            data: {
              validTo: now,
              status: type === 'reversal' ? 'reversed' : 'transferred' as any,
            },
          });
        } else {
          // Partial transfer: Update existing and create a new "remainder" stake
          // Rule: To keep history immutable, we close the old one and open TWO new ones
          // One for the remaining pct (staying with source) and one for the target.
          await tx.propertyCompany.update({
            where: { id: sourceStake.id },
            data: {
              validTo: now,
              status: 'transferred' as any,
            },
          });

          await tx.propertyCompany.create({
            data: {
              propertyId: leg.propertyId,
              companyId: leg.sourceCompanyId,
              ownershipPct: sourceStake.ownershipPct - leg.ownershipPct,
              status: 'active' as any,
              validFrom: now,
            },
          });
        }

        // 4. Create the target stake
        const targetStake = await tx.propertyCompany.create({
          data: {
            propertyId: leg.propertyId,
            companyId: leg.targetCompanyId,
            ownershipPct: leg.ownershipPct,
            status: 'active' as any,
            validFrom: now,
          },
        });

        // 5. Record the transfer legs for the audit trail
        // Outgoing leg
        await tx.propertyTransferLeg.create({
          data: {
            transferId: transfer.id,
            propertyCompanyId: sourceStake.id,
            direction: 'out',
          },
        });

        // Incoming leg
        await tx.propertyTransferLeg.create({
          data: {
            transferId: transfer.id,
            propertyCompanyId: targetStake.id,
            direction: 'in',
          },
        });
      }

      return transfer;
    });
  }

  /**
   * Reverses a transfer event by creating a new transfer event with opposite legs.
   */
  async reverseTransfer(transferId: string, notes?: string) {
    const originalTransfer = await this.prisma.propertyTransfer.findUnique({
      where: { id: transferId },
      include: {
        legs: {
          include: {
            propertyCompany: true,
          },
        },
      },
    });

    if (!originalTransfer) throw new Error('Transfer not found');
    if (originalTransfer.reversedBy) throw new Error('Transfer already reversed');

    // Group legs by property to reconstruct what was moved
    // We only need the 'in' legs of the original transfer to know who received what, 
    // and then we move that back to whoever sent it ('out' legs).
    
    // For a simple transfer, it's easy. For a swap, we reverse all movements.
    const reversalLegs: TransferLegInput[] = [];

    // The 'in' legs tell us where property ended up. We move from those targets back to sources.
    const inLegs = originalTransfer.legs.filter(l => l.direction === 'in');
    const outLegs = originalTransfer.legs.filter(l => l.direction === 'out');

    for (let i = 0; i < inLegs.length; i++) {
        const leg = inLegs[i];
        // Find corresponding out leg for this property (this logic assumes standard transfer pairs)
        // In a complex swap, we just need to know which companies swapped.
        // Simplest: Find the company that received (inLeg) and move it back to the company that lost (outLeg)
        // Note: This logic assumes 1 property per leg pair.
        const matchingOutLeg = outLegs.find(ol => ol.propertyCompany.propertyId === leg.propertyCompany.propertyId);
        
        if (matchingOutLeg) {
            reversalLegs.push({
                propertyId: leg.propertyCompany.propertyId,
                sourceCompanyId: leg.propertyCompany.companyId,
                targetCompanyId: matchingOutLeg.propertyCompany.companyId,
                ownershipPct: leg.propertyCompany.ownershipPct
            });
        }
    }

    return await this.executeTransferEvent('reversal', reversalLegs, notes || `Reversal of transfer ${transferId}`, transferId);
  }
}
