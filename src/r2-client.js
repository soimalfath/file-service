// Cloudflare R2 client setup using AWS SDK v3
const { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand, 
  ListObjectsV2Command,
  HeadObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

// Create S3Client with Cloudflare R2 configuration
const createClient = () => {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT, // e.g. 'https://<accountid>.r2.cloudflarestorage.com'
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
};

const R2 = {
  // Upload a file to R2 bucket
  putObject: async ({ Bucket, Key, Body, ContentType }) => {
    const client = createClient();
    const command = new PutObjectCommand({
      Bucket,
      Key,
      Body,
      ContentType,
    });
    return client.send(command);
  },

  // Get object metadata (check if exists)
  headObject: async ({ Bucket, Key }) => {
    const client = createClient();
    const command = new HeadObjectCommand({
      Bucket,
      Key,
    });
    try {
      return await client.send(command);
    } catch (error) {
      if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
        return null;
      }
      throw error;
    }
  },

  // Get a file from R2 bucket
  getObject: async ({ Bucket, Key }) => {
    const client = createClient();
    const command = new GetObjectCommand({
      Bucket,
      Key,
    });
    try {
      return await client.send(command);
    } catch (error) {
      if (error.name === 'NoSuchKey' || error.name === 'NotFound') {
        const err = new Error('File not found');
        err.name = 'NoSuchKey';
        throw err;
      }
      throw error;
    }
  },

  // Download file to a specific path
  downloadObject: async ({ Bucket, Key, filePath }) => {
    const client = createClient();
    const command = new GetObjectCommand({
      Bucket,
      Key,
    });
    
    const response = await client.send(command);
    const body = response.Body;
    
    // Ensure the directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // If Body is a Readable stream, pipe it to a file
    if (body instanceof Readable) {
      const writeStream = fs.createWriteStream(filePath);
      return new Promise((resolve, reject) => {
        body.pipe(writeStream)
          .on('error', reject)
          .on('finish', resolve);
      });
    } else {
      // For non-stream response body (like an ArrayBuffer)
      await fs.promises.writeFile(filePath, Buffer.from(await body.transformToByteArray()));
    }
  },

  // Delete a file from R2 bucket
  deleteObject: async ({ Bucket, Key }) => {
    const client = createClient();
    const command = new DeleteObjectCommand({
      Bucket,
      Key,
    });
    return client.send(command);
  },

  // List objects in R2 bucket with pagination
  listObjects: async ({ Bucket, ContinuationToken, MaxKeys, Prefix }) => {
    const client = createClient();
    const command = new ListObjectsV2Command({
      Bucket,
      ContinuationToken,
      MaxKeys,
      Prefix
    });
    return client.send(command);
  },
  
  // Generate a presigned URL for temporary access
  getPresignedUrl: async ({ Bucket, Key, expiresIn = 3600 }) => {
    const client = createClient();
    const command = new GetObjectCommand({ Bucket, Key });
    return getSignedUrl(client, command, { expiresIn });
  }
};

module.exports = { R2 };
