import { useEffect, useMemo, useState } from 'react';
import { Layers3, Users, Plus, Loader2, UserPlus, Trash2, ClipboardCheck, RefreshCw, BarChart3 } from 'lucide-react';
import { batchesService, type BatchReentryPolicy, type BatchStatus, type BatchType } from '../services/batchesService';
import { learnersService } from '../services/learnersService';
import { assessmentService } from '../services/assessmentService';
import { useAuth } from '../auth/AuthContext';
import { can } from '../auth/permissions';

type Learner = {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  createdAt: string;
  batchCount?: number;
  batches?: Array<{ id: string; name: string }>;
};

type Batch = {
  id: string;
  name: string;
  code?: string | null;
  type: BatchType;
  status: BatchStatus;
  startDate?: string | null;
  endDate?: string | null;
  summary?: {
    memberCount: number;
    activeMemberCount: number;
    assignmentCount: number;
    submittedCount: number;
    averageScore: number | null;
    passRate: number;
  };
};

type BatchMember = {
  membershipId: string;
  batchId: string;
  learnerId: string;
  membershipStatus: 'active' | 'inactive';
  joinedAt: string;
  leftAt?: string | null;
  fullName: string;
  email: string;
  isActive: boolean;
};

type Assessment = {
  id: string;
  title: string;
  status: string;
};

type BatchResult = {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  learnerId: string;
  learnerName: string;
  learnerEmail: string;
  status: string;
  assignedAt: string;
  dueDate?: string | null;
  submittedAt?: string | null;
  score?: number | null;
  passed?: boolean | null;
  reentryPolicy: BatchReentryPolicy;
};

const BATCH_TYPE_OPTIONS: Array<{ value: BatchType; label: string }> = [
  { value: 'cohort', label: 'Cohort' },
  { value: 'bootcamp', label: 'Bootcamp' },
  { value: 'campus', label: 'Campus Batch' },
  { value: 'team', label: 'Team' },
  { value: 'hiring', label: 'Hiring Batch' },
  { value: 'custom', label: 'Custom' }
];

