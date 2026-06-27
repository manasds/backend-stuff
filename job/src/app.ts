import { Hono } from "hono";
import { cors } from "hono/cors";
import { ImageQueue } from "./queue";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { uploadPaths } from "./paths";
const app = new Hono();

app.use("/*", cors({ origin: "http://localhost:3000" }));

app.post("/files", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];

  if (!(file instanceof File)) {
    return c.json({ error: "file Field required" }, 400);
  }

  const jobId = randomUUID();
  const ext = path.extname(file.name) || ".jpg";
  const { inputPath, outputPath } = uploadPaths(jobId, ext);
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await mkdir(path.dirname(inputPath), { recursive: true });
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(inputPath, buffer);

  await ImageQueue.add("resize", { jobId, inputPath, outputPath }, { jobId });
  return c.json({ jobId, status: "processing" }, 202);
});

app.get("/files/:jobId", async (c) => {
  const { jobId } = c.req.param();
  const job = await ImageQueue.getJob(jobId);

  if (!job || (await job.getState()) !== "completed") {
    return c.json({ error: "not ready yet" }, 404);
  }

  const { outputPath } = job.returnvalue as { outputPath: string };
  const imageBytes = await readFile(outputPath);

  const ext = path.extname(outputPath).toLowerCase();
  const contentType =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
        ? "image/webp"
        : "image/jpeg";

  // Send raw bytes back — browser can display as <img src="...">
  return c.body(imageBytes, 200, {
    "Content-Type": contentType,
  });
});
export default app;
