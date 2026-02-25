# 🧪 Learnlytica Platform - Testing Guide

## 📋 **Quick Test Checklist**

After installation, verify everything works:

- [ ] Database migrations run successfully
- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Can access frontend at http://localhost:4666
- [ ] Can create a question via UI
- [ ] Can view question details
- [ ] Can search and filter questions
- [ ] API endpoints respond correctly

---

## 🎯 **Step-by-Step Testing**

### **1. Database Testing**

```bash
# Verify database exists
psql -l | grep learnlytica

# Connect to database
psql -d learnlytica

# Verify tables
\dt

# Should see:
# - questions
# - lab_templates
# - assessments
# - assessment_questions
# - student_assessments

# Check questions table structure
\d questions

# Exit
\q
```

### **2. Backend API Testing**

#### **Start Backend**
```bash
./start-production.sh
```

#### **Test Health Endpoint**
```bash
curl http://localhost:3666/health

# Expected: {"status":"ok"}
```

#### **Test Questions API (List)**
```bash
# Note: For testing, you may need to temporarily disable auth
curl http://localhost:3666/api/v1/questions

# Expected: 
# {"success":true,"data":[],"pagination":{...}}
```

#### **Create Test Question**
```bash
curl -X POST http://localhost:3666/api/v1/questions \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Question",
    "description": "This is a test question",
    "category": "frontend",
    "difficulty": "easy",
    "skills": ["javascript"],
    "tags": ["test"],
    "timeEstimate": 30,
    "points": 50,
    "starterCode": {
      "files": [{"path": "index.js", "content": "// Start here"}],
      "dependencies": {}
    },
    "testFramework": "jest",
    "testConfig": {
      "framework": "jest",
      "version": "29.0.0",
      "environment": {"node": "18"},
      "setup": {"commands": ["npm install"]},
      "execution": {"command": "npm test", "timeout": 60000},
      "testCases": [{
        "id": "tc1",
        "name": "Test case 1",
        "file": "test.js",
        "testName": "test",
        "points": 50,
        "visible": true
      }],
      "scoring": {"total": 50, "passing": 30}
    }
  }'
```

### **3. Frontend Testing**

#### **Start Frontend**
```bash
cd frontend
npm run dev
```

#### **Manual UI Testing**

1. **Access Application**
   - Open: http://localhost:4666
   - Should redirect to: http://localhost:4666/questions

2. **Test Question List Page**
   - [ ] Page loads without errors
   - [ ] "Create Question" button visible
   - [ ] Search box present
   - [ ] Filter dropdowns working

3. **Test Question Creation**
   - [ ] Click "Create Question"
   - [ ] Form loads
   - [ ] Can enter title
   - [ ] Can select category
   - [ ] Can select difficulty
   - [ ] Submit button enabled
   - [ ] Question appears in list after creation

4. **Test Question Details**
   - [ ] Click on a question
   - [ ] Detail page loads
   - [ ] All information displayed
   - [ ] Edit/Delete buttons visible

5. **Test Search & Filters**
   - [ ] Search by title works
   - [ ] Category filter works
   - [ ] Difficulty filter works
   - [ ] Status filter works

6. **Test Pagination**
   - [ ] Next/Previous buttons work
   - [ ] Page numbers correct
   - [ ] Items per page correct

---

## 🔍 **Detailed API Tests**

### **Questions API**

#### **1. Create Question**
```bash
POST /api/v1/questions
# Status: 201 Created
# Response includes: id, slug, status, createdAt
```

#### **2. List Questions**
```bash
GET /api/v1/questions
GET /api/v1/questions?category=frontend
GET /api/v1/questions?difficulty=medium
GET /api/v1/questions?search=react
GET /api/v1/questions?page=1&limit=10

# Status: 200 OK
# Response includes: data[], pagination{}
```

#### **3. Get Question**
```bash
GET /api/v1/questions/:id

# Status: 200 OK
# Response includes: complete question object
```

#### **4. Update Question**
```bash
PUT /api/v1/questions/:id
Content-Type: application/json

{
  "title": "Updated Title",
  "difficulty": "hard"
}

# Status: 200 OK
# Response: updated question
```

#### **5. Update Status**
```bash
PATCH /api/v1/questions/:id/status
Content-Type: application/json

{
  "status": "published"
}

# Status: 200 OK
```

#### **6. Delete Question**
```bash
DELETE /api/v1/questions/:id

# Status: 200 OK
```

