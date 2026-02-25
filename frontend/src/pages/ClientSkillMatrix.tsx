import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { analyticsService } from '../services/analyticsService';

export function ClientSkillMatrix() {
  const { studentId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    analyticsService.getStudentSkillMatrix(studentId)
      .then((res) => setData(res.data))
      .catch((e) => setError(e?.response?.data?.error || 'Failed to load skill matrix'))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;
  if (error) return <div className="p-6"><div className="card"><div className="ll-toast err">{error}</div><Link className="btn-secondary mt-4" to="/learners">Back to Learners</Link></div></div>;

  const matrix = data?.matrix || [];
  const swot = data?.swot || {};
  const learner = data?.learner;
  const summary = data?.summary;

  return (
    <div className="p-6 space-y-6">
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-xs font-semibold tracking-wide" style={{ color: 'var(--text-dim)' }}>AI SKILL MATRIX</div>
            <h1 className="text-2xl font-bold mt-1">{learner?.fullName || 'Learner'} Skill Matrix</h1>
            <p className="text-sm text-gray-600 mt-1">{learner?.email}</p>
          </div>
          <Link to="/learners" className="btn-secondary">Back to Learners</Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <Metric label="Attempts Reviewed" value={summary?.attemptsReviewed ?? 0} />
          <Metric label="Skills Tracked" value={summary?.skillsTracked ?? 0} />
          <Metric label="Avg Score" value={`${Number(summary?.overallAverageScore || 0).toFixed(1)}%`} />
          <Metric label="Pass Rate" value={`${Number(summary?.passRate || 0).toFixed(1)}%`} />
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Skill Matrix</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-2)] border-b border-[var(--border)]">
              <tr>
                <th className="px-3 py-3 text-left">Skill</th>
                <th className="px-3 py-3 text-left">Proficiency</th>
                <th className="px-3 py-3 text-left">Avg Score</th>
                <th className="px-3 py-3 text-left">Test Pass Rate</th>
                <th className="px-3 py-3 text-left">Questions</th>
                <th className="px-3 py-3 text-left">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {matrix.map((row: any) => (
                <tr key={row.skill}>
                  <td className="px-3 py-3 font-medium">{row.skill}</td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      row.proficiency === 'advanced' ? 'bg-green-100 text-green-700' :
                      row.proficiency === 'intermediate' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {row.proficiency.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-3">{Number(row.averageScore || 0).toFixed(1)}%</td>
                  <td className="px-3 py-3">{Number(row.testPassRate || 0).toFixed(1)}%</td>
                  <td className="px-3 py-3">{row.questionCount}</td>
                  <td className="px-3 py-3">{row.pointsEarned}/{row.totalPoints}</td>
                </tr>
              ))}
              {matrix.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No submitted attempts to analyze yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SwotCard title="Strengths" items={swot.strengths || []} tone="success" />
        <SwotCard title="Weaknesses" items={swot.weaknesses || []} tone="warn" />
        <SwotCard title="Opportunities" items={swot.opportunities || []} tone="info" />
        <SwotCard title="Threats" items={swot.threats || []} tone="danger" />
      </div>

      <div className="card">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Recommendations</h2>
          <span className="text-xs px-2 py-1 rounded-full border" style={{ borderColor: 'var(--border)' }}>
            Source: {swot.source || 'heuristic'}
          </span>
        </div>
        <ul className="mt-3 space-y-2">
          {(swot.recommendations || []).map((r: string, i: number) => (
            <li key={i} className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              {r}
            </li>
          ))}
          {(!swot.recommendations || swot.recommendations.length === 0) && (
            <li className="text-sm text-gray-500">No recommendations available yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="text-xs" style={{ color: 'var(--text-dim)' }}>{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

function SwotCard({ title, items, tone }: { title: string; items: string[]; tone: 'success' | 'warn' | 'info' | 'danger' }) {
  const cls =
    tone === 'success' ? 'bg-green-100 text-green-700' :
    tone === 'warn' ? 'bg-amber-100 text-amber-700' :
    tone === 'danger' ? 'bg-red-100 text-red-700' :
    'bg-blue-100 text-blue-700';
  return (
    <div className="card">
      <div className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${cls}`}>{title}</div>
      <ul className="mt-3 space-y-2">
        {items.length ? items.map((item, i) => (
          <li key={i} className="text-sm rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>{item}</li>
        )) : <li className="text-sm text-gray-500">No items yet.</li>}
      </ul>
    </div>
  );
}
