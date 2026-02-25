import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, UserRound, Clock3, Shield, Activity, FileClock, Eye } from 'lucide-react';
import { assessmentService } from '../services/assessmentService';

export function ClientAssignmentDetail() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!assignmentId) return;
    setLoading(true);
    assessmentService
      .getAssignmentDetail(assignmentId)
      .then((res) => setData(res.data))
      .catch((e) => setError(e?.response?.data?.error || 'Failed to load assignment detail'))
      .finally(() => setLoading(false));
  }, [assignmentId]);

  const timeline = useMemo(() => {
    const a = data?.assignment;
    if (!a) return [];
    const items = [
      { label: 'Assigned', at: a.assignedAt, tone: 'neutral' },
      { label: 'Started', at: a.startedAt, tone: 'info' },
      { label: 'Draft Updated', at: a.draftUpdatedAt, tone: 'neutral' },
      { label: 'Last Activity', at: a.lastActivityAt, tone: 'neutral' },
      { label: 'Session Locked', at: a.sessionLockedAt, tone: 'warn' },
      { label: 'Submitted', at: a.submittedAt, tone: a.passed ? 'success' : 'warn' }
    ].filter((x) => !!x.at);
    return items;
  }, [data]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="card">
          <div className="text-red-300 font-semibold">Unable to load assignment detail</div>
          <div className="mt-2 text-sm" style={{ color: 'var(--text-dim)' }}>{error}</div>
          <button className="btn-secondary mt-4" onClick={() => navigate('/learners')}>
            Back to Learners
          </button>
        </div>
      </div>
    );
  }

  const assignment = data?.assignment;
  const assessment = data?.assessment;
  const learner = data?.learner;
  const focusEvents = Array.isArray(data?.focusEvents) ? data.focusEvents : [];
  const review = data?.review;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <section className="card">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-3">
            <div className="text-xs font-semibold tracking-wide" style={{ color: 'var(--text-dim)' }}>
              ASSIGNMENT DETAIL
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">{assessment?.title || 'Assignment'}</h1>
            <div className="flex flex-wrap gap-2 text-sm">
              <Chip icon={<UserRound className="w-4 h-4" />} label={learner?.fullName || 'Learner'} />
              {learner?.email ? <Chip icon={<Eye className="w-4 h-4" />} label={learner.email} /> : null}
              <Chip icon={<Shield className="w-4 h-4" />} label={assignment?.reentryPolicy === 'single_session' ? 'Single session' : 'Resume allowed'} />
              <Chip icon={<ClipboardList className="w-4 h-4" />} label={`Status: ${String(assignment?.status || '').replace('_', ' ')}`} />
            </div>
          </div>
          <div className="flex gap-2">
            {assignment?.reviewAvailable && (
              <Link to={`/learners/assignments/${assignmentId}/review`} className="btn-primary">
                Review Submission
              </Link>
            )}
            <Link to="/learners" className="btn-secondary">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mt-5">
          <Metric label="Score" value={assignment?.score != null ? `${Number(assignment.score).toFixed(1)}%` : 'N/A'} />
          <Metric label="Points" value={`${assignment?.pointsEarned ?? 0}/${assignment?.totalPoints ?? 0}`} />
          <Metric label="Time Spent" value={`${assignment?.timeSpentMinutes ?? 0}m`} />
          <Metric label="Focus Events" value={`${assignment?.focusEventCount ?? focusEvents.length ?? 0}`} />
          <Metric label="Time Limit" value={assessment?.timeLimitMinutes ? `${assessment.timeLimitMinutes}m` : 'None'} />
          <Metric label="Pass Threshold" value={assessment?.passingScore != null ? `${assessment.passingScore}%` : 'N/A'} />
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 card">
          <div className="flex items-center gap-2 mb-4">
            <FileClock className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Attempt Timeline</h2>
          </div>
          {timeline.length ? (
            <ol className="space-y-3">
              {timeline.map((item, idx) => (
                <li key={`${item.label}-${idx}`} className="flex gap-3">
                  <div className="mt-1">
                    <span className={`block h-2.5 w-2.5 rounded-full ${
                      item.tone === 'success' ? 'bg-green-400' :
                      item.tone === 'warn' ? 'bg-amber-400' :
                      item.tone === 'info' ? 'bg-blue-400' : 'bg-slate-400'
                    }`} />
                  </div>
                  <div>
                    <div className="font-medium">{item.label}</div>
                    <div className="text-sm" style={{ color: 'var(--text-dim)' }}>
                      {new Date(item.at).toLocaleString()}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="text-sm" style={{ color: 'var(--text-dim)' }}>
              No activity recorded yet.
            </div>
          )}
        </section>

        <section className="card space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Attempt Signals</h2>
          </div>
          <SignalRow label="Active session lock" value={assignment?.hasActiveSession ? 'Present' : 'None'} />
          <SignalRow label="Review payload" value={review ? 'Available' : 'Not stored'} />
          <SignalRow label="Focus/visibility events" value={`${focusEvents.length}`} />
          <SignalRow label="Allow review" value={assessment?.allowReviewAfterSubmission ? 'Yes' : 'No'} />
          <SignalRow label="Show results immediately" value={assessment?.showResultsImmediately ? 'Yes' : 'No'} />
          {assignment?.dueDate && (
            <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <div className="text-xs" style={{ color: 'var(--text-dim)' }}>Due Date</div>
              <div className="mt-1 flex items-center gap-2 font-medium">
                <Clock3 className="w-4 h-4" />
                {new Date(assignment.dueDate).toLocaleString()}
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <h2 className="text-lg font-semibold mb-3">Recent Focus / Visibility Events</h2>
        {focusEvents.length ? (
          <div className="flex flex-wrap gap-2">
            {focusEvents.slice(-40).map((event: any, idx: number) => {
              const risky = event.type === 'blur' || event.type === 'hidden';
              return (
                <span
                  key={`${event.type}-${event.at}-${idx}`}
                  className="px-2 py-1 rounded-full text-xs border"
                  style={{
                    borderColor: risky ? 'rgba(239,68,68,.35)' : 'var(--border)',
                    color: risky ? '#fecaca' : 'var(--text-dim)'
                  }}
                >
                  {event.type} · {event.at ? new Date(event.at).toLocaleTimeString() : ''}
                </span>
              );
            })}
          </div>
        ) : (
          <div className="text-sm" style={{ color: 'var(--text-dim)' }}>No focus/visibility events recorded.</div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="text-xs" style={{ color: 'var(--text-dim)' }}>{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

function Chip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
      {icon}
      {label}
    </span>
  );
}

function SignalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="text-sm" style={{ color: 'var(--text-dim)' }}>{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
