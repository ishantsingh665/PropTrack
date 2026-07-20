import { PrismaClient } from '@prisma/client';

export class GeocodeService {
  private prisma: PrismaClient;
  private nominatimUrl: string;
  private maxAttempts: number;
  private retryInterval: number;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.nominatimUrl = process.env.NOMINATIM_URL || 'http://nominatim:8080';
    this.maxAttempts = parseInt(process.env.GEOCODE_MAX_ATTEMPTS || '3');
    this.retryInterval = parseInt(process.env.GEOCODE_RETRY_INTERVAL_SECONDS || '60');
  }

  async queueGeocoding(propertyId: string) {
    await this.prisma.geocodeQueue.create({
      data: {
        propertyId,
        nextRunAt: new Date(),
      },
    });
  }

  async processQueue() {
    const jobs = await this.prisma.geocodeQueue.findMany({
      where: {
        nextRunAt: { lte: new Date() },
      },
      take: 10,
    });

    for (const job of jobs) {
      await this.geocodeProperty(job);
    }
  }

  private async geocodeProperty(job: any) {
    const property = await this.prisma.property.findUnique({
      where: { id: job.propertyId },
    });

    if (!property || property.geocodeStatus === 'manual_override') {
      await this.prisma.geocodeQueue.delete({ where: { id: job.id } });
      return;
    }

    try {
      const query = new URLSearchParams({
        street: property.addressLine1,
        city: property.city,
        country: property.countryCode,
        format: 'json',
        limit: '1',
      });

      const response = await fetch(`${this.nominatimUrl}/search?${query.toString()}`, {
        headers: { 'User-Agent': 'PropTrack/1.0' },
      });

      if (!response.ok) {
        throw new Error(`Nominatim returned ${response.status}`);
      }

      const data: any = await response.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        await this.prisma.property.update({
          where: { id: property.id },
          data: {
            latitude: parseFloat(lat),
            longitude: parseFloat(lon),
            geocodeStatus: 'success',
            geocodeAttempts: property.geocodeAttempts + 1,
          },
        });
        await this.prisma.geocodeQueue.delete({ where: { id: job.id } });
      } else {
        throw new Error('No results found');
      }
    } catch (error: any) {
      const attempts = property.geocodeAttempts + 1;
      const isLastAttempt = attempts >= this.maxAttempts;

      await this.prisma.property.update({
        where: { id: property.id },
        data: {
          geocodeAttempts: attempts,
          geocodeStatus: isLastAttempt ? 'failed' : 'pending',
        },
      });

      if (isLastAttempt) {
        await this.prisma.geocodeQueue.delete({ where: { id: job.id } });
      } else {
        await this.prisma.geocodeQueue.update({
          where: { id: job.id },
          data: {
            attempts,
            lastError: error.message,
            nextRunAt: new Date(Date.now() + this.retryInterval * 1000),
          },
        });
      }
    }
  }
}
