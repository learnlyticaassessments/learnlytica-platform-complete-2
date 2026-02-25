import { useParams, useNavigate } from 'react-router-dom';
import { useAssessment, useDeleteAssessment, useAssessmentStats } from '../../hooks/useAssessments';
import { ArrowLeft, Edit, Trash, Users } from 'lucide-react';

export function AssessmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useAssessment(id!, ['questions', 'labTemplate']);
  const { data: statsData } = useAssessmentStats(id!);
  const deleteMutation = useDeleteAssessment();

  const handleDelete = async () => {
    if (confirm('Delete this assessment?')) {
      try {
        await deleteMutation.mutateAsync(id!);
        navigate('/assessments');
      } catch (error) {
        alert('Failed to delete');
      }
    }
  };

  if (isLoading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (!data?.data) return <div className="p-6"><div className="bg-red-50 p-6 rounded-lg">Assessment not found</div></div>;

  const assessment = data.data;
  const stats = statsData?.data;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button onClick={() => navigate('/assessments')} className="p-2 hover:bg-gray-100 rounded-lg mt-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold">{assessment.title}</h1>
            <p className="text-gray-600 mt-1">{assessment.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate(`/assessments/${id}/edit`)} className="btn-secondary flex items-center gap-2">
            <Edit className="w-4 h-4" />
            Edit
          </button>
          <button onClick={handleDelete} className="btn-danger">
            <Trash className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card">
          <div className="text-sm text-gray-600">Total Points</div>
          <div className="text-2xl font-bold mt-1">{assessment.totalPoints}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600">Time Limit</div>
          <div className="text-2xl font-bold mt-1">{assessment.timeLimitMinutes} min</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600">Passing Score</div>
          <div className="text-2xl font-bold mt-1">{assessment.passingScore}%</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600">Max Attempts</div>
          <div className="text-2xl font-bold mt-1">{assessment.maxAttempts}</div>
        </div>
      </div>

      {stats && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Statistics</h2>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Assigned</div>
              <div className="text-xl font-bold">{stats.totalAssigned}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Completed</div>
              <div className="text-xl font-bold">{stats.completed}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Avg Score</div>
              <div className="text-xl font-bold">{stats.averageScore.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Pass Rate</div>
              <div className="text-xl font-bold">{stats.passRate.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      )}

      {assessment.labTemplate && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Lab Environment</h2>
          <div className="space-y-2">
            <div><span className="font-medium">Name:</span> {assessment.labTemplate.name}</div>
            <div><span className="font-medium">Image:</span> {assessment.labTemplate.dockerImage}:{assessment.labTemplate.dockerTag}</div>
            <div><span className="font-medium">Category:</span> {assessment.labTemplate.category}</div>
          </div>
        </div>
      )}

      {assessment.questions && assessment.questions.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Questions ({assessment.questions.length})</h2>
          <div className="space-y-2">
            {assessment.questions.map((q: any, idx: number) => (
              <div key={q.id} className="flex items-center p-3 bg-gray-50 rounded">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-700 font-medium">{idx + 1}</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium">{q.question?.title || 'Question'}</div>
                </div>
                <div className="text-gray-600">{q.pointsOverride || q.question?.points || 0} pts</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
