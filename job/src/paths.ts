import path from "node:path";
import { fileURLToPath } from "node:url";

const srcDir = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(srcDir, "..");
export const uploadsDir = path.join(projectRoot, "uploads");

export function uploadPaths(jobId: string, ext: string) {
  const inputPath = path.join(uploadsDir, "originals", `${jobId}${ext}`);
  const outputPath = path.join(uploadsDir, "processed", `${jobId}${ext}`);
  return { inputPath, outputPath };
}
