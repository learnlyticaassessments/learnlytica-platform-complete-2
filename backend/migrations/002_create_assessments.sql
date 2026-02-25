-- Migration: Create Assessments Tables
-- Description: Complete schema for assessment creation and management
-- Author: Learnlytica Platform
-- Date: 2024-02-25

-- ============================================================================
-- ASSESSMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    
    -- Basic Information
    title VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- Lab Environment (ADMIN-LOCKED)
    lab_template_id UUID NOT NULL,
    -- This field is set once by admin and cannot be changed
    -- Ensures consistency of testing environment
    
    -- Assessment Configuration
    time_limit INTEGER NOT NULL CHECK (time_limit > 0),  -- Minutes
    passing_score INTEGER NOT NULL CHECK (passing_score >= 0 AND passing_score <= 100),
    max_attempts INTEGER DEFAULT 1 CHECK (max_attempts > 0),
    
    -- Behavior Settings
    shuffle_questions BOOLEAN DEFAULT FALSE,
    show_results BOOLEAN DEFAULT TRUE,
    show_solutions BOOLEAN DEFAULT FALSE,
    allow_review BOOLEAN DEFAULT TRUE,
    
    -- Scheduling
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    
    -- Workflow
    created_by UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (
        status IN ('draft', 'published', 'archived')
    ),
    
    -- Metadata
    total_points INTEGER DEFAULT 0,
    question_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    published_at TIMESTAMP,
    archived_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_time_range CHECK (
        start_time IS NULL OR end_time IS NULL OR start_time < end_time
    )
);

-- ============================================================================
-- ASSESSMENT_QUESTIONS (Junction Table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS assessment_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    
    -- Ordering
    order_index INTEGER NOT NULL,
    
    -- Point override (optional)
    points_override INTEGER CHECK (points_override >= 0),
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Ensure unique question per assessment
    CONSTRAINT unique_question_per_assessment UNIQUE (assessment_id, question_id),
    
    -- Ensure unique order per assessment
    CONSTRAINT unique_order_per_assessment UNIQUE (assessment_id, order_index)
);

-- ============================================================================
-- STUDENT_ASSESSMENTS (Assignment & Attempts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL,
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'assigned' CHECK (
        status IN ('assigned', 'in_progress', 'submitted', 'graded', 'expired')
    ),
    
    -- Attempt tracking
    attempt_number INTEGER NOT NULL DEFAULT 1,
    max_attempts INTEGER NOT NULL,  -- Copied from assessment at assignment time
    
    -- Timing
    assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP,
    submitted_at TIMESTAMP,
    expires_at TIMESTAMP,
    
    -- Time tracking
    time_spent INTEGER DEFAULT 0,  -- Seconds
    time_limit INTEGER NOT NULL,   -- Minutes (copied from assessment)
    
    -- Scoring
    score INTEGER,
    percentage DECIMAL(5,2),
    passed BOOLEAN,
    
    -- Results
    correct_answers INTEGER DEFAULT 0,
    incorrect_answers INTEGER DEFAULT 0,
    unanswered INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_attempt_number CHECK (attempt_number <= max_attempts),
    CONSTRAINT valid_timing CHECK (
        started_at IS NULL OR assigned_at <= started_at
    ),
    CONSTRAINT valid_submission CHECK (
        submitted_at IS NULL OR started_at IS NULL OR started_at <= submitted_at
    )
);

-- ============================================================================
-- LAB_TEMPLATES (Referenced by Assessments)
-- ============================================================================

-- Note: This table might already exist from infrastructure setup
-- Creating if not exists for completeness

CREATE TABLE IF NOT EXISTS lab_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    
    -- Template Information
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Docker Configuration
    docker_image VARCHAR(500) NOT NULL,
    docker_tag VARCHAR(100) DEFAULT 'latest',
    
    -- VS Code Configuration
    vscode_extensions TEXT[],  -- Array of extension IDs
    vscode_settings JSONB,     -- VS Code settings.json
    
    -- Resource Limits
    cpu_limit VARCHAR(20) DEFAULT '2',      -- e.g., "2" cores
    memory_limit VARCHAR(20) DEFAULT '4Gi',  -- e.g., "4Gi"
    storage_limit VARCHAR(20) DEFAULT '10Gi',
    
    -- Network
    network_enabled BOOLEAN DEFAULT FALSE,
    allowed_domains TEXT[],
    
    -- Environment Variables
    environment_variables JSONB,
    
    -- Ports
    exposed_ports INTEGER[],
    
    -- Workflow
    created_by UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (
        status IN ('active', 'deprecated', 'archived')
    ),
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Assessments indexes
CREATE INDEX idx_assessments_organization ON assessments(organization_id);
CREATE INDEX idx_assessments_status ON assessments(status);
CREATE INDEX idx_assessments_created_by ON assessments(created_by);
CREATE INDEX idx_assessments_lab_template ON assessments(lab_template_id);
CREATE INDEX idx_assessments_created_at ON assessments(created_at DESC);
CREATE INDEX idx_assessments_start_end ON assessments(start_time, end_time);

