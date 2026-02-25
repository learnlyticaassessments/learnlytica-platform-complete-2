-- Migration: Create Batches and Batch Memberships
-- Description: Adds cohort/group management for learners and batch attribution for assignments

CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    type VARCHAR(30) NOT NULL DEFAULT 'custom'
        CHECK (type IN ('cohort', 'bootcamp', 'campus', 'team', 'hiring', 'custom')),
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'archived')),
    start_date TIMESTAMP NULL,
    end_date TIMESTAMP NULL,
    metadata_json JSONB NULL,
    created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, name),
    UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_batches_org ON batches(organization_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_type ON batches(type);

CREATE TABLE IF NOT EXISTS batch_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
    left_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (batch_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_batch_memberships_batch ON batch_memberships(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_memberships_student ON batch_memberships(student_id);
CREATE INDEX IF NOT EXISTS idx_batch_memberships_status ON batch_memberships(status);

ALTER TABLE student_assessments
  ADD COLUMN IF NOT EXISTS assigned_batch_id UUID NULL REFERENCES batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_student_assessments_assigned_batch ON student_assessments(assigned_batch_id);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_batches_updated_at') THEN
            CREATE TRIGGER update_batches_updated_at
                BEFORE UPDATE ON batches
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        END IF;
    END IF;
END $$;

COMMENT ON TABLE batches IS 'Client-managed learner groups/cohorts for assignment and analytics';
COMMENT ON TABLE batch_memberships IS 'Membership mapping between learner users and batches';
COMMENT ON COLUMN student_assessments.assigned_batch_id IS 'Batch attribution for assignments created via batch workflows';
