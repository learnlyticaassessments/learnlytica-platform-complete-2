-- Normalize template phase model:
-- Phase 1 = ui_flow
-- Phase 2 = api_contract
-- Phase 3 = ui_api_integration

-- Mark existing Phase 1 templates explicitly as Phase 1 UI flow.
UPDATE project_evaluator_templates
SET
  config_json = (config_json - 'evaluationMode') || jsonb_build_object('phase', 1, 'evaluationMode', 'ui_flow'),
  updated_at = NOW()
WHERE organization_id IS NULL
  AND slug IN (
    'phase1-react-vite-playwright',
    'phase1-react-vite-expense-claim',
    'phase1-react-vite-visitor-checkin'
  );

-- Reclassify existing "phase2-*-ui-api" templates to Phase 3 integrated.
UPDATE project_evaluator_templates
SET
  config_json = (config_json - 'evaluationMode') || jsonb_build_object('phase', 3, 'evaluationMode', 'ui_api_integration'),
  updated_at = NOW()
WHERE organization_id IS NULL
  AND slug IN (
    'phase2-react-vite-support-ticket-ui-api',
    'phase2-react-vite-expense-claim-ui-api',
    'phase2-react-vite-visitor-checkin-ui-api'
  );

-- Seed Phase 2 API-only templates for all 3 projects.
INSERT INTO project_evaluator_templates (
  organization_id, name, slug, description, evaluator_type, target_kind, framework_family, version, is_active, config_json
)
VALUES (
  NULL,
  'Phase 2 React/Vite API Contract - Support Ticket Portal',
  'phase2-react-vite-support-ticket-api',
  'Validates backend/API contract for Support Ticket Intake Portal.',
  'playwright_ui_flow',
  'frontend_zip',
  'react_vite',
  2,
  TRUE,
  jsonb_build_object(
    'phase', 2,
    'evaluationMode', 'api_contract',
    'supportedSubmissionModes', jsonb_build_array('zip_upload'),
    'requiredServices', jsonb_build_array('frontend', 'api'),
    'expectedPort', 4173,
    'runnerStatus', 'active',
    'phase2ApiBaseUrl', 'http://127.0.0.1:4173',
    'phase2ApiChecks', jsonb_build_array(
      jsonb_build_object('title', 'Health endpoint responds', 'method', 'GET', 'path', '/api/health', 'expectedStatus', 200, 'expectBodyContains', jsonb_build_array('ok')),
      jsonb_build_object('title', 'Create ticket endpoint responds', 'method', 'POST', 'path', '/api/tickets', 'expectedStatus', 201, 'expectBodyContains', jsonb_build_array('ticketId')),
      jsonb_build_object('title', 'List tickets endpoint responds', 'method', 'GET', 'path', '/api/tickets', 'expectedStatus', 200, 'expectBodyContains', jsonb_build_array('tickets'))
    )
  )
),
(
  NULL,
  'Phase 2 React/Vite API Contract - Expense Claim Portal',
  'phase2-react-vite-expense-claim-api',
  'Validates backend/API contract for Expense Claim Submission Portal.',
  'playwright_ui_flow',
  'frontend_zip',
  'react_vite',
  2,
  TRUE,
  jsonb_build_object(
    'phase', 2,
    'evaluationMode', 'api_contract',
    'supportedSubmissionModes', jsonb_build_array('zip_upload'),
    'requiredServices', jsonb_build_array('frontend', 'api'),
    'expectedPort', 4173,
    'runnerStatus', 'active',
    'phase2ApiBaseUrl', 'http://127.0.0.1:4173',
    'phase2ApiChecks', jsonb_build_array(
      jsonb_build_object('title', 'Health endpoint responds', 'method', 'GET', 'path', '/api/health', 'expectedStatus', 200, 'expectBodyContains', jsonb_build_array('ok')),
      jsonb_build_object('title', 'Create claim endpoint responds', 'method', 'POST', 'path', '/api/claims', 'expectedStatus', 201, 'expectBodyContains', jsonb_build_array('claimId')),
      jsonb_build_object('title', 'List claims endpoint responds', 'method', 'GET', 'path', '/api/claims', 'expectedStatus', 200, 'expectBodyContains', jsonb_build_array('claims'))
    )
  )
),
(
  NULL,
  'Phase 2 React/Vite API Contract - Visitor Check-In Desk',
  'phase2-react-vite-visitor-checkin-api',
  'Validates backend/API contract for Visitor Check-In Desk.',
  'playwright_ui_flow',
  'frontend_zip',
  'react_vite',
  2,
  TRUE,
  jsonb_build_object(
    'phase', 2,
    'evaluationMode', 'api_contract',
    'supportedSubmissionModes', jsonb_build_array('zip_upload'),
    'requiredServices', jsonb_build_array('frontend', 'api'),
    'expectedPort', 4173,
    'runnerStatus', 'active',
    'phase2ApiBaseUrl', 'http://127.0.0.1:4173',
    'phase2ApiChecks', jsonb_build_array(
      jsonb_build_object('title', 'Health endpoint responds', 'method', 'GET', 'path', '/api/health', 'expectedStatus', 200, 'expectBodyContains', jsonb_build_array('ok')),
      jsonb_build_object('title', 'Visitor check-in endpoint responds', 'method', 'POST', 'path', '/api/visitors/check-in', 'expectedStatus', 201, 'expectBodyContains', jsonb_build_array('visitorId')),
      jsonb_build_object('title', 'Today visitors endpoint responds', 'method', 'GET', 'path', '/api/visitors/today', 'expectedStatus', 200, 'expectBodyContains', jsonb_build_array('visitors'))
    )
  )
)
ON CONFLICT DO NOTHING;

