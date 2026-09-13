let _s3: Bun.S3Client | null = null;

function getS3(): Bun.S3Client {
  if (_s3) return _s3;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET ?? process.env.S3_SECRET_ACCESS_KEY;
  const endpoint = process.env.S3_ENDPOINT;
  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("S3 not configured: missing S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET");
  }
  _s3 = new Bun.S3Client({ bucket, accessKeyId, secretAccessKey, endpoint });
  return _s3;
}

// Export compat : `import { s3 } from "./s3"` continue de marcher mais sans crash au boot
export const s3 = {
  file(path: string) {
    return getS3().file(path);
  },
};

export abstract class S3Files{
  static #generateFileName() {
    return `${Date.now()}-image-${Bun.randomUUIDv7()}`
  }
  static async uploadCoverImage(img: File) {
    const client = getS3();
    const file = client.file(`cover/${this.#generateFileName()}.jpg`)
    await file.write(img)
    return file
  }

  static async deleteCoverImage(key: string) {
    try{
      const client = getS3();
      await client.file(key).delete()
    } catch (e) {
      console.error("Failed to delete file:", e)
    }
  }
}
