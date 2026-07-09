# Image Resize Service

A Hono API + BullMQ worker that resizes uploaded images. Files are stored in
**Cloudflare R2** (S3-compatible object storage) and jobs are coordinated through
**Redis**. The API and worker run as **separate services** so they can scale
independently.

## Architecture

```
        upload                enqueue (Redis)              process
client ───────▶  API service ───────────────▶  Worker service
                    │                                  │
                    │ put originals/<id>               │ get originals/<id>
                    ▼                                  ▼ put processed/<id>
                       ┌──────────────────────────┐
                       │      Cloudflare R2        │
                       └──────────────────────────┘
```

- **API** (`src/index.ts` → `src/app.ts`): accepts uploads, writes the original
  to R2, enqueues a job. `GET /files/:jobId` returns a URL so the client
  downloads the processed image **directly from R2** (the bytes never flow
  through the API).
- **Worker** (`src/worker.ts`): pulls the original from R2, resizes with `sharp`,
  writes the result back to R2.
- **Redis**: BullMQ job queue shared by both services.
- **R2**: shared file storage (replaces local disk, which the two services can't
  share).

## Local development

1. Copy env: `cp .env.example .env` and fill in R2 values.
2. Start Redis (e.g. `docker run -p 6379:6379 redis`).
3. Install deps: `pnpm install`.
4. Run both processes in separate terminals:
   - API: `pnpm dev`
   - Worker: `pnpm dev:worker`

### API

- `POST /files` — multipart form field `file`. Returns `{ jobId, status }`.
- `GET /files/:jobId` — once ready, returns `{ jobId, status: "completed", url }`
  where `url` points directly at the processed image in R2. The client fetches
  the bytes from that URL (not through the API).
- `GET /health` — health check.

### How the download URL works

By default the API returns a **presigned** URL — a signed, time-limited link to
the private bucket (validity set by `R2_URL_EXPIRES_IN`, default 1h). Nothing in
the bucket is public.

If you prefer permanent public links, expose the bucket via R2's public `r2.dev`
URL or a custom domain, then set `R2_PUBLIC_URL`; the API will return a plain
unsigned URL instead.

## Cloudflare R2 setup

1. Cloudflare dashboard → **R2** → **Create bucket** (note the name).
2. **R2 → Manage API Tokens → Create API Token** with Object Read & Write on the
   bucket. Save the **Access Key ID** and **Secret Access Key**.
3. Your **Account ID** is shown on the R2 overview page.
4. These map to `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
   `R2_ACCOUNT_ID`.

## Deploy to Railway

Create one Railway project with **three services** from this repo.

### 1. Redis

- **New → Database → Add Redis**. Railway provisions it and exposes `REDIS_URL`.

### 2. API service

- **New → GitHub Repo** → select this repo.
- **Settings → Config-as-code → Config Path**: `railway.api.json`.
- **Settings → Networking → Generate Domain** (public URL for the API).
- **Variables**:
  - `REDIS_URL=${{Redis.REDIS_URL}}`
  - `CORS_ORIGIN=https://your-frontend.example.com`
  - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
  - Optional: `R2_URL_EXPIRES_IN` (presigned URL TTL) or `R2_PUBLIC_URL` (for a
    public bucket domain).
  - `PORT` is injected by Railway automatically — do not set it.

### 3. Worker service

- **New → GitHub Repo** → select the **same** repo again.
- **Settings → Config-as-code → Config Path**: `railway.worker.json`.
- No public domain needed (it's a background worker).
- **Variables**: same as the API **except** `CORS_ORIGIN`/`PORT` are not needed:
  - `REDIS_URL=${{Redis.REDIS_URL}}`
  - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`

> Tip: use Railway **shared variables** at the project level for the R2 + Redis
> values so both services reference the same set.

### Notes

- Use Railway's **internal** Redis URL (`redis.railway.internal`) so traffic stays
  on the private network — `${{Redis.REDIS_URL}}` resolves to this.
- Scale the worker independently by increasing its replica count; concurrency per
  worker is set in `src/worker.ts`.
- No filesystem/volume is required — all durable state lives in R2 and Redis.
