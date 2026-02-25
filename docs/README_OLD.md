# 🚀 Learnlytica Assessment Platform - Complete Package

> Deprecated: This is an older reference document and contains outdated ports/script names (for example `3000/5173`).
> Use `../README.md`, `quickstart.md`, and `TESTING_GUIDE.md` for the current setup (`backend:3666`, `frontend:4666`, `./start-production.sh`).

## 📋 **What's Included**

A complete, production-ready assessment platform with:

### ✅ **Module 1: Question Management System** (100% Complete)
- Create, edit, and manage coding questions
- Support for multiple test frameworks (Playwright, Jest, Pytest, JUnit)
- Full-text search and filtering
- Question versioning and cloning
- **Backend:** Complete REST API (9 endpoints)
- **Frontend:** Full React UI (4 pages)
- **Lines of Code:** ~4,130

### ✅ **Module 2: Assessment Creation System** (50% Complete)
- Lab environment templates (Admin-managed)
- Create assessments from questions
- Assign assessments to students
- Track attempts and scores
- **Backend:** Database + Types + Validators
- **Frontend:** Not yet implemented
- **Lines of Code:** ~2,070

---

## 📁 **Project Structure**

```
learnlytica-platform-complete/
├── README.md (this file)
├── INSTALLATION.md
├── TESTING_GUIDE.md
├── docker-compose.yml
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── migrations/
│   │   ├── 001_create_questions.sql
│   │   ├── 002_create_lab_templates.sql
│   │   └── 003_create_assessments.sql
│   ├── src/
│   │   ├── index.ts
│   │   ├── config/
│   │   │   └── database.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── validation.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── validators/
│   │   │   ├── question.validator.ts
│   │   │   ├── assessment.validator.ts
│   │   │   └── lab-template.validator.ts
│   │   ├── models/
│   │   │   └── question.model.ts
│   │   ├── services/
│   │   │   └── question.service.ts
│   │   ├── controllers/
│   │   │   └── question.controller.ts
│   │   └── routes/
│   │       └── question.routes.ts
│   └── shared/
│       └── types/
│           ├── question.types.ts
│           └── assessment.types.ts
│
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── index.html
│   ├── .env.example
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── components/
│   │   │   └── Layout.tsx
│   │   ├── pages/
│   │   │   ├── QuestionList.tsx
│   │   │   ├── QuestionDetail.tsx
│   │   │   ├── QuestionCreate.tsx
│   │   │   └── QuestionEdit.tsx
│   │   ├── services/
│   │   │   └── questionService.ts
│   │   └── hooks/
│   │       └── useQuestions.ts
│   └── public/
│
└── docs/
    ├── API_DOCUMENTATION.md
    ├── DATABASE_SCHEMA.md
    └── DEPLOYMENT.md
```

---

## 🚀 **Quick Start (5 Minutes)**

### **Prerequisites**
- Node.js 18+ and npm 9+
- PostgreSQL 14+
- Git

### **1. Clone/Extract Package**

```bash
# If you have the package
cd learnlytica-platform-complete

# Or extract from zip
unzip learnlytica-platform-complete.zip
cd learnlytica-platform-complete
```

### **2. Setup Database**

```bash
# Create database
createdb learnlytica

# Run migrations (in order)
psql -d learnlytica -f backend/migrations/001_create_questions.sql
psql -d learnlytica -f backend/migrations/002_create_lab_templates.sql
psql -d learnlytica -f backend/migrations/003_create_assessments.sql

# Verify tables created
psql -d learnlytica -c "\dt"
```

### **3. Setup Backend**

```bash
cd backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Edit .env with your settings
nano .env

# Start backend
npm run dev
```

Backend runs on: http://localhost:3000

### **4. Setup Frontend (New Terminal)**

```bash
cd frontend

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Start frontend
npm run dev
```

Frontend runs on: http://localhost:5173

### **5. Access Application**

```
🌐 Open: http://localhost:5173/questions

You should see:
✅ Question list page
✅ Search and filters
✅ Create question button
```

---

## 🔧 **Detailed Installation**

### **Database Setup**

**Option 1: Local PostgreSQL**

```bash
# Install PostgreSQL (macOS)
brew install postgresql@14
brew services start postgresql@14

# Install PostgreSQL (Ubuntu)
sudo apt update
sudo apt install postgresql-14
sudo systemctl start postgresql

# Create database and user
sudo -u postgres psql
CREATE DATABASE learnlytica;
CREATE USER learnlytica_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE learnlytica TO learnlytica_user;
\q
```

**Option 2: Docker**