export function Batches() {
  const { user } = useAuth();
  const canManage = can(user?.role, 'batches.manage');

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [batches, setBatches] = useState<Batch[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [batchMembers, setBatchMembers] = useState<BatchMember[]>([]);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [batchResultsSummary, setBatchResultsSummary] = useState<any>(null);

  const [batchSearch, setBatchSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [resultsSearch, setResultsSearch] = useState('');
  const [resultsStatus, setResultsStatus] = useState('');
  const [resultsAssessmentId, setResultsAssessmentId] = useState('');

  const [newBatch, setNewBatch] = useState({
    name: '',
    code: '',
    type: 'cohort' as BatchType,
    startDate: '',
    endDate: ''
  });

  const [editBatch, setEditBatch] = useState({
    name: '',
    code: '',
    type: 'cohort' as BatchType,
    status: 'active' as BatchStatus,
    startDate: '',
    endDate: ''
  });

  const [selectedLearnerIdsToAdd, setSelectedLearnerIdsToAdd] = useState<string[]>([]);
  const [showOnlyUnbatchedToAdd, setShowOnlyUnbatchedToAdd] = useState(false);
  const [batchCsvText, setBatchCsvText] = useState('');
  const [batchCsvDefaultPassword, setBatchCsvDefaultPassword] = useState('Learner@123');
  const [batchCsvImportResult, setBatchCsvImportResult] = useState<any>(null);
  const [assignConfig, setAssignConfig] = useState({
    assessmentId: '',
    dueDate: '',
    reentryPolicy: 'resume_allowed' as BatchReentryPolicy
  });

  const selectedBatch = batches.find((b) => b.id === selectedBatchId) || null;

  const filteredBatches = useMemo(() => {
    const q = batchSearch.trim().toLowerCase();
    if (!q) return batches;
    return batches.filter((b) =>
      b.name.toLowerCase().includes(q) || (b.code || '').toLowerCase().includes(q)
    );
  }, [batches, batchSearch]);

  const memberLearnerIds = useMemo(() => new Set(batchMembers.map((m) => m.learnerId)), [batchMembers]);

  const addableLearners = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return learners.filter((l) => {
      if (memberLearnerIds.has(l.id)) return false;
      if (showOnlyUnbatchedToAdd && (l.batchCount || 0) > 0) return false;
      if (!q) return true;
      return l.fullName.toLowerCase().includes(q) || l.email.toLowerCase().includes(q);
    });
  }, [learners, memberLearnerIds, memberSearch, showOnlyUnbatchedToAdd]);

  const batchCsvPreview = useMemo(() => {
    if (!batchCsvText.trim()) return [] as Array<{ fullName: string; email: string; password?: string }>;
    return batchCsvText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const cols = line.split(',').map((c) => c.trim());
        const firstLooksEmail = cols[0]?.includes('@');
        const email = (firstLooksEmail ? cols[0] : cols[1] || '').toLowerCase();
        const fullName = firstLooksEmail ? (cols[1] || '') : (cols[0] || '');
        const password = cols[2] || undefined;
        return { fullName, email, password };
      });
  }, [batchCsvText]);

  const loadBase = async (preserveSelection = true) => {
    setLoading(true);
    setError(null);
    try {
      const [batchRes, learnerRes, assessmentRes] = await Promise.all([
        batchesService.list({ limit: 200 }),
        learnersService.list(),
        assessmentService.list({ status: 'published', page: 1, limit: 200 })
      ]);
      const batchRows = batchRes.data || [];
      const assessmentRows = Array.isArray(assessmentRes?.data)
        ? assessmentRes.data
        : (assessmentRes?.data?.assessments || []);

      setBatches(batchRows);
      setLearners(learnerRes.data || []);
      setAssessments((assessmentRows || []).filter((a: Assessment) => a.status === 'published'));

      if (!preserveSelection || !selectedBatchId || !batchRows.some((b: Batch) => b.id === selectedBatchId)) {
        setSelectedBatchId(batchRows[0]?.id || '');
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load batches workspace');
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedBatchData = async (batchId: string) => {
    if (!batchId) {
      setBatchMembers([]);
      setBatchResults([]);
      setBatchResultsSummary(null);
      return;
    }
    try {
      const [membersRes, resultsRes, batchRes] = await Promise.all([
        batchesService.listMembers(batchId, { limit: 200 }),
        batchesService.listResults(batchId, {
          limit: 200,
          search: resultsSearch || undefined,
          status: resultsStatus || undefined,
          assessmentId: resultsAssessmentId || undefined
        }),
        batchesService.getById(batchId)
      ]);

      setBatchMembers(membersRes.data || []);
      setBatchResults(resultsRes.data || []);
      setBatchResultsSummary(resultsRes.summary || null);
      setBatches((prev) => prev.map((b) => (b.id === batchId ? batchRes.data : b)));

      setEditBatch({
        name: batchRes.data.name || '',
        code: batchRes.data.code || '',
        type: batchRes.data.type,
        status: batchRes.data.status,
        startDate: toDateTimeLocalValue(batchRes.data.startDate),
        endDate: toDateTimeLocalValue(batchRes.data.endDate)
      });
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load batch details');
    }
  };

  useEffect(() => {
    loadBase(false);
  }, []);

  useEffect(() => {
    void loadSelectedBatchData(selectedBatchId);
  }, [selectedBatchId]);

  const refreshResults = async () => {
    if (!selectedBatchId) return;
    setBusy('refresh-results');
    setError(null);
    try {
      const resultsRes = await batchesService.listResults(selectedBatchId, {
        limit: 200,
        search: resultsSearch || undefined,
        status: resultsStatus || undefined,
        assessmentId: resultsAssessmentId || undefined
      });
      setBatchResults(resultsRes.data || []);
      setBatchResultsSummary(resultsRes.summary || null);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to refresh batch results');
    } finally {
      setBusy(null);
    }
  };

  const createBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setBusy('create-batch');
    setError(null);
    setSuccess(null);
    try {
      const result = await batchesService.create({
        name: newBatch.name,
        code: newBatch.code || undefined,
        type: newBatch.type,
        startDate: newBatch.startDate ? new Date(newBatch.startDate).toISOString() : null,
        endDate: newBatch.endDate ? new Date(newBatch.endDate).toISOString() : null
      });
      setSuccess(`Batch "${result.data.name}" created`);
      setNewBatch({ name: '', code: '', type: 'cohort', startDate: '', endDate: '' });
      await loadBase(false);
      setSelectedBatchId(result.data.id);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to create batch');
    } finally {
      setBusy(null);
    }
  };

  const saveBatchSettings = async () => {
    if (!selectedBatchId || !canManage) return;
    setBusy('save-batch');
    setError(null);
    setSuccess(null);
    try {
      await batchesService.update(selectedBatchId, {
        name: editBatch.name,
        code: editBatch.code || null,
        type: editBatch.type,
        status: editBatch.status,
        startDate: editBatch.startDate ? new Date(editBatch.startDate).toISOString() : null,
        endDate: editBatch.endDate ? new Date(editBatch.endDate).toISOString() : null
      });
      setSuccess('Batch settings updated');
      await loadBase(true);
      await loadSelectedBatchData(selectedBatchId);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to update batch');
    } finally {
      setBusy(null);
    }
  };

  const addSelectedLearnersToBatch = async () => {
    if (!selectedBatchId || !selectedLearnerIdsToAdd.length) {
      setError('Select learners to add');
      return;
    }
    setBusy('add-members');
    setError(null);
    setSuccess(null);
    try {
      const result = await batchesService.addMembers(selectedBatchId, selectedLearnerIdsToAdd);
      setSuccess(`Added ${result.data.summary.added} learner(s) to batch`);
      setSelectedLearnerIdsToAdd([]);
      await loadSelectedBatchData(selectedBatchId);
      await loadBase(true);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to add learners to batch');
    } finally {
      setBusy(null);
    }
  };

  const importLearnersIntoSelectedBatch = async () => {
    if (!selectedBatchId) {
      setError('Select a batch first');
      return;
    }
    if (!batchCsvPreview.length) {
      setError('Paste CSV learner rows first');
      return;
    }

    setBusy('batch-csv-import');
    setError(null);
    setSuccess(null);
    setBatchCsvImportResult(null);
    try {
      const rows = batchCsvPreview
        .filter((r) => r.email && r.fullName)
        .map((r) => ({ email: r.email, fullName: r.fullName, password: r.password }));

      const importRes = await learnersService.importCsvRows({
        rows,
        defaultPassword: batchCsvDefaultPassword || undefined
      });

      const freshLearnersRes = await learnersService.list();
      const freshLearners: Learner[] = freshLearnersRes.data || [];
      const emailMap = new Map(freshLearners.map((l) => [l.email.toLowerCase(), l]));
      const idsToAdd = Array.from(
        new Set(
          rows
            .map((r) => emailMap.get(r.email.toLowerCase())?.id)
            .filter(Boolean)
            .filter((id) => !memberLearnerIds.has(id as string)) as string[]
        )
      );

      let addResult: any = null;
      if (idsToAdd.length) {
        addResult = await batchesService.addMembers(selectedBatchId, idsToAdd);
      }

      setBatchCsvImportResult({
        importSummary: importRes.data.summary,
        importSkipped: importRes.data.skipped,
        batchAddSummary: addResult?.data?.summary || { requested: idsToAdd.length, added: 0, skipped: 0 }
      });

      setSuccess(
        `CSV processed: ${importRes.data.summary.created} created, ${addResult?.data?.summary?.added || 0} added to batch`
      );
      setBatchCsvText('');
      await loadBase(true);
      await loadSelectedBatchData(selectedBatchId);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed batch CSV import');
    } finally {
      setBusy(null);
    }
  };

  const removeMember = async (learnerId: string, fullName: string) => {
    if (!selectedBatchId) return;
    if (!confirm(`Remove ${fullName} from this batch?`)) return;
    setBusy(`remove-${learnerId}`);
    setError(null);
    setSuccess(null);
    try {
      await batchesService.removeMember(selectedBatchId, learnerId);
      setSuccess(`${fullName} removed from batch`);
      await loadSelectedBatchData(selectedBatchId);
      await loadBase(true);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to remove learner from batch');
    } finally {
      setBusy(null);
    }
  };

  const assignAssessmentToBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId || !assignConfig.assessmentId) {
      setError('Select a batch and a published assessment');
      return;
    }
    setBusy('assign-batch');
    setError(null);
    setSuccess(null);
    try {
      const res = await batchesService.assignAssessment(selectedBatchId, {
        assessmentId: assignConfig.assessmentId,
        dueDate: assignConfig.dueDate ? new Date(assignConfig.dueDate).toISOString() : undefined,
        reentryPolicy: assignConfig.reentryPolicy
      });
      setSuccess(`Assigned to ${res.data.assignedCount} learner(s)`);
      await loadSelectedBatchData(selectedBatchId);
      await loadBase(true);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to assign assessment to batch');
    } finally {
      setBusy(null);
    }
  };

  const toggleLearnerToAdd = (id: string) => {
    setSelectedLearnerIdsToAdd((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const filteredBatchMembers = useMemo(() => {
    if (!memberSearch.trim()) return batchMembers;
    const q = memberSearch.trim().toLowerCase();
    return batchMembers.filter((m) =>
      m.fullName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    );
  }, [batchMembers, memberSearch]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="card flex items-center justify-center gap-3 py-16">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
          <span>Loading batches workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 fade-in">
      <div className="page-header flex-col md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text)]">Batches</h1>
          <p className="page-subtle mt-1">
            Organize learners into cohorts/teams, assign assessments in bulk, and track batch-level outcomes.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="card px-4 py-3 min-w-[120px]">
            <div className="text-gray-500">Batches</div>
            <div className="text-xl font-bold">{batches.length}</div>
          </div>
          <div className="card px-4 py-3 min-w-[120px]">
            <div className="text-gray-500">Learners</div>
            <div className="text-xl font-bold">{learners.length}</div>
          </div>
        </div>
      </div>

      {(error || success) && (
        <div className="space-y-2">
          {error && <div className="ll-toast err">{error}</div>}
          {success && <div className="ll-toast ok">{success}</div>}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 space-y-6">
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-[var(--accent)]" />
              <h2 className="text-lg font-semibold text-gray-900">Create Batch</h2>
            </div>
            <form className="space-y-4" onSubmit={createBatch}>
              <div>
                <label className="block text-sm font-medium mb-1">Batch Name</label>
                <input className="input-field" value={newBatch.name} onChange={(e) => setNewBatch((p) => ({ ...p, name: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Code (optional)</label>
                <input className="input-field" value={newBatch.code} onChange={(e) => setNewBatch((p) => ({ ...p, code: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select className="input-field" value={newBatch.type} onChange={(e) => setNewBatch((p) => ({ ...p, type: e.target.value as BatchType }))}>
                  {BATCH_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Start</label>
                  <input type="datetime-local" className="input-field" value={newBatch.startDate} onChange={(e) => setNewBatch((p) => ({ ...p, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End</label>
                  <input type="datetime-local" className="input-field" value={newBatch.endDate} onChange={(e) => setNewBatch((p) => ({ ...p, endDate: e.target.value }))} />
                </div>
              </div>
              <button className="btn-primary w-full" disabled={!canManage || busy === 'create-batch'}>
                {busy === 'create-batch' ? 'Creating...' : 'Create Batch'}
              </button>
            </form>
          </div>

          <div className="card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Layers3 className="w-4 h-4 text-[var(--accent)]" />
              <h2 className="font-semibold">Batch List</h2>
            </div>
            <input
              className="input-field"
              placeholder="Search batches"
              value={batchSearch}
              onChange={(e) => setBatchSearch(e.target.value)}
            />
            <div className="max-h-[520px] overflow-auto space-y-2 pr-1">
              {filteredBatches.map((batch) => (
                <button
                  key={batch.id}
                  type="button"
                  onClick={() => setSelectedBatchId(batch.id)}
                  className={`w-full text-left rounded-xl border p-3 transition ${
                    selectedBatchId === batch.id
                      ? 'border-[var(--accent)] bg-[var(--surface-2)]'
                      : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{batch.name}</div>
                      <div className="text-xs text-gray-600">
                        {BATCH_TYPE_OPTIONS.find((t) => t.value === batch.type)?.label || batch.type}
                        {batch.code ? ` • ${batch.code}` : ''}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                      batch.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {batch.status}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-gray-600">
                    <div><span className="font-semibold">{batch.summary?.memberCount || 0}</span> members</div>
                    <div><span className="font-semibold">{batch.summary?.assignmentCount || 0}</span> attempts</div>
                    <div><span className="font-semibold">{batch.summary?.passRate ?? 0}%</span> pass</div>
                  </div>
                </button>
              ))}
              {filteredBatches.length === 0 && (
                <div className="text-sm text-gray-600 text-center py-6">No batches found.</div>
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 space-y-6">
          {!selectedBatch ? (
            <div className="card p-10 text-center text-gray-600">
              Select a batch to manage members, assign assessments, and view results.
            </div>
          ) : (
            <>
              <div className="card p-6 space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedBatch.name}</h2>
                    <p className="text-sm text-gray-600">Batch settings, lifecycle, and cohort metadata.</p>
                  </div>
                  <button type="button" className="btn-secondary" onClick={() => void loadSelectedBatchData(selectedBatch.id)}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <MetricCard label="Members" value={String(selectedBatch.summary?.memberCount || 0)} />
                  <MetricCard label="Active" value={String(selectedBatch.summary?.activeMemberCount || 0)} />
                  <MetricCard label="Attempts" value={String(selectedBatch.summary?.assignmentCount || 0)} />
                  <MetricCard label="Submitted" value={String(selectedBatch.summary?.submittedCount || 0)} />
                  <MetricCard label="Pass Rate" value={`${selectedBatch.summary?.passRate ?? 0}%`} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input className="input-field" value={editBatch.name} onChange={(e) => setEditBatch((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Code</label>
                    <input className="input-field" value={editBatch.code} onChange={(e) => setEditBatch((p) => ({ ...p, code: e.target.value }))} placeholder="Optional batch code" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select className="input-field" value={editBatch.type} onChange={(e) => setEditBatch((p) => ({ ...p, type: e.target.value as BatchType }))}>
                      {BATCH_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select className="input-field" value={editBatch.status} onChange={(e) => setEditBatch((p) => ({ ...p, status: e.target.value as BatchStatus }))}>
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Date</label>
                    <input type="datetime-local" className="input-field" value={editBatch.startDate} onChange={(e) => setEditBatch((p) => ({ ...p, startDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Date</label>
                    <input type="datetime-local" className="input-field" value={editBatch.endDate} onChange={(e) => setEditBatch((p) => ({ ...p, endDate: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button className="btn-primary" onClick={saveBatchSettings} disabled={!canManage || busy === 'save-batch'}>
                    {busy === 'save-batch' ? 'Saving...' : 'Save Batch Settings'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
                <div className="card p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-[var(--accent)]" />
                    <h3 className="text-lg font-semibold">Batch Members ({batchMembers.length})</h3>
                  </div>
                  <input className="input-field" placeholder="Search current or addable learners" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} />

                  <div className="rounded-xl border border-[var(--border)]">
                    <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-2)] font-medium">Current Members</div>
                    <div className="max-h-[260px] overflow-auto divide-y divide-[var(--border)]">
                      {filteredBatchMembers.length ? filteredBatchMembers.map((member) => (
                        <div key={member.membershipId} className="px-4 py-3 flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-900 truncate">{member.fullName}</div>
                            <div className="text-xs text-gray-600 truncate">{member.email}</div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                            member.membershipStatus === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {member.membershipStatus}
                          </span>
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={!canManage || busy === `remove-${member.learnerId}`}
                            onClick={() => void removeMember(member.learnerId, member.fullName)}
                            title="Remove from batch"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )) : (
                        <div className="px-4 py-8 text-sm text-gray-600 text-center">No members in this batch yet.</div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--border)]">
                    <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-2)] font-medium">Add Learners</div>
                    <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-xs text-gray-700">
                        <input
                          type="checkbox"
                          checked={showOnlyUnbatchedToAdd}
                          onChange={(e) => setShowOnlyUnbatchedToAdd(e.target.checked)}
                        />
                        Show unbatched learners only
                      </label>
                      <span className="text-xs text-gray-500">
                        {addableLearners.length} available
                      </span>
                    </div>
                    <div className="max-h-[220px] overflow-auto divide-y divide-[var(--border)]">
                      {addableLearners.length ? addableLearners.slice(0, 120).map((learner) => (
                        <label key={learner.id} className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-[var(--surface-2)]/50">
                          <input
                            type="checkbox"
                            checked={selectedLearnerIdsToAdd.includes(learner.id)}
                            onChange={() => toggleLearnerToAdd(learner.id)}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-900 truncate">{learner.fullName}</div>
                            <div className="text-xs text-gray-600 truncate">{learner.email}</div>
                            <div className="text-[10px] text-gray-500 truncate">
                              {(learner.batchCount || 0) > 0 ? `In ${(learner.batchCount || 0)} batch(es)` : 'Unbatched'}
                            </div>
                          </div>
                          {!learner.isActive && (
                            <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700">inactive account</span>
                          )}
                        </label>
                      )) : (
                        <div className="px-4 py-8 text-sm text-gray-600 text-center">No available learners to add.</div>
                      )}
                    </div>
                    <div className="px-4 py-3 border-t border-[var(--border)] flex items-center justify-between gap-3">
                      <span className="text-xs text-gray-600">{selectedLearnerIdsToAdd.length} selected</span>
                      <button type="button" className="btn-primary" disabled={!canManage || !selectedLearnerIdsToAdd.length || busy === 'add-members'} onClick={addSelectedLearnersToBatch}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        {busy === 'add-members' ? 'Adding...' : 'Add Selected'}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--border)] p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-[var(--accent)]" />
                      <h4 className="font-semibold">CSV Import Into This Batch</h4>
                    </div>
                    <p className="text-xs text-gray-600">
                      Paste rows as <code>fullName,email,password</code> or <code>email,fullName,password</code>. Existing learners are matched by email and added to this batch.
                    </p>
                    <textarea
                      className="input-field min-h-[120px] font-mono text-xs"
                      placeholder={`Asha Patel,asha@company.com,Temp@123\nravi@company.com,Ravi Kumar,Temp@123`}
                      value={batchCsvText}
                      onChange={(e) => setBatchCsvText(e.target.value)}
                    />
                    <input
                      className="input-field"
                      value={batchCsvDefaultPassword}
                      onChange={(e) => setBatchCsvDefaultPassword(e.target.value)}
                      placeholder="Default password for new learners"
                    />
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-gray-600">Preview rows: {batchCsvPreview.length}</span>
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={!canManage || !batchCsvPreview.length || busy === 'batch-csv-import'}
                        onClick={importLearnersIntoSelectedBatch}
                      >
                        {busy === 'batch-csv-import' ? 'Importing...' : 'Import + Add to Batch'}
                      </button>
                    </div>
                    {batchCsvImportResult && (
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs space-y-1">
                        <div>Created learners: {batchCsvImportResult.importSummary?.created ?? 0}</div>
                        <div>Skipped learner rows: {batchCsvImportResult.importSummary?.skipped ?? 0}</div>
                        <div>Added to batch: {batchCsvImportResult.batchAddSummary?.added ?? 0}</div>
                        <div>Skipped batch adds: {batchCsvImportResult.batchAddSummary?.skipped ?? 0}</div>
                        {(batchCsvImportResult.importSkipped || []).slice(0, 4).map((s: any) => (
                          <div key={`${s.index}-${s.email || 'row'}`} className="text-amber-700">
                            Row {s.index + 1}: {s.reason}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="card p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-[var(--accent)]" />
                    <h3 className="text-lg font-semibold">Assign Assessment to Batch</h3>
                  </div>
                  <form className="space-y-4" onSubmit={assignAssessmentToBatch}>
                    <div>
                      <label className="block text-sm font-medium mb-1">Published Assessment</label>
                      <select className="input-field" value={assignConfig.assessmentId} onChange={(e) => setAssignConfig((p) => ({ ...p, assessmentId: e.target.value }))} required>
                        <option value="">Select assessment</option>
                        {assessments.map((a) => (
                          <option key={a.id} value={a.id}>{a.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Due Date (optional)</label>
                        <input type="datetime-local" className="input-field" value={assignConfig.dueDate} onChange={(e) => setAssignConfig((p) => ({ ...p, dueDate: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Re-entry Policy</label>
                        <select className="input-field" value={assignConfig.reentryPolicy} onChange={(e) => setAssignConfig((p) => ({ ...p, reentryPolicy: e.target.value as BatchReentryPolicy }))}>
                          <option value="resume_allowed">Resume allowed</option>
                          <option value="single_session">Single session</option>
                        </select>
                      </div>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm">
                      <div className="text-xs uppercase tracking-wide text-[var(--text-dim)] font-semibold">Assignment Scope</div>
                      <div className="mt-1">
                        {selectedBatch.summary?.activeMemberCount || 0} active learner(s) will receive the selected assessment.
                      </div>
                    </div>
                    <button className="btn-primary w-full" disabled={!canManage || busy === 'assign-batch' || !assignConfig.assessmentId}>
                      {busy === 'assign-batch' ? 'Assigning...' : 'Assign to Batch'}
                    </button>
                  </form>

                  <div className="rounded-xl border border-[var(--border)] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="w-4 h-4 text-[var(--accent)]" />
                      <div className="font-semibold">Batch Results</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <input className="input-field" placeholder="Search learner / assessment" value={resultsSearch} onChange={(e) => setResultsSearch(e.target.value)} />
                      <select className="input-field" value={resultsStatus} onChange={(e) => setResultsStatus(e.target.value)}>
                        <option value="">All statuses</option>
                        <option value="assigned">Assigned</option>
                        <option value="in_progress">In Progress</option>
                        <option value="submitted">Submitted</option>
                        <option value="graded">Graded</option>
                        <option value="expired">Expired</option>
                      </select>
                      <select className="input-field" value={resultsAssessmentId} onChange={(e) => setResultsAssessmentId(e.target.value)}>
                        <option value="">All assessments</option>
                        {assessments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
                      </select>
                    </div>
                    <div className="flex justify-between items-center mb-3">
                      <div className="text-xs text-gray-600">
                        Attempts: <span className="font-semibold">{batchResultsSummary?.assignmentCount ?? batchResults.length}</span>
                        {' • '}Submitted: <span className="font-semibold">{batchResultsSummary?.submittedCount ?? 0}</span>
                        {' • '}Pass Rate: <span className="font-semibold">{batchResultsSummary?.passRate ?? 0}%</span>
                      </div>
                      <button type="button" className="btn-secondary" onClick={refreshResults} disabled={busy === 'refresh-results'}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${busy === 'refresh-results' ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                    </div>
                    <div className="max-h-[320px] overflow-auto table-shell">
                      <table className="w-full text-sm">
                        <thead className="bg-[var(--surface-2)] border-b border-[var(--border)]">
                          <tr>
                            <th className="px-3 py-2 text-left">Learner</th>
                            <th className="px-3 py-2 text-left">Assessment</th>
                            <th className="px-3 py-2 text-left">Status</th>
                            <th className="px-3 py-2 text-left">Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {batchResults.length ? batchResults.map((row) => (
                            <tr key={row.id} className="hover:bg-[var(--surface-2)]/50">
                              <td className="px-3 py-2">
                                <div className="font-medium text-gray-900">{row.learnerName}</div>
                                <div className="text-xs text-gray-600">{row.learnerEmail}</div>
                              </td>
                              <td className="px-3 py-2">{row.assessmentTitle}</td>
                              <td className="px-3 py-2">
                                <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-[var(--surface-2)] border border-[var(--border)]">
                                  {row.status}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                {row.score == null ? '—' : `${row.score}${row.passed === true ? ' ✓' : row.passed === false ? ' ✕' : ''}`}
                              </td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan={4} className="px-3 py-8 text-center text-sm text-gray-600">
                                No batch-attributed assignment results yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

function toDateTimeLocalValue(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}
