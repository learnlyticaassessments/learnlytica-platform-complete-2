#!/bin/bash

echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║   🚀 LEARNLYTICA - PRODUCTION DEPLOYMENT               ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL client is not installed"
    exit 1
fi

echo "✅ All prerequisites met"
echo ""

# Setup environment
echo "🔧 Setting up environment..."

if [ ! -f backend/.env ]; then
    echo "Creating backend .env file..."
    cp backend/.env.example backend/.env
    echo "⚠️  IMPORTANT: Edit backend/.env and set:"
    echo "   - DATABASE_URL"
    echo "   - JWT_SECRET"
    echo "   - ANTHROPIC_API_KEY (for AI features)"
    read -p "Press Enter after updating backend/.env..."
fi

if [ ! -f frontend/.env ]; then
    echo "Creating frontend .env file..."
    cp frontend/.env.example frontend/.env
fi

echo "✅ Environment configured"
echo ""

# Build Docker images
echo "🐳 Building Docker images..."
cd docker/execution-environments

docker build -t learnlytica/executor-node:latest -f Dockerfile.node . || exit 1
docker build -t learnlytica/executor-python:latest -f Dockerfile.python . || exit 1
docker build -t learnlytica/executor-java:latest -f Dockerfile.java . || exit 1
docker build -t learnlytica/executor-playwright:latest -f Dockerfile.playwright . || exit 1

cd ../..
echo "✅ Docker images built"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."

echo "Installing backend dependencies..."
cd backend
npm install || exit 1
cd ..

echo "Installing frontend dependencies..."
cd frontend
npm install || exit 1
cd ..

echo "✅ Dependencies installed"
echo ""

# Setup database
echo "💾 Setting up database..."
read -p "Database name (default: learnlytica): " DB_NAME
DB_NAME=${DB_NAME:-learnlytica}

echo "Creating database..."
createdb $DB_NAME 2>/dev/null || echo "Database already exists"

echo "Running migrations..."
psql -d $DB_NAME -f backend/migrations/001_create_questions.sql || exit 1
psql -d $DB_NAME -f backend/migrations/002_create_lab_templates.sql || exit 1
psql -d $DB_NAME -f backend/migrations/003_create_assessments.sql || exit 1
psql -d $DB_NAME -f backend/migrations/004_create_auth.sql || exit 1
psql -d $DB_NAME -f backend/migrations/005_student_attempt_artifacts.sql || exit 1
psql -d $DB_NAME -f backend/migrations/006_assignment_audit_notes.sql || exit 1
psql -d $DB_NAME -f backend/migrations/007_certificates.sql || exit 1
psql -d $DB_NAME -f backend/migrations/008_create_batches.sql || exit 1
psql -d $DB_NAME -f backend/migrations/009_create_project_evaluations.sql || exit 1
psql -d $DB_NAME -f backend/migrations/010_seed_phase1_project_flow_templates.sql || exit 1
psql -d $DB_NAME -f backend/migrations/011_project_assessment_publish_and_assignment_workflow.sql || exit 1

echo "✅ Database ready"
echo ""
echo "🔐 Demo login accounts seeded (for first login):"
echo "   admin@learnlytica.local   / Admin@123"
echo "   client@learnlytica.local  / Client@123"
echo "   student@learnlytica.local / Student@123"
echo ""

# Build frontend
echo "🏗️  Building frontend..."
cd frontend
npm run build || exit 1
cd ..
echo "✅ Frontend built"
echo ""

echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║   ✅ DEPLOYMENT COMPLETE!                              ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "🚀 To start the platform:"
echo ""
echo "   ./start-production.sh"
echo ""
echo "📝 Or manually:"
echo "   Backend:  cd backend && npm start"
echo "   Frontend: cd frontend && npm run dev"
echo ""
echo "🌐 Access:"
echo "   Frontend: http://localhost:4666"
echo "   Backend:  http://localhost:3666"
echo ""
