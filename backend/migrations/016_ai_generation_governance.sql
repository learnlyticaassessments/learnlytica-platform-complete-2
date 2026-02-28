-- Migration: AI generation governance (audit + idempotency + manual review queue)
-- Date: 2026-02-28

CREATE TABLE IF NOT EXISTS ai_generation_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  user_role VARCHAR(30),
  request_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  capability_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  pipeline_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  generation_meta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  outcome VARCHAR(20) NOT NULL DEFAULT 'generated',
  error_type VARCHAR(40),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_audit_org_created
  ON ai_generation_audit(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_generation_audit_user_created
  ON ai_generation_audit(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_generation_idempotency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  idempotency_key VARCHAR(120) NOT NULL,
  status_code INT NOT NULL DEFAULT 200,
  response_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_ai_generation_idempotency UNIQUE (organization_id, user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_idempotency_created
  ON ai_generation_idempotency(created_at DESC);

CREATE TABLE IF NOT EXISTS ai_generation_manual_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  requested_by UUID NOT NULL,
  capability_state VARCHAR(20) NOT NULL,
  reason TEXT NOT NULL,
  request_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  capability_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_manual_reviews_org_created
  ON ai_generation_manual_reviews(organization_id, created_at DESC);
