import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Login } from './pages/Login';

// Module 1: Questions
import { QuestionList } from './pages/QuestionList';
import { QuestionDetail } from './pages/QuestionDetail';
import { QuestionCreate } from './pages/QuestionCreate';
import { QuestionEdit } from './pages/QuestionEdit';

// Module 2: Assessments
import { AssessmentList } from './pages/assessments/AssessmentList';
import { AssessmentCreate } from './pages/assessments/AssessmentCreate';
import { AssessmentDetail } from './pages/assessments/AssessmentDetail';

// Module 3: Student Interface
import { StudentDashboard } from './pages/student/StudentDashboard';
import { AssessmentTake } from './pages/student/AssessmentTake';

// Module 5: Analytics
import { Dashboard as AnalyticsDashboard } from './pages/analytics/Dashboard';

// Question Library
import { QuestionLibrary } from './pages/QuestionLibrary';

// AI Question Generator ⭐ NEW
import { AIQuestionGenerator } from './pages/AIQuestionGenerator';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route
          path="*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/questions" replace />} />
                
                {/* Module 1: Questions */}
                <Route path="/questions" element={<QuestionList />} />
                <Route path="/questions/create" element={<QuestionCreate />} />
                <Route path="/questions/:id" element={<QuestionDetail />} />
                <Route path="/questions/:id/edit" element={<QuestionEdit />} />
                
                {/* Module 2: Assessments */}
                <Route path="/assessments" element={<AssessmentList />} />
                <Route path="/assessments/create" element={<AssessmentCreate />} />
                <Route path="/assessments/:id" element={<AssessmentDetail />} />
                
                {/* Module 3: Student Interface */}
                <Route path="/student/assessments" element={<StudentDashboard />} />
                <Route path="/student/take/:id" element={<AssessmentTake />} />
                
                {/* Module 5: Analytics */}
                <Route path="/analytics" element={<AnalyticsDashboard />} />
                
                {/* Question Library */}
                <Route path="/library" element={<QuestionLibrary />} />
                
                {/* AI Question Generator ⭐ NEW */}
                <Route path="/ai/generate" element={<AIQuestionGenerator />} />
                
                <Route path="*" element={<Navigate to="/questions" replace />} />
              </Routes>
            </Layout>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
