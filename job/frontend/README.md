# Image Resizer — Frontend

Minimal **Vite + React + TypeScript** UI for the image-resize API. Builds to
static files (`dist/`) — deploy it anywhere that serves static assets
(Cloudflare Pages, Netlify, Vercel static, Railway static, GitHub Pages, S3/R2).

## How it works

1. Pick an image → previewed locally.
2. **Upload** → `POST {API}/files` returns a `jobId`.
3. Polls `GET {API}/files/:jobId` every 1s. While the worker is busy the API
   returns `404`; once done it returns `{ status: "completed", url }` with a
   presigned R2 URL.
4. The resized image is shown directly from that R2 URL. **Download resized**
   fetches it (falls back to opening in a new tab if R2 CORS isn't enabled).

## Configuration

The API base URL is read from `VITE_API_URL` at build time.

```bash
cp .env.example .env
# then edit VITE_API_URL
```

- Local dev against local API: `VITE_API_URL=http://localhost:9999`
- Production: `VITE_API_URL=https://image-resize-manas.up.railway.app`

## Local development

```bash
pnpm install
pnpm dev        # http://localhost:5173
```

## Build & preview

```bash
pnpm build      # outputs static site to dist/
pnpm preview    # serve the built dist/ locally
```

## Deploy (static)

Any static host works. Example settings:

| Setting | Value |
|---|---|
| Root directory | `frontend` |
| Build command | `pnpm install && pnpm build` |
| Output directory | `dist` |
| Env var | `VITE_API_URL=https://image-resize-manas.up.railway.app` |

### Required backend settings

- **API CORS**: set the API service's `CORS_ORIGIN` env var to this frontend's
  deployed origin (e.g. `https://your-frontend.pages.dev`). Otherwise the browser
  blocks the upload/poll requests.
- **R2 CORS (optional)**: image *display* via `<img>` needs no CORS. The in-app
  **Download resized** button uses `fetch()`, which needs the R2 bucket to allow
  your frontend origin. Without it, downloads fall back to opening the image in a
  new tab. To enable: Cloudflare R2 → your bucket → Settings → CORS policy, allow
  `GET` from your frontend origin.
