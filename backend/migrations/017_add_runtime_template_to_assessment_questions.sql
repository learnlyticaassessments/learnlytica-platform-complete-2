-- Migration: Add per-question runtime template binding
-- Description: Allows mixed-language assessments by overriding runtime template at question level
-- Date: 2026-02-28

ALTER TABLE assessment_questions
ADD COLUMN IF NOT EXISTS runtime_template_id UUID REFERENCES lab_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assessment_questions_runtime_template
ON assessment_questions(runtime_template_id);

COMMENT ON COLUMN assessment_questions.runtime_template_id IS
'Optional runtime template override for this specific question; falls back to assessments.lab_template_id when null';
