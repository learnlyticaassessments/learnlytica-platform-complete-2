/**
 * Question List Page
 * Browse, search, and manage questions
 * @module pages/QuestionList
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuestions, useDeleteQuestion, useUpdateQuestionStatus } from '../hooks/useQuestions';
import type { QuestionFilters } from '../../../backend/shared/types/question.types';
import { useAuth } from '../auth/AuthContext';
import { can, getRoleLabel } from '../auth/permissions';
import { 
  Search, 
  Plus, 
  Eye,
  Edit,
  Trash,
  CheckCircle,
} from 'lucide-react';

export function QuestionList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filters, setFilters] = useState<QuestionFilters>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const { data, isLoading, isError, error } = useQuestions(filters);
  const deleteMutation = useDeleteQuestion();
  const updateStatusMutation = useUpdateQuestionStatus();
  const canCreate = can(user?.role, 'questions.create');
  const canEdit = can(user?.role, 'questions.edit');
  const canPublish = can(user?.role, 'questions.publish');
  const canDelete = can(user?.role, 'questions.delete');

  const handleSearch = (search: string) => {
    setFilters(prev => ({ ...prev, search, page: 1 }));
  };

  const handleFilterChange = (key: keyof QuestionFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this question?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        alert('Failed to delete question');
      }
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id, status: 'published' });
    } catch (error) {
      alert('Failed to publish question');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-800 font-semibold">Error loading questions</h3>
        <p className="text-red-600">{error?.message}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Questions</h1>
          <p className="text-gray-600 mt-1">
            {canCreate
              ? 'Manage your organization question repository'
              : `Question repository (${getRoleLabel(user?.role)})`}
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => navigate('/questions/create')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Create Question
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search questions..."
            value={filters.search || ''}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={filters.category || ''}
            onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            <option value="frontend">Frontend</option>
            <option value="backend">Backend</option>
            <option value="fullstack">Full-Stack</option>
            <option value="database">Database</option>
            <option value="devops">DevOps</option>
          </select>

          <select
            value={filters.difficulty || ''}
            onChange={(e) => handleFilterChange('difficulty', e.target.value || undefined)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <select
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="review">In Review</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={filters.testFramework || ''}
            onChange={(e) => handleFilterChange('testFramework', e.target.value || undefined)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Frameworks</option>
            <option value="playwright">Playwright</option>
            <option value="jest">Jest</option>
            <option value="pytest">Pytest</option>
            <option value="junit">JUnit</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      {data && (
        <div className="text-sm text-gray-600">
          Showing {(data.page - 1) * data.limit + 1} to{' '}
          {Math.min(data.page * data.limit, data.total)} of {data.total} questions
        </div>
      )}

      {/* Questions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Difficulty
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Points
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data?.questions.map((question) => (
              <tr key={question.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium text-gray-900">{question.title}</div>
                    <div className="text-sm text-gray-500">
                      {question.skills.slice(0, 3).join(', ')}
                      {question.skills.length > 3 && ` +${question.skills.length - 3}`}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    {question.category}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      question.difficulty === 'easy'
                        ? 'bg-green-100 text-green-800'
                        : question.difficulty === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {question.difficulty}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      question.status === 'published'
                        ? 'bg-green-100 text-green-800'
                        : question.status === 'review'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {question.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{question.points}</td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {question.timeEstimate} min
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => navigate(`/questions/${question.id}`)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => navigate(`/questions/${question.id}/edit`)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {canPublish && question.status === 'draft' && (
                      <button
                        onClick={() => handlePublish(question.id)}
                        className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition"
                        title="Publish (Platform Admin only)"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(question.id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition"
                        title="Delete (Platform Admin only)"
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

        {data && data.questions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No questions found</p>
            {canCreate && (
              <button
                onClick={() => navigate('/questions/create')}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Create your first question
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => handlePageChange(data.page - 1)}
            disabled={data.page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {data.page} of {data.totalPages}
          </span>
          <button
            onClick={() => handlePageChange(data.page + 1)}
            disabled={!data.hasMore}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default QuestionList;
