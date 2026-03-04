import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const REGION = process.env.AWS_REGION || 'eu-north-1';
const s3Client = new S3Client({ region: REGION });

const BUCKET_NAME = process.env.S3_UPLOAD_BUCKET || 'uploader-project9080';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const { fileName, fileType } = await request.json();

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: 'Missing fileName or fileType' },
        { status: 400 },
      );
    }

    if (!BUCKET_NAME) {
      return NextResponse.json(
        { error: 'S3 bucket name is not configured' },
        { status: 500 },
      );
    }

    const key = `uploads/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    const url = await getSignedUrl(s3Client, command, {
      expiresIn: 300,
      signableHeaders: new Set(['content-type']),
    });

    return NextResponse.json({ url, key });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 },
    );
  }
}

