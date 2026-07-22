import * as Minio from 'minio';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class MinioService {
  private client: Minio.Client;
  private bucket: string;

  constructor() {
    const endPoint = process.env.MINIO_ENDPOINT || 'localhost';
    const useSSL = endPoint.startsWith('https');
    const host = endPoint.replace(/^https?:\/\//, '').split(':')[0];
    const port = parseInt(endPoint.split(':')[2] || (useSSL ? '443' : '9000'));

    this.client = new Minio.Client({
      endPoint: host,
      port: port,
      useSSL: useSSL,
      accessKey: process.env.MINIO_USER || 'proptrack_admin',
      secretKey: process.env.MINIO_PASSWORD || 'proptrack_password',
    });

    this.bucket = process.env.MINIO_BUCKET || 'proptrack';
    this.ensureBucket();
  }

  private async ensureBucket() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        console.log(`Bucket '${this.bucket}' created successfully.`);
      }
    } catch (err) {
      console.error('Error checking/creating MinIO bucket:', err);
    }
  }

  async uploadFile(fileBuffer: Buffer, originalFilename: string, mimeType: string) {
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
    const url = await this.client.presignedGetObject(this.bucket, storagePath, 3600, {
      'response-content-disposition': `attachment; filename="${originalFilename}"`,
    });
    
    // If a public endpoint is defined, replace the internal one in the generated URL
    if (process.env.MINIO_PUBLIC_ENDPOINT) {
      const internalEndpoint = `${this.client.protocol}//${this.client.host}:${this.client.port}`;
      return url.replace(internalEndpoint, process.env.MINIO_PUBLIC_ENDPOINT);
    }
    
    return url;
  }

  async deleteFile(storagePath: string) {
    await this.client.removeObject(this.bucket, storagePath);
  }
}
