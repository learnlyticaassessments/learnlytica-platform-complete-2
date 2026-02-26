import { ReactElement } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { useAuth } from './auth/AuthContext';
import { can } from './auth/permissions';
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
import { AssessmentReview } from './pages/student/AssessmentReview';
import { Learners } from './pages/Learners';
import { Batches } from './pages/Batches';
import { ClientAssignmentReview } from './pages/ClientAssignmentReview';
import { ClientAssignmentDetail } from './pages/ClientAssignmentDetail';
import { ClientSkillMatrix } from './pages/ClientSkillMatrix';
import { Certificates } from './pages/Certificates';
import { ProjectEvaluations } from './pages/ProjectEvaluations';

// Module 5: Analytics
import { Dashboard as AnalyticsDashboard } from './pages/analytics/Dashboard';

// Question Library
import { QuestionLibrary } from './pages/QuestionLibrary';

// AI Question Generator ⭐ NEW
import { AIQuestionGenerator } from './pages/AIQuestionGenerator';

function RoleRoute({
  allowedRoles,
  children
}: {
  allowedRoles: Array<'admin' | 'client' | 'student'>;
  children: ReactElement;
}) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (!allowedRoles.includes(user.role)) {
    const fallback = user.role === 'student' ? '/student/assessments' : '/questions';
    return <Navigate to={fallback} replace />;
  }

  return children;
}

function RoleHomeRedirect() {
  const { user } = useAuth();
  if (can(user?.role, 'questions.view')) return <Navigate to="/questions" replace />;
  if (can(user?.role, 'student.assessments.view')) return <Navigate to="/student/assessments" replace />;
  return <Navigate to="/login" replace />;
}

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
                <Route path="/" element={<RoleHomeRedirect />} />
                
                {/* Module 1: Questions */}
                <Route path="/questions" element={<RoleRoute allowedRoles={['admin', 'client']}><QuestionList /></RoleRoute>} />
                <Route path="/questions/create" element={<RoleRoute allowedRoles={['admin', 'client']}><QuestionCreate /></RoleRoute>} />
                <Route path="/questions/:id" element={<RoleRoute allowedRoles={['admin', 'client']}><QuestionDetail /></RoleRoute>} />
                <Route path="/questions/:id/edit" element={<RoleRoute allowedRoles={['admin', 'client']}><QuestionEdit /></RoleRoute>} />
                
                {/* Module 2: Assessments */}
                <Route path="/assessments" element={<RoleRoute allowedRoles={['admin', 'client']}><AssessmentList /></RoleRoute>} />
                <Route path="/assessments/create" element={<RoleRoute allowedRoles={['admin', 'client']}><AssessmentCreate /></RoleRoute>} />
                <Route path="/assessments/:id" element={<RoleRoute allowedRoles={['admin', 'client']}><AssessmentDetail /></RoleRoute>} />
                <Route path="/project-evaluations" element={<RoleRoute allowedRoles={['admin', 'client']}><ProjectEvaluations /></RoleRoute>} />
                <Route path="/learners" element={<RoleRoute allowedRoles={['admin', 'client']}><Learners /></RoleRoute>} />
                <Route path="/batches" element={<RoleRoute allowedRoles={['admin', 'client']}><Batches /></RoleRoute>} />
                <Route path="/learners/:studentId/skill-matrix" element={<RoleRoute allowedRoles={['admin', 'client']}><ClientSkillMatrix /></RoleRoute>} />
                <Route path="/learners/assignments/:assignmentId" element={<RoleRoute allowedRoles={['admin', 'client']}><ClientAssignmentDetail /></RoleRoute>} />
                <Route path="/learners/assignments/:assignmentId/review" element={<RoleRoute allowedRoles={['admin', 'client']}><ClientAssignmentReview /></RoleRoute>} />
                <Route path="/certificates" element={<RoleRoute allowedRoles={['admin', 'client']}><Certificates /></RoleRoute>} />
                
                {/* Module 3: Student Interface */}
                <Route path="/student/assessments" element={<RoleRoute allowedRoles={['student']}><StudentDashboard /></RoleRoute>} />
                <Route path="/student/take/:id" element={<RoleRoute allowedRoles={['student']}><AssessmentTake /></RoleRoute>} />
                <Route path="/student/review/:id" element={<RoleRoute allowedRoles={['student']}><AssessmentReview /></RoleRoute>} />
                
                {/* Module 5: Analytics */}
                <Route path="/analytics" element={<RoleRoute allowedRoles={['admin', 'client']}><AnalyticsDashboard /></RoleRoute>} />
                
                {/* Question Library */}
                <Route path="/library" element={<RoleRoute allowedRoles={['admin', 'client']}><QuestionLibrary /></RoleRoute>} />
                
                {/* AI Question Generator ⭐ NEW */}
                <Route path="/ai/generate" element={<RoleRoute allowedRoles={['admin', 'client']}><AIQuestionGenerator /></RoleRoute>} />
                
                <Route path="*" element={<RoleHomeRedirect />} />
              </Routes>
            </Layout>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
