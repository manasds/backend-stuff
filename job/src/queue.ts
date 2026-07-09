import { Queue, type ConnectionOptions } from "bullmq";

// BullMQ workers require maxRetriesPerRequest: null on the ioredis connection.
export const connection: ConnectionOptions = process.env.REDIS_URL
  ? { url: process.env.REDIS_URL, maxRetriesPerRequest: null }
  : { host: "localhost", port: 6379, maxRetriesPerRequest: null };

export const ImageQueue = new Queue("image", { connection });