```bash
# Start PostgreSQL in Docker
docker run -d \
  --name learnlytica-db \
  -e POSTGRES_DB=learnlytica \
  -e POSTGRES_USER=learnlytica_user \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  postgres:14-alpine
```

### **Environment Variables**

**Backend (.env)**

```bash
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://learnlytica_user:your_password@localhost:5432/learnlytica

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# CORS
CORS_ORIGIN=http://localhost:5173
```

**Frontend (.env)**

```bash
VITE_API_URL=http://localhost:3000
```

---

## 🧪 **Testing the Platform**

### **1. Test Backend API**

```bash
# Health check
curl http://localhost:3000/health

# List questions (will be empty initially)
curl http://localhost:3000/api/v1/questions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **2. Create a Test Question**

```bash
# Create question via API
curl -X POST http://localhost:3000/api/v1/questions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Build a Todo List with React",
    "description": "Create a functional todo list application using React hooks",
    "category": "frontend",
    "difficulty": "medium",
    "skills": ["react", "hooks", "state-management"],
    "tags": ["components", "crud"],
    "timeEstimate": 45,
    "points": 100,
    "starterCode": {
      "files": [{
        "path": "src/App.jsx",
        "content": "import React from '\''react'\'';\n\nfunction App() {\n  return <div>Start here</div>;\n}"
      }],
      "dependencies": {
        "react": "^18.2.0",
        "react-dom": "^18.2.0"
      }
    },
    "testFramework": "playwright",
    "testConfig": {
      "framework": "playwright",
      "version": "1.40.0",
      "environment": {"node": "18"},
      "setup": {
        "commands": ["npm install"]
      },
      "execution": {
        "command": "npx playwright test",
        "timeout": 300000
      },
      "testCases": [{
        "id": "tc_001",
        "name": "Should render todo list",
        "file": "tests/todo.spec.js",
        "testName": "Todo App > Should render",
        "points": 100,
        "visible": true
      }],
      "scoring": {
        "total": 100,
        "passing": 70
      }
    }
  }'
```

### **3. Test Frontend**

1. Open http://localhost:5173/questions
2. Click "Create Question" button
3. Fill in the form
4. Click "Create Question"
5. Verify question appears in list

### **4. Test Search & Filters**

1. In question list, use search box
2. Try filters (category, difficulty, status)
3. Test pagination
4. Click on question to view details

---

## 📊 **Database Schema Overview**

### **Module 1: Questions**

```sql
questions (
  id, organization_id, title, slug, description,
  category, subcategory[], difficulty, skills[], tags[],
  starter_code (JSONB), test_framework, test_config (JSONB),
  solution (JSONB), time_estimate, points,
  created_by, reviewed_by, status, version,
  created_at, updated_at, published_at
)
```

### **Module 2: Assessments**

```sql
lab_templates (
  id, organization_id, name, description, category,
  docker_image, docker_tag, vscode_extensions[],
  resource_limits (JSONB), environment_variables (JSONB),
  npm_packages[], pip_packages[], exposed_ports[],
  is_active, usage_count, created_by, created_at
)

assessments (
  id, organization_id, title, description,
  lab_template_id, time_limit_minutes, passing_score,
  max_attempts, start_date, end_date,
  shuffle_questions, status, total_points,
  created_by, created_at, updated_at
)

assessment_questions (
  assessment_id, question_id, order_index,
  points_override, time_estimate_override
)

student_assessments (
  assessment_id, student_id, assigned_at, due_date,
  started_at, submitted_at, status, attempt_number,
  score, points_earned, time_spent_minutes,
  vscode_session_id, lab_pod_name
)
```

---

## 🔌 **API Endpoints**

### **Questions API**

```
GET    /api/v1/questions              # List all questions
GET    /api/v1/questions/:id          # Get question by ID
GET    /api/v1/questions/:id/preview  # Get preview (no solution)
POST   /api/v1/questions              # Create question
PUT    /api/v1/questions/:id          # Update question
PATCH  /api/v1/questions/:id/status   # Update status
DELETE /api/v1/questions/:id          # Delete question
POST   /api/v1/questions/:id/clone    # Clone question
POST   /api/v1/questions/bulk-import  # Bulk import
```

### **Lab Templates API (Admin Only)**

```
GET    /api/v1/lab-templates           # List templates
GET    /api/v1/lab-templates/:id       # Get template
POST   /api/v1/lab-templates           # Create template
PUT    /api/v1/lab-templates/:id       # Update template
DELETE /api/v1/lab-templates/:id       # Delete template
```

### **Assessments API (Partially Implemented)**

```
GET    /api/v1/assessments             # List assessments
GET    /api/v1/assessments/:id         # Get assessment
POST   /api/v1/assessments             # Create assessment
PUT    /api/v1/assessments/:id         # Update assessment
POST   /api/v1/assessments/:id/assign  # Assign to students
GET    /api/v1/assessments/:id/stats   # Get statistics
```

---

## 🐛 **Troubleshooting**

### **Database Connection Issues**

```bash
# Check PostgreSQL is running
pg_isready

