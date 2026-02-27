# Multi-Org Readiness Checklist

## Goal
Support multiple client organizations safely on one platform instance with strict tenant isolation, predictable operations, and auditable access control.

## Current Status Snapshot
- Core backend services are already mostly org-scoped (`organization_id` filters are widely used).
- Auth context carries `organizationId` in `req.user`.
- Analytics/project/batch/learner modules are largely tenant-aware.
- Remaining work is governance, isolation testing, org lifecycle, and hardening.

---

## 1) Tenant Model and Data Ownership
1. Make `organizations` the parent tenant object for all business data.
2. Ensure every tenant-owned table has `organization_id NOT NULL`.
3. Add/verify FK from tenant-owned tables to `organizations(id)`.
4. Add composite indexes with `organization_id` on hot queries.
5. Define which tables are global (shared templates, feature flags) vs org-owned.

## 2) Auth and Identity
1. Ensure login token always embeds `organizationId`, `role`, `userId`.
2. Reject requests if token org and DB row org mismatch.
3. Add token invalidation path for user moved to another org.
4. Prevent cross-org email collision surprises (policy: global unique vs org-unique).
5. Add org status checks (`active`, `suspended`) at auth middleware level.

## 3) API Isolation Enforcement
1. Audit every controller/service for `organization_id = ctx.organizationId`.
2. For update/delete paths, verify both ID and org in same query.
3. For joins, ensure tenant filter is applied on the correct base table.
4. Block indirect leakage via linked IDs from other orgs.
5. Standardize error text (`not found`) to avoid tenant enumeration.

## 4) RBAC by Tenant
1. Keep roles tenant-scoped (`admin`, `client`, `student` within org).
2. Add optional `platform_super_admin` outside tenant scope (if needed).
3. Enforce role + org checks for publish/delete/high-risk actions.
4. Ensure student routes only operate on their own org and own records.
5. Add role matrix doc for each route.

## 5) Organization Lifecycle
1. Add org creation API + UI (name, slug, status, limits).
2. Add org bootstrap flow: first client-admin user.
3. Add org settings page (branding, quotas, policy toggles).
4. Add org suspend/reactivate controls.
5. Add org archival/deletion runbook.

## 6) Quotas and Capacity by Org
1. Add per-org limits: active evaluator runs, queue depth, storage cap.
2. Add per-org AI generation quotas.
3. Add soft/hard threshold enforcement with clear user messages.
4. Add org-specific capacity metrics in System Monitor.
5. Add throttling for noisy tenants.

## 7) Data Migration and Backfill
1. Verify old rows with null org fields; backfill safely.
2. Add migration guard scripts to detect orphan tenant rows.
3. Add pre-deploy checks: row counts by org across key tables.
4. Add post-migration validation SQL scripts.
5. Keep rollback scripts for tenant migrations.

## 8) Analytics and Reporting
1. Ensure all analytics endpoints are org-scoped.
2. Add tenant-safe aggregation tests (no cross-org counting).
3. Add org filter smoke checks for exports.
4. Add “debug analytics” endpoint output including org id.
5. Add alerting on suspicious cross-org query results.

## 9) Evaluator Isolation
1. Tag each run with org id in logs and metadata.
2. Ensure artifacts are stored under org-aware pathing or guarded by DB ownership.
3. Enforce cleanup jobs per org retention policy.
4. Ensure ZIP delete endpoints validate org ownership.
5. Add per-org evaluator queue visibility.

## 10) Security Hardening
1. Add tenant-aware audit logs for create/update/delete.
2. Redact secrets from stored logs before AI analysis.
3. Add signed artifact URLs with short expiry and org checks.
4. Validate all upload paths against traversal and over-size attacks.
5. Add security tests for cross-org access attempts.

## 11) Testing Strategy (Must-Have)
1. Integration tests: org A user cannot read org B data.
2. Integration tests: org A cannot mutate org B rows.
3. Auth tests: token org mismatch rejected.
4. Analytics tests: counts isolated per org.
5. End-to-end test: full flow in org A and org B simultaneously.

## 12) Operational Readiness
1. Add org-level dashboards (usage, evaluator load, errors).
2. Add org-level support tooling (find runs, resync assignments).
3. Backup/restore drills with multi-org sample data.
4. Add incident runbook for tenant isolation violations.
5. Document on-call triage for org-specific outages.

---

## Fast Audit Commands (Run on server)
1. Find services/controllers using org filters:
```bash
rg -n "organization_id|organizationId|where\\(.*organization" backend/src -g"*.ts"
```
2. Find likely high-risk DB operations:
```bash
rg -n "selectFrom\\(|updateTable\\(|deleteFrom\\(" backend/src/services -g"*.ts"
```
3. Verify system-monitor route exists after deploy:
```bash
rg -n "system-monitor" backend/src/routes/analytics.routes.ts backend/dist/src/routes/analytics.routes.js
```

---

## Go-Live Criteria for Multi-Org
1. All tenant isolation integration tests pass.
2. No endpoint returns cross-org data in audit test suite.
3. Org onboarding flow works end-to-end.
4. Per-org quotas and throttling enforced.
5. Multi-org load test passes without data leakage.

---

## Recommended Implementation Order
1. Isolation tests + route audit
2. Org lifecycle APIs/UI
3. Quotas and enforcement
4. Observability and audit logs
5. Security and incident runbooks

