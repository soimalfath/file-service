// Example R2 client setup for Cloudflare R2 using AWS SDK v3
const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const R2 = {
  putObject: async ({ Bucket, Key, Body, ContentType }) => {
    const client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT, // e.g. 'https://<accountid>.r2.cloudflarestorage.com'
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
    const command = new PutObjectCommand({
      Bucket,
      Key,
      Body,
      ContentType,
    });
    return client.send(command);
  },
  listObjects: async ({ Bucket, ContinuationToken, MaxKeys }) => {
    const client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
    const command = new ListObjectsV2Command({
      Bucket,
      ContinuationToken,
      MaxKeys,
    });
    return client.send(command);
  },
};

module.exports = { R2 };
