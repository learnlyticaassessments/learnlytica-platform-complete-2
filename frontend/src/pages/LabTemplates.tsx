import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { can } from '../auth/permissions';
import {
  useCreateLabTemplate,
  useDeleteLabTemplate,
  useLabTemplates,
  useUpdateLabTemplate
} from '../hooks/useAssessments';

const DEFAULT_TEMPLATE = {
  name: '',
  description: '',
  category: 'backend',
  dockerImage: 'learnlytica/executor-node:latest',
  dockerTag: 'latest',
  resourceLimits: {
    cpu: '1',
    memory: '1Gi',
    storage: '5Gi'
  },
  environmentVariables: {},
  vscodeExtensions: [],
  vscodeSettings: {},
  npmPackages: [],
  pipPackages: [],
  exposedPorts: []
};

export function LabTemplates() {
  const { user } = useAuth();
  const canManage = can(user?.role, 'labTemplates.manage');
  const { data, isLoading, isError, refetch } = useLabTemplates();
  const createMutation = useCreateLabTemplate();
  const updateMutation = useUpdateLabTemplate();
  const deleteMutation = useDeleteLabTemplate();

  const [form, setForm] = useState<any>(DEFAULT_TEMPLATE);
  const templates = data?.data || [];

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    try {
      await createMutation.mutateAsync(form);
      setForm(DEFAULT_TEMPLATE);
      await refetch();
    } catch (error) {
      console.error('Failed to create lab template', error);
      alert('Failed to create lab template');
    }
  };

  const toggleActive = async (template: any) => {
    if (!canManage) return;
    try {
      await updateMutation.mutateAsync({
        id: template.id,
        data: { isActive: !template.isActive }
      });
      await refetch();
    } catch (error) {
      console.error('Failed to update lab template', error);
      alert('Failed to update lab template');
    }
  };

  const removeTemplate = async (template: any) => {
    if (!canManage) return;
    const ok = window.confirm(`Delete template "${template.name}"?`);
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync(template.id);
      await refetch();
    } catch (error) {
      console.error('Failed to delete lab template', error);
      alert('Cannot delete template that is in use. Deactivate it instead.');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Runtime Templates</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Execution runtimes used by assessments. Learners still code in Monaco editor.
        </p>
      </div>

      {canManage && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Create Runtime Template</h2>
          <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                className="input-field"
                value={form.name}
                onChange={(e) => setForm((prev: any) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                className="input-field"
                value={form.category}
                onChange={(e) => setForm((prev: any) => ({ ...prev, category: e.target.value }))}
              >
                <option value="frontend">frontend</option>
                <option value="backend">backend</option>
                <option value="fullstack">fullstack</option>
                <option value="database">database</option>
                <option value="devops">devops</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Docker Image</label>
              <select
                className="input-field"
                value={form.dockerImage}
                onChange={(e) => setForm((prev: any) => ({ ...prev, dockerImage: e.target.value }))}
              >
                <option value="learnlytica/executor-node:latest">learnlytica/executor-node:latest</option>
                <option value="learnlytica/executor-python:latest">learnlytica/executor-python:latest</option>
                <option value="learnlytica/executor-java:latest">learnlytica/executor-java:latest</option>
                <option value="learnlytica/executor-playwright:latest">learnlytica/executor-playwright:latest</option>
                <option value="learnlytica/executor-dotnet:latest">learnlytica/executor-dotnet:latest</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">CPU</label>
              <input
                className="input-field"
                value={form.resourceLimits.cpu}
                onChange={(e) =>
                  setForm((prev: any) => ({ ...prev, resourceLimits: { ...prev.resourceLimits, cpu: e.target.value } }))
                }
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Memory</label>
              <input
                className="input-field"
                value={form.resourceLimits.memory}
                onChange={(e) =>
                  setForm((prev: any) => ({ ...prev, resourceLimits: { ...prev.resourceLimits, memory: e.target.value } }))
                }
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Storage</label>
              <input
                className="input-field"
                value={form.resourceLimits.storage}
                onChange={(e) =>
                  setForm((prev: any) => ({ ...prev, resourceLimits: { ...prev.resourceLimits, storage: e.target.value } }))
                }
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                className="input-field"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((prev: any) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button className="btn-primary" disabled={createMutation.isPending} type="submit">
                {createMutation.isPending ? 'Creating...' : 'Create Template'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Available Templates</h2>
        {isLoading && <div className="text-sm text-[var(--text-muted)]">Loading...</div>}
        {isError && <div className="text-sm text-red-500">Failed to load templates.</div>}
        {!isLoading && !templates.length && (
          <div className="text-sm text-[var(--text-muted)]">No lab templates found.</div>
        )}
        <div className="space-y-3">
          {templates.map((template: any) => (
            <div key={template.id} className="rounded-xl border border-[var(--border)] p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{template.name}</div>
                  <div className="text-sm text-[var(--text-muted)] mt-1">
                    {template.category} • {template.dockerImage}
                  </div>
                  <div className="text-xs mt-1">
                    Status: <span className={template.isActive ? 'text-emerald-600' : 'text-amber-600'}>{template.isActive ? 'active' : 'inactive'}</span>
                    {' • '}Usage: {template.usageCount || 0}
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button type="button" className="btn-secondary" onClick={() => toggleActive(template)}>
                      {template.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => removeTemplate(template)}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
