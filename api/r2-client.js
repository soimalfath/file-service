const { S3Client } = require('@aws-sdk/client-s3');
const { 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand, 
  ListObjectsV2Command,
  HeadObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Create R2 client
const R2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// Helper functions
async function putObject(params) {
  const command = new PutObjectCommand(params);
  return await R2.send(command);
}

async function getObject(params) {
  const command = new GetObjectCommand(params);
  return await R2.send(command);
}

async function deleteObject(params) {
  const command = new DeleteObjectCommand(params);
  return await R2.send(command);
}

async function listObjects(params) {
  const command = new ListObjectsV2Command(params);
  return await R2.send(command);
}

async function headObject(params) {
  const command = new HeadObjectCommand(params);
  return await R2.send(command);
}

async function getPresignedUrl(params) {
  const command = new GetObjectCommand(params);
  return await getSignedUrl(R2, command, { expiresIn: params.expiresIn || 3600 });
}

module.exports = {
  R2,
  putObject,
  getObject,
  deleteObject,
  listObjects,
  headObject,
  getPresignedUrl
};
