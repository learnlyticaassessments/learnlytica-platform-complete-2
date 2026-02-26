import { Fragment, useEffect, useMemo, useState } from 'react';
import { Layers3, Play, Plus, UploadCloud } from 'lucide-react';
import { projectEvaluationsService } from '../services/projectEvaluationsService';
import { learnersService } from '../services/learnersService';

function parseLines(input: string) {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function summarizeText(text?: string | null, max = 180) {
  const value = String(text || '').trim();
  if (!value) return '';
  if (value.length <= max) return value;
  return `${value.slice(0, max).trimEnd()}...`;
}

function parseLegacyDescriptionSections(description?: string | null) {
  const raw = String(description || '').trim();
  if (!raw) return null;

  const headings = [
    'Business Context',
    'Your Task',
    'Task Summary',
    'Expected Business Flow',
    'Expected User Flow',
    'Minimum UI Requirements',
    'Functional Requirements',
    'Suggested Data Model',
    'Acceptance Criteria',
    'Submission Instructions',
    'Framework/Submission Guidance',
    'Evaluation Notes',
    'Stretch Goals'
  ];

  let working = raw;
  headings.forEach((h) => {
    const escaped = h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\s*${escaped}(?:\\s*\\([^)]*\\))?\\s*:?\\s*`, 'gi');
    working = working.replace(re, `\n## ${h}\n`);
  });

  if (!working.includes('## ')) return null;

  const chunks = working
    .split('\n## ')
    .map((c) => c.trim())
    .filter(Boolean);

  const sections = chunks.map((chunk) => {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
    const firstLine = lines.shift() || '';
    const title = firstLine.replace(/^##\s*/, '').trim();
    const body = lines.join(' ').trim();

    const items = body
      .split(/\s+(?=(?:Agent|App|On success|Ticket list|Preferred stack|Submission for Phase 1|No backend required|One page is enough|Clear form labels|Required field validation|Submit button disabled|Recent Tickets|Clean readable layout|Filter tickets|Inline status change|Character counter|Persist tickets|Customer Name|Customer Email|Issue Category|Priority|Issue Description|Ticket ID|Category|Status)\b)/g)
      .map((i) => i.trim())
      .filter(Boolean);

    return {
      title,
      body,
      items: items.length >= 2 ? items : []
    };
  });

  return sections.length ? sections : null;
}

export function ProjectEvaluations() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [learners, setLearners] = useState<any[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  const [assessmentDetail, setAssessmentDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [msg, setMsg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [zipFile, setZipFile] = useState<File | null>(null);

  const [newAssessment, setNewAssessment] = useState({
    title: '',
    description: '',
    evaluatorTemplateId: '',
    frameworkScope: 'react_vite',
    submissionMode: 'zip_upload'
  });
  const [projectBrief, setProjectBrief] = useState({
    businessContext: '',
    taskSummary: '',
    expectedFlow: '',
    requirements: '',
    acceptanceCriteria: '',
    submissionInstructions: '',
    evaluationNotes: '',
    stretchGoals: ''
  });

  const [newSubmission, setNewSubmission] = useState({
    studentId: '',
    sourceType: 'zip_upload',
    zipFileName: '',
    sourceRef: '',
    repoUrl: '',
    repoBranch: 'main',
    frameworkHint: 'react_vite',
    notes: ''
  });

  async function loadAll(preserveSelected = true) {
    setLoading(true);
    setError('');
    try {
      const [t, a, l] = await Promise.all([
        projectEvaluationsService.listTemplates(),
        projectEvaluationsService.listAssessments(),
        learnersService.list()
      ]);
      setTemplates(t.data || []);
      setAssessments(a.data || []);
      setLearners(l.data || []);

      const fallbackAssessmentId = preserveSelected && selectedAssessmentId
        ? selectedAssessmentId
        : (a.data?.[0]?.id || '');
      if (fallbackAssessmentId) {
        setSelectedAssessmentId(fallbackAssessmentId);
        const detail = await projectEvaluationsService.getAssessment(fallbackAssessmentId);
        setAssessmentDetail(detail.data);
      } else {
        setAssessmentDetail(null);
      }

      if (!newAssessment.evaluatorTemplateId && t.data?.length) {
        setNewAssessment((prev) => ({ ...prev, evaluatorTemplateId: t.data[0].id }));
      }
      if (!newSubmission.studentId && l.data?.length) {
        setNewSubmission((prev) => ({ ...prev, studentId: l.data[0].id }));
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load project evaluations');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedAssessmentId) return;
    projectEvaluationsService.getAssessment(selectedAssessmentId)
      .then((res) => setAssessmentDetail(res.data))
      .catch((e) => setError(e?.response?.data?.error || 'Failed to load project assessment detail'));
  }, [selectedAssessmentId]);

  const selectedAssessment = useMemo(
    () => assessments.find((a) => a.id === selectedAssessmentId) || null,
    [assessments, selectedAssessmentId]
  );
  const structuredBrief = assessmentDetail?.config?.brief || null;
  const legacyDescriptionSections = !structuredBrief ? parseLegacyDescriptionSections(selectedAssessment?.description) : null;

  async function createAssessment() {
    if (!newAssessment.title.trim() || !newAssessment.evaluatorTemplateId) return;
    setWorking('assessment');
    setError('');
    setMsg('');
    try {
      await projectEvaluationsService.createAssessment({
        ...newAssessment,
        config: {
          brief: {
            businessContext: projectBrief.businessContext.trim(),
            taskSummary: projectBrief.taskSummary.trim(),
            expectedFlow: parseLines(projectBrief.expectedFlow),
            requirements: parseLines(projectBrief.requirements),
            acceptanceCriteria: parseLines(projectBrief.acceptanceCriteria),
            submissionInstructions: parseLines(projectBrief.submissionInstructions),
            evaluationNotes: parseLines(projectBrief.evaluationNotes),
            stretchGoals: parseLines(projectBrief.stretchGoals)
          }
        }
      });
      setMsg('Project assessment created');
      setNewAssessment((prev) => ({ ...prev, title: '', description: '' }));
      setProjectBrief({
        businessContext: '',
        taskSummary: '',
        expectedFlow: '',
        requirements: '',
        acceptanceCriteria: '',
        submissionInstructions: '',
        evaluationNotes: '',
        stretchGoals: ''
      });
      await loadAll(false);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to create project assessment');
    } finally {
      setWorking(null);
    }
  }

  async function deleteSelectedAssessment() {
    if (!selectedAssessmentId || !selectedAssessment) return;
    const ok = window.confirm(
      `Delete project assessment "${selectedAssessment.title}"?\n\nThis will also delete its reference submissions and evaluation runs.`
    );
    if (!ok) return;

    setWorking(`delete-assessment:${selectedAssessmentId}`);
    setError('');
    setMsg('');
    try {
      const res = await projectEvaluationsService.deleteAssessment(selectedAssessmentId);
      const deletedCount = res.data?.deletedSubmissionCount ?? 0;
      setMsg(`Deleted project assessment (${deletedCount} reference submission${deletedCount === 1 ? '' : 's'} removed)`);
      setSelectedAssessmentId('');
      setAssessmentDetail(null);
      await loadAll(false);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to delete project assessment');
    } finally {
      setWorking(null);
    }
  }

  async function submitProject() {
    if (!selectedAssessmentId || !newSubmission.studentId) return;
    setWorking('submission');
    setError('');
    setMsg('');
    try {
      const created = await projectEvaluationsService.createSubmission(selectedAssessmentId, {
        ...newSubmission,
        sourceType: newSubmission.sourceType,
        sourceRef: newSubmission.sourceType === 'zip_upload' ? newSubmission.sourceRef || newSubmission.zipFileName : undefined,
        repoUrl: newSubmission.sourceType === 'github' ? newSubmission.repoUrl : undefined,
        repoBranch: newSubmission.sourceType === 'github' ? newSubmission.repoBranch : undefined
      });
      if (newSubmission.sourceType === 'zip_upload' && zipFile) {
        const uploadRes = await projectEvaluationsService.uploadSubmissionZip(created.data.id, zipFile);
        const d = uploadRes.data?.detection;
        if (d) {
          setMsg(`ZIP uploaded and detected as ${d.detectedFramework} (${d.confidence})`);
        }
      }
      setMsg('Project submission recorded (Phase 1 scaffold)');
      setNewSubmission((prev) => ({ ...prev, zipFileName: '', sourceRef: '', notes: '' }));
      setZipFile(null);
      const detail = await projectEvaluationsService.getAssessment(selectedAssessmentId);
      setAssessmentDetail(detail.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to create project submission');
    } finally {
      setWorking(null);
    }
  }

  async function queueRun(submissionId: string) {
    setWorking(`run:${submissionId}`);
    setError('');
    setMsg('');
    try {
      const res = await projectEvaluationsService.queueRun(submissionId, { triggerType: 'manual' });
      const run = res.data;
      const summary = run?.summary || run?.summary_json || {};
      if (run?.runnerKind === 'phase1_react_vite_playwright' || run?.runner_kind === 'phase1_react_vite_playwright') {
        const scoreValue = run?.score != null ? Number(run.score) : null;
        const maxScoreValue = run?.maxScore != null ? Number(run.maxScore) : (run?.max_score != null ? Number(run.max_score) : 100);
        const score = Number.isFinite(scoreValue as number)
          ? `${scoreValue}/${Number.isFinite(maxScoreValue as number) ? maxScoreValue : 100}`
          : 'n/a';
        const testsPassed = summary?.testsPassed ?? '?';
        const testsTotal = summary?.testsTotal ?? '?';
        setMsg(run?.status === 'completed'
          ? `Browser evaluation completed (${testsPassed}/${testsTotal} tests passed, score ${score})`
          : `Browser evaluation failed (${testsPassed}/${testsTotal} tests passed, score ${score})`);
      } else if (summary?.state === 'preflight_complete') {
        setMsg(`Preflight validation completed (${summary?.checksPassed ?? 0}/${summary?.checksTotal ?? 0} checks passed)`);
      } else {
        setMsg('Evaluation run queued');
      }
      if (selectedAssessmentId) {
        const detail = await projectEvaluationsService.getAssessment(selectedAssessmentId);
        setAssessmentDetail(detail.data);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to queue evaluation run');
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="space-y-6 px-4 sm:px-6 py-6 fade-in">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] flex items-center justify-center">
            <Layers3 className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Project Evaluations (Phase 1)</h1>
            <p className="page-subtle">
              React/Vite ZIP + Playwright UI-flow evaluator scaffold. Queueing is wired; runner orchestration is the next step.
            </p>
          </div>
        </div>
      </div>

      {error && <div className="ll-toast err">{error}</div>}
      {msg && <div className="ll-toast ok">{msg}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 space-y-6">
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Evaluator Templates</h2>
              <span className="text-xs text-[var(--text-muted)]">{templates.length} active</span>
            </div>
            <div className="space-y-2 max-h-72 overflow-auto pr-1">
              {templates.map((t) => (
                <div key={t.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm">{t.name}</div>
                    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--surface-3)] border border-[var(--border)]">
                      {t.frameworkFamily}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-1">{t.description || 'No description'}</div>
                </div>
              ))}
              {!templates.length && !loading && <div className="text-sm text-[var(--text-muted)]">No templates found.</div>}
            </div>
          </div>

          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Create Project Assessment</h2>
              <Plus className="w-4 h-4 text-[var(--text-muted)]" />
            </div>
            <input className="input-field" placeholder="Assessment title" value={newAssessment.title} onChange={(e) => setNewAssessment((p) => ({ ...p, title: e.target.value }))} />
            <textarea className="input-field min-h-[90px]" placeholder="Description / expected business flow" value={newAssessment.description} onChange={(e) => setNewAssessment((p) => ({ ...p, description: e.target.value }))} />
            <select className="input-field" value={newAssessment.evaluatorTemplateId} onChange={(e) => setNewAssessment((p) => ({ ...p, evaluatorTemplateId: e.target.value }))}>
              <option value="">Select evaluator template</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <select className="input-field" value={newAssessment.frameworkScope} onChange={(e) => setNewAssessment((p) => ({ ...p, frameworkScope: e.target.value }))}>
                <option value="react_vite">react_vite</option>
                <option value="angular">angular</option>
                <option value="nextjs">nextjs</option>
              </select>
              <select className="input-field" value={newAssessment.submissionMode} onChange={(e) => setNewAssessment((p) => ({ ...p, submissionMode: e.target.value }))}>
                <option value="zip_upload">zip_upload</option>
                <option value="github">github</option>
              </select>
            </div>
            <details className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <summary className="cursor-pointer font-semibold text-sm">Learner Project Brief (Structured)</summary>
              <div className="mt-3 space-y-3">
                <textarea className="input-field min-h-[80px]" placeholder="Business Context (what business problem this project solves)" value={projectBrief.businessContext} onChange={(e) => setProjectBrief((p) => ({ ...p, businessContext: e.target.value }))} />
                <textarea className="input-field min-h-[80px]" placeholder="Task Summary (what the learner must build)" value={projectBrief.taskSummary} onChange={(e) => setProjectBrief((p) => ({ ...p, taskSummary: e.target.value }))} />
                <textarea className="input-field min-h-[90px]" placeholder={`Expected User Flow (one step per line)\n1. Open page\n2. Fill form\n3. Submit...`} value={projectBrief.expectedFlow} onChange={(e) => setProjectBrief((p) => ({ ...p, expectedFlow: e.target.value }))} />
                <textarea className="input-field min-h-[90px]" placeholder={`Functional Requirements (one per line)`} value={projectBrief.requirements} onChange={(e) => setProjectBrief((p) => ({ ...p, requirements: e.target.value }))} />
                <textarea className="input-field min-h-[90px]" placeholder={`Acceptance Criteria (one per line)`} value={projectBrief.acceptanceCriteria} onChange={(e) => setProjectBrief((p) => ({ ...p, acceptanceCriteria: e.target.value }))} />
                <textarea className="input-field min-h-[80px]" placeholder={`Submission Instructions (one per line)`} value={projectBrief.submissionInstructions} onChange={(e) => setProjectBrief((p) => ({ ...p, submissionInstructions: e.target.value }))} />
                <textarea className="input-field min-h-[70px]" placeholder={`Evaluation Notes (one per line)`} value={projectBrief.evaluationNotes} onChange={(e) => setProjectBrief((p) => ({ ...p, evaluationNotes: e.target.value }))} />
                <textarea className="input-field min-h-[70px]" placeholder={`Stretch Goals (optional, one per line)`} value={projectBrief.stretchGoals} onChange={(e) => setProjectBrief((p) => ({ ...p, stretchGoals: e.target.value }))} />
              </div>
            </details>
            <button className="btn-primary w-full" onClick={createAssessment} disabled={working === 'assessment'}>
              {working === 'assessment' ? 'Creating...' : 'Create Project Assessment'}
            </button>
          </div>
        </div>

        <div className="xl:col-span-2 space-y-6">
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Project Assessments</h2>
              <button className="btn-secondary !py-2" onClick={() => loadAll()} disabled={loading}>Refresh</button>
            </div>
            <div className="table-shell overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Template</th>
                    <th className="px-3 py-2">Framework</th>
                  </tr>
                </thead>
                <tbody>
                  {assessments.map((a) => (
                    <tr
                      key={a.id}
                      onClick={() => setSelectedAssessmentId(a.id)}
                      className={`cursor-pointer border-t border-[var(--border)] ${selectedAssessmentId === a.id ? 'bg-[var(--surface-3)]/60' : 'hover:bg-[var(--surface-2)]/70'}`}
                    >
                      <td className="px-3 py-2">{a.title}</td>
                      <td className="px-3 py-2">{a.status}</td>
                      <td className="px-3 py-2">{a.evaluatorTemplateName}</td>
                      <td className="px-3 py-2">{a.frameworkScope}</td>
                    </tr>
                  ))}
                  {!assessments.length && !loading && (
                    <tr><td className="px-3 py-4 text-[var(--text-muted)]" colSpan={4}>No project assessments yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {selectedAssessment && (
          <div className="card space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{selectedAssessment.title}</h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    {summarizeText(selectedAssessment.description) || 'No description'}
                  </p>
                </div>
                <div className="flex gap-2 text-xs items-center flex-wrap justify-end">
                  <span className="px-2 py-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)]">{selectedAssessment.frameworkScope}</span>
                  <span className="px-2 py-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)]">{selectedAssessment.submissionMode}</span>
                  <button
                    type="button"
                    className="btn-secondary !py-1.5 !px-2.5 text-[11px]"
                    style={{ borderColor: 'var(--red-dim)', color: 'var(--red)' }}
                    onClick={deleteSelectedAssessment}
                    disabled={working === `delete-assessment:${selectedAssessmentId}`}
                    title="Delete this project assessment and all its reference submissions/runs"
                  >
                    {working === `delete-assessment:${selectedAssessmentId}` ? 'Deleting...' : 'Delete Assessment'}
                  </button>
                </div>
              </div>

              {!!structuredBrief && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Learner Brief Preview</h3>
                    <span className="text-xs text-[var(--text-muted)]">Structured format (learner-facing)</span>
                  </div>
                  {structuredBrief.businessContext && (
                    <section>
                      <h4 className="text-sm font-semibold mb-1">Business Context</h4>
                      <p className="text-sm text-[var(--text-muted)] whitespace-pre-wrap">{structuredBrief.businessContext}</p>
                    </section>
                  )}
                  {structuredBrief.taskSummary && (
                    <section>
                      <h4 className="text-sm font-semibold mb-1">Your Task</h4>
                      <p className="text-sm text-[var(--text-muted)] whitespace-pre-wrap">{structuredBrief.taskSummary}</p>
                    </section>
                  )}
                  {[
                    ['Expected User Flow', structuredBrief.expectedFlow],
                    ['Functional Requirements', structuredBrief.requirements],
                    ['Acceptance Criteria', structuredBrief.acceptanceCriteria],
                    ['Submission Instructions', structuredBrief.submissionInstructions],
                    ['Evaluation Notes', structuredBrief.evaluationNotes],
                    ['Stretch Goals', structuredBrief.stretchGoals]
                  ].map(([label, items]: any) => Array.isArray(items) && items.length ? (
                    <section key={label}>
                      <h4 className="text-sm font-semibold mb-1">{label}</h4>
                      <ul className="space-y-1 text-sm text-[var(--text-muted)] list-disc pl-5">
                        {items.map((item: string, i: number) => <li key={`${label}-${i}`}>{item}</li>)}
                      </ul>
                    </section>
                  ) : null)}
                </div>
              )}

              {!structuredBrief && legacyDescriptionSections && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Learner Brief Preview</h3>
                    <span className="text-xs text-[var(--text-muted)]">Parsed from legacy description</span>
                  </div>
                  {legacyDescriptionSections.map((section) => (
                    <section key={section.title}>
                      <h4 className="text-sm font-semibold mb-1">{section.title}</h4>
                      {section.items.length ? (
                        <ul className="space-y-1 text-sm text-[var(--text-muted)] list-disc pl-5">
                          {section.items.map((item, i) => (
                            <li key={`${section.title}-${i}`}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-[var(--text-muted)] whitespace-pre-wrap">{section.body}</p>
                      )}
                    </section>
                  ))}
                </div>
              )}

              <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-4 space-y-3">
                <div className="flex items-center gap-2 font-semibold">
                  <UploadCloud className="w-4 h-4 text-[var(--accent)]" />
                  Reference Submission (Admin Validation)
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Use a reference project ZIP/GitHub repo to validate the evaluator and project brief before publishing/assigning to learners.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select className="input-field" value={newSubmission.studentId} onChange={(e) => setNewSubmission((p) => ({ ...p, studentId: e.target.value }))}>
                    <option value="">Select learner identity for validation record</option>
                    {learners.map((l) => <option key={l.id} value={l.id}>{l.fullName} ({l.email})</option>)}
                  </select>
                  <select className="input-field" value={newSubmission.sourceType} onChange={(e) => setNewSubmission((p) => ({ ...p, sourceType: e.target.value }))}>
                    <option value="zip_upload">zip_upload</option>
                    <option value="github">github</option>
                  </select>
                  {newSubmission.sourceType === 'zip_upload' ? (
                    <>
                      <input
                        type="file"
                        accept=".zip,application/zip"
                        className="input-field"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setZipFile(file);
                          setNewSubmission((p) => ({ ...p, zipFileName: file?.name || '' }));
                        }}
                      />
                      <input className="input-field" placeholder="Source ref (S3 key / local ref placeholder)" value={newSubmission.sourceRef} onChange={(e) => setNewSubmission((p) => ({ ...p, sourceRef: e.target.value }))} />
                    </>
                  ) : (
                    <>
                      <input className="input-field" placeholder="GitHub repo URL" value={newSubmission.repoUrl} onChange={(e) => setNewSubmission((p) => ({ ...p, repoUrl: e.target.value }))} />
                      <input className="input-field" placeholder="Branch" value={newSubmission.repoBranch} onChange={(e) => setNewSubmission((p) => ({ ...p, repoBranch: e.target.value }))} />
                    </>
                  )}
                  <input className="input-field" placeholder="Framework hint (react_vite)" value={newSubmission.frameworkHint} onChange={(e) => setNewSubmission((p) => ({ ...p, frameworkHint: e.target.value }))} />
                  <input className="input-field" placeholder="Optional notes" value={newSubmission.notes} onChange={(e) => setNewSubmission((p) => ({ ...p, notes: e.target.value }))} />
                </div>
                <button className="btn-primary" onClick={submitProject} disabled={working === 'submission' || (newSubmission.sourceType === 'zip_upload' && !zipFile)}>
                  {working === 'submission' ? 'Recording Reference Submission...' : 'Add Reference Submission'}
                </button>
                {newSubmission.sourceType === 'zip_upload' && !zipFile && (
                  <div className="text-xs text-[var(--text-muted)]">Attach a ZIP file to run Phase 1 preflight validation.</div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Reference Validation Submissions</h3>
                  <span className="text-xs text-[var(--text-muted)]">{assessmentDetail?.submissions?.length || 0} recorded</span>
                </div>
                <div className="table-shell overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left">
                        <th className="px-3 py-2">Validation Identity</th>
                        <th className="px-3 py-2">Source</th>
                        <th className="px-3 py-2">Detected</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Latest Validation</th>
                        <th className="px-3 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(assessmentDetail?.submissions || []).map((s: any) => (
                        <Fragment key={s.id}>
                          <tr key={s.id} className="border-t border-[var(--border)]">
                            <td className="px-3 py-2">
                              <div className="font-medium">{s.studentName || s.studentEmail}</div>
                              <div className="text-xs text-[var(--text-muted)]">{s.studentEmail}</div>
                            </td>
                            <td className="px-3 py-2">
                              <div>{s.sourceType}</div>
                              <div className="text-xs text-[var(--text-muted)]">{s.repoUrl || '-'}</div>
                            </td>
                            <td className="px-3 py-2">{s.detectedFramework || '-'}</td>
                            <td className="px-3 py-2">{s.status}</td>
                            <td className="px-3 py-2">
                              <div>{s.latestRunStatus || 'none'}</div>
                              {s.latestRunSummary && (
                                <div className="text-xs text-[var(--text-muted)]">
                                  {s.latestRunSummary.testsPassed ?? '?'}
                                  /
                                  {s.latestRunSummary.testsTotal ?? '?'} tests
                                </div>
                              )}
                              {(s.latestRunScore != null || s.latestScore != null) && (
                                <div className="text-xs text-[var(--text-muted)]">
                                  score {Number(s.latestRunScore ?? s.latestScore)}/{Number(s.latestRunMaxScore ?? 100)}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <button
                                className="btn-secondary !py-1.5 !px-2.5 text-xs"
                                onClick={() => queueRun(s.id)}
                                disabled={working === `run:${s.id}`}
                              >
                                <Play className="w-3.5 h-3.5" />
                                {working === `run:${s.id}` ? 'Running...' : 'Run Preflight Validation'}
                              </button>
                            </td>
                          </tr>
                          {Array.isArray(s?.latestRunResult?.tests) && s.latestRunResult.tests.length > 0 && (
                            <tr className="border-t border-[var(--border)]/50 bg-[var(--surface-2)]/50">
                              <td className="px-3 py-2" colSpan={6}>
                                <div className="text-xs font-semibold mb-2 text-[var(--text-2)]">Latest Test Results</div>
                                <div className="space-y-1">
                                  {s.latestRunResult.tests.map((t: any, idx: number) => (
                                    <div key={`${s.id}-test-${idx}`} className="flex items-start justify-between gap-3 text-xs rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5">
                                      <div className="min-w-0">
                                        <div className="font-medium truncate">{t.name || `Test ${idx + 1}`}</div>
                                        {t.error && (
                                          <div className="text-[var(--text-muted)] whitespace-pre-wrap break-words mt-0.5">{String(t.error).slice(0, 220)}</div>
                                        )}
                                      </div>
                                      <span
                                        className="shrink-0 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wide"
                                        style={{
                                          borderColor: t.passed ? 'var(--green-dim)' : 'var(--red-dim)',
                                          color: t.passed ? 'var(--green)' : 'var(--red)'
                                        }}
                                      >
                                        {t.passed ? 'Passed' : 'Failed'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                      {!assessmentDetail?.submissions?.length && (
                        <tr><td className="px-3 py-4 text-[var(--text-muted)]" colSpan={6}>No reference validation submissions yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
