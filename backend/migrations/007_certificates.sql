-- Migration: Certificates
-- Description: Certificate issuance and verification tracking
-- Date: 2026-02-25

CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  student_assessment_id UUID NOT NULL REFERENCES student_assessments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  issued_by UUID NOT NULL,
  certificate_number VARCHAR(100) NOT NULL UNIQUE,
  verification_code VARCHAR(100) NOT NULL UNIQUE,
  template_name VARCHAR(200) NOT NULL DEFAULT 'completion',
  title VARCHAR(500) NOT NULL,
  recipient_name VARCHAR(300) NOT NULL,
  issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
  score_snapshot DECIMAL(5,2),
  points_earned_snapshot INTEGER,
  total_points_snapshot INTEGER,
  metadata_json JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'revoked')),
  revoked_at TIMESTAMP,
  revoked_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(student_assessment_id)
);

CREATE INDEX IF NOT EXISTS idx_certificates_org ON certificates(organization_id);
CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_assessment ON certificates(assessment_id);
CREATE INDEX IF NOT EXISTS idx_certificates_issued_at ON certificates(issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status);

CREATE TRIGGER update_certificates_updated_at
  BEFORE UPDATE ON certificates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE certificates IS 'Issued learner certificates with verification codes';
