-- Migration: Reset demo auth users to known credentials (idempotent)
-- Purpose: Restore local/demo login credentials after password resets/deactivation during testing

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure demo org exists
INSERT INTO organizations (id, name, slug, is_active)
VALUES (
  '22222222-2222-2222-2222-222222222222'::uuid,
  'Learnlytica Demo Org',
  'learnlytica-demo',
  TRUE
)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  is_active = TRUE,
  updated_at = NOW();

-- Force-reset demo users (password + active flag), preserving stable IDs and roles
INSERT INTO users (id, organization_id, email, full_name, password_hash, role, is_active)
VALUES
(
  '11111111-1111-1111-1111-111111111111'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  'admin@learnlytica.local',
  'Demo Admin',
  crypt('Admin@123', gen_salt('bf', 10)),
  'admin',
  TRUE
),
(
  '33333333-3333-3333-3333-333333333333'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  'client@learnlytica.local',
  'Demo Client',
  crypt('Client@123', gen_salt('bf', 10)),
  'client',
  TRUE
),
(
  '44444444-4444-4444-4444-444444444444'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  'student@learnlytica.local',
  'Demo Student',
  crypt('Student@123', gen_salt('bf', 10)),
  'student',
  TRUE
)
ON CONFLICT (email) DO UPDATE
SET
  organization_id = EXCLUDED.organization_id,
  full_name = EXCLUDED.full_name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  is_active = TRUE,
  updated_at = NOW();

