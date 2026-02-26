import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAssessments, useDeleteAssessment } from '../../hooks/useAssessments';
import { Plus, Search, Eye, Edit, Trash } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { can, getRoleLabel } from '../../auth/permissions';

export function AssessmentList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    page: 1,
    limit: 20
  });

  const { data, isLoading } = useAssessments(filters);
  const deleteMutation = useDeleteAssessment();
  const canCreate = can(user?.role, 'assessments.create');
  const canEdit = can(user?.role, 'assessments.edit');
  const canDelete = can(user?.role, 'assessments.delete');

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
      <div className="page-header">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text)]">Assessments</h1>
          <p className="page-subtle mt-1">
            {canCreate
              ? 'Create and manage assessments for your organization'
              : `Assessment access (${getRoleLabel(user?.role)})`}
          </p>
        </div>
        {canCreate && (
          <Link to="/assessments/create" className="btn-primary">
            <Plus className="w-5 h-5" />
            Create Assessment
          </Link>
        )}
      </div>

      <div className="card">
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-dim)] w-5 h-5" />
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

        <div className="overflow-x-auto table-shell">
          <table className="w-full">
            <thead className="border-b">
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
                        className="icon-btn"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => navigate(`/assessments/${assessment.id}/edit`)}
                          className="icon-btn"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(assessment.id, assessment.title)}
                          className="icon-btn"
                          title={user?.role === 'admin' ? 'Delete' : 'Delete (Organization scope)'}
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      )}
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
            {canCreate && (
              <Link to="/assessments/create" className="text-[var(--accent)] hover:text-[var(--accent-2)] mt-2 inline-block font-semibold">
                Create your first assessment
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
