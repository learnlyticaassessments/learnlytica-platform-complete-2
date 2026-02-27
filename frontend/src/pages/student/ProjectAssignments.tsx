import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, Trash2, UploadCloud } from 'lucide-react';
import { projectEvaluationsService } from '../../services/projectEvaluationsService';

export function ProjectAssignments() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await projectEvaluationsService.listLearnerAssignments();
      setRows(res.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load project assignments');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function deleteUploadedZip(submissionId: string) {
    if (!confirm('Delete uploaded ZIP and evaluator artifacts for this project submission?')) return;
    setWorkingId(submissionId);
    setError('');
    setMsg('');
    try {
      await projectEvaluationsService.learnerDeleteSubmissionZip(submissionId);
      setMsg('Uploaded ZIP deleted. You can upload a new version anytime.');
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to delete uploaded ZIP');
    } finally {
      setWorkingId(null);
    }
  }

  function hasUploadedZip(row: any) {
    if (row?.metadata?.zipUpload?.localPath || row?.metadata?.zipUpload?.fileName) return true;
    // Backward-compatible fallback when metadata is not returned by older backend builds.
    const status = String(row?.status || '').toLowerCase();
    return ['submitted', 'preflight_completed', 'evaluation_queued', 'evaluation_completed', 'evaluation_failed'].includes(status);
  }

  return (
    <div className="space-y-6 px-4 sm:px-6 py-6 fade-in">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Projects</h1>
            <p className="page-subtle">Assigned project assessments for submission and automated evaluation.</p>
          </div>
        </div>
      </div>

      {error && <div className="ll-toast err">{error}</div>}
      {msg && <div className="ll-toast ok">{msg}</div>}

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Assigned Projects</h2>
          <button className="btn-secondary !py-2" onClick={load} disabled={loading}>Refresh</button>
        </div>
        <div className="table-shell overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-3 py-2">Project</th>
                <th className="px-3 py-2">Template</th>
                <th className="px-3 py-2">Due</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Latest Result</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.projectAssessmentTitle}</div>
                    <div className="text-xs text-[var(--text-muted)]">{r.projectAssessmentDescription || 'No description'}</div>
                  </td>
                  <td className="px-3 py-2 text-xs">{r.evaluatorTemplateName || '-'}</td>
                  <td className="px-3 py-2 text-xs">{r.dueDate ? new Date(r.dueDate).toLocaleString() : '-'}</td>
                  <td className="px-3 py-2">{r.status}</td>
                  <td className="px-3 py-2">
                    <div className="text-xs">{r.latestRunStatus || '—'}</div>
                    {r.latestRunSummary && (
                      <div className="text-xs text-[var(--text-muted)]">
                        {r.latestRunSummary.testsPassed ?? '?'} / {r.latestRunSummary.testsTotal ?? '?'} tests
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Link className="btn-secondary !py-1.5 !px-2.5 text-xs" to={`/student/projects/${r.id}`}>
                        <UploadCloud className="w-3.5 h-3.5" />
                        Open
                      </Link>
                      <button
                        className="btn-secondary !py-1.5 !px-2.5 text-xs"
                        onClick={() => deleteUploadedZip(r.id)}
                        disabled={workingId === r.id || !hasUploadedZip(r)}
                        title={hasUploadedZip(r) ? 'Delete uploaded ZIP' : 'No uploaded ZIP available'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {workingId === r.id ? 'Deleting...' : 'Delete ZIP'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && !loading && (
                <tr><td className="px-3 py-4 text-[var(--text-muted)]" colSpan={6}>No project assignments yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
