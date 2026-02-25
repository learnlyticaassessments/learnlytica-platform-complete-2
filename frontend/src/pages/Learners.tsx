import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Users, ClipboardCheck, Loader2 } from 'lucide-react';
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
};

type Assessment = {
  id: string;
  title: string;
  status: string;
  questionCount?: number;
  totalPoints?: number;
};

type ReentryPolicy = 'resume_allowed' | 'single_session';
type AssignmentStatus = 'assigned' | 'in_progress' | 'submitted' | 'graded' | 'expired';

type AssignmentRow = {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  studentId: string;
  learnerName: string;
  learnerEmail: string;
  status: AssignmentStatus;
  dueDate: string | null;
  assignedAt: string;
  submittedAt?: string | null;
  score?: number | null;
  reentryPolicy: ReentryPolicy;
};

export function Learners() {
  const { user } = useAuth();
  const canManage = can(user?.role, 'learners.manage');

  const [loading, setLoading] = useState(true);
  const [submittingLearner, setSubmittingLearner] = useState(false);
  const [submittingAssignment, setSubmittingAssignment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [learners, setLearners] = useState<Learner[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [selectedLearnerIds, setSelectedLearnerIds] = useState<string[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [reentryPolicy, setReentryPolicy] = useState<ReentryPolicy>('resume_allowed');
  const [search, setSearch] = useState('');
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<string>('');
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentBusyId, setAssignmentBusyId] = useState<string | null>(null);

  const [newLearner, setNewLearner] = useState({
    fullName: '',
    email: '',
    password: ''
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [learnersRes, assessmentsRes, assignmentsRes] = await Promise.all([
        learnersService.list(),
        assessmentService.list({ status: 'published', page: 1, limit: 100 }),
        assessmentService.listAssignments({ page: 1, limit: 100 })
      ]);
      const assessmentRows = Array.isArray(assessmentsRes?.data)
        ? assessmentsRes.data
        : (assessmentsRes?.data?.assessments || []);
      setLearners(learnersRes.data || []);
      setAssessments(assessmentRows.filter((a: Assessment) => a.status === 'published'));
      setAssignments(assignmentsRes?.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load learners and assessments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredLearners = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return learners;
    return learners.filter((learner) =>
      learner.fullName.toLowerCase().includes(q) || learner.email.toLowerCase().includes(q)
    );
  }, [learners, search]);

  const selectedAssessment = assessments.find((a) => a.id === selectedAssessmentId);
  const selectedAssessmentFilter = useMemo(() => {
    return selectedAssessmentId || '';
  }, [selectedAssessmentId]);

  const filteredAssignments = useMemo(() => {
    const q = assignmentSearch.trim().toLowerCase();
    return assignments.filter((row) => {
      if (selectedAssessmentFilter && row.assessmentId !== selectedAssessmentFilter) return false;
      if (assignmentStatusFilter && row.status !== assignmentStatusFilter) return false;
      if (!q) return true;
      return (
        row.learnerName.toLowerCase().includes(q) ||
        row.learnerEmail.toLowerCase().includes(q) ||
        row.assessmentTitle.toLowerCase().includes(q)
      );
    });
  }, [assignments, selectedAssessmentFilter, assignmentStatusFilter, assignmentSearch]);

  const toggleLearnerSelection = (id: string) => {
    setSelectedLearnerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreateLearner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setSubmittingLearner(true);
    setError(null);
    setSuccess(null);
    try {
      await learnersService.create(newLearner);
      setSuccess('Learner created successfully');
      setNewLearner({ fullName: '', email: '', password: '' });
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to create learner');
    } finally {
      setSubmittingLearner(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    if (!selectedAssessmentId || selectedLearnerIds.length === 0) {
      setError('Select one published assessment and at least one learner');
      return;
    }

    setSubmittingAssignment(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: {
        studentIds: string[];
        dueDate?: string;
        reentryPolicy: ReentryPolicy;
      } = {
        studentIds: selectedLearnerIds,
        reentryPolicy
      };

      if (dueDate) {
        payload.dueDate = new Date(dueDate).toISOString();
      }

      await assessmentService.assign(selectedAssessmentId, payload);
      setSuccess(`Assigned "${selectedAssessment?.title || 'assessment'}" to ${selectedLearnerIds.length} learner(s)`);
      setSelectedLearnerIds([]);
      setDueDate('');
      setReentryPolicy('resume_allowed');
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to assign assessment');
    } finally {
      setSubmittingAssignment(false);
    }
  };

  const toDateTimeLocalValue = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const updateAssignmentRow = async (row: AssignmentRow, patch: Partial<{ dueDate: string | null; reentryPolicy: ReentryPolicy }>) => {
    setAssignmentBusyId(row.id);
    setError(null);
    setSuccess(null);
    try {
      const payload: any = {};
      if ('dueDate' in patch) payload.dueDate = patch.dueDate ? new Date(patch.dueDate).toISOString() : null;
      if (patch.reentryPolicy) payload.reentryPolicy = patch.reentryPolicy;
      await assessmentService.updateAssignment(row.id, payload);
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === row.id
            ? {
                ...a,
                dueDate: payload.dueDate === undefined ? a.dueDate : payload.dueDate,
                reentryPolicy: payload.reentryPolicy ?? a.reentryPolicy
              }
            : a
        )
      );
      setSuccess(`Updated assignment for ${row.learnerName}`);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to update assignment');
    } finally {
      setAssignmentBusyId(null);
    }
  };

  const revokeAssignment = async (row: AssignmentRow) => {
    if (!confirm(`Revoke assignment for ${row.learnerName}?`)) return;
    setAssignmentBusyId(row.id);
    setError(null);
    setSuccess(null);
    try {
      await assessmentService.revokeAssignment(row.id);
      setAssignments((prev) => prev.filter((a) => a.id !== row.id));
      setSuccess(`Revoked assignment for ${row.learnerName}`);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to revoke assignment');
    } finally {
      setAssignmentBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="card flex items-center justify-center gap-3 py-16">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
          <span>Loading learners workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 fade-in">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Learners</h1>
          <p className="text-gray-600 mt-1">
            Create learners and assign published assessments with re-entry rules.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <div className="card px-4 py-3 min-w-[120px]">
            <div className="text-gray-500">Learners</div>
            <div className="text-xl font-bold">{learners.length}</div>
          </div>
          <div className="card px-4 py-3 min-w-[140px]">
            <div className="text-gray-500">Published Assessments</div>
            <div className="text-xl font-bold">{assessments.length}</div>
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
        <div className="xl:col-span-1 card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-lg font-semibold text-gray-900">Create Learner</h2>
          </div>
          <form className="space-y-4" onSubmit={handleCreateLearner}>
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input
                className="input-field"
                value={newLearner.fullName}
                onChange={(e) => setNewLearner((p) => ({ ...p, fullName: e.target.value }))}
                placeholder="Asha Patel"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                className="input-field"
                value={newLearner.email}
                onChange={(e) => setNewLearner((p) => ({ ...p, email: e.target.value }))}
                placeholder="asha@company.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Temporary Password</label>
              <input
                type="password"
                className="input-field"
                value={newLearner.password}
                onChange={(e) => setNewLearner((p) => ({ ...p, password: e.target.value }))}
                placeholder="Min 8 chars"
                minLength={8}
                required
              />
            </div>
            <button className="btn-primary w-full" disabled={submittingLearner || !canManage}>
              {submittingLearner ? 'Creating...' : 'Create Learner'}
            </button>
          </form>
          <p className="text-xs text-gray-500">
            Learners are created under your organization and can only access student workflows.
          </p>
        </div>

        <div className="xl:col-span-2 card p-6 space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[var(--accent)]" />
              <h2 className="text-lg font-semibold text-gray-900">Assign Assessment</h2>
            </div>
            <input
              className="input-field md:w-72"
              placeholder="Search learners by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <form onSubmit={handleAssign} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Published Assessment</label>
                <select
                  className="input-field"
                  value={selectedAssessmentId}
                  onChange={(e) => setSelectedAssessmentId(e.target.value)}
                  required
                >
                  <option value="">Select an assessment</option>
                  {assessments.map((assessment) => (
                    <option key={assessment.id} value={assessment.id}>
                      {assessment.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Due Date (optional)</label>
                <input
                  type="datetime-local"
                  className="input-field"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Re-entry Policy</label>
                <select
                  className="input-field"
                  value={reentryPolicy}
                  onChange={(e) => setReentryPolicy(e.target.value as ReentryPolicy)}
                >
                  <option value="resume_allowed">Resume allowed (multi-session)</option>
                  <option value="single_session">Single session (attempt lock)</option>
                </select>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-dim)]">Selection</div>
                <div className="mt-1 text-sm">
                  <span className="font-semibold">{selectedLearnerIds.length}</span> learner(s)
                  {selectedAssessment && (
                    <>
                      {' '}for <span className="font-semibold">{selectedAssessment.title}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface-2)] border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">Select Learners</span>
                </div>
                {filteredLearners.length > 0 && (
                  <button
                    type="button"
                    className="text-sm text-[var(--accent-2)] hover:underline"
                    onClick={() =>
                      setSelectedLearnerIds((prev) =>
                        prev.length === filteredLearners.length ? [] : filteredLearners.map((l) => l.id)
                      )
                    }
                  >
                    {selectedLearnerIds.length === filteredLearners.length ? 'Clear All' : 'Select All'}
                  </button>
                )}
              </div>
              <div className="max-h-[420px] overflow-auto divide-y divide-[var(--border)]">
                {filteredLearners.length === 0 ? (
                  <div className="px-4 py-8 text-sm text-gray-500 text-center">
                    No learners found. Create a learner first.
                  </div>
                ) : (
                  filteredLearners.map((learner) => {
                    const checked = selectedLearnerIds.includes(learner.id);
                    return (
                      <label
                        key={learner.id}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition ${
                          checked ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleLearnerSelection(learner.id)}
                          className="h-4 w-4"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900 truncate">{learner.fullName}</div>
                          <div className="text-sm text-gray-600 truncate">{learner.email}</div>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            learner.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {learner.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <p className="text-xs text-gray-500">
                Assignment applies the selected re-entry policy to each created learner attempt.
              </p>
              <button
                className="btn-primary"
                type="submit"
                disabled={submittingAssignment || !canManage || !selectedAssessmentId || selectedLearnerIds.length === 0}
              >
                {submittingAssignment ? 'Assigning...' : `Assign to ${selectedLearnerIds.length || 0} Learner(s)`}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Assignment Operations</h2>
            <p className="text-sm text-gray-600">Extend due dates, change re-entry policy, or revoke unsubmitted attempts.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full lg:w-auto">
            <input
              className="input-field min-w-[220px]"
              placeholder="Search learner / assessment"
              value={assignmentSearch}
              onChange={(e) => setAssignmentSearch(e.target.value)}
            />
            <select
              className="input-field"
              value={assignmentStatusFilter}
              onChange={(e) => setAssignmentStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In progress</option>
              <option value="submitted">Submitted</option>
              <option value="graded">Graded</option>
              <option value="expired">Expired</option>
            </select>
            <button className="btn-secondary" type="button" onClick={loadData}>
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-2)] border-b border-[var(--border)]">
              <tr>
                <th className="px-3 py-3 text-left">Learner</th>
                <th className="px-3 py-3 text-left">Assessment</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-3 py-3 text-left">Due Date</th>
                <th className="px-3 py-3 text-left">Re-entry</th>
                <th className="px-3 py-3 text-left">Result</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredAssignments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No assignments match current filters.
                  </td>
                </tr>
              )}
              {filteredAssignments.map((row) => {
                const isLocked = row.status === 'submitted' || row.status === 'graded';
                const busy = assignmentBusyId === row.id;
                return (
                  <tr key={row.id} className="hover:bg-[var(--surface-2)]/50 align-top">
                    <td className="px-3 py-3">
                      <div className="font-medium text-gray-900">{row.learnerName}</div>
                      <div className="text-xs text-gray-600">{row.learnerEmail}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-gray-900">{row.assessmentTitle}</div>
                      <div className="text-xs text-gray-600">ID: {row.assessmentId.slice(0, 8)}...</div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        row.status === 'assigned' ? 'bg-blue-100 text-blue-700' :
                        row.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                        row.status === 'submitted' ? 'bg-purple-100 text-purple-700' :
                        row.status === 'graded' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {row.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="datetime-local"
                        className="input-field min-w-[180px]"
                        defaultValue={toDateTimeLocalValue(row.dueDate)}
                        disabled={busy}
                        onBlur={(e) => {
                          const nextVal = e.target.value || null;
                          const currentVal = toDateTimeLocalValue(row.dueDate) || null;
                          if (nextVal !== currentVal) {
                            void updateAssignmentRow(row, { dueDate: nextVal });
                          }
                        }}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <select
                        className="input-field min-w-[180px]"
                        value={row.reentryPolicy}
                        disabled={busy || isLocked}
                        onChange={(e) => void updateAssignmentRow(row, { reentryPolicy: e.target.value as ReentryPolicy })}
                      >
                        <option value="resume_allowed">Resume allowed</option>
                        <option value="single_session">Single session</option>
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      {row.score != null ? (
                        <div>
                          <div className="font-medium">{row.score}%</div>
                          <div className="text-xs text-gray-600">{row.submittedAt ? new Date(row.submittedAt).toLocaleString() : ''}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">Not submitted</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/learners/assignments/${row.id}`}
                          className="btn-secondary"
                          title="Inspect assignment timeline and activity"
                        >
                          Inspect
                        </Link>
                        {isLocked && (
                          <Link
                            to={`/learners/assignments/${row.id}/review`}
                            className="btn-secondary"
                            title="Open learner review"
                          >
                            Review
                          </Link>
                        )}
                        <button
                          type="button"
                          className="btn-danger"
                          disabled={busy || isLocked}
                          onClick={() => void revokeAssignment(row)}
                          title={isLocked ? 'Cannot revoke submitted/graded assignment' : 'Revoke assignment'}
                        >
                          {busy ? 'Working...' : 'Revoke'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
