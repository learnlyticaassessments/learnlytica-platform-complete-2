import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock3, Target, XCircle } from 'lucide-react';
import { studentService } from '../../services/studentService';

export function AssessmentReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    studentService
      .getReview(id)
      .then((res) => setData(res.data))
      .catch((e) => setError(e?.response?.data?.error || 'Failed to load review'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="card">
          <div className="text-red-300 font-semibold">Unable to load review</div>
          <div className="mt-2 text-sm" style={{ color: 'var(--text-dim)' }}>{error}</div>
          <button className="btn-secondary mt-4" onClick={() => navigate('/student/assessments')}>
            Back to Assessments
          </button>
        </div>
      </div>
    );
  }

  const review = data?.review;
  const assessment = data?.assessment;
  const attempt = data?.studentAssessment;
  const questions = review?.questions || [];

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <section className="card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold tracking-wide" style={{ color: 'var(--text-dim)' }}>
              LEARNER REVIEW
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">{assessment?.title || 'Assessment Review'}</h1>
            <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
              Detailed score breakdown and per-test feedback from your submitted attempt.
            </p>
          </div>
          <Link to="/student/assessments" className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            Back to My Assessments
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
          <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="text-xs" style={{ color: 'var(--text-dim)' }}>Score</div>
            <div className="mt-1 text-xl font-bold">{Number(attempt?.score || review?.score || 0).toFixed(1)}%</div>
          </div>
          <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="text-xs" style={{ color: 'var(--text-dim)' }}>Points</div>
            <div className="mt-1 text-xl font-bold">{attempt?.pointsEarned ?? review?.pointsEarned ?? 0}/{attempt?.totalPoints ?? review?.totalPoints ?? 0}</div>
          </div>
          <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="text-xs" style={{ color: 'var(--text-dim)' }}>Time Spent</div>
            <div className="mt-1 text-xl font-bold">{attempt?.timeSpentMinutes ?? review?.timeSpentMinutes ?? 0}m</div>
          </div>
          <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="text-xs" style={{ color: 'var(--text-dim)' }}>Questions</div>
            <div className="mt-1 text-xl font-bold">{questions.length}</div>
          </div>
          <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="text-xs" style={{ color: 'var(--text-dim)' }}>Result</div>
            <div className={`mt-1 text-xl font-bold ${attempt?.passed ? 'text-green-300' : 'text-red-300'}`}>
              {attempt?.passed ? 'Passed' : 'Not Passed'}
            </div>
          </div>
        </div>
      </section>

      {review?.focusEvents?.length ? (
        <section className="card">
          <h2 className="text-lg font-semibold mb-3">Focus / Visibility Activity</h2>
          <div className="flex flex-wrap gap-2">
            {review.focusEvents.slice(-20).map((event: any, idx: number) => (
              <span
                key={`${event.type}-${event.at}-${idx}`}
                className="px-2 py-1 rounded-full text-xs border"
                style={{
                  borderColor: event.type === 'blur' || event.type === 'hidden' ? 'rgba(239,68,68,.35)' : 'var(--border)',
                  color: event.type === 'blur' || event.type === 'hidden' ? '#fecaca' : 'var(--text-dim)'
                }}
              >
                {event.type} · {event.at ? new Date(event.at).toLocaleTimeString() : ''}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        {questions.map((q: any, idx: number) => (
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
                </div>
              </div>
              <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl ${q.testsRun > 0 && q.testsPassed === q.testsRun ? 'text-green-300' : 'text-amber-300'}`} style={{ background: q.testsRun > 0 && q.testsPassed === q.testsRun ? 'var(--green-bg)' : 'var(--amber-bg)' }}>
                {q.testsRun > 0 && q.testsPassed === q.testsRun ? <CheckCircle2 className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                {q.testsRun > 0 && q.testsPassed === q.testsRun ? 'All tests passed' : 'Needs improvement'}
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
        ))}

        {!questions.length && (
          <div className="card">
            <div className="text-sm" style={{ color: 'var(--text-dim)' }}>
              Detailed review data is not available for this attempt.
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
