import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuestion, useDeleteQuestion, useUpdateQuestionStatus } from '../hooks/useQuestions';
import { ArrowLeft, Edit, Trash, CheckCircle, Eye, Download, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import JSZip from 'jszip';
import type { Question } from '../../../backend/shared/types/question.types';
import { useAuth } from '../auth/AuthContext';
import { can, getRoleLabel } from '../auth/permissions';

const QUESTION_PACKAGE_SCHEMA_VERSION = 1;

function exportLanguageFromPath(path: string) {
  const p = path.toLowerCase();
  if (p.endsWith('.py')) return 'python';
  if (p.endsWith('.java')) return 'java';
  return 'javascript';
}

function buildAuthorChecklist(question: Question, draftVerified: boolean) {
  const testCases = question.testConfig?.testCases || [];
  const visibleTestCases = testCases.filter((t) => t.visible);
  const totalTestPoints = testCases.reduce((sum, tc) => sum + (Number(tc.points) || 0), 0);
  return [
    { label: 'Description is sufficiently detailed', ok: (question.description || '').trim().length >= 20 },
    { label: 'At least one skill added', ok: (question.skills || []).length > 0 },
    { label: 'At least one tag added', ok: (question.tags || []).length > 0 },
    { label: 'Starter code files present', ok: (question.starterCode?.files || []).length > 0 },
    { label: 'Test cases configured', ok: testCases.length > 0 },
    { label: 'Test case points total > 0', ok: totalTestPoints > 0 },
    { label: 'At least one visible test case', ok: visibleTestCases.length > 0 },
    { label: 'Reference solution present', ok: (question.solution?.files || []).length > 0 },
    { label: 'Draft tests verified in authoring flow', ok: draftVerified }
  ];
}

export function QuestionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: question, isLoading, isError } = useQuestion(id!);
  const deleteMutation = useDeleteQuestion();
  const updateStatusMutation = useUpdateQuestionStatus();
  const createdFlow = searchParams.get('created') === '1';
  const draftVerified = searchParams.get('draftVerified') === '1';
  const canPublishQuestion = can(user?.role, 'questions.publish');

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
      if (createdFlow) {
        searchParams.delete('created');
        searchParams.delete('draftVerified');
        setSearchParams(searchParams, { replace: true });
      }
    } catch (error) {
      alert('Failed to publish question');
    }
  };

  const handleExportPackage = async () => {
    if (!question) return;
    try {
      const zip = new JSZip();

      for (const file of question.starterCode.files || []) {
        zip.file(`starter/${file.path}`, file.content ?? '');
      }
      for (const file of question.solution?.files || []) {
        zip.file(`solution/${file.path}`, file.content ?? '');
      }

      const testCases = question.testConfig?.testCases || [];
      const manifestTestCases = testCases.map((tc, idx) => {
        const ext = question.testFramework === 'pytest' ? 'py' : question.testFramework === 'junit' ? 'java' : 'js';
        const path = `tests/${tc.id || `tc_${String(idx + 1).padStart(3, '0')}`}.${ext}`;
        if (tc.testCode) {
          zip.file(path, tc.testCode);
        }
        return {
          id: tc.id,
          name: tc.name,
          description: tc.description,
          file: tc.file,
          testName: tc.testName,
          points: tc.points,
          visible: tc.visible,
          category: tc.category,
          ...(tc.testCode ? { testCodePath: path } : {})
        };
      });

      const manifest = {
        schemaVersion: QUESTION_PACKAGE_SCHEMA_VERSION,
        title: question.title,
        description: question.description,
        category: question.category,
        difficulty: question.difficulty,
        testFramework: question.testFramework,
        points: question.points,
        timeEstimate: question.timeEstimate,
        skills: question.skills || [],
        tags: question.tags || [],
        starterCode: {
          files: (question.starterCode.files || []).map((f) => ({
            path: f.path,
            source: `starter/${f.path}`,
            language: f.language || exportLanguageFromPath(f.path)
          }))
        },
        solution: question.solution
          ? {
              files: (question.solution.files || []).map((f) => ({
                path: f.path,
                source: `solution/${f.path}`,
                language: f.language || exportLanguageFromPath(f.path)
              }))
            }
          : { files: [] },
        testCases: manifestTestCases
      };

      zip.file('learnlytica-question.json', JSON.stringify(manifest, null, 2));
      zip.file('README.txt', [
        'Learnlytica Question Package (Exported)',
        '',
        'This package can be re-imported into Question Authoring for round-trip editing.',
        `Question ID: ${question.id}`,
        `Version: ${question.version}`
      ].join('\n'));

      const blob = await zip.generateAsync({ type: 'blob' });
      const safeTitle = (question.title || 'question').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${safeTitle || 'question'}-${question.testFramework}-v${question.version}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(error?.message || 'Failed to export question package ZIP');
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

  const checklist = buildAuthorChecklist(question, draftVerified);
  const checklistPassed = checklist.filter((item) => item.ok).length;
  const checklistComplete = checklist.every((item) => item.ok);

  return (
    <div className="p-6 space-y-6">
      {createdFlow && question.status === 'draft' && (
        <div className={`rounded-xl border p-5 ${checklistComplete ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                {checklistComplete ? <CheckCircle className="w-4 h-4 text-green-700" /> : <AlertTriangle className="w-4 h-4 text-amber-700" />}
                Create Question Success Checklist
              </div>
              <p className="text-sm text-gray-700">
                Question saved as draft. Review the checklist, then publish when ready. Passed {checklistPassed}/{checklist.length} checks.
              </p>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {checklist.map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${item.ok ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                      {item.ok ? '✓' : '•'}
                    </span>
                    <span className={item.ok ? 'text-gray-800' : 'text-gray-600'}>{item.label}</span>
                  </div>
                ))}
              </div>
              {!canPublishQuestion && (
                <div className="mt-3 rounded-lg border border-amber-300 bg-white/70 p-3 text-sm text-amber-900">
                  Publishing requires <span className="font-semibold">Platform Admin</span> role. You are signed in as{' '}
                  <span className="font-semibold">{getRoleLabel(user?.role)}</span>.
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/questions/${id}/edit`)}
                className="btn-secondary"
              >
                Edit First
              </button>
              <button
                onClick={handlePublish}
                disabled={!canPublishQuestion || !checklistComplete || updateStatusMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4" />
                {updateStatusMutation.isPending ? 'Publishing...' : 'Publish Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div className="flex items-start space-x-4">
          <button
            onClick={() => navigate('/questions')}
            className="icon-btn"
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

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={handleExportPackage}
            className="btn-secondary"
          >
            <Download className="w-4 h-4" />
            Export ZIP
          </button>
          {question.status === 'draft' && (
            <button
              onClick={handlePublish}
              disabled={!canPublishQuestion || updateStatusMutation.isPending}
              title={!canPublishQuestion ? 'Publishing requires Platform Admin role' : undefined}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-4 h-4" />
              {updateStatusMutation.isPending ? 'Publishing...' : 'Publish'}
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