#### **7. Clone Question**
```bash
POST /api/v1/questions/:id/clone
Content-Type: application/json

{
  "title": "Cloned Question"
}

# Status: 201 Created
```

### **Lab Templates API** (Admin Only)

```bash
# List templates
GET /api/v1/lab-templates

# Get template
GET /api/v1/lab-templates/:id

# Create template (Admin)
POST /api/v1/lab-templates
```

---

## 🐛 **Common Test Failures & Solutions**

### **Database Connection Error**

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
```bash
# Check PostgreSQL is running
pg_isready

# Start PostgreSQL
# macOS:
brew services start postgresql@14

# Linux:
sudo systemctl start postgresql
```

### **Migrations Not Applied**

```
Error: relation "questions" does not exist
```

**Solution:**
```bash
psql -d learnlytica -f backend/migrations/001_create_questions.sql
psql -d learnlytica -f backend/migrations/002_create_lab_templates.sql
psql -d learnlytica -f backend/migrations/003_create_assessments.sql
```

### **Port Already in Use**

```
Error: listen EADDRINUSE: address already in use :::3666
```

**Solution:**
```bash
# Find process using port 3666
lsof -i :3666

# Kill the process
kill -9 <PID>
```

### **401 Unauthorized**

```
{"success": false, "error": "Unauthorized"}
```

**Solution:**
For testing, temporarily disable auth in `backend/src/routes/question.routes.ts`:
```typescript
// Comment out this line:
// router.use(authenticate);

// Or add mock user in controller:
req.user = {
  id: 'test-user-id',
  organizationId: 'test-org-id',
  role: 'admin',
  email: 'test@example.com'
};
```

### **CORS Error**

```
Access to fetch blocked by CORS policy
```

**Solution:**
Check `backend/.env`:
```bash
CORS_ORIGIN=http://localhost:4666
```

---

## ✅ **Automated Testing**

### **Backend Unit Tests** (To be implemented)

```bash
cd backend
npm test
```

### **Frontend Tests** (To be implemented)

```bash
cd frontend
npm test
```

### **Integration Tests** (To be implemented)

```bash
npm run test:integration
```

---

## 📊 **Test Coverage**

### **What's Tested**
- ✅ Database schema creation
- ✅ Type definitions
- ✅ Validation schemas
- ✅ Basic CRUD operations

### **What's Not Tested**
- ⏳ Authentication flow
- ⏳ Authorization rules
- ⏳ Error handling
- ⏳ Edge cases
- ⏳ Performance under load

---

## 🎯 **Success Metrics**

Your platform is working correctly when:

1. **Database**
   - All 5 tables created
   - Sample lab templates inserted
   - No migration errors

2. **Backend**
   - Starts on port 3666
   - Health endpoint responds
   - All API endpoints respond
   - No console errors

3. **Frontend**
   - Starts on port 4666
   - UI loads correctly
   - No console errors
   - Can perform CRUD operations

4. **Integration**
   - Frontend can fetch questions
   - Can create questions via UI
   - Search/filter works
   - Pagination works

---

## 🚀 **Performance Testing**

### **Load Test (Optional)**

```bash
# Install Apache Bench
brew install httpd  # macOS
sudo apt install apache2-utils  # Linux

# Test list endpoint
ab -n 1000 -c 10 http://localhost:3666/api/v1/questions

# Expected:
# - Requests per second: > 100
# - Mean response time: < 100ms
```

### **Database Performance**

```bash
psql -d learnlytica

# Check query performance
EXPLAIN ANALYZE SELECT * FROM questions WHERE category = 'frontend';

# Should use index scan
```

---

## 📝 **Test Data**

### **Sample Questions**

Create a few test questions with different characteristics:

1. **Easy Frontend Question**
   - Category: frontend
   - Difficulty: easy
   - Framework: jest
   - 30 min, 50 points

2. **Medium Backend Question**
   - Category: backend
   - Difficulty: medium
   - Framework: pytest
   - 60 min, 100 points

3. **Hard Fullstack Question**
   - Category: fullstack
   - Difficulty: hard
   - Framework: playwright
   - 120 min, 200 points

### **Sample Lab Templates**

Already included in migration:
- React Development Environment
- Node.js API Environment
- Python Flask Environment

---

## 🎉 **Testing Complete!**

If all tests pass, your platform is:
- ✅ Properly installed
- ✅ Database configured
- ✅ Backend functional
- ✅ Frontend operational
- ✅ Ready for development/demo

**Next Steps:**
1. Add authentication
2. Create assessments
3. Implement Module 3 (Student Interface)
4. Deploy to production
