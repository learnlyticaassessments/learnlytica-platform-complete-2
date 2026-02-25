# ⚡ Quick Start (Copy-Paste Commands)

## 1️⃣ Database Setup (30 seconds)

```bash
# Create database
createdb learnlytica

# Run migrations
psql -d learnlytica -f backend/migrations/001_create_questions.sql
psql -d learnlytica -f backend/migrations/002_create_lab_templates.sql
psql -d learnlytica -f backend/migrations/003_create_assessments.sql
```

## 2️⃣ Install Dependencies (2-4 minutes)

```bash
./install.sh
```

## 3️⃣ Configure Environment (1 minute)

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit backend/.env and set DATABASE_URL
```

## 4️⃣ Start Platform

```bash
./start-production.sh
```

## 5️⃣ Access Application

Open: http://localhost:4666/questions

## 6️⃣ Create Your First Question

1. Click "Create Question"
2. Fill in:
   - Title: "My First Question"
   - Description: "Test description"
   - Category: Frontend
   - Difficulty: Easy
   - Time: 30 min
   - Points: 100
3. Click "Create Question"

**Done! 🎉**
