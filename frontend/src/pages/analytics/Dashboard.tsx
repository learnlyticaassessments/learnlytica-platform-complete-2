import { useState, useEffect } from 'react';
import { analyticsService } from '../../services/analyticsService';
import { BarChart3, Users, FileText, CheckCircle, TrendingUp, Download, FolderKanban, ClipboardCheck } from 'lucide-react';

export function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [projectTrends, setProjectTrends] = useState<any[]>([]);
  const [projectBatchRows, setProjectBatchRows] = useState<any[]>([]);
  const [projectDebug, setProjectDebug] = useState<any | null>(null);
  const [projectTrendsView, setProjectTrendsView] = useState<'chart' | 'table'>('chart');
  const [projectBatchView, setProjectBatchView] = useState<'chart' | 'table'>('chart');
  const [projectDebugView, setProjectDebugView] = useState<'chart' | 'table'>('chart');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  const toNum = (value: any) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const trendMax = Math.max(
    1,
    ...projectTrends.flatMap((row: any) => [toNum(row.assigned), toNum(row.submitted), toNum(row.evaluated), toNum(row.passed)])
  );

  const batchMax = Math.max(
    1,
    ...projectBatchRows.flatMap((row: any) => [toNum(row.passRate), toNum(row.averageScore)])
  );

  const debugKindRows = (projectDebug?.bySubmissionKindAndStatus || []) as Array<any>;
  const debugKindMax = Math.max(1, ...debugKindRows.map((r: any) => toNum(r.count)));
  const debugRecentRunStatus = ((projectDebug?.recentSubmissions || []) as Array<any>).reduce((acc: Record<string, number>, row: any) => {
    const key = String(row?.runStatus || 'unknown');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const debugRunRows = Object.entries(debugRecentRunStatus).map(([status, count]) => ({ status, count }));
  const debugRunMax = Math.max(1, ...debugRunRows.map((r) => toNum(r.count)));

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const nextWarnings: string[] = [];
    try {
      const [dashboard, trends, byBatch, debug] = await Promise.allSettled([
        analyticsService.getDashboard(),
        analyticsService.getProjectTrends(14),
        analyticsService.getProjectBatchAnalytics(),
        analyticsService.getProjectAnalyticsDebug()
      ]);

      if (dashboard.status === 'fulfilled') {
        setStats(dashboard.value.data);
      } else {
        nextWarnings.push('Dashboard metrics are currently unavailable.');
        setStats(null);
        console.error('Failed to load dashboard analytics', dashboard.reason);
      }

      if (trends.status === 'fulfilled') {
        setProjectTrends(trends.value.data || []);
      } else {
        nextWarnings.push('Project trend data could not be loaded.');
        setProjectTrends([]);
        console.error('Failed to load project trends', trends.reason);
      }

      if (byBatch.status === 'fulfilled') {
        setProjectBatchRows(byBatch.value.data || []);
        if ((byBatch.value as any).warning) nextWarnings.push((byBatch.value as any).warning);
      } else {
        nextWarnings.push('Batch-wise project analytics could not be loaded.');
        setProjectBatchRows([]);
        console.error('Failed to load batch analytics', byBatch.reason);
      }

      if (debug.status === 'fulfilled') {
        setProjectDebug(debug.value.data || null);
        if ((debug.value as any).warning) nextWarnings.push((debug.value as any).warning);
      } else {
        nextWarnings.push('Project debug analytics could not be loaded.');
        setProjectDebug(null);
        console.error('Failed to load project debug analytics', debug.reason);
      }
    } catch (error) {
      console.error('Failed to load stats', error);
      nextWarnings.push('Analytics is partially unavailable. Try again in a moment.');
    } finally {
      setWarnings(nextWarnings);
      setLoading(false);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const csvEscape = (value: any) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const downloadCsv = (headers: string[], rows: Array<Array<any>>, filename: string) => {
    const csv = [headers.map(csvEscape).join(','), ...rows.map((row) => row.map(csvEscape).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, filename);
  };

  const axisTicks = (maxValue: number, count = 5) => {
    const safeMax = Math.max(1, Math.ceil(maxValue));
    return Array.from({ length: count }, (_, i) => Math.round((safeMax * (count - 1 - i)) / (count - 1)));
  };

  const exportOrgAttempts = async () => {
    setExporting('attempts');
    try {
      const blob = await analyticsService.exportOrganizationAttemptsCsv();
      downloadBlob(blob, `learnlytica-org-attempts-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (error) {
      console.error('Failed to export org attempts', error);
    } finally {
      setExporting(null);
    }
  };

  const exportSkillMatrix = async () => {
    setExporting('skills');
    try {
      const blob = await analyticsService.exportSkillMatrixCsv();
      downloadBlob(blob, `learnlytica-skill-matrix-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (error) {
      console.error('Failed to export skill matrix', error);
    } finally {
      setExporting(null);
    }
  };

  const exportProjectSummary = async () => {
    setExporting('projects');
    try {
      const blob = await analyticsService.exportProjectSummaryCsv();
      downloadBlob(blob, `learnlytica-project-summary-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (error) {
      console.error('Failed to export project summary', error);
    } finally {
      setExporting(null);
    }
  };

  const exportProjectTrendsChartCsv = () => {
    downloadCsv(
      ['Day', 'Assigned', 'Submitted', 'Evaluated', 'Passed'],
      projectTrends.map((r) => [r.day, r.assigned, r.submitted, r.evaluated, r.passed]),
      `project-trends-14d-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const exportProjectBatchChartCsv = () => {
    downloadCsv(
      ['Batch', 'Assigned', 'Evaluated', 'Passed', 'Pass Rate', 'Average Score'],
      projectBatchRows.map((r) => [r.batchName, r.assigned, r.evaluated, r.passed, Number(r.passRate || 0).toFixed(1), Number(r.averageScore || 0).toFixed(1)]),
      `project-batch-performance-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const exportProjectDebugChartCsv = () => {
    const lines: string[] = [];
    lines.push(['Submission Kind', 'Status', 'Count'].map(csvEscape).join(','));
    debugKindRows.forEach((r: any) => {
      lines.push([r.submissionKind, r.status, r.count].map(csvEscape).join(','));
    });
    lines.push('');
    lines.push(['Run Status', 'Count'].map(csvEscape).join(','));
    debugRunRows.forEach((r: any) => {
      lines.push([r.status, r.count].map(csvEscape).join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, `project-debug-chart-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">Platform overview and insights</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={exportOrgAttempts} disabled={exporting !== null}>
              <Download className="w-4 h-4" />
              {exporting === 'attempts' ? 'Exporting...' : 'Export Attempts CSV'}
            </button>
            <button className="btn-secondary" onClick={exportSkillMatrix} disabled={exporting !== null}>
              <Download className="w-4 h-4" />
              {exporting === 'skills' ? 'Exporting...' : 'Export Skill Matrix CSV'}
            </button>
            <button className="btn-secondary" onClick={exportProjectSummary} disabled={exporting !== null}>
              <Download className="w-4 h-4" />
              {exporting === 'projects' ? 'Exporting...' : 'Export Project Summary CSV'}
            </button>
          </div>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="card border-amber-300 bg-amber-50 text-amber-900">
          <div className="text-sm font-semibold mb-1">Analytics Warnings</div>
          <ul className="list-disc pl-5 text-sm space-y-1">
            {warnings.map((w, idx) => (
              <li key={`warn-${idx}`}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Questions</p>
              <p className="text-3xl font-bold mt-1">{stats?.questions?.total || 0}</p>
              <p className="text-sm text-green-600 mt-1">{stats?.questions?.published || 0} published</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Assessments</p>
              <p className="text-3xl font-bold mt-1">{stats?.assessments?.total || 0}</p>
              <p className="text-sm text-green-600 mt-1">{stats?.assessments?.published || 0} published</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-3xl font-bold mt-1">{stats?.students?.total || 0}</p>
              <p className="text-sm text-blue-600 mt-1">{stats?.students?.attempts || 0} attempts</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Score</p>
              <p className="text-3xl font-bold mt-1">{stats?.students?.averageScore?.toFixed(1) || 0}%</p>
              <p className="text-sm text-green-600 mt-1">{stats?.students?.passRate?.toFixed(1) || 0}% pass rate</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Project Evaluation Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Project Assignments</p>
              <p className="text-3xl font-bold mt-1">{stats?.projects?.assigned || 0}</p>
              <p className="text-sm text-blue-600 mt-1">{stats?.projects?.submitted || 0} submitted</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FolderKanban className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Project Evaluated</p>
              <p className="text-3xl font-bold mt-1">{stats?.projects?.evaluated || 0}</p>
              <p className="text-sm text-purple-600 mt-1">{stats?.projects?.completionRate?.toFixed(1) || 0}% completion</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Project Pass Rate</p>
              <p className="text-3xl font-bold mt-1">{stats?.projects?.passRate?.toFixed(1) || 0}%</p>
              <p className="text-sm text-green-600 mt-1">{stats?.projects?.completed || 0} passed</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Project Avg Score</p>
              <p className="text-3xl font-bold mt-1">{stats?.projects?.averageScore?.toFixed(1) || 0}</p>
              <p className="text-sm text-red-600 mt-1">{stats?.projects?.failed || 0} failed</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Student Activity</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Attempts</span>
              <span className="font-semibold">{stats?.students?.attempts || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Completed</span>
              <span className="font-semibold text-green-600">{stats?.students?.completed || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Completion Rate</span>
              <span className="font-semibold">
                {stats?.students?.attempts > 0 
                  ? ((stats.students.completed / stats.students.attempts) * 100).toFixed(1) 
                  : 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Platform Health</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>All systems operational</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Docker execution ready</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Database healthy</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Project Evaluator Template Performance</h2>
        <div className="table-shell overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-3 py-2">Template</th>
                <th className="px-3 py-2">Assigned</th>
                <th className="px-3 py-2">Evaluated</th>
                <th className="px-3 py-2">Passed</th>
                <th className="px-3 py-2">Pass Rate</th>
                <th className="px-3 py-2">Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.projects?.byTemplate || []).map((t: any, idx: number) => {
                const passRate = t.evaluated > 0 ? (t.passed / t.evaluated) * 100 : 0;
                return (
                  <tr key={`${t.templateName}-${idx}`} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2 font-medium">{t.templateName}</td>
                    <td className="px-3 py-2">{t.assigned}</td>
                    <td className="px-3 py-2">{t.evaluated}</td>
                    <td className="px-3 py-2">{t.passed}</td>
                    <td className="px-3 py-2">{passRate.toFixed(1)}%</td>
                    <td className="px-3 py-2">{Number(t.averageScore || 0).toFixed(1)}</td>
                  </tr>
                );
              })}
              {!stats?.projects?.byTemplate?.length && (
                <tr><td className="px-3 py-4 text-[var(--text-muted)]" colSpan={6}>No project evaluation data yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold">Project Evaluation Trends (Last 14 Days)</h2>
            <div className="flex items-center gap-2">
              <button type="button" className="btn-secondary text-xs" onClick={exportProjectTrendsChartCsv} disabled={!projectTrends.length}>
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
              <div className="inline-flex rounded-lg border border-[var(--border)] p-1 text-xs">
                <button
                  type="button"
                  className={`px-2 py-1 rounded ${projectTrendsView === 'chart' ? 'bg-[var(--accent)] text-white' : ''}`}
                  onClick={() => setProjectTrendsView('chart')}
                >
                  View Chart
                </button>
                <button
                  type="button"
                  className={`px-2 py-1 rounded ${projectTrendsView === 'table' ? 'bg-[var(--accent)] text-white' : ''}`}
                  onClick={() => setProjectTrendsView('table')}
                >
                  View Table
                </button>
              </div>
            </div>
          </div>
          {projectTrendsView === 'chart' ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded bg-blue-100 text-blue-700">Assigned</span>
                <span className="px-2 py-1 rounded bg-indigo-100 text-indigo-700">Submitted</span>
                <span className="px-2 py-1 rounded bg-purple-100 text-purple-700">Evaluated</span>
                <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700">Passed</span>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[720px] h-64 border border-[var(--border)] rounded-lg p-3 bg-white">
                  <div className="text-[11px] text-[var(--text-muted)] mb-1">Y-axis: Daily submission/evaluation counts | X-axis: Day</div>
                  <div className="h-full flex gap-2">
                    <div className="w-10 h-44 flex flex-col justify-between items-end text-[10px] text-[var(--text-muted)] pr-1">
                      {axisTicks(trendMax).map((tick, idx) => (
                        <div key={`trend-tick-${idx}`}>{tick}</div>
                      ))}
                    </div>
                    <div className="flex-1 h-44 relative">
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        {axisTicks(trendMax).map((tick, idx) => (
                          <div key={`trend-grid-${idx}`} className="border-t border-slate-100 w-full" />
                        ))}
                      </div>
                      <div className="relative h-full flex items-end gap-2">
                        {projectTrends.map((row, idx) => (
                          <div key={`trend-chart-${idx}`} className="flex-1 min-w-[42px] flex flex-col items-center gap-1">
                            <div className="w-full h-44 flex items-end justify-center gap-1">
                              <div className="relative group">
                                <div className="w-1.5 bg-blue-500 rounded-t" style={{ height: `${(toNum(row.assigned) / trendMax) * 100}%` }} />
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[10px] rounded bg-slate-900 text-white opacity-0 group-hover:opacity-100 transition whitespace-nowrap">Assigned: {row.assigned}</div>
                              </div>
                              <div className="relative group">
                                <div className="w-1.5 bg-indigo-500 rounded-t" style={{ height: `${(toNum(row.submitted) / trendMax) * 100}%` }} />
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[10px] rounded bg-slate-900 text-white opacity-0 group-hover:opacity-100 transition whitespace-nowrap">Submitted: {row.submitted}</div>
                              </div>
                              <div className="relative group">
                                <div className="w-1.5 bg-purple-500 rounded-t" style={{ height: `${(toNum(row.evaluated) / trendMax) * 100}%` }} />
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[10px] rounded bg-slate-900 text-white opacity-0 group-hover:opacity-100 transition whitespace-nowrap">Evaluated: {row.evaluated}</div>
                              </div>
                              <div className="relative group">
                                <div className="w-1.5 bg-emerald-500 rounded-t" style={{ height: `${(toNum(row.passed) / trendMax) * 100}%` }} />
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[10px] rounded bg-slate-900 text-white opacity-0 group-hover:opacity-100 transition whitespace-nowrap">Passed: {row.passed}</div>
                              </div>
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)]">{String(row.day || '').slice(5)}</div>
                          </div>
                        ))}
                        {!projectTrends.length && <div className="text-sm text-[var(--text-muted)]">No trend data yet.</div>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="table-shell overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="px-3 py-2">Day</th>
                    <th className="px-3 py-2">Assigned</th>
                    <th className="px-3 py-2">Submitted</th>
                    <th className="px-3 py-2">Evaluated</th>
                    <th className="px-3 py-2">Passed</th>
                  </tr>
                </thead>
                <tbody>
                  {projectTrends.map((row, idx) => (
                    <tr key={`${row.day}-${idx}`} className="border-t border-[var(--border)]">
                      <td className="px-3 py-2">{row.day}</td>
                      <td className="px-3 py-2">{row.assigned}</td>
                      <td className="px-3 py-2">{row.submitted}</td>
                      <td className="px-3 py-2">{row.evaluated}</td>
                      <td className="px-3 py-2">{row.passed}</td>
                    </tr>
                  ))}
                  {!projectTrends.length && (
                    <tr><td className="px-3 py-4 text-[var(--text-muted)]" colSpan={5}>No trend data yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold">Batch-wise Project Performance</h2>
            <div className="flex items-center gap-2">
              <button type="button" className="btn-secondary text-xs" onClick={exportProjectBatchChartCsv} disabled={!projectBatchRows.length}>
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
              <div className="inline-flex rounded-lg border border-[var(--border)] p-1 text-xs">
                <button
                  type="button"
                  className={`px-2 py-1 rounded ${projectBatchView === 'chart' ? 'bg-[var(--accent)] text-white' : ''}`}
                  onClick={() => setProjectBatchView('chart')}
                >
                  View Chart
                </button>
                <button
                  type="button"
                  className={`px-2 py-1 rounded ${projectBatchView === 'table' ? 'bg-[var(--accent)] text-white' : ''}`}
                  onClick={() => setProjectBatchView('table')}
                >
                  View Table
                </button>
              </div>
            </div>
          </div>
          {projectBatchView === 'chart' ? (
            <div className="space-y-3">
              <div className="text-[11px] text-[var(--text-muted)]">Y-axis: Metric value (0 to {batchMax.toFixed(1)}) | X-axis: Batch</div>
              {projectBatchRows.map((row, idx) => (
                <div key={`batch-chart-${idx}`} className="rounded border border-[var(--border)] p-3">
                  <div className="text-sm font-medium mb-2">{row.batchName}</div>
                  <div className="text-xs mb-1">Pass Rate: {Number(row.passRate || 0).toFixed(1)}%</div>
                  <div className="h-2 rounded bg-slate-100 overflow-hidden mb-2 relative group">
                    <div className="h-full bg-emerald-500" style={{ width: `${(toNum(row.passRate) / batchMax) * 100}%` }} />
                    <div className="absolute -top-6 right-0 px-1.5 py-0.5 text-[10px] rounded bg-slate-900 text-white opacity-0 group-hover:opacity-100 transition">Pass Rate: {Number(row.passRate || 0).toFixed(1)}%</div>
                  </div>
                  <div className="text-xs mb-1">Average Score: {Number(row.averageScore || 0).toFixed(1)}</div>
                  <div className="h-2 rounded bg-slate-100 overflow-hidden relative group">
                    <div className="h-full bg-indigo-500" style={{ width: `${(toNum(row.averageScore) / batchMax) * 100}%` }} />
                    <div className="absolute -top-6 right-0 px-1.5 py-0.5 text-[10px] rounded bg-slate-900 text-white opacity-0 group-hover:opacity-100 transition">Average Score: {Number(row.averageScore || 0).toFixed(1)}</div>
                  </div>
                </div>
              ))}
              {!projectBatchRows.length && <div className="text-sm text-[var(--text-muted)]">No batch analytics yet.</div>}
            </div>
          ) : (
            <div className="table-shell overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="px-3 py-2">Batch</th>
                    <th className="px-3 py-2">Assigned</th>
                    <th className="px-3 py-2">Evaluated</th>
                    <th className="px-3 py-2">Passed</th>
                    <th className="px-3 py-2">Pass Rate</th>
                    <th className="px-3 py-2">Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  {projectBatchRows.map((row, idx) => (
                    <tr key={`${row.batchId}-${idx}`} className="border-t border-[var(--border)]">
                      <td className="px-3 py-2 font-medium">{row.batchName}</td>
                      <td className="px-3 py-2">{row.assigned}</td>
                      <td className="px-3 py-2">{row.evaluated}</td>
                      <td className="px-3 py-2">{row.passed}</td>
                      <td className="px-3 py-2">{Number(row.passRate || 0).toFixed(1)}%</td>
                      <td className="px-3 py-2">{Number(row.averageScore || 0).toFixed(1)}</td>
                    </tr>
                  ))}
                  {!projectBatchRows.length && (
                    <tr><td className="px-3 py-4 text-[var(--text-muted)]" colSpan={6}>No batch analytics yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h2 className="text-xl font-semibold">Project Analytics Debug (Org Scoped)</h2>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-secondary text-xs" onClick={exportProjectDebugChartCsv} disabled={!debugKindRows.length && !debugRunRows.length}>
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <div className="inline-flex rounded-lg border border-[var(--border)] p-1 text-xs">
              <button
                type="button"
                className={`px-2 py-1 rounded ${projectDebugView === 'chart' ? 'bg-[var(--accent)] text-white' : ''}`}
                onClick={() => setProjectDebugView('chart')}
              >
                View Chart
              </button>
              <button
                type="button"
                className={`px-2 py-1 rounded ${projectDebugView === 'table' ? 'bg-[var(--accent)] text-white' : ''}`}
                onClick={() => setProjectDebugView('table')}
              >
                View Table
              </button>
            </div>
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          Use this to verify what backend analytics is counting for your current organization.
        </p>
        <div className="text-sm mb-3">
          Org ID: <span className="font-mono">{projectDebug?.organizationId || '-'}</span>
          {' • '}
          Total submissions counted: <span className="font-semibold">{projectDebug?.totalProjectSubmissions ?? 0}</span>
        </div>
        {projectDebugView === 'chart' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded border border-[var(--border)] p-3">
              <div className="text-sm font-semibold mb-2">Submission Kind + Status Counts</div>
              <div className="text-[11px] text-[var(--text-muted)] mb-2">Y-axis: count | X-axis: kind/status pair</div>
              <div className="space-y-2">
                {debugKindRows.map((r: any, idx: number) => (
                  <div key={`debug-kind-chart-${idx}`}>
                    <div className="text-xs mb-1">{r.submissionKind} / {r.status} ({r.count})</div>
                    <div className="h-2 rounded bg-slate-100 overflow-hidden relative group">
                      <div className="h-full bg-purple-500" style={{ width: `${(toNum(r.count) / debugKindMax) * 100}%` }} />
                      <div className="absolute -top-6 right-0 px-1.5 py-0.5 text-[10px] rounded bg-slate-900 text-white opacity-0 group-hover:opacity-100 transition">Count: {r.count}</div>
                    </div>
                  </div>
                ))}
                {!debugKindRows.length && <div className="text-sm text-[var(--text-muted)]">No rows.</div>}
              </div>
            </div>
            <div className="rounded border border-[var(--border)] p-3">
              <div className="text-sm font-semibold mb-2">Recent Run Status Distribution</div>
              <div className="text-[11px] text-[var(--text-muted)] mb-2">Y-axis: count | X-axis: run status</div>
              <div className="space-y-2">
                {debugRunRows.map((r: any, idx: number) => (
                  <div key={`debug-run-chart-${idx}`}>
                    <div className="text-xs mb-1">{r.status} ({r.count})</div>
                    <div className="h-2 rounded bg-slate-100 overflow-hidden relative group">
                      <div className="h-full bg-indigo-500" style={{ width: `${(toNum(r.count) / debugRunMax) * 100}%` }} />
                      <div className="absolute -top-6 right-0 px-1.5 py-0.5 text-[10px] rounded bg-slate-900 text-white opacity-0 group-hover:opacity-100 transition">Count: {r.count}</div>
                    </div>
                  </div>
                ))}
                {!debugRunRows.length && <div className="text-sm text-[var(--text-muted)]">No recent submission rows.</div>}
              </div>
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="table-shell overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="px-3 py-2">Submission Kind</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Count</th>
                </tr>
              </thead>
              <tbody>
                {(projectDebug?.bySubmissionKindAndStatus || []).map((r: any, idx: number) => (
                  <tr key={`debug-kind-${idx}`} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2">{r.submissionKind}</td>
                    <td className="px-3 py-2">{r.status}</td>
                    <td className="px-3 py-2">{r.count}</td>
                  </tr>
                ))}
                {!projectDebug?.bySubmissionKindAndStatus?.length && (
                  <tr><td className="px-3 py-3 text-[var(--text-muted)]" colSpan={3}>No rows.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="table-shell overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="px-3 py-2">Recent Submission</th>
                  <th className="px-3 py-2">Kind</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Run</th>
                </tr>
              </thead>
              <tbody>
                {(projectDebug?.recentSubmissions || []).map((r: any, idx: number) => (
                  <tr key={`debug-recent-${idx}`} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2">
                      <div className="text-xs">{r.studentEmail || '-'}</div>
                      <div className="text-[10px] text-[var(--text-muted)] font-mono">{String(r.id || '').slice(0, 8)}</div>
                    </td>
                    <td className="px-3 py-2">{r.submissionKind || 'null'}</td>
                    <td className="px-3 py-2">{r.status || '-'}</td>
                    <td className="px-3 py-2">{r.runStatus || '-'}</td>
                  </tr>
                ))}
                {!projectDebug?.recentSubmissions?.length && (
                  <tr><td className="px-3 py-3 text-[var(--text-muted)]" colSpan={4}>No recent submissions.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
