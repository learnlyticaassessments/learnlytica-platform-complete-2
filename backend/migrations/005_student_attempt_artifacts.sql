-- Migration: Student Attempt Artifacts / Drafts / Review
-- Description: Adds server-side draft storage, re-entry policy, and stored review payloads
-- Date: 2026-02-25

ALTER TABLE student_assessments
  ADD COLUMN IF NOT EXISTS reentry_policy VARCHAR(20) NOT NULL DEFAULT 'resume_allowed'
    CHECK (reentry_policy IN ('resume_allowed', 'single_session')),
  ADD COLUMN IF NOT EXISTS active_session_key VARCHAR(128),
  ADD COLUMN IF NOT EXISTS session_locked_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS draft_state JSONB,
  ADD COLUMN IF NOT EXISTS draft_updated_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS focus_events JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS review_payload JSONB,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_student_assessments_reentry_policy ON student_assessments(reentry_policy);
CREATE INDEX IF NOT EXISTS idx_student_assessments_draft_updated ON student_assessments(draft_updated_at);

COMMENT ON COLUMN student_assessments.reentry_policy IS 'resume_allowed or single_session';
COMMENT ON COLUMN student_assessments.active_session_key IS 'Session key used to enforce single-session attempts';
COMMENT ON COLUMN student_assessments.draft_state IS 'Server-side autosaved learner draft state';
COMMENT ON COLUMN student_assessments.review_payload IS 'Stored per-question submission review breakdown';

