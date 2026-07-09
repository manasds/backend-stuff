import { Worker } from "bullmq";
import { connection } from "./queue";
import { getObject, putObject } from "./storage";
import path from "node:path";
import sharp from "sharp";

function contentTypeFor(key: string): string {
  const ext = path.extname(key).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

const worker = new Worker(
  "image",
  async (job) => {
    const { inputKey, outputKey } = job.data;

    const { body: input } = await getObject(inputKey);
    const output = await sharp(input)
      .resize({
        width: 300,
        fit: "inside",
        withoutEnlargement: true,
      })
      .toBuffer();

    await putObject(outputKey, output, contentTypeFor(outputKey));
    return { outputKey, jobId: job.data.jobId };
  },
  { connection, concurrency: 5 },
);

worker.on("completed", (job) => console.log(`${job.id} completed`));
worker.on("failed", (job, err) =>
  console.log(`${job?.id} failed`, err.message),
);
