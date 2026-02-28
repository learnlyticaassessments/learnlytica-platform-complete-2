import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateAssessment, useLabTemplates } from '../../hooks/useAssessments';
import { useQuestionCurricula, useQuestions } from '../../hooks/useQuestions';
import { AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react';

function checkCompatibility(question: any, template: any): string[] {
  if (!template) return [];
  const issues: string[] = [];
  const templateCategory = template.category;
  const qCategory = question.category;
  const dockerImage = String(template.dockerImage || '').toLowerCase();
  const framework = question.testFramework;

  const categoryCompatible =
    templateCategory === 'fullstack' ||
    qCategory === templateCategory ||
    (templateCategory === 'backend' && ['database', 'devops'].includes(qCategory));
  if (!categoryCompatible) {
    issues.push(`Category mismatch (${qCategory} vs ${templateCategory})`);
  }

  const nodeCapable = dockerImage.includes('node') || ['frontend', 'backend', 'fullstack', 'devops'].includes(templateCategory);
  const pythonCapable = dockerImage.includes('python') || ['backend', 'fullstack', 'devops'].includes(templateCategory);
  const javaCapable = dockerImage.includes('java') || dockerImage.includes('maven') || dockerImage.includes('gradle') || ['backend', 'fullstack'].includes(templateCategory);
  const dotnetCapable = dockerImage.includes('dotnet') || dockerImage.includes('aspnet') || dockerImage.includes('csharp') || dockerImage.includes('c#') || ['backend', 'fullstack'].includes(templateCategory);

  if (['jest', 'playwright', 'supertest', 'mocha', 'cypress'].includes(framework) && !nodeCapable) {
    issues.push(`Framework ${framework} needs Node-capable lab`);
  }
  if (['pytest', 'pytest-requests'].includes(framework) && !pythonCapable) {
    issues.push(`Framework ${framework} needs Python-capable lab`);
  }
  if (framework === 'junit' && !javaCapable) {
    issues.push('Framework junit needs Java-capable lab');
  }
  if (framework === 'dotnet' && !dotnetCapable) {
    issues.push('Framework dotnet needs .NET-capable lab');
  }

  return issues;
}

export function AssessmentCreate() {
  const navigate = useNavigate();
  const createMutation = useCreateAssessment();
  const { data: labTemplatesData } = useLabTemplates({ isActive: true });
  const [questionFilters, setQuestionFilters] = useState({
    curriculum: '',
    search: ''
  });
  const { data: questionsData } = useQuestions({
    status: 'published',
    limit: 200,
    curriculum: questionFilters.curriculum || undefined,
    search: questionFilters.search.trim().length >= 2 ? questionFilters.search.trim() : undefined
  });
  const { data: allQuestionsData } = useQuestions({ status: 'published', limit: 200 });
  const { data: curriculaData } = useQuestionCurricula();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    labTemplateId: '',
    timeLimitMinutes: 120,
    passingScore: 70,
    maxAttempts: 3,
    selectedQuestions: [] as string[]
  });

  const labTemplates = labTemplatesData?.data || [];
  const questions = questionsData?.questions || [];
  const allQuestions = allQuestionsData?.questions || [];
  const selectedLabTemplate = labTemplates.find((t: any) => t.id === formData.labTemplateId);

  const fallbackCurriculumOptions = useMemo(() => {
    const set = new Set<string>();
    const collect = (items: any[]) => {
      for (const item of items || []) {
        const raw = String(item || '').trim();
        if (!raw) continue;
        const lower = raw.toLowerCase();
        if (lower.startsWith('curriculum:')) {
          set.add(raw.slice('curriculum:'.length).trim());
        } else if (lower.startsWith('curriculum-')) {
          set.add(raw.slice('curriculum-'.length).trim());
        }
      }
    };

    for (const q of allQuestions) {
      collect(Array.isArray(q.tags) ? q.tags : []);
      collect(Array.isArray(q.skills) ? q.skills : []);
    }
    return Array.from(set)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .map((slug) => ({ slug, name: slug.replace(/-/g, ' ') }));
  }, [allQuestions]);
  const curriculumOptions = (curriculaData?.map((c: any) => ({ slug: c.slug, name: c.name || c.slug })) || fallbackCurriculumOptions).filter((c: any) => c?.slug);

  const selectedQuestionObjects = useMemo(
    () => questions.filter((q: any) => formData.selectedQuestions.includes(q.id)),
    [questions, formData.selectedQuestions]
  );

  const compatibilityIssues = useMemo(
    () =>
      selectedLabTemplate
        ? selectedQuestionObjects
            .map((q: any) => ({ question: q, issues: checkCompatibility(q, selectedLabTemplate) }))
            .filter((row: any) => row.issues.length > 0)
        : [],
    [selectedQuestionObjects, selectedLabTemplate]
  );

  const totalSelectedPoints = selectedQuestionObjects.reduce((sum: number, q: any) => sum + (Number(q.points) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const questionPayload = formData.selectedQuestions.map((qId, index) => ({
        questionId: qId,
        orderIndex: index + 1
      }));

      await createMutation.mutateAsync({
        ...formData,
        questions: questionPayload
      });
      navigate('/assessments');
    } catch (error) {
      alert('Failed to create assessment');
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="page-header mb-6">
          <div className="flex items-center gap-4">
          <button onClick={() => navigate('/assessments')} className="icon-btn">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold">Create Assessment</h1>
            <p className="text-sm page-subtle mt-1">Select a lab template and published questions. Preflight checks help avoid framework/template mismatches.</p>
          </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  rows={4}
                  className="input-field"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Lab Environment</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Select Lab Template</label>
              <select
                required
                className="input-field"
                value={formData.labTemplateId}
                onChange={(e) => setFormData({ ...formData, labTemplateId: e.target.value })}
              >
                <option value="">Choose a template...</option>
                {labTemplates.map((template: any) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.category})
                  </option>
                ))}
              </select>
            </div>
            {selectedLabTemplate && (
              <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <div className="font-semibold">{selectedLabTemplate.name}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {selectedLabTemplate.category} {selectedLabTemplate.dockerImage ? `• ${selectedLabTemplate.dockerImage}` : ''}
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Questions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Filter by Curriculum</label>
                <select
                  className="input-field"
                  value={questionFilters.curriculum}
                  onChange={(e) => setQuestionFilters((prev) => ({ ...prev, curriculum: e.target.value }))}
                >
                  <option value="">All Curricula</option>
                  {curriculumOptions.map((c: any) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Search Questions</label>
                <input
                  className="input-field"
                  value={questionFilters.search}
                  onChange={(e) => setQuestionFilters((prev) => ({ ...prev, search: e.target.value }))}
                  placeholder="Type at least 2 characters"
                />
              </div>
            </div>
            <div className="mb-3 text-sm text-gray-600">
              Selected <span className="font-semibold">{selectedQuestionObjects.length}</span> question(s) •
              Total points <span className="font-semibold ml-1">{totalSelectedPoints}</span>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {questions.map((question: any) => (
                <label key={question.id} className="flex items-center p-3 hover:bg-gray-50 rounded-xl cursor-pointer border border-transparent hover:border-[var(--border)] transition">
                  <input
                    type="checkbox"
                    className="mr-3"
                    checked={formData.selectedQuestions.includes(question.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, selectedQuestions: [...formData.selectedQuestions, question.id] });
                      } else {
                        setFormData({ ...formData, selectedQuestions: formData.selectedQuestions.filter(id => id !== question.id) });
                      }
                    }}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{question.title}</div>
                    <div className="text-sm text-gray-600">{question.points} pts · {question.category} · {question.testFramework || 'n/a'}</div>
                  </div>
                </label>
              ))}
            </div>

            {!!selectedLabTemplate && !!selectedQuestionObjects.length && compatibilityIssues.length === 0 && (
              <div className="mt-4 rounded-xl border border-green-300 bg-green-50 p-3 flex items-start gap-2 text-sm text-green-800">
                <CheckCircle2 className="w-4 h-4 mt-0.5" />
                <div>Preflight compatibility check passed for the current lab template and selected questions.</div>
              </div>
            )}

            {!!compatibilityIssues.length && (
              <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
                <div className="flex items-start gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-700" />
                  <div className="font-semibold text-amber-900">Compatibility issues found</div>
                </div>
                <div className="text-sm text-amber-800 mb-3">
                  Backend validation will reject this assessment until these mismatches are resolved.
                </div>
                <div className="space-y-2 max-h-48 overflow-auto">
                  {compatibilityIssues.map((row: any) => (
                    <div key={row.question.id} className="rounded-lg border border-amber-200 bg-white/70 p-3">
                      <div className="font-medium">{row.question.title}</div>
                      <div className="text-xs text-gray-600 mb-1">{row.question.category} • {row.question.testFramework}</div>
                      <ul className="list-disc pl-4 text-sm text-amber-800">
                        {row.issues.map((issue: string) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Time Limit (minutes)</label>
                <input
                  type="number"
                  min="5"
                  className="input-field"
                  value={formData.timeLimitMinutes}
                  onChange={(e) => setFormData({ ...formData, timeLimitMinutes: parseInt(e.target.value || '120', 10) })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Passing Score (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="input-field"
                  value={formData.passingScore}
                  onChange={(e) => setFormData({ ...formData, passingScore: parseInt(e.target.value || '70', 10) })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Attempts</label>
                <input
                  type="number"
                  min="1"
                  className="input-field"
                  value={formData.maxAttempts}
                  onChange={(e) => setFormData({ ...formData, maxAttempts: parseInt(e.target.value || '3', 10) })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button type="button" onClick={() => navigate('/assessments')} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={createMutation.isPending || compatibilityIssues.length > 0} className="btn-primary">
              {createMutation.isPending ? 'Creating...' : 'Create Assessment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
