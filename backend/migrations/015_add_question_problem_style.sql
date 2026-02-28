-- Migration: Add problem style + technical focus to questions
-- Description: Production-grade classification for question framing style and focus area
-- Date: 2026-02-28

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS problem_style VARCHAR(30),
  ADD COLUMN IF NOT EXISTS technical_focus VARCHAR(100);

UPDATE questions
SET problem_style = 'implementation'
WHERE problem_style IS NULL;

ALTER TABLE questions
  ALTER COLUMN problem_style SET DEFAULT 'implementation';

ALTER TABLE questions
  ALTER COLUMN problem_style SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_questions_problem_style'
      AND conrelid = 'questions'::regclass
  ) THEN
    ALTER TABLE questions
      ADD CONSTRAINT chk_questions_problem_style
      CHECK (problem_style IN (
        'algorithmic',
        'scenario_driven',
        'debugging',
        'implementation',
        'optimization',
        'design_tradeoff'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_questions_problem_style ON questions(problem_style);
CREATE INDEX IF NOT EXISTS idx_questions_technical_focus ON questions(technical_focus);
CREATE INDEX IF NOT EXISTS idx_questions_org_problem_style ON questions(organization_id, problem_style);
