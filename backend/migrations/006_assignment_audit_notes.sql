-- Migration: Assignment Audit Notes
-- Description: Adds client review/coaching notes fields to student assignments
-- Date: 2026-02-25

ALTER TABLE student_assessments
  ADD COLUMN IF NOT EXISTS client_audit_notes TEXT,
  ADD COLUMN IF NOT EXISTS coaching_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_student_assessments_reviewed_at ON student_assessments(reviewed_at);

COMMENT ON COLUMN student_assessments.client_audit_notes IS 'Internal evaluator notes for client/admin review';
COMMENT ON COLUMN student_assessments.coaching_notes IS 'Learner coaching notes and recommendations';
COMMENT ON COLUMN student_assessments.reviewed_by IS 'User who last updated audit/coaching notes';
COMMENT ON COLUMN student_assessments.reviewed_at IS 'Timestamp of last audit/coaching note update';
