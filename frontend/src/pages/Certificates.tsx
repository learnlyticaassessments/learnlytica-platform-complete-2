import { useEffect, useState } from 'react';
import { certificateService } from '../services/certificateService';

export function Certificates() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await certificateService.list();
      setItems(res.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const revoke = async (id: string) => {
    const reason = prompt('Reason for revocation (optional)') || undefined;
    try {
      await certificateService.revoke(id, reason);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to revoke certificate');
    }
  };

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Certificates</h1>
        <p className="text-gray-600 mt-1">Issued learner certificates and verification tracking</p>
      </div>
      {error && <div className="ll-toast err">{error}</div>}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-2)] border-b border-[var(--border)]">
              <tr>
                <th className="px-3 py-3 text-left">Certificate</th>
                <th className="px-3 py-3 text-left">Learner</th>
                <th className="px-3 py-3 text-left">Assessment</th>
                <th className="px-3 py-3 text-left">Issued</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {items.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-3">
                    <div className="font-medium">{c.certificateNumber}</div>
                    <div className="text-xs text-gray-600">Verify: {c.verificationCode}</div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium">{c.learnerName}</div>
                    <div className="text-xs text-gray-600">{c.learnerEmail}</div>
                  </td>
                  <td className="px-3 py-3">{c.assessmentTitle}</td>
                  <td className="px-3 py-3 text-xs">{c.issuedAt ? new Date(c.issuedAt).toLocaleString() : '—'}</td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.status === 'issued' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    {c.status === 'issued' ? (
                      <button className="btn-danger" onClick={() => void revoke(c.id)}>Revoke</button>
                    ) : (
                      <span className="text-xs text-gray-500">Revoked</span>
                    )}
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No certificates issued yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
