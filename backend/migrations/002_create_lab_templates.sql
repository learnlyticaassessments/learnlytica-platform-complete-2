-- Migration: Create Lab Templates Table
-- Description: Lab environment templates for assessments (Admin-managed)
-- Module: 2 - Assessment Creation
-- Date: 2024-02-25

-- ============================================================================
-- LAB TEMPLATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS lab_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    
    -- Basic Information
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (
        category IN ('frontend', 'backend', 'fullstack', 'database', 'devops')
    ),
    
    -- Docker Configuration
    docker_image VARCHAR(500) NOT NULL,
    docker_tag VARCHAR(100) NOT NULL DEFAULT 'latest',
    dockerfile_content TEXT,
    
    -- VS Code Configuration
    vscode_extensions JSONB DEFAULT '[]'::jsonb,
    -- Example: ["dbaeumer.vscode-eslint", "esbenp.prettier-vscode"]
    
    vscode_settings JSONB DEFAULT '{}'::jsonb,
    -- Example: {"editor.formatOnSave": true}
    
    -- Resource Limits
    resource_limits JSONB NOT NULL DEFAULT '{
        "cpu": "2",
        "memory": "4Gi",
        "storage": "10Gi"
    }'::jsonb,
    
    -- Environment Variables
    environment_variables JSONB DEFAULT '{}'::jsonb,
    -- Example: {"NODE_ENV": "test", "API_URL": "http://localhost:3000"}
    
    -- Pre-installed Packages
    npm_packages VARCHAR(200)[] DEFAULT '{}',
    pip_packages VARCHAR(200)[] DEFAULT '{}',
    
    -- Ports
    exposed_ports INTEGER[] DEFAULT '{5173, 3000}'::integer[],
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_lab_templates_org ON lab_templates(organization_id);
CREATE INDEX idx_lab_templates_category ON lab_templates(category);
CREATE INDEX idx_lab_templates_active ON lab_templates(is_active);
CREATE INDEX idx_lab_templates_created_by ON lab_templates(created_by);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_lab_templates_updated_at
    BEFORE UPDATE ON lab_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE lab_templates IS 'Lab environment templates for assessments (Admin-managed)';
COMMENT ON COLUMN lab_templates.docker_image IS 'Base Docker image (e.g., "node:18-alpine")';
COMMENT ON COLUMN lab_templates.vscode_extensions IS 'Array of VS Code extension IDs';
COMMENT ON COLUMN lab_templates.resource_limits IS 'CPU, memory, storage limits';
COMMENT ON COLUMN lab_templates.usage_count IS 'Number of assessments using this template';

-- ============================================================================
-- SAMPLE LAB TEMPLATES
-- ============================================================================

INSERT INTO lab_templates (
    organization_id,
    name,
    description,
    category,
    docker_image,
    docker_tag,
    vscode_extensions,
    vscode_settings,
    resource_limits,
    environment_variables,
    npm_packages,
    exposed_ports,
    created_by
) VALUES
-- Frontend React Template
(
    '00000000-0000-0000-0000-000000000001'::UUID,
    'React Development Environment',
    'Complete React development setup with Vite, TypeScript, and testing tools',
    'frontend',
    'node',
    '18-alpine',
    '["dbaeumer.vscode-eslint", "esbenp.prettier-vscode", "dsznajder.es7-react-js-snippets", "bradlc.vscode-tailwindcss"]'::jsonb,
    '{"editor.formatOnSave": true, "editor.defaultFormatter": "esbenp.prettier-vscode"}'::jsonb,
    '{"cpu": "2", "memory": "4Gi", "storage": "10Gi"}'::jsonb,
    '{"NODE_ENV": "development", "VITE_API_URL": "http://localhost:3000"}'::jsonb,
    ARRAY['vite@latest', 'react@^18.2.0', 'react-dom@^18.2.0', '@playwright/test@latest'],
    ARRAY[5173, 3000],
    '00000000-0000-0000-0000-000000000002'::UUID
),

-- Backend Node.js Template
(
    '00000000-0000-0000-0000-000000000001'::UUID,
    'Node.js API Environment',
    'Node.js + Express + TypeScript for API development',
    'backend',
    'node',
    '18-alpine',
    '["dbaeumer.vscode-eslint", "esbenp.prettier-vscode", "ms-vscode.vscode-typescript-next"]'::jsonb,
    '{"editor.formatOnSave": true}'::jsonb,
    '{"cpu": "2", "memory": "3Gi", "storage": "5Gi"}'::jsonb,
    '{"NODE_ENV": "test", "PORT": "3000"}'::jsonb,
    ARRAY['express@^4.18.0', 'typescript@^5.0.0', 'jest@^29.0.0'],
    ARRAY[3000],
    '00000000-0000-0000-0000-000000000002'::UUID
),

-- Python Backend Template
(
    '00000000-0000-0000-0000-000000000001'::UUID,
    'Python Flask/FastAPI Environment',
    'Python development with Flask/FastAPI and pytest',
    'backend',
    'python',
    '3.11-slim',
    '["ms-python.python", "ms-python.vscode-pylance", "ms-python.black-formatter"]'::jsonb,
    '{"python.formatting.provider": "black"}'::jsonb,
    '{"cpu": "1", "memory": "2Gi", "storage": "5Gi"}'::jsonb,
    '{"PYTHON_ENV": "development", "FLASK_DEBUG": "1"}'::jsonb,
    ARRAY[]::varchar[],
    ARRAY[5000, 8000],
    '00000000-0000-0000-0000-000000000002'::UUID
);
