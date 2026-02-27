-- Seed a Phase 2 template that validates UI flow + API contract checks
INSERT INTO project_evaluator_templates (
  organization_id, name, slug, description, evaluator_type, target_kind, framework_family, version, is_active, config_json
)
VALUES (
  NULL,
  'Phase 2 React/Vite UI + API Contract - Support Ticket Portal',
  'phase2-react-vite-support-ticket-ui-api',
  'Evaluates React/Vite Support Ticket Intake project with Playwright UI flow and API contract checks.',
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
      )
    )
  )
)
ON CONFLICT DO NOTHING;
