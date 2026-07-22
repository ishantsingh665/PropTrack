import * as Minio from 'minio';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class MinioService {
  private client: Minio.Client | null = null;
  private bucket: string;
  private internalEndpoint: string = '';
  private isDisabled: boolean = false;

  constructor() {
    const endPoint = process.env.MINIO_ENDPOINT;
    const user = process.env.MINIO_USER;

    // Consider disabled if endpoint is localhost (within docker) or user is placeholder
    if (!endPoint || endPoint.includes('localhost') || user === 'placeholder') {
      this.isDisabled = true;
      this.bucket = 'proptrack';
      console.warn('MinIO storage is disabled (no valid endpoint or placeholder user).');
      return;
    }

    const useSSL = endPoint.startsWith('https');
    const protocol = useSSL ? 'https:' : 'http:';
    const host = endPoint.replace(/^https?:\/\//, '').split(':')[0];
    const port = parseInt(endPoint.split(':')[2] || (useSSL ? '443' : '9000'));

    this.internalEndpoint = `${protocol}//${host}:${port}`;

    this.client = new Minio.Client({
      endPoint: host,
      port: port,
      useSSL: useSSL,
      accessKey: user || 'proptrack_admin',
      secretKey: process.env.MINIO_PASSWORD || 'proptrack_password',
    });

    this.bucket = process.env.MINIO_BUCKET || 'proptrack';
    this.ensureBucket();
  }

  private async ensureBucket() {
    if (this.isDisabled || !this.client) return;
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        console.log(`Bucket '${this.bucket}' created successfully.`);
      }
    } catch (err) {
      console.error('Error checking/creating MinIO bucket:', err);
      this.isDisabled = true; // Disable on failure to prevent repeated errors
    }
  }

  async uploadFile(fileBuffer: Buffer, originalFilename: string, mimeType: string) {
    if (this.isDisabled || !this.client) {
      throw new Error('Storage service is currently disabled.');
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const uuid = uuidv4();
    const extension = path.extname(originalFilename);
    const storagePath = `notes/${year}/${month}/${uuid}${extension}`;

    await this.client.putObject(this.bucket, storagePath, fileBuffer, fileBuffer.length, {
      'Content-Type': mimeType,
    });

    return storagePath;
  }

  async getDownloadUrl(storagePath: string, originalFilename: string) {
    if (this.isDisabled || !this.client) {
      throw new Error('Storage service is currently disabled.');
    }

    const url = await this.client.presignedGetObject(this.bucket, storagePath, 3600, {
      'response-content-disposition': `attachment; filename="${originalFilename}"`,
    });
    
    // If a public endpoint is defined, replace the internal one in the generated URL
    if (process.env.MINIO_PUBLIC_ENDPOINT) {
      return url.replace(this.internalEndpoint, process.env.MINIO_PUBLIC_ENDPOINT);
    }
    
    return url;
  }

  async deleteFile(storagePath: string) {
    if (this.isDisabled || !this.client) return;
    await this.client.removeObject(this.bucket, storagePath);
  }
}
