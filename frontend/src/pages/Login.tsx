import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Lock, Mail, Sparkles } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const demoAccounts = [
  { role: 'Admin', email: 'admin@learnlytica.local', password: 'Admin@123' },
  { role: 'Client', email: 'client@learnlytica.local', password: 'Client@123' },
  { role: 'Student', email: 'student@learnlytica.local', password: 'Student@123' }
];

export function Login() {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const { login } = useAuth();

  const [email, setEmail] = useState(demoAccounts[0].email);
  const [password, setPassword] = useState(demoAccounts[0].password);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const nextPath = location.state?.from || '/questions';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(nextPath, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="hidden lg:block rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white p-8 shadow-[0_30px_60px_rgba(99,102,241,.25)] relative overflow-hidden">
          <div className="absolute -top-10 -right-8 w-40 h-40 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute bottom-6 left-8 w-28 h-28 rounded-full bg-fuchsia-200/20 blur-2xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Learnlytica Access Portal
            </div>
            <h1 className="mt-5 text-3xl font-bold leading-tight">Production Login with Role-Based Access</h1>
            <p className="mt-3 text-white/90">
              Sign in as Admin, Client, or Student. The app now uses real JWT login and protected API routes.
            </p>
            <div className="mt-6 space-y-3">
              {demoAccounts.map((acc) => (
                <button
                  type="button"
                  key={acc.role}
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword(acc.password);
                  }}
                  className="w-full text-left rounded-2xl border border-white/15 bg-white/10 px-4 py-3 hover:bg-white/15 transition"
                >
                  <div className="text-sm font-semibold">{acc.role}</div>
                  <div className="text-xs text-white/80">{acc.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sign in</h2>
            <p className="mt-1 text-sm text-slate-500">Use one of the seeded demo accounts or your own DB user.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-9"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-9"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-ai w-full min-h-[46px]">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-700 mb-2">Demo credentials</div>
            <div className="space-y-2 text-xs text-slate-600">
              {demoAccounts.map((acc) => (
                <div key={acc.role} className="flex justify-between gap-3">
                  <span className="font-medium">{acc.role}</span>
                  <span className="font-mono">{acc.email} / {acc.password}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