-- Assessment questions indexes
CREATE INDEX idx_assessment_questions_assessment ON assessment_questions(assessment_id);
CREATE INDEX idx_assessment_questions_question ON assessment_questions(question_id);
CREATE INDEX idx_assessment_questions_order ON assessment_questions(assessment_id, order_index);

-- Student assessments indexes
CREATE INDEX idx_student_assessments_assessment ON student_assessments(assessment_id);
CREATE INDEX idx_student_assessments_student ON student_assessments(student_id);
CREATE INDEX idx_student_assessments_status ON student_assessments(status);
CREATE INDEX idx_student_assessments_assigned ON student_assessments(assigned_at DESC);
CREATE INDEX idx_student_assessments_composite ON student_assessments(student_id, assessment_id, attempt_number);

-- Lab templates indexes
CREATE INDEX idx_lab_templates_organization ON lab_templates(organization_id);
CREATE INDEX idx_lab_templates_status ON lab_templates(status);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update assessment updated_at timestamp
CREATE TRIGGER update_assessments_updated_at
    BEFORE UPDATE ON assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update student_assessments updated_at timestamp
CREATE TRIGGER update_student_assessments_updated_at
    BEFORE UPDATE ON student_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-calculate assessment metadata
CREATE OR REPLACE FUNCTION update_assessment_metadata()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE assessments
    SET 
        question_count = (
            SELECT COUNT(*) 
            FROM assessment_questions 
            WHERE assessment_id = NEW.assessment_id
        ),
        total_points = (
            SELECT COALESCE(SUM(
                COALESCE(aq.points_override, q.points)
            ), 0)
            FROM assessment_questions aq
            JOIN questions q ON aq.question_id = q.id
            WHERE aq.assessment_id = NEW.assessment_id
        )
    WHERE id = NEW.assessment_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_assessment_metadata_trigger
    AFTER INSERT OR DELETE ON assessment_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_assessment_metadata();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE assessments IS 'Assessment configurations with questions and settings';
COMMENT ON TABLE assessment_questions IS 'Junction table linking assessments to questions';
COMMENT ON TABLE student_assessments IS 'Student assignment and attempt tracking';
COMMENT ON TABLE lab_templates IS 'Lab environment templates for assessments';

COMMENT ON COLUMN assessments.lab_template_id IS 'Admin-locked lab environment, cannot be changed after creation';
COMMENT ON COLUMN assessments.time_limit IS 'Time limit in minutes';
COMMENT ON COLUMN assessments.passing_score IS 'Passing score percentage (0-100)';
COMMENT ON COLUMN assessment_questions.points_override IS 'Override default question points for this assessment';
COMMENT ON COLUMN student_assessments.time_spent IS 'Actual time spent in seconds';

-- ============================================================================
-- SAMPLE DATA (Optional)
-- ============================================================================

-- Insert sample lab template
INSERT INTO lab_templates (
    organization_id,
    name,
    description,
    docker_image,
    docker_tag,
    vscode_extensions,
    vscode_settings,
    cpu_limit,
    memory_limit,
    created_by,
    status
) VALUES (
    '00000000-0000-0000-0000-000000000001'::UUID,
    'React Development Environment',
    'Standard React development environment with Node.js 18 and common tools',
    'learnlytica/react-dev',
    'latest',
    ARRAY['dbaeumer.vscode-eslint', 'esbenp.prettier-vscode', 'dsznajder.es7-react-js-snippets'],
    '{"editor.formatOnSave": true, "editor.defaultFormatter": "esbenp.prettier-vscode"}'::JSONB,
    '2',
    '4Gi',
    '00000000-0000-0000-0000-000000000002'::UUID,
    'active'
) ON CONFLICT DO NOTHING;