-- Add default learner briefs to seeded templates so assessment authoring can auto-fill.
UPDATE project_evaluator_templates
SET
  config_json = config_json || jsonb_build_object(
    'defaultBrief', jsonb_build_object(
      'businessContext', 'Customer operations team needs a fast, reliable support ticket intake experience.',
      'taskSummary', 'Build a ticket intake workflow with clear validation, success feedback, and a recent ticket list.',
      'expectedFlow', jsonb_build_array(
        'Open portal page',
        'Fill customer details and issue information',
        'Submit ticket',
        'Verify success feedback and new row in Recent Tickets'
      ),
      'requirements', jsonb_build_array(
        'Form labels must be clearly visible and match expected inputs',
        'Required field validation should block invalid submits',
        'Recent ticket list must show new entries immediately'
      ),
      'acceptanceCriteria', jsonb_build_array(
        'Ticket can be created with valid input',
        'UI reflects category/priority/status correctly',
        'Submission flow is clear on desktop and mobile'
      ),
      'submissionInstructions', jsonb_build_array(
        'Submit source ZIP without node_modules/build artifacts',
        'Ensure npm run dev starts successfully'
      ),
      'evaluationNotes', jsonb_build_array(
        'Phase 1 validates UI flow only',
        'Phase 2 validates API endpoints',
        'Phase 3 validates both UI and API in one run'
      ),
      'stretchGoals', jsonb_build_array(
        'Add filtering by status/priority',
        'Persist records in localStorage'
      )
    )
  ),
  updated_at = NOW()
WHERE organization_id IS NULL
  AND slug LIKE 'phase%react-vite-support-ticket%';

UPDATE project_evaluator_templates
SET
  config_json = config_json || jsonb_build_object(
    'defaultBrief', jsonb_build_object(
      'businessContext', 'Finance operations needs accurate and auditable employee expense intake.',
      'taskSummary', 'Build an expense claim submission workflow with validation and recent claims tracking.',
      'expectedFlow', jsonb_build_array(
        'Open expense claim page',
        'Fill employee, category, amount, date, and description',
        'Submit claim',
        'Verify success feedback and claim appears in Recent Claims'
      ),
      'requirements', jsonb_build_array(
        'Amount/date validation required',
        'Claim status should default to Pending Review',
        'Recent claims table should update immediately'
      ),
      'acceptanceCriteria', jsonb_build_array(
        'Valid claim submission works end-to-end',
        'Invalid data is blocked with clear messages',
        'Table shows correct claim details and status'
      ),
      'submissionInstructions', jsonb_build_array(
        'Submit source ZIP without node_modules/build artifacts',
        'Ensure npm run dev starts successfully'
      ),
      'evaluationNotes', jsonb_build_array(
        'Phase 2/3 API checks include /api/claims endpoints'
      ),
      'stretchGoals', jsonb_build_array(
        'Add claim filters and totals',
        'Add edit/cancel actions'
      )
    )
  ),
  updated_at = NOW()
WHERE organization_id IS NULL
  AND slug LIKE 'phase%react-vite-expense-claim%';

UPDATE project_evaluator_templates
SET
  config_json = config_json || jsonb_build_object(
    'defaultBrief', jsonb_build_object(
      'businessContext', 'Front-desk operations need efficient visitor intake and live visibility of checked-in guests.',
      'taskSummary', 'Build visitor check-in workflow with required validation and today visitors tracking.',
      'expectedFlow', jsonb_build_array(
        'Open visitor check-in page',
        'Fill visitor/company/host/purpose fields',
        'Submit check-in',
        'Verify success feedback and new row in Today’s Visitors'
      ),
      'requirements', jsonb_build_array(
        'All visitor fields required',
        'Checked-in status must be shown',
        'Visitors table updates immediately'
      ),
      'acceptanceCriteria', jsonb_build_array(
        'Visitor can be checked in with valid data',
        'Validation blocks incomplete form',
        'Table shows expected visitor attributes'
      ),
      'submissionInstructions', jsonb_build_array(
        'Submit source ZIP without node_modules/build artifacts',
        'Ensure npm run dev starts successfully'
      ),
      'evaluationNotes', jsonb_build_array(
        'Phase 2/3 API checks include /api/visitors/check-in and /api/visitors/today'
      ),
      'stretchGoals', jsonb_build_array(
        'Add check-out flow',
        'Add host-wise filtering'
      )
    )
  ),
  updated_at = NOW()
WHERE organization_id IS NULL
  AND slug LIKE 'phase%react-vite-visitor-checkin%';
