import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsService } from '../../services/analyticsService';
import { BarChart3, Users, FileText, CheckCircle, TrendingUp, Download, FolderKanban, ClipboardCheck } from 'lucide-react';

export function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [projectTrends, setProjectTrends] = useState<any[]>([]);
  const [projectBatchRows, setProjectBatchRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [dashboard, trends, byBatch] = await Promise.all([
        analyticsService.getDashboard(),
        analyticsService.getProjectTrends(14),
        analyticsService.getProjectBatchAnalytics()
      ]);
      setStats(dashboard.data);
      setProjectTrends(trends.data || []);
      setProjectBatchRows(byBatch.data || []);
    } catch (error) {
      console.error('Failed to load stats', error);
    } finally {
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
          <h2 className="text-xl font-semibold mb-4">Project Evaluation Trends (Last 14 Days)</h2>
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
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Batch-wise Project Performance</h2>
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
        </div>
      </div>
    </div>
  );
}
