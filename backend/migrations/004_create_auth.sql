-- Migration: Create Organizations and Users (Auth)
-- Description: Adds production-grade baseline authentication tables + demo users

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- ORGANIZATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- ============================================================================
-- USERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'client', 'student')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (email),
    UNIQUE (organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_organizations_updated_at'
    ) THEN
        CREATE TRIGGER update_organizations_updated_at
            BEFORE UPDATE ON organizations
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at'
    ) THEN
        CREATE TRIGGER update_users_updated_at
            BEFORE UPDATE ON users
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- DEMO SEED DATA (idempotent)
-- Passwords:
--   admin@learnlytica.local   / Admin@123
--   client@learnlytica.local  / Client@123
--   student@learnlytica.local / Student@123
-- ============================================================================

INSERT INTO organizations (id, name, slug)
VALUES (
    '22222222-2222-2222-2222-222222222222'::uuid,
    'Learnlytica Demo Org',
    'learnlytica-demo'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO users (id, organization_id, email, full_name, password_hash, role)
VALUES
(
    '11111111-1111-1111-1111-111111111111'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    'admin@learnlytica.local',
    'Demo Admin',
    crypt('Admin@123', gen_salt('bf', 10)),
    'admin'
),
(
    '33333333-3333-3333-3333-333333333333'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    'client@learnlytica.local',
    'Demo Client',
    crypt('Client@123', gen_salt('bf', 10)),
    'client'
),
(
    '44444444-4444-4444-4444-444444444444'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    'student@learnlytica.local',
    'Demo Student',
    crypt('Student@123', gen_salt('bf', 10)),
    'student'
)
ON CONFLICT (email) DO NOTHING;
