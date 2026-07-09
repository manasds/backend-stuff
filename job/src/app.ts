import { Hono } from "hono";
import { cors } from "hono/cors";
import { ImageQueue } from "./queue.js";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { objectKeys } from "./paths.js";
import { putObject, getDownloadUrl } from "./storage.js";

const app = new Hono();

const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000";
app.use("/*", cors({ origin: corsOrigin }));

app.get("/health", (c) => c.json({ ok: true }));

app.post("/files", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];

  if (!(file instanceof File)) {
    return c.json({ error: "file Field required" }, 400);
  }

  const jobId = randomUUID();
  const ext = path.extname(file.name) || ".jpg";
  const { inputKey, outputKey } = objectKeys(jobId, ext);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await putObject(inputKey, buffer, file.type || "application/octet-stream");

  await ImageQueue.add("resize", { jobId, inputKey, outputKey }, { jobId });
  return c.json({ jobId, status: "processing" }, 202);
});

app.get("/files/:jobId", async (c) => {
  const { jobId } = c.req.param();
  const job = await ImageQueue.getJob(jobId);

  if (!job || (await job.getState()) !== "completed") {
    return c.json({ error: "not ready yet" }, 404);
  }

  const { outputKey } = job.returnvalue as { outputKey: string };
  const url = await getDownloadUrl(outputKey);

  // Client downloads the processed image directly from R2.
  return c.json({ jobId, status: "completed", url }, 200);
});

export default app;
