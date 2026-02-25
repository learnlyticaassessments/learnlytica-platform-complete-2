import { useParams, useNavigate } from 'react-router-dom';
import { useQuestion, useDeleteQuestion, useUpdateQuestionStatus } from '../hooks/useQuestions';
import { ArrowLeft, Edit, Trash, CheckCircle, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function QuestionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: question, isLoading, isError } = useQuestion(id!);
  const deleteMutation = useDeleteQuestion();
  const updateStatusMutation = useUpdateQuestionStatus();

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this question?')) {
      try {
        await deleteMutation.mutateAsync(id!);
        navigate('/questions');
      } catch (error) {
        alert('Failed to delete question');
      }
    }
  };

  const handlePublish = async () => {
    try {
      await updateStatusMutation.mutateAsync({ id: id!, status: 'published' });
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

  if (isError || !question) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-semibold">Question not found</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <button
            onClick={() => navigate('/questions')}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{question.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                {question.category}
              </span>
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
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${
                  question.status === 'published'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {question.status}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {question.status === 'draft' && (
            <button
              onClick={handlePublish}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <CheckCircle className="w-4 h-4" />
              Publish
            </button>
          )}
          <button
            onClick={() => navigate(`/questions/${id}/edit`)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            <Trash className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card">
          <div className="text-sm text-gray-600">Points</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{question.points}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600">Time Estimate</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{question.timeEstimate} min</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600">Test Framework</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{question.testFramework}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600">Test Cases</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {question.testConfig.testCases.length}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
        <div className="prose max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {question.description}
          </ReactMarkdown>
        </div>
      </div>

      {/* Skills & Tags */}
      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {question.skills.map((skill) => (
              <span
                key={skill}
                className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {question.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Test Cases */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Cases</h2>
        <div className="space-y-3">
          {question.testConfig.testCases.map((testCase, index) => (
            <div
              key={testCase.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-700 font-medium text-sm">{index + 1}</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{testCase.name}</div>
                  {testCase.description && (
                    <div className="text-sm text-gray-600 mt-1">{testCase.description}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  {testCase.points} points
                </div>
                <div className="flex items-center gap-2">
                  {testCase.visible ? (
                    <Eye className="w-4 h-4 text-green-600" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Starter Code */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Starter Code</h2>
        <div className="text-sm text-gray-600 mb-3">
          {question.starterCode.files.length} file(s)
        </div>
        <div className="space-y-3">
          {question.starterCode.files.map((file) => (
            <div key={file.path} className="bg-gray-900 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-2">{file.path}</div>
              <pre className="text-gray-100 text-sm overflow-x-auto">
                <code>{file.content}</code>
              </pre>
            </div>
          ))}
        </div>
      </div>

      {/* Solution (if exists) */}
      {question.solution && (
        <div className="card border-2 border-yellow-200 bg-yellow-50">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Solution (Hidden from Students)
          </h2>
          <div className="space-y-3">
            {question.solution.files.map((file) => (
              <div key={file.path} className="bg-gray-900 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-2">{file.path}</div>
                <pre className="text-gray-100 text-sm overflow-x-auto">
                  <code>{file.content}</code>
                </pre>
              </div>
            ))}
          </div>
          {question.solution.explanation && (
            <div className="mt-4 p-4 bg-white rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Explanation</h3>
              <div className="prose max-w-none text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {question.solution.explanation}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
