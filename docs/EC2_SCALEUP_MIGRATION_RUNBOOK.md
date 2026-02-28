# Learnlytica EC2 Scale-Up Migration Runbook (Data-Safe, Minimal Downtime)

## 1. Scope and Current State

This runbook is for migrating from current single-instance deployment (example: `t2.medium`) to a larger EC2 instance (example: `t2.large` / `t3.large`) while keeping existing system live until cutover.

Current deployment assumptions from code/scripts:

1. Backend on `localhost:3666` managed by PM2.
2. Frontend preview on `localhost:4666` managed by PM2.
3. Nginx reverse proxy on port `80`.
4. PostgreSQL runs locally on the same EC2 host (`DATABASE_URL=...@localhost:5432/learnlytica`).
5. Project ZIP/evaluation artifacts stored on local disk under:
   - `backend/storage/project-evaluations/`
6. Docker executor images are local on host (`learnlytica/executor-*`).

Because DB + storage are local, true zero-write-loss migration requires controlled cutover.

---

## 2. Migration Strategy (Simple + Safe)

Recommended: **Blue/Green with final delta sync**

1. Keep old server running for all users.
2. Build new larger instance in parallel.
3. Perform initial full data copy (DB dump + storage + app config).
4. Validate new instance fully.
5. Enter short maintenance window (2-5 min) for final delta sync and cutover.
6. Switch traffic (Elastic IP or DNS/ALB).
7. Keep old server intact for rollback.

This is the simplest reliable approach with full data retention.

---

## 3. Pre-Migration Checklist

On **old server**:

1. Confirm PM2 app names:
```bash
pm2 status
```

2. Confirm DB and app connectivity:
```bash
curl -s http://localhost:3666/health
sudo -u postgres psql -d learnlytica -c "SELECT now();"
```

3. Confirm storage path exists:
```bash
ls -la ~/learnlytica-platform-complete-2/backend/storage/project-evaluations
```

4. Capture baseline counts (for post-migration validation):
```bash
sudo -u postgres psql -d learnlytica -P pager=off -c "
SELECT
  (SELECT count(*) FROM questions) AS questions,
  (SELECT count(*) FROM assessments) AS assessments,
  (SELECT count(*) FROM project_assessments) AS project_assessments,
  (SELECT count(*) FROM project_submissions) AS project_submissions,
  (SELECT count(*) FROM project_evaluation_runs) AS project_runs,
  (SELECT count(*) FROM users) AS users;
"
```

---

## 4. Backup Policy (Before + Ongoing)

## 4.1 Pre-cutover backup (mandatory)

Run on old server:

```bash
export TS=$(date +%Y%m%d_%H%M%S)
mkdir -p /root/backups/$TS

# 1) DB backup (custom format, best for restore)
sudo -u postgres pg_dump -Fc learnlytica > /root/backups/$TS/learnlytica.dump

# 2) App env + PM2 + nginx config backup
cp ~/learnlytica-platform-complete-2/backend/.env /root/backups/$TS/backend.env
cp ~/learnlytica-platform-complete-2/frontend/.env /root/backups/$TS/frontend.env
cp ~/learnlytica-platform-complete-2/ecosystem.config.cjs /root/backups/$TS/ecosystem.config.cjs
cp /etc/nginx/sites-available/learnlytica /root/backups/$TS/nginx-learnlytica.conf

# 3) Storage backup
tar -czf /root/backups/$TS/project-evaluations-storage.tgz \
  -C ~/learnlytica-platform-complete-2/backend/storage project-evaluations
```

## 4.2 Ongoing backup policy (recommended)

1. Daily DB backup (`pg_dump -Fc`) retained 14-30 days.
2. Daily storage backup for `backend/storage/project-evaluations`.
3. Weekly restore test on staging.
4. Copy backups to S3 with lifecycle policy.

---

## 5. Build New Larger Instance (Green)

1. Launch new EC2 (same Ubuntu version), larger size.
2. Security group: allow 22, 80, 443 (same as old).
3. Clone repo to same path:
```bash
cd ~
git clone <repo-url> learnlytica-platform-complete-2
cd learnlytica-platform-complete-2
```

4. Install system deps using your deployment script (or manual):
```bash
sudo bash deploy-aws-ubuntu.sh
```

If script prompts for domain/API key, use production values.

---

## 6. Initial Data Copy to New Instance

From old -> new (replace `<NEW_IP>`):

## 6.1 Copy DB dump and restore

Old:
```bash
scp /root/backups/$TS/learnlytica.dump ubuntu@<NEW_IP>:/tmp/
```

New:
```bash
sudo -u postgres createdb learnlytica || true
sudo -u postgres pg_restore -d learnlytica /tmp/learnlytica.dump
```

## 6.2 Copy storage artifacts

Old:
```bash
scp /root/backups/$TS/project-evaluations-storage.tgz ubuntu@<NEW_IP>:/tmp/
```

New:
```bash
mkdir -p ~/learnlytica-platform-complete-2/backend/storage
tar -xzf /tmp/project-evaluations-storage.tgz -C ~/learnlytica-platform-complete-2/backend/storage
```

