/**
 * One-time script to set CORS on the S3 bucket so browser uploads work.
 * Run: node scripts/set-s3-cors.js
 * Uses the same AWS credentials as the app (env / default profile).
 */

const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');

const BUCKET_NAME = process.env.S3_UPLOAD_BUCKET || 'uploads-bucket9080';
const REGION = process.env.AWS_REGION || 'ap-south-1';

const corsRules = {
  CORSRules: [
    {
      AllowedOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000'],
      // Note: S3 CORS AllowedMethods does NOT include OPTIONS.
      // Browsers send OPTIONS as a preflight, but you allow the *actual* methods (e.g. PUT).
      AllowedMethods: ['GET', 'PUT', 'HEAD'],
      AllowedHeaders: ['*'],
      ExposeHeaders: ['ETag'],
    },
  ],
};

async function main() {
  const client = new S3Client({ region: REGION });
  await client.send(
    new PutBucketCorsCommand({
      Bucket: BUCKET_NAME,
      CORSConfiguration: corsRules,
    })
  );
  console.log(`CORS configured on bucket: ${BUCKET_NAME}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
