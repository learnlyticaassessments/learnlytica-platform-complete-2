-- Update existing Phase 1 support ticket template with executable flow config
UPDATE project_evaluator_templates
SET
  description = 'Evaluates React/Vite frontend ZIP submissions using Playwright UI business-flow checks for Support Ticket Intake Portal.',
  config_json = jsonb_build_object(
    'phase', 1,
    'supportedSubmissionModes', jsonb_build_array('zip_upload'),
    'requiredServices', jsonb_build_array('frontend'),
    'expectedPort', 4173,
    'stackDetectionRules', jsonb_build_array('package.json', 'vite.config.*'),
    'runnerStatus', 'active',
    'phase1Flow', jsonb_build_object(
      'baseUrl', 'http://127.0.0.1:4173',
      'tests', jsonb_build_array(
        jsonb_build_object(
          'title', 'Loads ticket intake portal page',
          'steps', jsonb_build_array(
            jsonb_build_object('type', 'goto', 'url', 'http://127.0.0.1:4173'),
            jsonb_build_object('type', 'expect_heading', 'text', 'Support Ticket Intake Portal'),
            jsonb_build_object('type', 'expect_button', 'text', 'Create Ticket')
          )
        ),
        jsonb_build_object(
          'title', 'Creates ticket with valid data and shows success feedback',
          'steps', jsonb_build_array(
            jsonb_build_object('type', 'goto', 'url', 'http://127.0.0.1:4173'),
            jsonb_build_object('type', 'fill_label', 'label', 'Customer Name', 'value', 'Riya Sharma'),
            jsonb_build_object('type', 'fill_label', 'label', 'Customer Email', 'value', 'riya@example.com'),
            jsonb_build_object('type', 'select_label', 'label', 'Issue Category', 'value', 'technical'),
            jsonb_build_object('type', 'select_label', 'label', 'Priority', 'value', 'high'),
            jsonb_build_object('type', 'fill_label', 'label', 'Issue Description', 'value', 'Customer cannot access billing dashboard after login.'),
            jsonb_build_object('type', 'click_button', 'text', 'Create Ticket'),
            jsonb_build_object('type', 'expect_text', 'text', 'Ticket created successfully')
          )
        ),
        jsonb_build_object(
          'title', 'Appends created ticket to Recent Tickets table with expected fields',
          'steps', jsonb_build_array(
            jsonb_build_object('type', 'goto', 'url', 'http://127.0.0.1:4173'),
            jsonb_build_object('type', 'fill_label', 'label', 'Customer Name', 'value', 'Riya Sharma'),
            jsonb_build_object('type', 'fill_label', 'label', 'Customer Email', 'value', 'riya@example.com'),
            jsonb_build_object('type', 'select_label', 'label', 'Issue Category', 'value', 'technical'),
            jsonb_build_object('type', 'select_label', 'label', 'Priority', 'value', 'high'),
            jsonb_build_object('type', 'fill_label', 'label', 'Issue Description', 'value', 'Customer cannot access billing dashboard after login.'),
            jsonb_build_object('type', 'click_button', 'text', 'Create Ticket'),
            jsonb_build_object('type', 'expect_table_contains', 'text', 'TKT-0001'),
            jsonb_build_object('type', 'expect_table_contains', 'text', 'Riya Sharma'),
            jsonb_build_object('type', 'expect_table_contains', 'text', 'technical'),
            jsonb_build_object('type', 'expect_table_contains', 'text', 'high'),
            jsonb_build_object('type', 'expect_table_contains', 'text', 'Open')
          )
        )
      )
    )
  ),
  updated_at = NOW()
WHERE organization_id IS NULL AND slug = 'phase1-react-vite-playwright';

