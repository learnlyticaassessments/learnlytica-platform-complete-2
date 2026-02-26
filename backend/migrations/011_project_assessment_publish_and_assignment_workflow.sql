ALTER TABLE project_assessments
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS published_by UUID NULL;

ALTER TABLE project_submissions
  ADD COLUMN IF NOT EXISTS submission_kind VARCHAR(30) NOT NULL DEFAULT 'reference_validation',
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS assigned_by UUID NULL,
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS assignment_notes TEXT NULL;

UPDATE project_submissions
SET submission_kind = 'reference_validation'
WHERE submission_kind IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_submissions_kind_assessment
  ON project_submissions(project_assessment_id, submission_kind, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_submissions_kind_student
  ON project_submissions(student_id, submission_kind, submitted_at DESC);
