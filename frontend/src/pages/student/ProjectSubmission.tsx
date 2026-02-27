import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Play, UploadCloud } from 'lucide-react';
import { projectEvaluationsService } from '../../services/projectEvaluationsService';

function sectionList(items: any) {
  return Array.isArray(items) ? items.filter(Boolean) : [];
}

export function ProjectSubmission() {
  const { submissionId = '' } = useParams();
  const [detail, setDetail] = useState<any | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function load() {
    if (!submissionId) return;
    try {
      const res = await projectEvaluationsService.getLearnerAssignmentDetail(submissionId);
      setDetail(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load project assignment');
    }
  }

  useEffect(() => {
    load();
  }, [submissionId]);

  const brief = detail?.assessmentConfig?.brief || null;
  const canSubmit = useMemo(() => {
    const hasUploadedZip = Boolean(detail?.metadata?.zipUpload?.localPath || detail?.metadata?.zipUpload?.fileName);
    return Boolean(zipFile || hasUploadedZip);
  }, [zipFile, detail?.metadata]);

  async function uploadZip() {
    if (!submissionId || !zipFile) return;
    setWorking('upload');
    setError('');
    setMsg('');
    try {
      const res = await projectEvaluationsService.learnerUploadSubmissionZip(submissionId, zipFile);
      const d = res.data?.detection;
      setMsg(d ? `ZIP uploaded and detected as ${d.detectedFramework} (${d.confidence})` : 'ZIP uploaded');
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to upload ZIP');
    } finally {
      setWorking(null);
    }
  }

  async function submitAndEvaluate() {
    if (!submissionId) return;
    setWorking('submit');
    setError('');
    setMsg('');
    try {
      const res = await projectEvaluationsService.learnerSubmitAndEvaluate(submissionId);
      const run = res.data;
      const summary = run?.summary || run?.summary_json || {};
      const score = run?.score != null ? `${Number(run.score)}/${Number(run?.maxScore ?? run?.max_score ?? 100)}` : 'n/a';
      const phase2 = run?.runnerKind === 'phase2_react_vite_playwright_api'
        || run?.runner_kind === 'phase2_react_vite_playwright_api'
        || summary?.mode === 'browser_api_eval';
      const modeLabel = phase2 ? 'UI + API evaluation' : 'Browser evaluation';
      setMsg(run?.status === 'completed'
        ? `${modeLabel} completed (${summary.testsPassed ?? '?'} / ${summary.testsTotal ?? '?'} tests passed, score ${score})`
        : `${modeLabel} failed (${summary.testsPassed ?? '?'} / ${summary.testsTotal ?? '?'} tests passed, score ${score})`);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to submit project for evaluation');
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="space-y-6 px-4 sm:px-6 py-6 fade-in">
      <div className="flex items-center gap-3">
        <Link to="/student/projects" className="icon-btn" aria-label="Back to My Projects">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{detail?.assessmentTitle || 'Project Submission'}</h1>
          <p className="page-subtle">{detail?.evaluatorTemplateName || 'Phase 1 project evaluation'}</p>
        </div>
      </div>

      {error && <div className="ll-toast err">{error}</div>}
      {msg && <div className="ll-toast ok">{msg}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="card space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-semibold">Learner Brief</h2>
              <div className="text-xs text-[var(--text-muted)]">
                Status: <span className="font-semibold">{detail?.status || '-'}</span>
                {' • '}
                Due: <span className="font-semibold">{detail?.dueDate ? new Date(detail.dueDate).toLocaleString() : '-'}</span>
              </div>
            </div>

            {brief ? (
              <div className="space-y-4">
                {brief.businessContext && <section><h3 className="font-semibold text-sm mb-1">Business Context</h3><p className="text-sm text-[var(--text-muted)] whitespace-pre-wrap">{brief.businessContext}</p></section>}
                {brief.taskSummary && <section><h3 className="font-semibold text-sm mb-1">Your Task</h3><p className="text-sm text-[var(--text-muted)] whitespace-pre-wrap">{brief.taskSummary}</p></section>}
                {[
                  ['Expected User Flow', sectionList(brief.expectedFlow)],
                  ['Functional Requirements', sectionList(brief.requirements)],
                  ['Acceptance Criteria', sectionList(brief.acceptanceCriteria)],
                  ['Submission Instructions', sectionList(brief.submissionInstructions)],
                  ['Evaluation Notes', sectionList(brief.evaluationNotes)],
                  ['Stretch Goals', sectionList(brief.stretchGoals)]
                ].map(([title, items]: any) => items.length ? (
                  <section key={title}>
                    <h3 className="font-semibold text-sm mb-1">{title}</h3>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-[var(--text-muted)]">
                      {items.map((i: string, idx: number) => <li key={`${title}-${idx}`}>{i}</li>)}
                    </ul>
                  </section>
                ) : null)}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)] whitespace-pre-wrap">{detail?.assessmentDescription || 'No learner brief available.'}</p>
            )}
          </div>

          <div className="card space-y-4">
            <h2 className="text-lg font-semibold">Submit Project ZIP</h2>
            <input
              type="file"
              accept=".zip,application/zip"
              className="input-field"
              onChange={(e) => setZipFile(e.target.files?.[0] || null)}
            />
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={uploadZip} disabled={!zipFile || working === 'upload'}>
                <UploadCloud className="w-4 h-4" />
                {working === 'upload' ? 'Uploading...' : 'Upload ZIP'}
              </button>
              <button className="btn-primary" onClick={submitAndEvaluate} disabled={!canSubmit || working === 'submit'}>
                <Play className="w-4 h-4" />
                {working === 'submit' ? 'Running Evaluation...' : 'Submit & Evaluate'}
              </button>
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              Upload a React/Vite ZIP, then run automated evaluation. Some projects include Phase 2 API checks in addition to UI flow.
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card space-y-3">
            <h2 className="text-lg font-semibold">Latest Evaluation</h2>
            <div className="text-sm">Run status: <span className="font-semibold">{detail?.latestRunStatus || '—'}</span></div>
            <div className="text-sm">Score: <span className="font-semibold">{detail?.latestRunScore != null ? `${Number(detail.latestRunScore)}/${Number(detail?.latestRunMaxScore ?? 100)}` : '—'}</span></div>
            <div className="text-sm">Tests: <span className="font-semibold">{detail?.latestRunSummary?.testsPassed ?? '?'} / {detail?.latestRunSummary?.testsTotal ?? '?'}</span></div>
          </div>

          {Array.isArray(detail?.latestRunResult?.tests) && detail.latestRunResult.tests.length > 0 && (
            <div className="card space-y-3">
              <h2 className="text-lg font-semibold">Test Results</h2>
              <div className="space-y-2">
                {detail.latestRunResult.tests.map((t: any, idx: number) => (
                  <div key={`learner-run-test-${idx}`} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium">{t.name || `Test ${idx + 1}`}</div>
                      <span
                        className="px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wide"
                        style={{
                          borderColor: t.passed ? 'var(--green-dim)' : 'var(--red-dim)',
                          color: t.passed ? 'var(--green)' : 'var(--red)'
                        }}
                      >
                        {t.passed ? 'Passed' : 'Failed'}
                      </span>
                    </div>
                    {t.error && <div className="text-xs text-[var(--text-muted)] mt-1 whitespace-pre-wrap break-words">{String(t.error).slice(0, 300)}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
