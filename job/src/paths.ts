// R2 object keys (not local filesystem paths). The API and worker are separate
// services, so they share state only through R2 + Redis.
export function objectKeys(jobId: string, ext: string) {
  const inputKey = `originals/${jobId}${ext}`;
  const outputKey = `processed/${jobId}${ext}`;
  return { inputKey, outputKey };
}
