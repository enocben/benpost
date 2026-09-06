export const s3 = new Bun.S3Client({
  accessKeyId: process.env.S3_ACCESS_KEY_ID!,
  secretAccessKey: process.env.S3_SECRET!,
  bucket: process.env.S3_BUCKET!,
  endpoint: process.env.S3_ENDPOINT
})

export abstract class S3Files{
  static #generateFileName() {
    return `${Date.now()}-image-${Bun.randomUUIDv7()}`
  }
  static async uploadCoverImage(img: File) {
    const file =  s3.file(`cover/${this.#generateFileName()}.jpg`)
    await file.write(img)
    return file
  }
}
