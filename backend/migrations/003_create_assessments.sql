-- Migration: Create Assessments Tables
-- Description: Assessment management system
-- Module: 2 - Assessment Creation
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
    instructions TEXT,
    
    -- Lab Template (Admin-locked)
    lab_template_id UUID REFERENCES lab_templates(id) ON DELETE RESTRICT,
    
    -- Assessment Configuration
    time_limit_minutes INTEGER CHECK (time_limit_minutes > 0),
    passing_score DECIMAL(5,2) DEFAULT 70.0 CHECK (passing_score >= 0 AND passing_score <= 100),
    max_attempts INTEGER DEFAULT 1 CHECK (max_attempts > 0),
    
    -- Scheduling
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    
    -- Settings
    shuffle_questions BOOLEAN DEFAULT false,
    show_results_immediately BOOLEAN DEFAULT true,
    allow_review_after_submission BOOLEAN DEFAULT true,
    require_webcam BOOLEAN DEFAULT false,
    
    -- Workflow
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (
        status IN ('draft', 'published', 'archived')
    ),
    
    -- Metadata
    total_points INTEGER DEFAULT 0,
    estimated_duration_minutes INTEGER,
    created_by UUID NOT NULL,
    published_by UUID,
    published_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_date_range CHECK (end_date IS NULL OR start_date IS NULL OR end_date > start_date)
);

-- ============================================================================
-- ASSESSMENT_QUESTIONS (Junction Table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS assessment_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    
    -- Ordering
    order_index INTEGER NOT NULL,
    
    -- Optional Overrides
    points_override INTEGER CHECK (points_override >= 0),
    time_estimate_override INTEGER CHECK (time_estimate_override > 0),
    
    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(assessment_id, question_id),
    UNIQUE(assessment_id, order_index)
);

-- ============================================================================
-- STUDENT_ASSESSMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL,
    
    -- Timing
    assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    assigned_by UUID NOT NULL,
    due_date TIMESTAMP,
    started_at TIMESTAMP,
    submitted_at TIMESTAMP,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'assigned' CHECK (
        status IN ('assigned', 'in_progress', 'submitted', 'graded', 'expired')
    ),
    
    -- Attempt Tracking
    attempt_number INTEGER DEFAULT 1 CHECK (attempt_number > 0),
    
    -- Results
    score DECIMAL(5,2) CHECK (score >= 0 AND score <= 100),
    points_earned INTEGER DEFAULT 0,
    total_points INTEGER,
    time_spent_minutes INTEGER DEFAULT 0,
    passed BOOLEAN,
    
    -- VS Code Session
    vscode_session_id VARCHAR(200),
    lab_pod_name VARCHAR(200),
    
    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(assessment_id, student_id, attempt_number)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Assessments
CREATE INDEX idx_assessments_org ON assessments(organization_id);
CREATE INDEX idx_assessments_status ON assessments(status);
CREATE INDEX idx_assessments_lab_template ON assessments(lab_template_id);
CREATE INDEX idx_assessments_created_by ON assessments(created_by);
CREATE INDEX idx_assessments_dates ON assessments(start_date, end_date);

-- Assessment Questions
CREATE INDEX idx_assessment_questions_assessment ON assessment_questions(assessment_id);
CREATE INDEX idx_assessment_questions_question ON assessment_questions(question_id);
CREATE INDEX idx_assessment_questions_order ON assessment_questions(assessment_id, order_index);

-- Student Assessments
CREATE INDEX idx_student_assessments_assessment ON student_assessments(assessment_id);
CREATE INDEX idx_student_assessments_student ON student_assessments(student_id);
CREATE INDEX idx_student_assessments_status ON student_assessments(status);
CREATE INDEX idx_student_assessments_assigned ON student_assessments(assigned_at);
CREATE INDEX idx_student_assessments_submitted ON student_assessments(submitted_at);
CREATE INDEX idx_student_assessments_student_status ON student_assessments(student_id, status);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_assessments_updated_at
    BEFORE UPDATE ON assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_assessments_updated_at
    BEFORE UPDATE ON student_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update assessment total_points
CREATE OR REPLACE FUNCTION update_assessment_total_points()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE assessments
    SET total_points = (
        SELECT COALESCE(SUM(COALESCE(aq.points_override, q.points)), 0)
        FROM assessment_questions aq
        JOIN questions q ON aq.question_id = q.id
        WHERE aq.assessment_id = COALESCE(NEW.assessment_id, OLD.assessment_id)
    )
    WHERE id = COALESCE(NEW.assessment_id, OLD.assessment_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_assessment_points_on_question_change
    AFTER INSERT OR UPDATE OR DELETE ON assessment_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_assessment_total_points();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE assessments IS 'Assessment configurations';
COMMENT ON TABLE assessment_questions IS 'Questions included in assessments';
COMMENT ON TABLE student_assessments IS 'Student assessment attempts and results';

COMMENT ON COLUMN assessments.lab_template_id IS 'Lab environment template (Admin-locked)';
COMMENT ON COLUMN assessments.shuffle_questions IS 'Randomize question order for each student';
COMMENT ON COLUMN assessment_questions.points_override IS 'Override question default points';
COMMENT ON COLUMN student_assessments.attempt_number IS 'Which attempt this is (1, 2, 3...)';
