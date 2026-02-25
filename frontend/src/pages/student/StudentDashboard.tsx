import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentService } from '../../services/studentService';
import { Clock, CheckCircle, PlayCircle } from 'lucide-react';

export function StudentDashboard() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssessments();
  }, []);

  const loadAssessments = async () => {
    try {
      const response = await studentService.getMyAssessments();
      setAssessments(response.data);
    } catch (error) {
      console.error('Failed to load assessments', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Assessments</h1>
        <p className="text-gray-600 mt-1">View and take your assigned assessments</p>
      </div>

      <div className="grid gap-4">
        {assessments.map((item: any) => (
          <div key={item.studentAssessmentId} className="card hover:shadow-lg transition">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-semibold">{item.title}</h3>
                <p className="text-gray-600 mt-1">{item.description}</p>
                
                <div className="flex gap-6 mt-4 text-sm">
                  <div><span className="font-medium">Time Limit:</span> {item.timeLimitMinutes} min</div>
                  <div><span className="font-medium">Total Points:</span> {item.totalPoints}</div>
                  <div><span className="font-medium">Passing Score:</span> {item.passingScore}%</div>
                  {item.dueDate && <div><span className="font-medium">Due:</span> {new Date(item.dueDate).toLocaleString()}</div>}
                </div>

                {item.score && (
                  <div className="mt-4">
                    <span className="text-lg font-bold text-green-600">Score: {item.score}%</span>
                  </div>
                )}
              </div>

              <div className="ml-6">
                {item.status === 'assigned' && (
                  <button
                    onClick={() => navigate(`/student/take/${item.studentAssessmentId}`)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <PlayCircle className="w-5 h-5" />
                    Start Assessment
                  </button>
                )}
                {item.status === 'in_progress' && (
                  <button
                    onClick={() => navigate(`/student/take/${item.studentAssessmentId}`)}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Clock className="w-5 h-5" />
                    Continue
                  </button>
                )}
                {item.status === 'submitted' && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Submitted</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {assessments.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No assessments assigned yet
          </div>
        )}
      </div>
    </div>
  );
}
