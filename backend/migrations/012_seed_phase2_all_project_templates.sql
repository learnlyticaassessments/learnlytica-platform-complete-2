-- Ensure all planned Phase 2 templates (UI + API) exist for the 3 demo projects.
-- Safe to run multiple times due to ON CONFLICT DO NOTHING.

-- 1) Support Ticket Intake Portal (Phase 2)
INSERT INTO project_evaluator_templates (
  organization_id, name, slug, description, evaluator_type, target_kind, framework_family, version, is_active, config_json
)
VALUES (
  NULL,
  'Phase 2 React/Vite UI + API Contract - Support Ticket Portal',
  'phase2-react-vite-support-ticket-ui-api',
  'Evaluates Support Ticket Intake Portal using Playwright UI flow + API contract checks.',
  'playwright_ui_flow',
  'frontend_zip',
  'react_vite',
  2,
  TRUE,
  jsonb_build_object(
    'phase', 2,
    'supportedSubmissionModes', jsonb_build_array('zip_upload'),
    'requiredServices', jsonb_build_array('frontend', 'api'),
    'expectedPort', 4173,
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
    ),
    'phase2ApiBaseUrl', 'http://127.0.0.1:4173',
    'phase2ApiChecks', jsonb_build_array(
      jsonb_build_object(
        'title', 'Health endpoint responds',
        'method', 'GET',
        'path', '/api/health',
        'expectedStatus', 200,
        'expectBodyContains', jsonb_build_array('ok')
      ),
      jsonb_build_object(
        'title', 'Create ticket endpoint responds',
        'method', 'POST',
        'path', '/api/tickets',
        'expectedStatus', 201,
        'expectBodyContains', jsonb_build_array('ticketId')
      ),
      jsonb_build_object(
        'title', 'List tickets endpoint responds',
        'method', 'GET',
        'path', '/api/tickets',
        'expectedStatus', 200,
        'expectBodyContains', jsonb_build_array('tickets')
      )
    )
  )
)
ON CONFLICT DO NOTHING;

-- 2) Expense Claim Portal (Phase 2)
INSERT INTO project_evaluator_templates (
  organization_id, name, slug, description, evaluator_type, target_kind, framework_family, version, is_active, config_json
)
VALUES (
  NULL,
  'Phase 2 React/Vite UI + API Contract - Expense Claim Portal',
  'phase2-react-vite-expense-claim-ui-api',
  'Evaluates Expense Claim Submission Portal using Playwright UI flow + API contract checks.',
  'playwright_ui_flow',
  'frontend_zip',
  'react_vite',
  2,
  TRUE,
  jsonb_build_object(
    'phase', 2,
    'supportedSubmissionModes', jsonb_build_array('zip_upload'),
    'requiredServices', jsonb_build_array('frontend', 'api'),
    'expectedPort', 4173,
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
    ),
    'phase2ApiBaseUrl', 'http://127.0.0.1:4173',
    'phase2ApiChecks', jsonb_build_array(
      jsonb_build_object(
        'title', 'Health endpoint responds',
        'method', 'GET',
        'path', '/api/health',
        'expectedStatus', 200,
        'expectBodyContains', jsonb_build_array('ok')
      ),
      jsonb_build_object(
        'title', 'Create claim endpoint responds',
        'method', 'POST',
        'path', '/api/claims',
        'expectedStatus', 201,
        'expectBodyContains', jsonb_build_array('claimId')
      ),
      jsonb_build_object(
        'title', 'List claims endpoint responds',
        'method', 'GET',
        'path', '/api/claims',
        'expectedStatus', 200,
        'expectBodyContains', jsonb_build_array('claims')
      )
    )
  )
)
ON CONFLICT DO NOTHING;

-- 3) Visitor Check-In Desk (Phase 2)
INSERT INTO project_evaluator_templates (
  organization_id, name, slug, description, evaluator_type, target_kind, framework_family, version, is_active, config_json
)
VALUES (
  NULL,
  'Phase 2 React/Vite UI + API Contract - Visitor Check-In Desk',
  'phase2-react-vite-visitor-checkin-ui-api',
  'Evaluates Visitor Check-In Desk using Playwright UI flow + API contract checks.',
  'playwright_ui_flow',
  'frontend_zip',
  'react_vite',
  2,
  TRUE,
  jsonb_build_object(
    'phase', 2,
    'supportedSubmissionModes', jsonb_build_array('zip_upload'),
    'requiredServices', jsonb_build_array('frontend', 'api'),
    'expectedPort', 4173,
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
    ),
    'phase2ApiBaseUrl', 'http://127.0.0.1:4173',
    'phase2ApiChecks', jsonb_build_array(
      jsonb_build_object(
        'title', 'Health endpoint responds',
        'method', 'GET',
        'path', '/api/health',
        'expectedStatus', 200,
        'expectBodyContains', jsonb_build_array('ok')
      ),
      jsonb_build_object(
        'title', 'Visitor check-in endpoint responds',
        'method', 'POST',
        'path', '/api/visitors/check-in',
        'expectedStatus', 201,
        'expectBodyContains', jsonb_build_array('visitorId')
      ),
      jsonb_build_object(
        'title', 'Today visitors endpoint responds',
        'method', 'GET',
        'path', '/api/visitors/today',
        'expectedStatus', 200,
        'expectBodyContains', jsonb_build_array('visitors')
      )
    )
  )
)
ON CONFLICT DO NOTHING;
