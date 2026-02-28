-- Migration: Create Curricula Mapping for Questions
-- Description: Production-grade curriculum taxonomy and question mappings
-- Date: 2026-02-28

CREATE TABLE IF NOT EXISTS curricula (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  slug VARCHAR(120) NOT NULL,
  name VARCHAR(180) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, slug)
);

CREATE TABLE IF NOT EXISTS question_curricula (
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  curriculum_id UUID NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  assigned_by UUID,
  PRIMARY KEY (question_id, curriculum_id)
);

CREATE INDEX IF NOT EXISTS idx_curricula_org_active ON curricula(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_curricula_org_name ON curricula(organization_id, name);
CREATE INDEX IF NOT EXISTS idx_question_curricula_org_curriculum ON question_curricula(organization_id, curriculum_id);
CREATE INDEX IF NOT EXISTS idx_question_curricula_question ON question_curricula(question_id);

-- Reuse global trigger function from questions migration
DROP TRIGGER IF EXISTS update_curricula_updated_at ON curricula;
CREATE TRIGGER update_curricula_updated_at
  BEFORE UPDATE ON curricula
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Backfill from existing tags/skills using conventions:
-- curriculum:<slug> OR curriculum-<slug>
WITH extracted AS (
  SELECT
    q.id AS question_id,
    q.organization_id,
    LOWER(TRIM(REGEXP_REPLACE(t, '^curriculum[:\-]', ''))) AS curriculum_slug
  FROM questions q
  CROSS JOIN LATERAL UNNEST(COALESCE(q.tags, '{}'::varchar[])) AS t
  WHERE LOWER(t) LIKE 'curriculum:%' OR LOWER(t) LIKE 'curriculum-%'
  UNION
  SELECT
    q.id AS question_id,
    q.organization_id,
    LOWER(TRIM(REGEXP_REPLACE(s, '^curriculum[:\-]', ''))) AS curriculum_slug
  FROM questions q
  CROSS JOIN LATERAL UNNEST(COALESCE(q.skills, '{}'::varchar[])) AS s
  WHERE LOWER(s) LIKE 'curriculum:%' OR LOWER(s) LIKE 'curriculum-%'
),
dedup AS (
  SELECT DISTINCT question_id, organization_id, curriculum_slug
  FROM extracted
  WHERE curriculum_slug <> ''
)
INSERT INTO curricula (organization_id, slug, name)
SELECT DISTINCT
  d.organization_id,
  d.curriculum_slug,
  INITCAP(REPLACE(d.curriculum_slug, '-', ' '))
FROM dedup d
ON CONFLICT (organization_id, slug) DO NOTHING;

INSERT INTO question_curricula (question_id, curriculum_id, organization_id)
SELECT
  d.question_id,
  c.id,
  d.organization_id
FROM (
  SELECT DISTINCT question_id, organization_id, curriculum_slug
  FROM (
    SELECT
      q.id AS question_id,
      q.organization_id,
      LOWER(TRIM(REGEXP_REPLACE(t, '^curriculum[:\-]', ''))) AS curriculum_slug
    FROM questions q
    CROSS JOIN LATERAL UNNEST(COALESCE(q.tags, '{}'::varchar[])) AS t
    WHERE LOWER(t) LIKE 'curriculum:%' OR LOWER(t) LIKE 'curriculum-%'
    UNION
    SELECT
      q.id AS question_id,
      q.organization_id,
      LOWER(TRIM(REGEXP_REPLACE(s, '^curriculum[:\-]', ''))) AS curriculum_slug
    FROM questions q
    CROSS JOIN LATERAL UNNEST(COALESCE(q.skills, '{}'::varchar[])) AS s
    WHERE LOWER(s) LIKE 'curriculum:%' OR LOWER(s) LIKE 'curriculum-%'
  ) z
  WHERE curriculum_slug <> ''
) d
JOIN curricula c
  ON c.organization_id = d.organization_id
 AND c.slug = d.curriculum_slug
ON CONFLICT (question_id, curriculum_id) DO NOTHING;

