import { useEffect, useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:9999";

type UploadStatus = "idle" | "uploading" | "processing" | "done" | "error";

// The API returns 404 while the job is still processing, and once complete
// responds with { status: "completed", url } pointing at the image in R2.
async function pollProcessedUrl(
  jobId: string,
  signal: AbortSignal,
): Promise<string> {
  while (!signal.aborted) {
    const response = await fetch(`${API_URL}/files/${jobId}`, { signal });

    if (response.ok) {
      const data = (await response.json()) as { url?: string };
      if (data.url) return data.url;
    } else if (response.status !== 404) {
      const data = await response.json().catch(() => null);
      throw new Error(
        data?.error ?? `Request failed with status ${response.status}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Upload cancelled");
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);

  async function downloadProcessedImage() {
    if (!processedUrl) return;

    const baseName = file?.name.replace(/\.[^.]+$/, "") ?? "image";
    try {
      // Requires CORS to be enabled on the R2 bucket. Falls back to opening
      // the URL in a new tab when the cross-origin fetch is blocked.
      const response = await fetch(processedUrl);
      const blob = await response.blob();
      const ext =
        blob.type === "image/png"
          ? ".png"
          : blob.type === "image/webp"
            ? ".webp"
            : ".jpg";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${baseName}-resized${ext}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(processedUrl, "_blank", "noopener");
    }
  }

  async function upload() {
    if (!file) return;

    pollAbortRef.current?.abort();
    setProcessedUrl(null);
    setError(null);
    setStatus("uploading");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/files`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? `Upload failed with status ${response.status}`,
        );
      }

      const { jobId } = data as { jobId: string; status: string };
      setStatus("processing");

      const controller = new AbortController();
      pollAbortRef.current = controller;

      const url = await pollProcessedUrl(jobId, controller.signal);
      setProcessedUrl(url);
      setStatus("done");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  useEffect(() => {
    return () => {
      pollAbortRef.current?.abort();
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const isBusy = status === "uploading" || status === "processing";

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-neutral-100 via-white to-neutral-200 px-6 py-24 text-neutral-900">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-8 rounded-3xl border border-neutral-200 bg-white/80 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Upload an image
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Pick a file, upload it, and wait for the resized version from the
            worker.
          </p>
        </div>

        {status !== "idle" && (
          <p
            className={`text-sm font-medium ${
              status === "error"
                ? "text-red-600"
                : status === "done"
                  ? "text-green-700"
                  : "text-neutral-600"
            }`}
          >
            {status === "uploading" && "Uploading..."}
            {status === "processing" && "Processing on server..."}
            {status === "done" && "Done — resized image ready."}
            {status === "error" && (error ?? "Upload failed")}
          </p>
        )}

        <div className="grid w-full gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Original
            </p>
            <div className="flex h-64 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-neutral-300 bg-neutral-50">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Selected file preview"
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-sm text-neutral-500">
                  No image selected
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Processed
            </p>
            <div className="flex h-64 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-neutral-300 bg-neutral-50">
              {processedUrl ? (
                <img
                  src={processedUrl}
                  alt="Processed file preview"
                  className="h-full w-full object-contain"
                />
              ) : isBusy ? (
                <span className="text-sm text-neutral-500">
                  Waiting for worker...
                </span>
              ) : (
                <span className="text-sm text-neutral-500">
                  Not processed yet
                </span>
              )}
            </div>
          </div>
        </div>

        <input
          className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 file:mr-4 file:rounded-lg file:border-0 file:bg-neutral-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-neutral-700"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const selected = e.target.files?.[0] ?? null;

            pollAbortRef.current?.abort();
            setProcessedUrl(null);
            setError(null);
            setStatus("idle");

            if (previewUrlRef.current) {
              URL.revokeObjectURL(previewUrlRef.current);
              previewUrlRef.current = null;
            }

            if (selected) {
              previewUrlRef.current = URL.createObjectURL(selected);
            }

            setFile(selected);
            setPreviewUrl(previewUrlRef.current);
          }}
        />
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <button
            className="flex-1 rounded-xl bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
            onClick={upload}
            disabled={!file || isBusy}
            type="button"
          >
            {status === "uploading"
              ? "Uploading..."
              : status === "processing"
                ? "Processing..."
                : "Upload"}
          </button>
          <button
            className="flex-1 rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={downloadProcessedImage}
            disabled={!processedUrl}
            type="button"
          >
            Download resized
          </button>
        </div>
      </div>
    </div>
  );
}
