import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAssessments, useDeleteAssessment } from '../../hooks/useAssessments';
import { Plus, Search, Eye, Edit, Trash, Copy } from 'lucide-react';

export function AssessmentList() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    page: 1,
    limit: 20
  });

  const { data, isLoading } = useAssessments(filters);
  const deleteMutation = useDeleteAssessment();

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Delete assessment "${title}"?`)) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        alert('Failed to delete assessment');
      }
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }

  const assessments = data?.data?.assessments || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assessments</h1>
          <p className="text-gray-600 mt-1">Create and manage assessments</p>
        </div>
        <Link to="/assessments/create" className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Create Assessment
        </Link>
      </div>

      <div className="card">
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search assessments..."
              className="input-field pl-10"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            />
          </div>
          <select
            className="input-field w-48"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Title</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Questions</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Points</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Time Limit</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {assessments.map((assessment: any) => (
                <tr key={assessment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{assessment.title}</div>
                    {assessment.description && (
                      <div className="text-sm text-gray-600 truncate max-w-md">{assessment.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      assessment.status === 'published' ? 'bg-green-100 text-green-800' :
                      assessment.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {assessment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{assessment.questionCount || 0}</td>
                  <td className="px-4 py-3 text-gray-600">{assessment.totalPoints}</td>
                  <td className="px-4 py-3 text-gray-600">{assessment.timeLimitMinutes || 'None'} min</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => navigate(`/assessments/${assessment.id}`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/assessments/${assessment.id}/edit`)}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(assessment.id, assessment.title)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {assessments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No assessments found</p>
            <Link to="/assessments/create" className="text-blue-600 hover:underline mt-2 inline-block">
              Create your first assessment
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