-- Expense Claim Submission Portal template
INSERT INTO project_evaluator_templates (
  organization_id, name, slug, description, evaluator_type, target_kind, framework_family, version, is_active, config_json
)
VALUES (
  NULL,
  'Phase 1 React/Vite UI Flow - Expense Claim Submission',
  'phase1-react-vite-expense-claim',
  'Evaluates React/Vite Expense Claim Submission Portal UI flow using Playwright.',
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
    'runnerStatus', 'active',
    'phase1Flow', jsonb_build_object(
      'baseUrl', 'http://127.0.0.1:4173',
      'tests', jsonb_build_array(
        jsonb_build_object(
          'title', 'Loads expense claim submission page',
          'steps', jsonb_build_array(
            jsonb_build_object('type', 'goto', 'url', 'http://127.0.0.1:4173'),
            jsonb_build_object('type', 'expect_heading', 'text', 'Expense Claim Submission Portal'),
            jsonb_build_object('type', 'expect_button', 'text', 'Submit Claim')
          )
        ),
        jsonb_build_object(
          'title', 'Submits a valid expense claim and shows confirmation',
          'steps', jsonb_build_array(
            jsonb_build_object('type', 'goto', 'url', 'http://127.0.0.1:4173'),
            jsonb_build_object('type', 'fill_label', 'label', 'Employee Name', 'value', 'Asha Verma'),
            jsonb_build_object('type', 'fill_label', 'label', 'Employee Email', 'value', 'asha@example.com'),
            jsonb_build_object('type', 'select_label', 'label', 'Category', 'value', 'travel'),
            jsonb_build_object('type', 'fill_label', 'label', 'Amount', 'value', '1250'),
            jsonb_build_object('type', 'fill_label', 'label', 'Date', 'value', '2026-02-25'),
            jsonb_build_object('type', 'fill_label', 'label', 'Expense Description', 'value', 'Flight booking for client visit'),
            jsonb_build_object('type', 'click_button', 'text', 'Submit Claim'),
            jsonb_build_object('type', 'expect_text', 'text', 'Expense claim submitted successfully')
          )
        ),
        jsonb_build_object(
          'title', 'Appends claim to Recent Claims table with pending status',
          'steps', jsonb_build_array(
            jsonb_build_object('type', 'goto', 'url', 'http://127.0.0.1:4173'),
            jsonb_build_object('type', 'fill_label', 'label', 'Employee Name', 'value', 'Asha Verma'),
            jsonb_build_object('type', 'fill_label', 'label', 'Employee Email', 'value', 'asha@example.com'),
            jsonb_build_object('type', 'select_label', 'label', 'Category', 'value', 'travel'),
            jsonb_build_object('type', 'fill_label', 'label', 'Amount', 'value', '1250'),
            jsonb_build_object('type', 'fill_label', 'label', 'Date', 'value', '2026-02-25'),
            jsonb_build_object('type', 'fill_label', 'label', 'Expense Description', 'value', 'Flight booking for client visit'),
            jsonb_build_object('type', 'click_button', 'text', 'Submit Claim'),
            jsonb_build_object('type', 'expect_table_contains', 'text', 'CLM-0001'),
            jsonb_build_object('type', 'expect_table_contains', 'text', 'Asha Verma'),
            jsonb_build_object('type', 'expect_table_contains', 'text', 'travel'),
            jsonb_build_object('type', 'expect_table_contains', 'text', 'Pending Review')
          )
        )
      )
    )
  )
)
ON CONFLICT DO NOTHING;

-- Visitor Check-In Desk template
INSERT INTO project_evaluator_templates (
  organization_id, name, slug, description, evaluator_type, target_kind, framework_family, version, is_active, config_json
)
VALUES (
  NULL,
  'Phase 1 React/Vite UI Flow - Visitor Check-In Desk',
  'phase1-react-vite-visitor-checkin',
  'Evaluates React/Vite Visitor Check-In Desk UI flow using Playwright.',
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
    'runnerStatus', 'active',
    'phase1Flow', jsonb_build_object(
      'baseUrl', 'http://127.0.0.1:4173',
      'tests', jsonb_build_array(
        jsonb_build_object(
          'title', 'Loads visitor check-in desk page',
          'steps', jsonb_build_array(
            jsonb_build_object('type', 'goto', 'url', 'http://127.0.0.1:4173'),
            jsonb_build_object('type', 'expect_heading', 'text', 'Visitor Check-In Desk'),
            jsonb_build_object('type', 'expect_button', 'text', 'Check In')
          )
        ),
        jsonb_build_object(
          'title', 'Checks in a visitor successfully',
          'steps', jsonb_build_array(
            jsonb_build_object('type', 'goto', 'url', 'http://127.0.0.1:4173'),
            jsonb_build_object('type', 'fill_label', 'label', 'Visitor Name', 'value', 'Rahul Nair'),
            jsonb_build_object('type', 'fill_label', 'label', 'Company', 'value', 'Acme Corp'),
            jsonb_build_object('type', 'fill_label', 'label', 'Host Name', 'value', 'Priya Menon'),
            jsonb_build_object('type', 'select_label', 'label', 'Purpose', 'value', 'meeting'),
            jsonb_build_object('type', 'click_button', 'text', 'Check In'),
            jsonb_build_object('type', 'expect_text', 'text', 'Visitor checked in successfully')
          )
        ),
        jsonb_build_object(
          'title', 'Shows checked-in visitor in Today’s Visitors table',
          'steps', jsonb_build_array(
            jsonb_build_object('type', 'goto', 'url', 'http://127.0.0.1:4173'),
            jsonb_build_object('type', 'fill_label', 'label', 'Visitor Name', 'value', 'Rahul Nair'),
            jsonb_build_object('type', 'fill_label', 'label', 'Company', 'value', 'Acme Corp'),
            jsonb_build_object('type', 'fill_label', 'label', 'Host Name', 'value', 'Priya Menon'),
            jsonb_build_object('type', 'select_label', 'label', 'Purpose', 'value', 'meeting'),
            jsonb_build_object('type', 'click_button', 'text', 'Check In'),
            jsonb_build_object('type', 'expect_table_contains', 'text', 'VIS-0001'),
            jsonb_build_object('type', 'expect_table_contains', 'text', 'Rahul Nair'),
            jsonb_build_object('type', 'expect_table_contains', 'text', 'Acme Corp'),
            jsonb_build_object('type', 'expect_table_contains', 'text', 'Checked In')
          )
        )
      )
    )
  )
)
ON CONFLICT DO NOTHING;
