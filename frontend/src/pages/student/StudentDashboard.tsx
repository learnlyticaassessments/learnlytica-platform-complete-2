import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileCheck2,
  PlayCircle,
  Eye,
  Target,
  TimerReset
} from 'lucide-react';
import { studentService } from '../../services/studentService';

function statusMeta(status: string) {
  switch (status) {
    case 'assigned':
      return { label: 'Assigned', color: 'text-amber-300', bg: 'var(--amber-bg)' };
    case 'in_progress':
      return { label: 'In Progress', color: 'text-blue-300', bg: 'var(--cyan-bg)' };
    case 'submitted':
      return { label: 'Submitted', color: 'text-green-300', bg: 'var(--green-bg)' };
    default:
      return { label: status || 'Unknown', color: 'text-slate-300', bg: 'var(--surface-3)' };
  }
}

export function StudentDashboard() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadAssessments();
  }, []);

  const loadAssessments = async () => {
    setLoading(true);
    try {
      const response = await studentService.getMyAssessments();
      setAssessments(response.data || []);
    } catch (error) {
      console.error('Failed to load assessments', error);
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    const total = assessments.length;
    const assigned = assessments.filter((a) => a.status === 'assigned').length;
    const inProgress = assessments.filter((a) => a.status === 'in_progress').length;
    const submitted = assessments.filter((a) => a.status === 'submitted').length;
    return { total, assigned, inProgress, submitted };
  }, [assessments]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <section className="card">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold tracking-wide" style={{ color: 'var(--text-dim)' }}>
              LEARNER WORKSPACE
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">My Assessments</h1>
            <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
              Start, continue, and submit coding assessments with test feedback and timed progress.
            </p>
          </div>
          <button onClick={loadAssessments} className="btn-secondary self-start">
            <TimerReset className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          {[
            ['Total', summary.total, FileCheck2],
            ['Assigned', summary.assigned, CalendarClock],
            ['In Progress', summary.inProgress, Clock3],
            ['Submitted', summary.submitted, CheckCircle2]
          ].map(([label, value, Icon]: any) => (
            <div key={label} className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold" style={{ color: 'var(--text-dim)' }}>{label}</div>
                <Icon className="w-4 h-4" style={{ color: 'var(--accent-2)' }} />
              </div>
              <div className="mt-2 text-2xl font-bold">{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        {assessments.map((item: any) => {
          const meta = statusMeta(item.status);
          const actionLabel =
            item.status === 'assigned' ? 'Start Assessment' :
            item.status === 'in_progress' ? 'Continue Assessment' :
            null;

          return (
            <div key={item.studentAssessmentId} className="card">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${meta.color}`} style={{ background: meta.bg }}>
                      {meta.label}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs" style={{ background: 'var(--surface-2)', color: 'var(--text-dim)' }}>
                      Attempt #{item.attemptNumber || 1}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-semibold">{item.title}</h3>
                  {item.description && (
                    <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
                      {item.description}
                    </p>
                  )}

                  <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                    <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                      <div style={{ color: 'var(--text-dim)' }}>Time Limit</div>
                      <div className="mt-1 font-semibold">{item.timeLimitMinutes || 0} min</div>
                    </div>
                    <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                      <div style={{ color: 'var(--text-dim)' }}>Total Points</div>
                      <div className="mt-1 font-semibold">{item.totalPoints || 0}</div>
                    </div>
                    <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                      <div style={{ color: 'var(--text-dim)' }}>Passing Score</div>
                      <div className="mt-1 font-semibold">{item.passingScore || 0}%</div>
                    </div>
                    <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                      <div style={{ color: 'var(--text-dim)' }}>Due Date</div>
                      <div className="mt-1 font-semibold text-xs sm:text-sm">
                        {item.dueDate ? new Date(item.dueDate).toLocaleString() : 'No due date'}
                      </div>
                    </div>
                  </div>

                  {typeof item.score === 'number' && (
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--surface)' }}>
                        <Target className="w-4 h-4 text-green-400" />
                        <span style={{ color: 'var(--text-muted)' }}>Score</span>
                        <span className="font-bold text-green-300">{item.score.toFixed?.(1) ?? item.score}%</span>
                      </div>
                      {item.submittedAt && (
                        <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
                          Submitted: {new Date(item.submittedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="xl:ml-6 flex items-center gap-2">
                  {actionLabel ? (
                    <button
                      onClick={() => navigate(`/student/take/${item.studentAssessmentId}`)}
                      className={item.status === 'assigned' ? 'btn-primary' : 'btn-secondary'}
                    >
                      {item.status === 'assigned' ? <PlayCircle className="w-4 h-4" /> : <Clock3 className="w-4 h-4" />}
                      {actionLabel}
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-green-300" style={{ background: 'var(--green-bg)' }}>
                      <CheckCircle2 className="w-4 h-4" />
                      Submitted
                    </div>
                  )}
                  {item.status === 'submitted' && (item.showResultsImmediately || item.allowReviewAfterSubmission) && (
                    <button
                      onClick={() => navigate(`/student/review/${item.studentAssessmentId}`)}
                      className="btn-secondary"
                    >
                      <Eye className="w-4 h-4" />
                      Review Results
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {assessments.length === 0 && (
          <div className="card text-center py-12">
            <div className="text-lg font-semibold">No assessments assigned yet</div>
            <p className="mt-2" style={{ color: 'var(--text-dim)' }}>
              When an organization admin assigns an assessment, it will appear here.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
