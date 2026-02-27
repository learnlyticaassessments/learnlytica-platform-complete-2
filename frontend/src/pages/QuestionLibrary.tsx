import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Book, FileText, FolderKanban, Upload, RefreshCw, Search, Layers3 } from 'lucide-react';
import questionService from '../services/questionService';
import { projectEvaluationsService } from '../services/projectEvaluationsService';
import { libraryService } from '../services/libraryService';
import { assessmentService, labTemplateService } from '../services/assessmentService';

type TabKey = 'catalog' | 'templates' | 'samples' | 'guidelines';

export function QuestionLibrary() {
  const [activeTab, setActiveTab] = useState<TabKey>('catalog');
  const [loading, setLoading] = useState(true);
  const [workingImportPath, setWorkingImportPath] = useState<string | null>(null);
  const [workingCreateAssessment, setWorkingCreateAssessment] = useState(false);
  const [workingCreateProjectAssessment, setWorkingCreateProjectAssessment] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [query, setQuery] = useState('');

  const [questions, setQuestions] = useState<any[]>([]);
  const [projectTemplates, setProjectTemplates] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [samples, setSamples] = useState<any[]>([]);
  const [guidelines, setGuidelines] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<any>(null);
  const [labTemplates, setLabTemplates] = useState<any[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [assessmentDraft, setAssessmentDraft] = useState({
    title: '',
    description: '',
    labTemplateId: '',
    timeLimitMinutes: 120,
    passingScore: 70,
    maxAttempts: 3
  });
  const [selectedProjectTemplateId, setSelectedProjectTemplateId] = useState<string>('');
  const [projectAssessmentDraft, setProjectAssessmentDraft] = useState({
    title: '',
    description: '',
    status: 'draft',
    submissionMode: 'zip_upload',
    frameworkScope: 'react_vite',
    timeLimitMinutes: 180
  });

  async function loadLibraryData() {
    setLoading(true);
    setError('');
    try {
      const [qRes, pRes, templatesRes, samplesRes, guidelinesRes, statsRes] = await Promise.all([
        questionService.list({ page: 1, limit: 200 }),
        projectEvaluationsService.listTemplates(),
        libraryService.listTemplates(),
        libraryService.listSamples(),
        libraryService.listGuidelines(),
        libraryService.getStats()
      ]);
      const labRes = await labTemplateService.list({ isActive: true, limit: 200 });

      setQuestions(qRes.questions || []);
      setProjectTemplates((pRes.data || []).slice().sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))));
      setTemplates(templatesRes.data || []);
      setSamples(samplesRes.data || []);
      setGuidelines(guidelinesRes.data || {});
      setStats(statsRes.data || null);
      const labs = labRes?.data || [];
      setLabTemplates(labs);
      setAssessmentDraft((prev) => ({
        ...prev,
        labTemplateId: prev.labTemplateId || labs[0]?.id || ''
      }));
      setSelectedProjectTemplateId((prev) => prev || (pRes.data || [])[0]?.id || '');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load library');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLibraryData();
  }, []);

  const filteredQuestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return questions;
    return questions.filter((item: any) =>
      String(item?.title || '').toLowerCase().includes(q)
      || String(item?.category || '').toLowerCase().includes(q)
      || String(item?.difficulty || '').toLowerCase().includes(q)
      || String(item?.testFramework || '').toLowerCase().includes(q)
    );
  }, [questions, query]);
  const selectableQuestions = useMemo(
    () => filteredQuestions.filter((q: any) => String(q?.status || '').toLowerCase() === 'published'),
    [filteredQuestions]
  );

  const filteredProjectTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projectTemplates;
    return projectTemplates.filter((item: any) =>
      String(item?.name || '').toLowerCase().includes(q)
      || String(item?.slug || '').toLowerCase().includes(q)
      || String(item?.frameworkFamily || '').toLowerCase().includes(q)
      || String(item?.targetKind || '').toLowerCase().includes(q)
    );
  }, [projectTemplates, query]);
  const selectedProjectTemplate = useMemo(
    () => projectTemplates.find((t: any) => t.id === selectedProjectTemplateId) || null,
    [projectTemplates, selectedProjectTemplateId]
  );

  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t: any) =>
      String(t?.name || '').toLowerCase().includes(q) || String(t?.language || '').toLowerCase().includes(q)
    );
  }, [templates, query]);

  const filteredSamples = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return samples;
    return samples.filter((s: any) =>
      String(s?.name || '').toLowerCase().includes(q)
      || String(s?.difficulty || '').toLowerCase().includes(q)
      || String(s?.question?.title || '').toLowerCase().includes(q)
    );
  }, [samples, query]);

  const guidelinesEntries = useMemo(() => Object.entries(guidelines), [guidelines]);

  async function importFromLibrary(libraryPath: string) {
    setWorkingImportPath(libraryPath);
    setError('');
    setMsg('');
    try {
      const res = await libraryService.importQuestion(libraryPath);
      setMsg(res.message || 'Question imported from library');
      await loadLibraryData();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to import library item');
    } finally {
      setWorkingImportPath(null);
    }
  }

  function toggleQuestionSelection(questionId: string) {
    setSelectedQuestionIds((prev) =>
      prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId]
    );
  }

  function toggleSelectAllVisiblePublished() {
    const visibleIds = selectableQuestions.map((q: any) => q.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id: string) => selectedQuestionIds.includes(id));
    if (allSelected) {
      setSelectedQuestionIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      return;
    }
    setSelectedQuestionIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  }

  async function createAssessmentFromSelection() {
    const title = assessmentDraft.title.trim();
    if (!title) {
      setError('Assessment title is required');
      return;
    }
    if (!assessmentDraft.labTemplateId) {
      setError('Select a lab template');
      return;
    }
    if (!selectedQuestionIds.length) {
      setError('Select at least one published question');
      return;
    }

    setWorkingCreateAssessment(true);
    setError('');
    setMsg('');
    try {
      const payload = {
        title,
        description: assessmentDraft.description || `Created from Library catalog (${selectedQuestionIds.length} question(s))`,
        labTemplateId: assessmentDraft.labTemplateId,
        timeLimitMinutes: Number(assessmentDraft.timeLimitMinutes || 120),
        passingScore: Number(assessmentDraft.passingScore || 70),
        maxAttempts: Number(assessmentDraft.maxAttempts || 3),
        questions: selectedQuestionIds.map((questionId, idx) => ({
          questionId,
          orderIndex: idx + 1
        }))
      };
      const res = await assessmentService.create(payload);
      const created = res?.data;
      setMsg(`Draft assessment created: ${created?.title || title}`);
      setSelectedQuestionIds([]);
      setAssessmentDraft((prev) => ({ ...prev, title: '', description: '' }));
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to create assessment from library selection');
    } finally {
      setWorkingCreateAssessment(false);
    }
  }

  useEffect(() => {
    if (!selectedProjectTemplate) return;
    const scope = String(selectedProjectTemplate.frameworkFamily || 'react_vite');
    setProjectAssessmentDraft((prev) => ({
      ...prev,
      title: prev.title || `${selectedProjectTemplate.name} Assessment`,
      description: prev.description || `Created from library project template: ${selectedProjectTemplate.name}`,
      frameworkScope: scope
    }));
  }, [selectedProjectTemplate]);

  async function createProjectAssessmentFromTemplate() {
    if (!selectedProjectTemplateId) {
      setError('Select a project template');
      return;
    }
    const title = projectAssessmentDraft.title.trim();
    if (!title) {
      setError('Project assessment title is required');
      return;
    }
    setWorkingCreateProjectAssessment(true);
    setError('');
    setMsg('');
    try {
      const payload = {
        title,
        description: projectAssessmentDraft.description || null,
        evaluatorTemplateId: selectedProjectTemplateId,
        status: projectAssessmentDraft.status || 'draft',
        submissionMode: projectAssessmentDraft.submissionMode || 'zip_upload',
        frameworkScope: projectAssessmentDraft.frameworkScope || selectedProjectTemplate?.frameworkFamily || 'react_vite',
        timeLimitMinutes: Number(projectAssessmentDraft.timeLimitMinutes || 180),
        config: {}
      };
      const res = await projectEvaluationsService.createAssessment(payload);
      const created = res?.data;
      setMsg(`Project assessment created: ${created?.title || title}`);
      setProjectAssessmentDraft((prev) => ({ ...prev, title: '', description: '' }));
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to create project assessment from template');
    } finally {
      setWorkingCreateProjectAssessment(false);
    }
  }

  return (
    <div className="p-6 space-y-6 fade-in">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] flex items-center justify-center">
            <Book className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Library</h1>
            <p className="page-subtle">
              Reusable catalog for Questions, Project Templates, sample packs, and authoring guidelines.
            </p>
          </div>
        </div>
      </div>

      {error && <div className="ll-toast err">{error}</div>}
      {msg && <div className="ll-toast ok">{msg}</div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Questions" value={String(questions.length)} icon={<FileText className="w-5 h-5" />} />
        <StatCard label="Project Templates" value={String(projectTemplates.length)} icon={<FolderKanban className="w-5 h-5" />} />
        <StatCard label="Library Templates" value={String(stats?.totalTemplates || 0)} icon={<Layers3 className="w-5 h-5" />} />
        <StatCard label="Sample Questions" value={String(stats?.totalSamples || 0)} icon={<Upload className="w-5 h-5" />} />
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {[
              ['catalog', 'Catalog'],
              ['templates', 'Templates'],
              ['samples', 'Samples'],
              ['guidelines', 'Guidelines']
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`btn-secondary !py-1.5 !px-2.5 text-xs ${activeTab === key ? '!border-[var(--accent)] !text-[var(--accent)]' : ''}`}
                onClick={() => setActiveTab(key as TabKey)}
              >
                {label}
              </button>
            ))}
          </div>
          <button className="btn-secondary !py-1.5 !px-2.5 text-xs" onClick={() => void loadLibraryData()} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            className="input-field pl-9"
            placeholder="Search library..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-6">
          <div className="card p-4 space-y-3">
            <h2 className="text-lg font-semibold">Create Assessment from Selected Questions</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Select published questions from the Questions Catalog below, choose a lab template, and create a draft assessment in one click.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
              <input
                className="input-field xl:col-span-2"
                placeholder="Assessment title"
                value={assessmentDraft.title}
                onChange={(e) => setAssessmentDraft((p) => ({ ...p, title: e.target.value }))}
              />
              <select
                className="input-field"
                value={assessmentDraft.labTemplateId}
                onChange={(e) => setAssessmentDraft((p) => ({ ...p, labTemplateId: e.target.value }))}
              >
                <option value="">Select lab template</option>
                {labTemplates.map((l: any) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              <input
                type="number"
                min={5}
                className="input-field"
                placeholder="Time limit"
                value={assessmentDraft.timeLimitMinutes}
                onChange={(e) => setAssessmentDraft((p) => ({ ...p, timeLimitMinutes: Number(e.target.value || 120) }))}
              />
              <button className="btn-primary" onClick={createAssessmentFromSelection} disabled={workingCreateAssessment || !selectedQuestionIds.length}>
                {workingCreateAssessment ? 'Creating...' : `Create Draft (${selectedQuestionIds.length})`}
              </button>
            </div>
            <textarea
              className="input-field"
              placeholder="Optional description"
              rows={2}
              value={assessmentDraft.description}
              onChange={(e) => setAssessmentDraft((p) => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div className="card p-4 space-y-3">
            <h2 className="text-lg font-semibold">Create Project Assessment from Project Template</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Select a project evaluator template from the Project Template Catalog and create a draft/published project assessment.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
              <select
                className="input-field xl:col-span-2"
                value={selectedProjectTemplateId}
                onChange={(e) => setSelectedProjectTemplateId(e.target.value)}
              >
                <option value="">Select project template</option>
                {filteredProjectTemplates.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.frameworkFamily || 'n/a'})
                  </option>
                ))}
              </select>
              <input
                className="input-field xl:col-span-2"
                placeholder="Project assessment title"
                value={projectAssessmentDraft.title}
                onChange={(e) => setProjectAssessmentDraft((p) => ({ ...p, title: e.target.value }))}
              />
              <select
                className="input-field"
                value={projectAssessmentDraft.status}
                onChange={(e) => setProjectAssessmentDraft((p) => ({ ...p, status: e.target.value }))}
              >
                <option value="draft">draft</option>
                <option value="published">published</option>
              </select>
              <input
                type="number"
                min={30}
                className="input-field"
                placeholder="Time limit"
                value={projectAssessmentDraft.timeLimitMinutes}
                onChange={(e) => setProjectAssessmentDraft((p) => ({ ...p, timeLimitMinutes: Number(e.target.value || 180) }))}
              />
              <button
                className="btn-primary xl:col-span-1"
                onClick={createProjectAssessmentFromTemplate}
                disabled={workingCreateProjectAssessment || !selectedProjectTemplateId}
              >
                {workingCreateProjectAssessment ? 'Creating...' : 'Create Project'}
              </button>
            </div>
            <textarea
              className="input-field"
              rows={2}
              placeholder="Optional project assessment description"
              value={projectAssessmentDraft.description}
              onChange={(e) => setProjectAssessmentDraft((p) => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="card p-4">
            <h2 className="text-lg font-semibold mb-3">Questions Catalog</h2>
            <div className="table-shell overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectableQuestions.length > 0 && selectableQuestions.every((q: any) => selectedQuestionIds.includes(q.id))}
                        onChange={toggleSelectAllVisiblePublished}
                        title="Select all visible published questions"
                      />
                    </th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Difficulty</th>
                    <th className="px-3 py-2">Framework</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuestions.slice(0, 120).map((q: any) => (
                    <tr key={q.id} className="border-t border-[var(--border)]">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedQuestionIds.includes(q.id)}
                          disabled={String(q?.status || '').toLowerCase() !== 'published'}
                          onChange={() => toggleQuestionSelection(q.id)}
                        />
                      </td>
                      <td className="px-3 py-2">{q.title}</td>
                      <td className="px-3 py-2">{q.category || '-'}</td>
                      <td className="px-3 py-2">{q.difficulty || '-'}</td>
                      <td className="px-3 py-2">{q.testFramework || '-'}</td>
                      <td className="px-3 py-2">{q.status || '-'}</td>
                    </tr>
                  ))}
                  {!filteredQuestions.length && (
                    <tr><td className="px-3 py-4 text-[var(--text-muted)]" colSpan={6}>No questions found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-4">
            <h2 className="text-lg font-semibold mb-3">Project Template Catalog</h2>
            <div className="table-shell overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Slug</th>
                    <th className="px-3 py-2">Framework</th>
                    <th className="px-3 py-2">Target</th>
                    <th className="px-3 py-2">Version</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjectTemplates.slice(0, 120).map((t: any) => (
                    <tr key={t.id} className="border-t border-[var(--border)]">
                      <td className="px-3 py-2">{t.name}</td>
                      <td className="px-3 py-2 font-mono text-xs">{t.slug}</td>
                      <td className="px-3 py-2">{t.frameworkFamily || '-'}</td>
                      <td className="px-3 py-2">{t.targetKind || '-'}</td>
                      <td className="px-3 py-2">{t.version || '-'}</td>
                    </tr>
                  ))}
                  {!filteredProjectTemplates.length && (
                    <tr><td className="px-3 py-4 text-[var(--text-muted)]" colSpan={5}>No project templates found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTemplates.map((t: any) => {
            const libraryPath = `templates/${t.language}/${t.name}.json`;
            return (
              <div key={`${t.language}-${t.name}`} className="card p-4 space-y-3">
                <div>
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{t.language}</div>
                </div>
                <div className="text-sm text-[var(--text-muted)] line-clamp-3">
                  {String(t?.template?.description || 'No description')}
                </div>
                <button
                  className="btn-primary w-full"
                  onClick={() => importFromLibrary(libraryPath)}
                  disabled={workingImportPath === libraryPath}
                >
                  {workingImportPath === libraryPath ? 'Importing...' : 'Import as Draft Question'}
                </button>
              </div>
            );
          })}
          {!filteredTemplates.length && <div className="text-sm text-[var(--text-muted)]">No templates found.</div>}
        </div>
      )}

      {activeTab === 'samples' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSamples.map((s: any) => {
            const libraryPath = `samples/${s.difficulty}/${s.name}.json`;
            return (
              <div key={`${s.difficulty}-${s.name}`} className="card p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">{s?.question?.title || s.name}</div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] uppercase">
                    {s.difficulty}
                  </span>
                </div>
                <div className="text-xs text-[var(--text-muted)]">{s?.question?.category || '-'}</div>
                <div className="text-sm text-[var(--text-muted)] line-clamp-3">
                  {String(s?.question?.description || 'No description')}
                </div>
                <button
                  className="btn-primary w-full"
                  onClick={() => importFromLibrary(libraryPath)}
                  disabled={workingImportPath === libraryPath}
                >
                  {workingImportPath === libraryPath ? 'Importing...' : 'Import Sample as Draft'}
                </button>
              </div>
            );
          })}
          {!filteredSamples.length && <div className="text-sm text-[var(--text-muted)]">No samples found.</div>}
        </div>
      )}

      {activeTab === 'guidelines' && (
        <div className="space-y-4">
          {guidelinesEntries.map(([name, content]) => (
            <div key={name} className="card p-4 space-y-2">
              <div className="font-semibold">{name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())}</div>
              <pre className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs whitespace-pre-wrap break-words max-h-72 overflow-auto text-[var(--text)]">
                {content}
              </pre>
            </div>
          ))}
          {!guidelinesEntries.length && <div className="text-sm text-[var(--text-muted)]">No guidelines found.</div>}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide">{label}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
        </div>
        <div className="w-10 h-10 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-center text-[var(--accent)]">
          {icon}
        </div>
      </div>
    </div>
  );
}
