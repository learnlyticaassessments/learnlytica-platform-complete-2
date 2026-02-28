import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateAssessment, useLabTemplates, useSeedDefaultLabTemplates } from '../../hooks/useAssessments';
import { useQuestionCurricula, useQuestions } from '../../hooks/useQuestions';
import { AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react';

const FRAMEWORK_FILTER_OPTIONS = [
  { value: '', label: 'All Languages/Frameworks' },
  { value: 'jest', label: 'JavaScript (Jest)' },
  { value: 'playwright', label: 'JavaScript (Playwright)' },
  { value: 'supertest', label: 'JavaScript API (Supertest)' },
  { value: 'pytest', label: 'Python (Pytest)' },
  { value: 'pytest-requests', label: 'Python API (Pytest-Requests)' },
  { value: 'junit', label: 'Java (JUnit)' },
  { value: 'dotnet', label: 'C#/.NET (xUnit)' }
];

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

function supportsFramework(template: any, framework: string): boolean {
  const templateCategory = String(template?.category || '').toLowerCase();
  const dockerImage = String(template?.dockerImage || '').toLowerCase();

  const nodeCapable = dockerImage.includes('node') || ['frontend', 'backend', 'fullstack', 'devops'].includes(templateCategory);
  const pythonCapable = dockerImage.includes('python') || ['backend', 'fullstack', 'devops'].includes(templateCategory);
  const javaCapable = dockerImage.includes('java') || dockerImage.includes('maven') || dockerImage.includes('gradle') || ['backend', 'fullstack'].includes(templateCategory);
  const dotnetCapable = dockerImage.includes('dotnet') || dockerImage.includes('aspnet') || dockerImage.includes('csharp') || dockerImage.includes('c#') || ['backend', 'fullstack'].includes(templateCategory);

  if (['jest', 'playwright', 'supertest', 'mocha', 'cypress'].includes(framework)) return nodeCapable;
  if (['pytest', 'pytest-requests'].includes(framework)) return pythonCapable;
  if (framework === 'junit') return javaCapable;
  if (framework === 'dotnet') return dotnetCapable;
  return false;
}

function frameworkWeight(dockerImage: string, framework: string): number {
  const image = String(dockerImage || '').toLowerCase();
  if (['jest', 'playwright', 'supertest', 'mocha', 'cypress'].includes(framework)) return image.includes('node') ? 3 : 1;
  if (['pytest', 'pytest-requests'].includes(framework)) return image.includes('python') ? 3 : 1;
  if (framework === 'junit') return image.includes('java') ? 3 : 1;
  if (framework === 'dotnet') return image.includes('dotnet') ? 3 : 1;
  return 0;
}

export function AssessmentCreate() {
  const navigate = useNavigate();
  const createMutation = useCreateAssessment();
  const seedDefaultsMutation = useSeedDefaultLabTemplates();
  const { data: labTemplatesData } = useLabTemplates();
  const [questionFilters, setQuestionFilters] = useState({
    curriculum: 'all',
    testFramework: '',
    difficulty: '',
    technicalFocus: '',
    search: ''
  });
  const filteredQuestionsQuery = useQuestions({
    status: 'published',
    limit: 100,
    curriculum: questionFilters.curriculum && questionFilters.curriculum !== 'all' ? questionFilters.curriculum : undefined,
    testFramework: (questionFilters.testFramework as any) || undefined,
    difficulty: (questionFilters.difficulty as any) || undefined,
    technicalFocus: questionFilters.technicalFocus || undefined,
    search: questionFilters.search.trim().length >= 2 ? questionFilters.search.trim() : undefined
  });
  const allQuestionsQuery = useQuestions({ status: 'published', limit: 100 });
  const { data: curriculaData } = useQuestionCurricula();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    editorMode: 'monaco',
    labTemplateId: '',
    timeLimitMinutes: 120,
    passingScore: 70,
    maxAttempts: 3,
    selectedQuestions: [] as string[],
    questionRuntimeTemplates: {} as Record<string, string>
  });

  const labTemplatesRaw = labTemplatesData?.data || [];
  const activeLabTemplates = labTemplatesRaw.filter((t: any) => t?.isActive !== false);
  const labTemplates = activeLabTemplates.length ? activeLabTemplates : labTemplatesRaw;
  const filteredQuestions = filteredQuestionsQuery.data?.questions || [];
  const allQuestions = allQuestionsQuery.data?.questions || [];
  const hasActiveQuestionFilters =
    (questionFilters.curriculum && questionFilters.curriculum !== 'all') ||
    !!questionFilters.testFramework ||
    !!questionFilters.difficulty ||
    !!questionFilters.technicalFocus ||
    questionFilters.search.trim().length >= 2;
  const questions = useMemo(() => {
    if (!hasActiveQuestionFilters) {
      // For default "All" view, prefer the full published list to avoid empty
      // states caused by backend filter/query mismatches.
      return allQuestions.length ? allQuestions : filteredQuestions;
    }
    return filteredQuestions;
  }, [hasActiveQuestionFilters, allQuestions, filteredQuestions]);
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
  const technicalFocusOptions = useMemo(() => {
    const set = new Set<string>();
    for (const q of allQuestions) {
      const value = String(q?.technicalFocus || '').trim();
      if (value) set.add(value);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allQuestions]);

  const selectedQuestionObjects = useMemo(
    () => allQuestions.filter((q: any) => formData.selectedQuestions.includes(q.id)),
    [allQuestions, formData.selectedQuestions]
  );

  const selectedFrameworks = useMemo(
    () =>
      Array.from(
        new Set(
          selectedQuestionObjects
            .map((q: any) => String(q?.testFramework || '').trim())
            .filter(Boolean)
        )
      ),
    [selectedQuestionObjects]
  );

  const suggestedRuntimeTemplate = useMemo(() => {
    if (!selectedFrameworks.length) return null;
    const compatible = labTemplates.filter((template: any) =>
      selectedFrameworks.every((fw) => supportsFramework(template, fw))
    );
    if (!compatible.length) return null;

    const ranked = compatible
      .map((template: any) => {
        const image = String(template?.dockerImage || '').toLowerCase();
        const category = String(template?.category || '').toLowerCase();
        let score = 0;
        if (category === 'fullstack') score += 1;
        for (const fw of selectedFrameworks) score += frameworkWeight(image, fw);
        return { template, score };
      })
      .sort((a: any, b: any) => b.score - a.score);
    return ranked[0]?.template || compatible[0];
  }, [labTemplates, selectedFrameworks]);

  useEffect(() => {
    if (!suggestedRuntimeTemplate?.id) return;
    if (!formData.labTemplateId) {
      setFormData((prev) => ({ ...prev, labTemplateId: suggestedRuntimeTemplate.id }));
      return;
    }
    const current = labTemplates.find((t: any) => t.id === formData.labTemplateId);
    if (!current) {
      setFormData((prev) => ({ ...prev, labTemplateId: suggestedRuntimeTemplate.id }));
      return;
    }
    const currentCompatible = selectedFrameworks.length
      ? selectedFrameworks.every((fw) => supportsFramework(current, fw))
      : true;
    if (!currentCompatible) {
      setFormData((prev) => ({ ...prev, labTemplateId: suggestedRuntimeTemplate.id }));
    }
  }, [suggestedRuntimeTemplate, formData.labTemplateId, labTemplates, selectedFrameworks]);

  const compatibilityIssues = useMemo(
    () =>
      selectedQuestionObjects
        .map((q: any) => {
          const overrideTemplateId = formData.questionRuntimeTemplates[q.id];
          const effectiveTemplateId = overrideTemplateId || formData.labTemplateId;
          const effectiveTemplate = labTemplates.find((t: any) => t.id === effectiveTemplateId);
          const issues = !effectiveTemplate
            ? ['No runtime template selected for this question']
            : checkCompatibility(q, effectiveTemplate);
          return { question: q, issues, template: effectiveTemplate };
        })
        .filter((row: any) => row.issues.length > 0),
    [selectedQuestionObjects, formData.questionRuntimeTemplates, formData.labTemplateId, labTemplates]
  );

  const totalSelectedPoints = selectedQuestionObjects.reduce((sum: number, q: any) => sum + (Number(q.points) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const questionPayload = formData.selectedQuestions.map((qId, index) => ({
        questionId: qId,
        orderIndex: index + 1,
        runtimeTemplateId: formData.questionRuntimeTemplates[qId] || undefined
      }));

      await createMutation.mutateAsync({
        title: formData.title,
        description: formData.description,
        questions: questionPayload,
        labTemplateId: formData.labTemplateId,
        timeLimitMinutes: formData.timeLimitMinutes,
        passingScore: formData.passingScore,
        maxAttempts: formData.maxAttempts
      });
      navigate('/assessments');
    } catch (error) {
      alert('Failed to create assessment');
    }
  };

  const handleSeedDefaults = async () => {
    try {
      const result = await seedDefaultsMutation.mutateAsync();
      const createdCount = Number(result?.data?.createdCount || 0);
      if (createdCount > 0) {
        alert(`Seeded ${createdCount} runtime template(s). Reloading page data...`);
      } else {
        alert('Default runtime templates already exist.');
      }
      window.location.reload();
    } catch (error) {
      console.error('Failed to seed runtime templates', error);
      alert('Failed to seed runtime templates');
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
            <p className="text-sm page-subtle mt-1">Choose learner editor mode, execution runtime template, and published questions. Preflight checks prevent runtime mismatch.</p>
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
            <h2 className="text-xl font-semibold mb-4">Editor Environment</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Learner Editor</label>
                <select
                  className="input-field"
                  value={formData.editorMode}
                  onChange={(e) => setFormData((prev) => ({ ...prev, editorMode: e.target.value }))}
                >
                  <option value="monaco">Monaco Editor (recommended)</option>
                  <option value="vscode_embedded" disabled>VS Code Embedded (coming soon)</option>
                </select>
                <p className="mt-2 text-xs text-gray-600">
                  This controls the coding UI learners see. Current production mode uses Monaco.
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Lab Runtime</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Select Runtime Template</label>
              <select
                required
                className="input-field"
                value={formData.labTemplateId}
                onChange={(e) => setFormData({ ...formData, labTemplateId: e.target.value })}
              >
                <option value="">{labTemplates.length ? 'Choose a template...' : 'No runtime templates found'}</option>
                {labTemplates.map((template: any) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.category})
                  </option>
                ))}
              </select>
              {selectedFrameworks.length > 0 && (
                <p className="mt-2 text-xs text-gray-600">
                  Required frameworks from selected questions: <span className="font-semibold">{selectedFrameworks.join(', ')}</span>
                  {suggestedRuntimeTemplate ? (
                    <>
                      {' '}• Suggested runtime: <span className="font-semibold">{suggestedRuntimeTemplate.name}</span>
                    </>
                  ) : (
                    <>
                      {' '}• <span className="text-amber-700 font-semibold">No compatible runtime template found yet</span>
                    </>
                  )}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-600">
                Execution runtime controls runner image and framework compatibility. It is separate from learner editor UI.
              </p>
              {!labTemplates.length && (
                <p className="mt-1 text-xs text-amber-700">
                  Create at least one runtime template in <span className="font-semibold">Lab Templates</span> to continue.
                </p>
              )}
              {!labTemplates.length && (
                <button
                  type="button"
                  className="btn-secondary mt-2"
                  onClick={handleSeedDefaults}
                  disabled={seedDefaultsMutation.isPending}
                >
                  {seedDefaultsMutation.isPending ? 'Seeding runtime templates...' : 'Seed Default Runtime Templates'}
                </button>
              )}
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
            <div className="mb-3 text-xs text-gray-600">
              Only <span className="font-semibold">published</span> questions are listed for assessment creation.
            </div>
            {(filteredQuestionsQuery.isError || allQuestionsQuery.isError) && (
              <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
                Question list query had an issue. Showing best available results.
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Filter by Curriculum</label>
                <select
                  className="input-field"
                  value={questionFilters.curriculum}
                  onChange={(e) => setQuestionFilters((prev) => ({ ...prev, curriculum: e.target.value }))}
                >
                  <option value="all">All Curricula (including uncategorized)</option>
                  <option value="__uncategorized__">Unmapped / No Curriculum</option>
                  {curriculumOptions.map((c: any) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Language / Framework</label>
                <select
                  className="input-field"
                  value={questionFilters.testFramework}
                  onChange={(e) => setQuestionFilters((prev) => ({ ...prev, testFramework: e.target.value }))}
                >
                  {FRAMEWORK_FILTER_OPTIONS.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Difficulty</label>
                <select
                  className="input-field"
                  value={questionFilters.difficulty}
                  onChange={(e) => setQuestionFilters((prev) => ({ ...prev, difficulty: e.target.value }))}
                >
                  <option value="">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Technical Focus</label>
                <select
                  className="input-field"
                  value={questionFilters.technicalFocus}
                  onChange={(e) => setQuestionFilters((prev) => ({ ...prev, technicalFocus: e.target.value }))}
                >
                  <option value="">All Technical Focus Areas</option>
                  {technicalFocusOptions.map((focus) => (
                    <option key={focus} value={focus}>
                      {focus}
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
                        const nextSelected = formData.selectedQuestions.filter(id => id !== question.id);
                        const nextRuntimeMap = { ...formData.questionRuntimeTemplates };
                        delete nextRuntimeMap[question.id];
                        setFormData({ ...formData, selectedQuestions: nextSelected, questionRuntimeTemplates: nextRuntimeMap });
                      }
                    }}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{question.title}</div>
                    <div className="text-sm text-gray-600">{question.points} pts · {question.category} · {question.testFramework || 'n/a'}</div>
                    {formData.selectedQuestions.includes(question.id) && (
                      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                        <label className="block text-xs font-medium mb-1 text-gray-700">
                          Runtime override for this question (optional)
                        </label>
                        <select
                          className="input-field text-sm"
                          value={formData.questionRuntimeTemplates[question.id] || ''}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              questionRuntimeTemplates: {
                                ...prev.questionRuntimeTemplates,
                                [question.id]: e.target.value
                              }
                            }))
                          }
                        >
                          <option value="">Use assessment default runtime</option>
                          {labTemplates.map((template: any) => (
                            <option key={template.id} value={template.id}>
                              {template.name} ({template.category})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </label>
              ))}
              {questions.length === 0 && (
                <div className="rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-gray-600">
                  No questions match these filters. Try selecting <span className="font-semibold">All Curricula</span> or clearing one of the filters.
                </div>
              )}
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
                      <div className="text-xs text-gray-600 mb-1">
                        {row.question.category} • {row.question.testFramework}
                        {row.template ? ` • runtime: ${row.template.name}` : ''}
                      </div>
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
