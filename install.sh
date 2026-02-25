#!/bin/bash
set -e

echo "🚀 Installing Learnlytica Platform..."

# Backend
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Frontend
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Setup database: createdb learnlytica"
echo "2. Run migrations:"
echo "   psql -d learnlytica -f backend/migrations/001_create_questions.sql"
echo "   psql -d learnlytica -f backend/migrations/002_create_lab_templates.sql"
echo "   psql -d learnlytica -f backend/migrations/003_create_assessments.sql"
echo "   psql -d learnlytica -f backend/migrations/004_create_auth.sql"
echo "   psql -d learnlytica -f backend/migrations/005_student_attempt_artifacts.sql"
echo "   psql -d learnlytica -f backend/migrations/006_assignment_audit_notes.sql"
echo "   psql -d learnlytica -f backend/migrations/007_certificates.sql"
echo "   psql -d learnlytica -f backend/migrations/008_create_batches.sql"
echo "3. Configure .env files in backend/ and frontend/"
echo "4. Start platform: ./start-production.sh"
echo "5. Access frontend at http://localhost:4666 (backend http://localhost:3666)"
