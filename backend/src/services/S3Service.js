import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class S3Service {
  constructor() {
    const hasCredentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
    this.isMock = process.env.STORAGE_TYPE === 'LOCAL' || !hasCredentials;

    if (!this.isMock) {
      this.client = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
      this.bucket = process.env.AWS_S3_BUCKET;
    } else {
      console.warn('⚠️ [S3Service] Rodando em MOCK MODE (Storage Local)');
    }
  }

  async uploadFileStream(localPath, key) {
    if (this.isMock) {
      // Simula persistência movendo para uma pasta "mock_s3"
      const mockStorageDir = path.join(__dirname, '../../uploads/mock_s3');
      if (!fs.existsSync(mockStorageDir)) fs.mkdirSync(mockStorageDir, { recursive: true });
      
      const destination = path.join(mockStorageDir, key.replace(/\//g, '_'));
      fs.copyFileSync(localPath, destination);
      console.log(`[MOCK_S3] Arquivo persistido localmente: ${destination}`);
      return key;
    }

    const fileStream = fs.createReadStream(localPath);
    fileStream.on('error', (err) => console.error('[STREAM_ERROR]', err.message));

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: fileStream,
      ContentType: 'application/pdf',
    });

    try {
      const response = await this.client.send(command);
      if (response.$metadata.httpStatusCode !== 200) throw new Error(`S3 Error: ${response.$metadata.httpStatusCode}`);
      return key;
    } catch (err) {
      fileStream.destroy();
      throw err;
    }
  }

  async getPresignedUrl(key) {
    if (this.isMock) {
      // No modo mock, retornamos um marcador que a rota de download entenderá
      return `MOCK_LOCAL_URL:${key}`;
    }

    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return await getSignedUrl(this.client, command, { expiresIn: 3600 });
  }

  async rollbackObject(key) {
    if (this.isMock) return console.log(`[MOCK_ROLLBACK] Removendo simulação de: ${key}`);
    
    const command = new DeleteObjectCommand({ Bucket: this.bucket, Key: key });
    await this.client.send(command);
  }

  generateKey(documentId) {
    const now = new Date();
    const ano = now.getFullYear();
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    return `rnc/${ano}/${mes}/${documentId}_${Date.now()}.pdf`;
  }
}

export default new S3Service();
