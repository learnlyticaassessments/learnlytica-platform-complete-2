import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock3, Target, XCircle, UserRound, Mail } from 'lucide-react';
import { assessmentService } from '../services/assessmentService';

export function ClientAssignmentReview() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!assignmentId) return;
    setLoading(true);
    assessmentService
      .getAssignmentReview(assignmentId)
      .then((res) => setData(res.data))
      .catch((e) => setError(e?.response?.data?.error || 'Failed to load learner review'))
      .finally(() => setLoading(false));
  }, [assignmentId]);

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
          <div className="text-red-300 font-semibold">Unable to load learner review</div>
          <div className="mt-2 text-sm" style={{ color: 'var(--text-dim)' }}>{error}</div>
          <button className="btn-secondary mt-4" onClick={() => navigate('/learners')}>
            Back to Learners
          </button>
        </div>
      </div>
    );
  }

  const review = data?.review;
  const assessment = data?.assessment;
  const learner = data?.learner;
  const attempt = data?.assignment;
  const questions = review?.questions || [];
  const focusEvents = review?.focusEvents || [];

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold tracking-wide" style={{ color: 'var(--text-dim)' }}>
                CLIENT REVIEW • LEARNER ATTEMPT
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold mt-1">{assessment?.title || 'Assignment Review'}</h1>
              <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
                Review per-question and per-test performance for this learner submission.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
                <UserRound className="w-4 h-4" />
                {learner?.fullName || 'Learner'}
              </span>
              {learner?.email && (
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
                  <Mail className="w-4 h-4" />
                  {learner.email}
                </span>
              )}
              <span className="px-3 py-2 rounded-xl border text-xs font-medium" style={{ borderColor: 'var(--border)' }}>
                Re-entry: {attempt?.reentryPolicy === 'single_session' ? 'Single session' : 'Resume allowed'}
              </span>
            </div>
          </div>
          <Link to="/learners" className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            Back to Learners
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
          <StatCard label="Score" value={`${Number(attempt?.score ?? review?.score ?? 0).toFixed(1)}%`} />
          <StatCard
            label="Points"
            value={`${attempt?.pointsEarned ?? review?.pointsEarned ?? 0}/${attempt?.totalPoints ?? review?.totalPoints ?? 0}`}
          />
          <StatCard label="Time Spent" value={`${attempt?.timeSpentMinutes ?? review?.timeSpentMinutes ?? 0}m`} />
          <StatCard label="Questions" value={`${questions.length}`} />
          <StatCard
            label="Result"
            value={attempt?.passed ? 'Passed' : 'Not Passed'}
            accent={attempt?.passed ? 'success' : 'danger'}
          />
        </div>
      </section>

      {focusEvents.length ? (
        <section className="card">
          <h2 className="text-lg font-semibold mb-3">Focus / Visibility Activity</h2>
          <div className="flex flex-wrap gap-2">
            {focusEvents.slice(-30).map((event: any, idx: number) => {
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
        </section>
      ) : null}

      <section className="space-y-4">
        {questions.map((q: any, idx: number) => {
          const allPassed = q.testsRun > 0 && q.testsPassed === q.testsRun;
          return (
            <div key={q.questionId || idx} className="card">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <div className="text-xs" style={{ color: 'var(--text-dim)' }}>Question {idx + 1}</div>
                  <h2 className="text-lg font-semibold mt-1">{q.title}</h2>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 rounded-full border" style={{ borderColor: 'var(--border)' }}>
                      {q.pointsEarned}/{q.totalPoints} pts
                    </span>
                    <span className="px-2 py-1 rounded-full border" style={{ borderColor: 'var(--border)' }}>
                      {q.testsPassed}/{q.testsRun} tests passed
                    </span>
                    {q.executionTime != null && (
                      <span className="px-2 py-1 rounded-full border" style={{ borderColor: 'var(--border)' }}>
                        <Clock3 className="w-3 h-3 inline mr-1" />
                        {Math.round(q.executionTime)} ms
                      </span>
                    )}
                    {q.difficulty && (
                      <span className="px-2 py-1 rounded-full border" style={{ borderColor: 'var(--border)' }}>
                        {q.difficulty}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl ${allPassed ? 'text-green-300' : 'text-amber-300'}`}
                  style={{ background: allPassed ? 'var(--green-bg)' : 'var(--amber-bg)' }}
                >
                  {allPassed ? <CheckCircle2 className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                  {allPassed ? 'All tests passed' : 'Needs improvement'}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {(q.results || []).map((r: any, i: number) => (
                  <div
                    key={i}
                    className="rounded-xl border p-3"
                    style={{
                      borderColor: r.passed ? 'rgba(34,197,94,.35)' : 'rgba(239,68,68,.35)',
                      background: r.passed ? 'var(--green-bg)' : 'color-mix(in srgb, var(--red) 8%, var(--surface))'
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className={`font-medium text-sm ${r.passed ? 'text-green-300' : 'text-red-300'}`}>
                          {r.passed ? <CheckCircle2 className="w-4 h-4 inline mr-1" /> : <XCircle className="w-4 h-4 inline mr-1" />}
                          {r.name || `Test ${i + 1}`}
                        </div>
                        {r.error && (
                          <pre className="mt-2 text-xs whitespace-pre-wrap leading-5" style={{ color: 'var(--text-dim)' }}>
                            {r.error}
                          </pre>
                        )}
                      </div>
                      <div className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                        {r.points || 0} pts
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {q.output && (
                <div className="mt-4">
                  <div className="text-sm font-semibold mb-2">Execution Output</div>
                  <div className="rounded-xl border p-3 max-h-64 overflow-auto" style={{ borderColor: 'var(--border)', background: '#0b1220' }}>
                    <pre className="text-xs whitespace-pre-wrap leading-5" style={{ color: '#c7ddf7' }}>
                      {String(q.output)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {!questions.length && (
          <div className="card">
            <div className="text-sm" style={{ color: 'var(--text-dim)' }}>
              Detailed review data is not available for this learner attempt.
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent
}: {
  label: string;
  value: string;
  accent?: 'success' | 'danger';
}) {
  const color =
    accent === 'success' ? 'text-green-300' :
    accent === 'danger' ? 'text-red-300' :
    '';

  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="text-xs" style={{ color: 'var(--text-dim)' }}>{label}</div>
      <div className={`mt-1 text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
