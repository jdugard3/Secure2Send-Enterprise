import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env";
import { createHash } from "crypto";
import fs from "fs";
import path from "path";

export class CloudflareR2Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    if (!env.CLOUDFLARE_R2_ENDPOINT || !env.CLOUDFLARE_R2_ACCESS_KEY_ID || !env.CLOUDFLARE_R2_SECRET_ACCESS_KEY) {
      throw new Error("Cloudflare R2 configuration missing");
    }

    this.s3Client = new S3Client({
      region: "auto",
      endpoint: env.CLOUDFLARE_R2_ENDPOINT,
      credentials: {
        accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      },
    });
    
    this.bucketName = env.CLOUDFLARE_R2_BUCKET_NAME!;
  }

  // Upload file with encryption
  async uploadFile(filePath: string, originalName: string, clientId: string): Promise<{ key: string; url: string }> {
    const fileBuffer = await fs.promises.readFile(filePath);
    const hash = createHash('sha256').update(fileBuffer).digest('hex').substring(0, 16);
    const ext = path.extname(originalName);
    const key = `documents/${clientId}/${hash}_${Date.now()}${ext}`;

    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: this.getMimeType(ext),
      ServerSideEncryption: "AES256",
      Metadata: {
        originalName: originalName,
        clientId: clientId,
        uploadedAt: new Date().toISOString(),
      }
    }));

    const publicUrl = env.CLOUDFLARE_R2_PUBLIC_URL ? `${env.CLOUDFLARE_R2_PUBLIC_URL}/${key}` : '';
    return { key, url: publicUrl };
  }

  // Generate secure download URL
  async getDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    
    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  // Delete file
  async deleteFile(key: string): Promise<void> {
    await this.s3Client.send(new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    }));
  }

  private getMimeType(ext: string): string {
    const mimeTypes: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
    };
    return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
  }

  // Check if R2 is configured
  static isConfigured(): boolean {
    return !!(env.CLOUDFLARE_R2_ENDPOINT && 
             env.CLOUDFLARE_R2_ACCESS_KEY_ID && 
             env.CLOUDFLARE_R2_SECRET_ACCESS_KEY && 
             env.CLOUDFLARE_R2_BUCKET_NAME);
  }
}

// Export singleton instance only if configured
export const cloudflareR2 = CloudflareR2Service.isConfigured() 
  ? new CloudflareR2Service() 
  : null;
