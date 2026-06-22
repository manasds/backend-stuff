# Background Jobs — Learning Roadmap

A staged plan to learn background job processing, from first principles to a
portfolio-ready project. No code here — this is the map, not the territory.

> **Why this topic:** chosen as the first backend upskill after CRUD + DB +
> typesafety + validation. Libraries handle much of the initial heavy lifting,
> so the concepts are reachable at a beginner level while still being highly
> relevant to the job market.

---

## The mental model (why background jobs exist)

A request handler must answer fast and close the connection. Some work is slow
(PDFs, emails, external APIs), failure-prone, or simply "not the client's
concern." Doing it inline makes users wait, couples unrelated systems, wastes
server capacity, and loses work on crashes.

**Solution:** the API does only the essential work, then drops a job into a
**durable queue**. A separate **worker** process reads the queue and does the
slow work on its own time — with retries, concurrency, and independent scaling.

Core vocabulary:
- **Producer** — code that adds a job (usually your API endpoint).
- **Queue** — durable storage for pending jobs (Redis or Postgres).
- **Worker** — a separate long-running process that consumes and runs jobs.
- **Job** — a unit of work plus its payload (data).

---

## Tooling decision

| Option | Backing store | Notes |
| --- | --- | --- |
| **BullMQ** | Redis | Most in-demand Node queue. Recommended. |
| **pg-boss** | PostgreSQL | No new infra — reuses the DB you already know. |
| **Graphile Worker** | PostgreSQL | Similar Postgres-based alternative. |

**Decision:** start with **BullMQ + Redis** (market relevance + Redis pays off
again later for caching). Fall back to **pg-boss** only to avoid installing
anything.

**Redis note:** you don't need to *study* Redis to start — only have it
*running*. BullMQ talks to it for you. Learn Redis properly later when you reach
the caching topic.

### Getting Redis running (pick one)
- [ ] Native install (`redis-server`) — fastest on Linux.
- [ ] Cloud Redis (e.g. Upstash free tier) — zero local install, needs TLS.
- [ ] Docker (`redis:7`) — if/when Docker is available.
- [ ] OR skip Redis with pg-boss on existing Postgres.

---

## Stage 0 — Warm-up: feel the mechanics (~30 min)

Goal: internalize **producer → queue → worker**. No real project yet.

- [ ] Get Redis running and confirm it responds.
- [ ] Create a tiny project with a queue, a producer, and a worker.
- [ ] Enqueue a job from the producer; watch the worker pick it up after a delay.
- [ ] **Experiment 1:** stop the worker, enqueue 3 jobs, restart the worker —
      observe that jobs waited in the queue (durability).
- [ ] **Experiment 2:** add retries + exponential backoff; make the worker fail
      randomly and watch it retry.
- [ ] **Experiment 3:** raise concurrency and watch multiple jobs run at once.

**Done when:** you can explain, in your own words, why the worker is a separate
process and why jobs survive a restart.

---

## Stage 1 — Project: Email / Notification sender

The "hello world" of background jobs.

- [ ] An endpoint saves a row, then enqueues a "send welcome email" job.
- [ ] A worker "sends" the email (fake provider or log output).
- [ ] Add retries with exponential backoff.
- [ ] Simulate random failures and confirm retries recover them.

**New concepts:** producer/consumer split, job payloads, retries.

---

## Stage 2 — Project: Scheduled report / digest

- [ ] A repeatable (cron-style) job runs on an interval.
- [ ] It queries the DB and produces a summary (to a file or table).
- [ ] Allow the same report to be triggered on-demand via an endpoint.

**New concepts:** repeatable/scheduled jobs vs. on-demand jobs.

---

## Stage 3 — Project: Image / file processing pipeline (recommended focus)

The sweet spot: useful, and teaches the concept most CRUD-only devs lack —
**job status tracking**.

- [ ] Upload endpoint stores the file and enqueues a processing job.
- [ ] Worker processes it (e.g. resize / thumbnails) over a few seconds.
- [ ] Track status in the DB: `pending → processing → done` (and `failed`).
- [ ] A status endpoint lets the client poll progress.
- [ ] Stretch: produce multiple outputs in parallel; report progress %.

**New concepts:** job status persistence, polling, longer-running work,
storing results.

---

## Stage 4 — Project: Scraper / data aggregator with rate limiting

- [ ] Submit many URLs; fan out into one job per URL.
- [ ] Limit concurrency so the target isn't hammered (rate limiting).
- [ ] Handle partial failures; retry only the failed items.
- [ ] Stretch: aggregate results once all jobs in a batch finish.

**New concepts:** fan-out, concurrency control, rate limiting, partial failure.

---

## Stage 5 — Capstone: CSV processing service with a job dashboard

- [ ] Upload a large CSV; a job parses it in chunks.
- [ ] Validate rows, import to DB, then notify when complete.
- [ ] Multi-step job chain/flow.
- [ ] A dashboard shows queued / active / completed / failed jobs.
- [ ] Dead-letter handling for permanently failed jobs.

**New concepts:** chunking, job chains/flows, queue dashboard, dead-letter queue.

---

## Cross-cutting concepts to ensure you hit

Regardless of which projects you build, make sure you have hands-on experience
with each of these:

- [ ] Retries + exponential backoff
- [ ] Job status persistence (DB column or queue state)
- [ ] Concurrency limits
- [ ] Failure handling / dead-letter queue
- [ ] Observability (logs or a dashboard) to watch jobs

---

## Suggested path

Stage 0 (warm-up) → Stage 1 (email) → **Stage 3 (image pipeline)** → then pick
Stage 4 or Stage 5 depending on appetite. Stage 2 can slot in any time you want
scheduled-job practice.

## Definition of "I know background jobs"

You can take a slow piece of work out of a request, run it reliably in a worker
with retries and status tracking, observe it, and explain the durability and
scaling reasons for doing so.
