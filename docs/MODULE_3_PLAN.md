# Module 3: Student Assessment Interface

## 🎯 What We're Building

A complete student-facing interface for taking assessments with:
- Student dashboard showing assigned assessments
- Assessment taking interface with VS Code integration
- Real-time code execution and testing
- Progress tracking and submission

## 📦 Components Needed

### Backend (8 files)
1. models/student-session.model.ts - Track student sessions
2. services/student-assessment.service.ts - Student-specific logic
3. controllers/student-assessment.controller.ts - Student endpoints
4. routes/student-assessment.routes.ts - Student routes
5. services/code-execution.service.ts - Run code (mock for now)
6. middleware/student-auth.middleware.ts - Student role check

### Frontend (6 pages/components)
1. pages/student/StudentDashboard.tsx - View assigned assessments
2. pages/student/AssessmentTake.tsx - Main assessment interface
3. components/CodeEditor.tsx - Monaco/VS Code editor
4. components/TestRunner.tsx - Run tests and show results
5. components/QuestionNavigator.tsx - Navigate between questions
6. services/studentService.ts - API calls

### Database Updates
1. Add indexes for student queries
2. Update student_assessments table if needed

## 🔌 API Endpoints (New)

```
GET    /api/v1/student/assessments - My assigned assessments
GET    /api/v1/student/assessments/:id - Get assessment to take
POST   /api/v1/student/assessments/:id/start - Start assessment
POST   /api/v1/student/assessments/:id/submit - Submit assessment
POST   /api/v1/student/assessments/:id/run-tests - Run tests
GET    /api/v1/student/assessments/:id/results - View results
```

## 🎨 UI Flow

```
1. Student Dashboard
   ├─ Shows all assigned assessments
   ├─ Status: Not Started, In Progress, Submitted
   ├─ Due dates and time limits
   └─ Click to start assessment

2. Assessment Taking Interface
   ├─ Split view: Questions (left) | Code Editor (right)
   ├─ Question navigator (bottom)
   ├─ Timer (top)
   ├─ Run Tests button
   ├─ Submit button
   └─ Save progress

3. Results View
   ├─ Score breakdown
   ├─ Test results
   ├─ Time spent
   └─ Feedback (if enabled)
```

## ⚡ Features

### Phase 1 (Essential)
- ✅ View assigned assessments
- ✅ Start assessment (timer starts)
- ✅ Code editor (Monaco)
- ✅ Run tests (mock execution)
- ✅ Submit assessment
- ✅ View basic results

### Phase 2 (Advanced - Future)
- Auto-save code
- Real Docker execution
- Live test results
- Code collaboration
- Proctoring integration

## 🔐 Security

- Students can only see their own assessments
- Cannot access other students' work
- Time limits enforced server-side
- Attempt limits enforced
- Code execution sandboxed

Let's build Phase 1!
