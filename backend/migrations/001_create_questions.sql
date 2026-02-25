-- Migration: Create Questions Table
-- Description: Complete schema for question management system
-- Author: Learnlytica Platform
-- Date: 2024-02-25

-- ============================================================================
-- QUESTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    
    -- Basic Information
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    
    -- Classification
    category VARCHAR(50) NOT NULL CHECK (
        category IN ('frontend', 'backend', 'fullstack', 'database', 'devops')
    ),
    subcategory VARCHAR(100)[] DEFAULT '{}',
    difficulty VARCHAR(20) NOT NULL CHECK (
        difficulty IN ('easy', 'medium', 'hard')
    ),
    skills VARCHAR(100)[] DEFAULT '{}',
    tags VARCHAR(100)[] DEFAULT '{}',
    
    -- Code Templates
    starter_code JSONB NOT NULL,
    -- Structure: { files: [{path, content}], dependencies: {}, scripts: {} }
    
    -- Test Configuration
    test_framework VARCHAR(50) NOT NULL CHECK (
        test_framework IN ('playwright', 'jest', 'pytest', 'junit', 'mocha', 'cypress')
    ),
    test_config JSONB NOT NULL,
    -- Structure: { framework, version, environment, setup, execution, testCases, scoring }
    
    -- Solution (Hidden from students)
    solution JSONB,
    -- Structure: { files: [{path, content}], explanation: "" }
    
    -- Metadata
    time_estimate INTEGER NOT NULL CHECK (time_estimate > 0),
    points INTEGER NOT NULL DEFAULT 100 CHECK (points >= 0),
    
    -- Workflow
    created_by UUID NOT NULL,
    reviewed_by UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (
        status IN ('draft', 'review', 'published', 'archived')
    ),
    
    -- Versioning
    version INTEGER NOT NULL DEFAULT 1,
    parent_question_id UUID REFERENCES questions(id),
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    published_at TIMESTAMP,
    archived_at TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Primary lookups
CREATE INDEX idx_questions_organization ON questions(organization_id);
CREATE INDEX idx_questions_slug ON questions(slug);
CREATE INDEX idx_questions_created_by ON questions(created_by);

-- Filtering
CREATE INDEX idx_questions_category ON questions(category);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_status ON questions(status);
CREATE INDEX idx_questions_framework ON questions(test_framework);

-- Array columns (GIN indexes for array contains operations)
CREATE INDEX idx_questions_skills ON questions USING GIN(skills);
CREATE INDEX idx_questions_tags ON questions USING GIN(tags);
CREATE INDEX idx_questions_subcategory ON questions USING GIN(subcategory);

-- Full-text search
CREATE INDEX idx_questions_search ON questions USING GIN(
    to_tsvector('english', title || ' ' || description)
);

-- Composite indexes for common queries
CREATE INDEX idx_questions_org_status ON questions(organization_id, status);
CREATE INDEX idx_questions_org_category ON questions(organization_id, category);
CREATE INDEX idx_questions_category_difficulty ON questions(category, difficulty);

-- Timestamps for sorting
CREATE INDEX idx_questions_created_at ON questions(created_at DESC);
CREATE INDEX idx_questions_updated_at ON questions(updated_at DESC);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Generate slug from title
CREATE OR REPLACE FUNCTION generate_slug(title TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(
        REGEXP_REPLACE(
            REGEXP_REPLACE(title, '[^a-zA-Z0-9\s-]', '', 'g'),
            '\s+', '-', 'g'
        )
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE questions IS 'Stores coding questions with test configurations';
COMMENT ON COLUMN questions.starter_code IS 'JSONB: Initial code template provided to students';
COMMENT ON COLUMN questions.test_config IS 'JSONB: Complete test execution configuration';
COMMENT ON COLUMN questions.solution IS 'JSONB: Reference solution, hidden from students';
COMMENT ON COLUMN questions.time_estimate IS 'Estimated time in minutes';
COMMENT ON COLUMN questions.points IS 'Maximum points available for this question';

-- ============================================================================
-- SAMPLE DATA (Optional - for development)
-- ============================================================================

-- Uncomment to insert sample question
/*
INSERT INTO questions (
    organization_id,
    title,
    slug,
    description,
    category,
    subcategory,
    difficulty,
    skills,
    tags,
    starter_code,
    test_framework,
    test_config,
    solution,
    time_estimate,
    points,
    created_by,
    status
) VALUES (
    '00000000-0000-0000-0000-000000000001'::UUID, -- Replace with real org ID
    'Build a Todo List with React',
    'build-todo-list-react',
    '# Todo List Application

Create a functional todo list application using React.

## Requirements

1. Display a list of todo items
2. Add new todo items
3. Mark items as complete
4. Delete items
5. Persist data in localStorage

## Expected Behavior

- Input field at the top for new todos
- List of todos below
- Each todo has a checkbox and delete button
- Completed todos should have strikethrough text',
    'frontend',
    ARRAY['react', 'javascript'],
    'medium',
    ARRAY['react', 'hooks', 'state-management', 'localStorage'],
    ARRAY['components', 'crud', 'forms'],
    '{
        "files": [
            {
                "path": "src/App.jsx",
                "content": "import React from ''react'';\n\nfunction App() {\n  return (\n    <div className=\"App\">\n      <h1>Todo List</h1>\n      {/* Your code here *\/}\n    </div>\n  );\n}\n\nexport default App;"
            }
        ],
        "dependencies": {
            "react": "^18.2.0",
            "react-dom": "^18.2.0"
        },
        "scripts": {
            "dev": "vite",
            "build": "vite build",
            "test": "playwright test"
        }
    }'::JSONB,
    'playwright',
    '{
        "framework": "playwright",
        "version": "1.40.0",
        "environment": {
            "node": "18",
            "npm": "9"
        },
        "setup": {
            "commands": ["npm install", "npm run build"],
            "startServer": "npm run dev",
            "waitForServer": "http://localhost:5173",
            "timeout": 30000
        },
        "execution": {
            "command": "npx playwright test",
            "timeout": 300000
        },
        "testCases": [
            {
                "id": "tc_001",
                "name": "Should render todo list",
                "file": "tests/todo.spec.js",
                "testName": "Todo App > Should render list",
                "points": 20,
                "visible": true,
                "category": "basic"
            },
            {
                "id": "tc_002",
                "name": "Should add new todo",
                "file": "tests/todo.spec.js",
                "testName": "Todo App > Should add todo",
                "points": 30,
                "visible": true,
                "category": "functionality"
            },
            {
                "id": "tc_003",
                "name": "Should mark as complete",
                "file": "tests/todo.spec.js",
                "testName": "Todo App > Should complete todo",
                "points": 25,
                "visible": false,
                "category": "functionality"
            },
            {
                "id": "tc_004",
                "name": "Should persist data",
                "file": "tests/todo.spec.js",
                "testName": "Todo App > Should persist in localStorage",
                "points": 25,
                "visible": false,
                "category": "advanced"
            }
        ],
        "scoring": {
            "total": 100,
            "passing": 70,
            "categories": {
                "basic": 20,
                "functionality": 55,
                "advanced": 25
            }
        }
    }'::JSONB,
    '{
        "files": [
            {
                "path": "src/App.jsx",
                "content": "// Complete solution code here"
            }
        ],
        "explanation": "This solution uses React hooks (useState, useEffect) for state management and localStorage for data persistence."
    }'::JSONB,
    45,
    100,
    '00000000-0000-0000-0000-000000000002'::UUID, -- Replace with real user ID
    'published'
);
*/
