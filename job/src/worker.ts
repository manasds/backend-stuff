import { Worker } from "bullmq";
import { connection } from "./queue";
import sharp from "sharp";
const worker = new Worker(
  "image",
  async (job) => {
    const {inputPath , outputPath} = job.data ;
    await sharp(inputPath)
      .resize({
        width: 300, 
        fit: "inside", 
        withoutEnlargement: true,
      })
      .toFile(outputPath);
    return { outputPath, jobId: job.data.jobId };
  },
  { connection, concurrency: 5 },
);

worker.on("completed", (job) => console.log(`${job.id} completed`));
worker.on("failed", (job, err) =>
  console.log(`${job?.id} failed`, err.message),
);
