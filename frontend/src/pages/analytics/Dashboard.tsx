import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsService } from '../../services/analyticsService';
import { BarChart3, Users, FileText, CheckCircle, TrendingUp, Download } from 'lucide-react';

export function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await analyticsService.getDashboard();
      setStats(response.data);
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
    </div>
  );
}
