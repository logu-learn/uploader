'use strict';

const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const  Jimp  = require('jimp');

const s3 = new S3Client({
  region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-south-1',
});

const DEST_BUCKET = process.env.DEST_BUCKET || 'uploader-download9080';

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.once('end', () => resolve(Buffer.concat(chunks)));
    stream.once('error', reject);
  });
}

async function watermarkImageBuffer(inputBuffer) {

  const image = await Jimp.read(inputBuffer);

  // Resize image if too large
  const MAX_WIDTH = 1920;

  if (image.bitmap.width > MAX_WIDTH) {
    image.resize(MAX_WIDTH, Jimp.AUTO);
  }

  const watermarkText = 'logesh.cloud';
  const margin = 24;

  const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);

  const textWidth = Jimp.measureText(font, watermarkText);
  const textHeight = Jimp.measureTextHeight(font, watermarkText, textWidth);

  const x = Math.max(0, image.bitmap.width - textWidth - margin);
  const y = Math.max(0, image.bitmap.height - textHeight - margin);

  image.print(font, x, y, watermarkText);

  const mime = image.getMIME();

  if (mime === Jimp.MIME_JPEG) {
    return {
      buffer: await image.quality(85).getBufferAsync(Jimp.MIME_JPEG),
      contentType: Jimp.MIME_JPEG
    };
  }

  if (mime === Jimp.MIME_PNG) {
    return {
      buffer: await image.getBufferAsync(Jimp.MIME_PNG),
      contentType: Jimp.MIME_PNG
    };
  }

  if (mime === Jimp.MIME_WEBP) {
    return {
      buffer: await image.getBufferAsync(Jimp.MIME_WEBP),
      contentType: Jimp.MIME_WEBP
    };
  }

  return {
    buffer: await image.getBufferAsync(Jimp.MIME_PNG),
    contentType: Jimp.MIME_PNG
  };
}

function isImageKey(key) {
  return /\.(png|jpg|jpeg|webp|tiff|tif|gif|avif)$/i.test(key);
}

exports.handler = async (event) => {

  const results = [];

  for (const record of event.Records || []) {

    let s3Event;

    try {
      s3Event = JSON.parse(record.body);
    } catch (err) {
      console.warn("Skipping record with non-JSON body");
      continue;
    }

    for (const s3rec of s3Event.Records || []) {

      const bucket = s3rec.s3?.bucket?.name;

      const rawKey = s3rec.s3?.object?.key || '';
      const key = decodeURIComponent(rawKey.replace(/\+/g, ' '));

      console.log("Processing:", bucket, key);

      if (!bucket || !key) {
        console.warn("Missing bucket or key");
        continue;
      }

      if (!isImageKey(key)) {
        console.log(`Skipping non-image object: s3://${bucket}/${key}`);
        continue;
      }

      try {

        const getRes = await s3.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: key
          })
        );

        const inputBuffer = await streamToBuffer(getRes.Body);

        const { buffer, contentType } = await watermarkImageBuffer(inputBuffer);

        const destKey = key.replace(/^uploads\//, 'watermarked/');

        await s3.send(
          new PutObjectCommand({
            Bucket: DEST_BUCKET,
            Key: destKey,
            Body: buffer,
            ContentType: contentType
          })
        );

        console.log(`Saved watermarked image → s3://${DEST_BUCKET}/${destKey}`);

        results.push({
          source: { bucket, key },
          dest: { bucket: DEST_BUCKET, key: destKey }
        });

      } catch (err) {

        console.error("Failed to process", {
          bucket,
          key,
          err
        });

        continue;
      }
    }
  }

  return {
    ok: true,
    results
  };
};