## 6.3 Copy exact env/config files

Old:
```bash
scp /root/backups/$TS/backend.env ubuntu@<NEW_IP>:/tmp/backend.env
scp /root/backups/$TS/frontend.env ubuntu@<NEW_IP>:/tmp/frontend.env
scp /root/backups/$TS/ecosystem.config.cjs ubuntu@<NEW_IP>:/tmp/ecosystem.config.cjs
```

New:
```bash
cp /tmp/backend.env ~/learnlytica-platform-complete-2/backend/.env
cp /tmp/frontend.env ~/learnlytica-platform-complete-2/frontend/.env
cp /tmp/ecosystem.config.cjs ~/learnlytica-platform-complete-2/ecosystem.config.cjs
```

---

## 7. Build and Validate New Instance

On new instance:

```bash
cd ~/learnlytica-platform-complete-2/docker/execution-environments
docker build -t learnlytica/executor-node:latest -f Dockerfile.node .
docker build -t learnlytica/executor-python:latest -f Dockerfile.python .
docker build -t learnlytica/executor-java:latest -f Dockerfile.java .
docker build -t learnlytica/executor-playwright:latest -f Dockerfile.playwright .
docker build -t learnlytica/executor-dotnet:latest -f Dockerfile.dotnet .

cd ~/learnlytica-platform-complete-2/backend
npm install && npm run build

cd ~/learnlytica-platform-complete-2/frontend
npm install && npm run build

cd ~/learnlytica-platform-complete-2
pm2 start ecosystem.config.cjs
pm2 save
```

Health checks:

```bash
curl -s http://localhost:3666/health
curl -s http://localhost:3666/api/v1/analytics/executors/health -H "Authorization: Bearer <admin_or_client_token>"
```

Data checks:

```bash
sudo -u postgres psql -d learnlytica -P pager=off -c "
SELECT
  (SELECT count(*) FROM questions) AS questions,
  (SELECT count(*) FROM assessments) AS assessments,
  (SELECT count(*) FROM project_assessments) AS project_assessments,
  (SELECT count(*) FROM project_submissions) AS project_submissions,
  (SELECT count(*) FROM project_evaluation_runs) AS project_runs,
  (SELECT count(*) FROM users) AS users;
"
```

Counts should match old baseline (or only differ by live traffic created after initial backup).

---

## 8. Cutover (IP / DNS) with Minimal Risk

## Option A (simplest): Elastic IP re-association

Use one Elastic IP for production endpoint:

1. Keep old serving traffic.
2. Announce 2-5 minute maintenance window.
3. Pause writes briefly (recommended):
   - stop UI submissions OR put maintenance banner.
4. Take **final delta backup** (repeat Section 4.1 quickly).
5. Restore final delta to new instance.
6. Re-associate Elastic IP from old to new instance.
7. Validate externally via production URL/IP.
8. Keep old instance running but detached for rollback.

## Option B: DNS A record switch

If using domain A record:

1. Set DNS TTL to 60 seconds at least 24h before migration.
2. Perform final delta backup/restore.
3. Update A record to new public IP.
4. Validate.

## Option C: ALB target switch (best long term)

1. Add both instances as targets.
2. Mark new healthy.
3. Shift traffic to new and drain old.

---

## 9. Required IP/Config Changes

No app-level changes needed **if endpoint hostname/IP remains same** (Elastic IP or same domain).

Update only if public endpoint changes:

1. `backend/.env`
   - `CORS_ORIGIN=http://<new-host>,https://<new-host>,http://localhost:4666`
2. `frontend/.env`
   - `VITE_API_URL=http://<new-host>`
3. Nginx config (`/etc/nginx/sites-available/learnlytica`) if host rules are strict.

Then:
```bash
cd ~/learnlytica-platform-complete-2/frontend && npm run build
pm2 reload learnlytica-backend --update-env
pm2 reload learnlytica-frontend --update-env
sudo nginx -t && sudo systemctl reload nginx
```

---

## 10. Rollback Plan

If any critical issue after cutover:

1. Switch traffic back (re-associate Elastic IP or revert DNS/ALB target).
2. Keep new instance for debugging.
3. Use old instance as source of truth.
4. Re-run migration after fix.

Because old instance is untouched, rollback is fast.

---

## 11. Post-Cutover Hardening

1. Enable automated backups to S3 (DB + storage).
2. Add CloudWatch alarms:
   - CPU, memory, disk
   - `/health` failure
3. Enable PM2 cluster mode for backend (optional next step):
   - `instances: "max"`, `exec_mode: "cluster"`
   - use `pm2 reload` for zero-downtime app restarts
4. Plan DB decoupling to RDS for future horizontal scale.

---

## 12. One-Page Execution Summary

1. Baseline + backup old.
2. Build new larger instance.
3. Restore DB + storage + env/config.
4. Validate app + executor health + data counts.
5. Final delta backup/restore.
6. Switch IP/DNS.
7. Validate production.
8. Keep old instance for rollback window (24-72h).