# Check database exists
psql -l | grep learnlytica

# Test connection
psql -d learnlytica -c "SELECT 1;"
```

### **Backend Won't Start**

```bash
# Check Node version
node --version  # Should be 18+

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for port conflicts
lsof -i :3000
```

### **Frontend Won't Build**

```bash
# Check Node version
node --version

# Clear Vite cache
rm -rf node_modules/.vite

# Reinstall dependencies
npm install
```

### **Authentication Issues**

For testing, you can temporarily disable authentication:
1. Comment out `authenticate` middleware in routes
2. Mock user in controllers: `req.user = { id: 'test', role: 'admin' }`

---

## 📚 **Additional Documentation**

- **API Documentation:** See `docs/API_DOCUMENTATION.md`
- **Database Schema:** See `docs/DATABASE_SCHEMA.md`
- **Deployment Guide:** See `docs/DEPLOYMENT.md`

---

## 🎯 **What Works Right Now**

### ✅ **Fully Functional**
- Question Management (CRUD)
- Question Search & Filtering
- Question Preview
- Question Cloning
- Full-text Search
- Pagination
- Status Management

### ⏳ **Database Ready (No UI)**
- Lab Templates
- Assessments
- Assessment Questions
- Student Assignments

---

## 🚧 **What's Not Yet Implemented**

### **Module 2 Backend**
- Lab Template Service/Controller/Routes
- Assessment Service/Controller/Routes
- Student Assignment Logic

### **Module 2 Frontend**
- Lab Template Management UI
- Assessment Creation Wizard
- Question Selector Component
- Student Assignment Interface

### **Module 3-5**
- Student Assessment Interface
- Test Execution Engine
- Reporting & Analytics

---

## 📊 **Platform Statistics**

```
Total Files:        35 files
Total Lines:        ~6,200 lines
Completion:         30% overall

Module 1:           100% Complete ✅
Module 2:           50% Complete ⏳
Module 3:           0% Complete
Module 4:           0% Complete
Module 5:           0% Complete
```

---

## 🔐 **Security Notes**

### **For Development:**
- Default JWT secret is insecure (change it!)
- CORS is wide open (localhost only)
- No rate limiting enabled

### **For Production:**
- Use strong JWT secret (32+ characters)
- Enable HTTPS
- Configure CORS properly
- Add rate limiting
- Use environment variables
- Enable authentication
- Add logging/monitoring

---

## 🚀 **Next Steps**

### **To Complete Module 2:**
1. Implement remaining backend (services, controllers, routes)
2. Create frontend UI for assessments
3. Test end-to-end workflows

### **To Start Module 3:**
1. Student dashboard
2. Assessment taking interface
3. VS Code integration

---

## 💡 **Need Help?**

### **Common Commands**

```bash
# Backend
cd backend
npm run dev          # Start dev server
npm run build        # Build for production
npm run test         # Run tests

# Frontend
cd frontend
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build

# Database
psql -d learnlytica  # Open PostgreSQL shell
\dt                  # List tables
\d questions         # Describe table
```

### **Reset Database**

```bash
# Drop and recreate
dropdb learnlytica
createdb learnlytica

# Re-run migrations
psql -d learnlytica -f backend/migrations/001_create_questions.sql
psql -d learnlytica -f backend/migrations/002_create_lab_templates.sql
psql -d learnlytica -f backend/migrations/003_create_assessments.sql
```

---

## 📞 **Support**

For issues or questions:
1. Check this README
2. Check troubleshooting section
3. Review docs/ folder
4. Check console logs

---

## ✅ **Success Criteria**

You'll know everything is working when:

1. ✅ Backend starts without errors on port 3000
2. ✅ Frontend starts without errors on port 5173
3. ✅ Can access http://localhost:5173/questions
4. ✅ Can see question list (empty initially)
5. ✅ Can create a new question via UI
6. ✅ Can view question details
7. ✅ Can search and filter questions

---

**🎉 Congratulations! You have a working assessment platform!**

**Platform Status:** Development Ready
**Production Ready:** Module 1 only
**Time to Deploy:** < 1 day (Module 1)

For production deployment, see `docs/DEPLOYMENT.md`
