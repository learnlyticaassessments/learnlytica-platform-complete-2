# Single-Instance Scale-Up Plan for 100 Concurrent Project Evaluations

## 1) Reality Check
A current medium instance cannot reliably run 100 concurrent project evaluations.
To achieve near-glitch-free operation on **one machine**, you need vertical scaling + strict orchestration.

Also: “no glitch” is not realistic in distributed systems. Production goal should be:
- controlled degradation
- automatic retry
- zero silent failures
- clear status for every run

## 2) Target Definition
This plan targets:
- up to **100 concurrent evaluation jobs in-flight**
- up to **40-60 parallel active evaluators** depending on framework mix
- remaining jobs queued with predictable SLA

If you require **100 truly parallel browser-heavy runs**, use the “High Parallel” profile below.

## 3) Recommended AWS Instance Profiles (Single Node)

### Balanced (recommended first)
- Instance: `m7i.12xlarge` (48 vCPU, 192 GiB RAM)
- Practical evaluator parallelism: `35-45`
- In-flight concurrency via queue: `100+`

### High Parallel (if you insist on near-100 active parallel)
- Instance: `m7i.16xlarge` (64 vCPU, 256 GiB RAM) or `c7i.16xlarge` + RAM-optimized swap strategy
- Practical evaluator parallelism: `55-75`
- Browser-heavy 100 parallel still risky unless tests are short and lightweight

## 4) Core Architecture on Same Instance
Keep all components on same host but isolated:

1. API service (`pm2` or systemd)
2. Worker service (separate process from API)
3. Postgres (local, tuned)
4. Redis (local, for queue + locks)
5. Docker daemon for sandboxed evaluators
6. Nginx reverse proxy + rate limiting

## 5) Mandatory Reliability Controls

## 5.1 Queue and Backpressure
- Move evaluation execution to queue workers (BullMQ or equivalent).
- Enforce:
  - `MAX_ACTIVE_EVALUATIONS`
  - per-org concurrency limit
  - per-user concurrency limit
- When saturated: queue only, never spawn unmanaged containers.

## 5.2 Idempotent Job State Machine
Each run must transition only through:
- `queued -> preparing -> running -> parsing -> completed|failed|timed_out|aborted`

Store heartbeat timestamp every 5-10s.
Watchdog marks stale runs and performs cleanup.

## 5.3 Hard Resource Limits per Evaluator Container
Use Docker run limits (non-negotiable):
- `--cpus=0.75` to `1.25` per worker class
- `--memory=1200m` to `2200m`
- `--pids-limit=256`
- `--network=none` by default (or allowlist mode)
- `--read-only` root fs where possible
- temp workspace size limit

## 5.4 Timeouts
Per stage timeout + global timeout:
- install: 180-300s
- build: 180-300s
- app start: 90-120s
- tests: 180-600s by template
- global: 15-20 min hard cap

## 5.5 Automatic Cleanup
- Kill containers exceeding timeout.
- Prune orphan containers every 5 min.
- Prune dangling images daily.
- Delete old artifacts/logs by retention policy.

## 5.6 Retry Policy
Retry only transient failures (max 1-2 retries):
- registry/network temporary errors
- port bind race
- temporary docker daemon error

Do not retry deterministic failures (test assertions, syntax errors).

## 6) Postgres Tuning (Single-Node)
For 192-256 GB RAM instance, start with conservative values and tune:
- `shared_buffers = 8GB to 16GB`
- `effective_cache_size = 48GB to 96GB`
- `work_mem = 16MB`
- `maintenance_work_mem = 1GB`
- `max_connections = 200` (use pooling)

Use PgBouncer locally:
- transaction pooling
- cap app/worker connection spikes

Indexes to verify for evaluator flows:
- `project_submissions(organization_id, status, submitted_at)`
- `project_evaluation_runs(project_submission_id, created_at desc)`
- `project_evaluation_runs(status, created_at)`

## 7) Worker Sizing Strategy
Define worker classes by framework cost:

- Class A (API only): lightweight
- Class B (frontend build + UI checks): medium
- Class C (fullstack + browser): heavy

Use weighted scheduling:
- 1 Class C job consumes 2 slots
- 1 Class B job consumes 1 slot
- 1 Class A job consumes 0.5 slot

This prevents browser-heavy jobs from starving the node.

## 8) Suggested Initial Limits (for m7i.12xlarge)
- `MAX_ACTIVE_EVALUATIONS = 40`
- `MAX_ACTIVE_BROWSER_EVALS = 20`
- `MAX_ACTIVE_API_EVALS = 20`
- `PER_ORG_MAX_ACTIVE = 10`
- `PER_USER_MAX_ACTIVE = 2`

Queue can hold 100+ concurrently submitted jobs.

## 9) Observability (Fail-Safe Requirement)
Every run must emit structured logs:
- `runId`, `submissionId`, `orgId`, `template`, `phase`, `status`, `durationMs`, `failureCode`

Metrics to track (Prometheus/Grafana or CloudWatch):
- queue depth
- active workers
- avg/p95 runtime
- failure rate by failure code
- container OOM kills
- stale run count
- DB query p95

Alerts:
- queue depth > threshold for 10 min
- failure rate > 10%
- stale runs > 0
- docker daemon unhealthy

## 10) Security and Isolation
- Run evaluator containers as non-root.
- Disable privileged mode.
- Mount only workspace and results path.
- Block outbound network by default.
- Scan uploaded zip (size, file count, file type, path traversal).

## 11) Deployment Topology on Same Instance
Process split:
- `learnlytica-api` (pm2 process 1)
- `learnlytica-worker` (pm2 process 2, queue consumers)
- `postgres` service
- `redis` service
- `nginx` service

Do not run evaluator loop inside API request handler.

## 12) Readiness Gate Before Claiming 100 Concurrency
Pass all these tests:

1. Soak test 24h with 100 in-flight submissions
2. p95 run completion under target SLA
3. No stale run left unresolved
4. No data corruption in run state transitions
5. Error budget respected (<2% infra failures)

## 13) Load Test Plan (Must Run)
Use synthetic submissions of mixed types:
- 30% API-only
- 40% frontend UI
- 30% fullstack/browser

Test waves:
- wave 1: 20 concurrent
- wave 2: 40 concurrent
- wave 3: 60 concurrent
- wave 4: 100 in-flight (queued + active)

Record:
- success/failure by type
- timeout distribution
- queue latency
- node CPU/RAM/IO saturation

## 14) Risks If You Skip This
- random evaluator crashes
- queue starvation
- DB lock contention
- API latency spikes / 5xx during peak
- silent “stuck in running” jobs

## 15) Practical Recommendation
For immediate stability on one scaled-up instance:
1. Upgrade to `m7i.12xlarge` minimum.
2. Separate API and worker processes.
3. Introduce Redis queue + strict concurrency caps.
4. Enforce container CPU/memory/time limits.
5. Add watchdog + retry + cleanup jobs.
6. Run 24h soak test before announcing 100-concurrency support.

With this, you can reliably support 100 concurrent submissions in-flight and high active evaluation throughput on a single machine.
