CREATE TABLE IF NOT EXISTS project_evaluator_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  evaluator_type VARCHAR(50) NOT NULL DEFAULT 'playwright_ui_flow',
  target_kind VARCHAR(50) NOT NULL DEFAULT 'frontend_zip',
  framework_family VARCHAR(50) NOT NULL DEFAULT 'react_vite',
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_evaluator_templates_org_slug
ON project_evaluator_templates (COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);

CREATE TABLE IF NOT EXISTS project_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  evaluator_template_id UUID NOT NULL REFERENCES project_evaluator_templates(id) ON DELETE RESTRICT,
  submission_mode VARCHAR(30) NOT NULL DEFAULT 'zip_upload',
  framework_scope VARCHAR(50) NOT NULL DEFAULT 'react_vite',
  time_limit_minutes INTEGER NULL,
  due_date TIMESTAMPTZ NULL,
  allow_review BOOLEAN NOT NULL DEFAULT TRUE,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_assessments_org ON project_assessments(organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS project_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_assessment_id UUID NOT NULL REFERENCES project_assessments(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  student_id UUID NOT NULL,
  assigned_batch_id UUID NULL REFERENCES batches(id) ON DELETE SET NULL,
  source_type VARCHAR(30) NOT NULL DEFAULT 'zip_upload',
  source_ref VARCHAR(1024) NULL,
  repo_url VARCHAR(1024) NULL,
  repo_branch VARCHAR(255) NULL,
  repo_commit_sha VARCHAR(100) NULL,
  detected_framework VARCHAR(100) NULL,
  detected_backend VARCHAR(100) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latest_run_id UUID NULL,
  latest_score NUMERIC(6,2) NULL,
  latest_summary_json JSONB NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_project_submissions_assessment ON project_submissions(project_assessment_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_submissions_student ON project_submissions(student_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS project_evaluation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_submission_id UUID NOT NULL REFERENCES project_submissions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'queued',
  trigger_type VARCHAR(30) NOT NULL DEFAULT 'manual',
  runner_kind VARCHAR(50) NOT NULL DEFAULT 'phase1_placeholder',
  framework_detected VARCHAR(100) NULL,
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  score NUMERIC(6,2) NULL,
  max_score NUMERIC(6,2) NULL,
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_json JSONB NULL,
  logs_text TEXT NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_runs_submission ON project_evaluation_runs(project_submission_id, created_at DESC);

ALTER TABLE project_submissions
  ADD CONSTRAINT fk_project_submissions_latest_run
  FOREIGN KEY (latest_run_id) REFERENCES project_evaluation_runs(id) ON DELETE SET NULL;

-- Seed a default Phase 1 Playwright evaluator template for org-independent use
INSERT INTO project_evaluator_templates (
  organization_id, name, slug, description, evaluator_type, target_kind, framework_family, version, is_active, config_json
)
VALUES (
  NULL,
  'Phase 1 React/Vite UI Flow (Playwright)',
  'phase1-react-vite-playwright',
  'Evaluates React/Vite frontend ZIP submissions using Playwright UI business-flow checks (Phase 1 scaffold).',
  'playwright_ui_flow',
  'frontend_zip',
  'react_vite',
  1,
  TRUE,
  jsonb_build_object(
    'phase', 1,
    'supportedSubmissionModes', jsonb_build_array('zip_upload'),
    'requiredServices', jsonb_build_array('frontend'),
    'expectedPort', 4173,
    'stackDetectionRules', jsonb_build_array('package.json', 'vite.config.*'),
    'runnerStatus', 'scaffold'
  )
)
ON CONFLICT DO NOTHING;
