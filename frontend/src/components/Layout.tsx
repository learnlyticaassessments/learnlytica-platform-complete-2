import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileText, ClipboardList, User, Users, BarChart3, Book, Sparkles, LogOut, Zap, Award, Layers3, Sun, Moon, Monitor } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { can, getRoleLabel } from '../auth/permissions';
import { useTheme } from '../theme/ThemeProvider';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const roleLabel = getRoleLabel(user?.role);
  const { theme, setTheme, resolvedTheme, toggleTheme } = useTheme();

  const navigation: Array<{
    name: string;
    href: string;
    icon: any;
    highlight?: boolean;
    canView: boolean;
  }> = [
    { name: 'Questions', href: '/questions', icon: FileText, canView: can(user?.role, 'questions.view') },
    { name: 'AI Generator', href: '/ai/generate', icon: Sparkles, highlight: true, canView: can(user?.role, 'ai.generate') },
    { name: 'Assessments', href: '/assessments', icon: ClipboardList, canView: can(user?.role, 'assessments.view') },
    { name: 'Batches', href: '/batches', icon: Layers3, canView: can(user?.role, 'batches.view') },
    { name: 'Learners', href: '/learners', icon: Users, canView: can(user?.role, 'learners.view') },
    { name: 'Certificates', href: '/certificates', icon: Award, canView: can(user?.role, 'certificates.view') },
    { name: 'My Assessments', href: '/student/assessments', icon: User, canView: can(user?.role, 'student.assessments.view') },
    { name: 'Library', href: '/library', icon: Book, canView: can(user?.role, 'library.view') },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, canView: can(user?.role, 'analytics.view') }
  ];

  const visibleNavigation = navigation.filter((item) => {
    if (!user) return false;
    return item.canView;
  });

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-[var(--bg)] text-[var(--text)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-90 bg-[radial-gradient(circle_at_15%_10%,rgba(124,58,237,0.14),transparent_55%),radial-gradient(circle_at_85%_15%,rgba(139,92,246,0.12),transparent_50%)]" />
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] backdrop-blur-xl shadow-[0_10px_30px_rgba(2,8,23,0.12)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex flex-col gap-3 py-3 lg:py-0">
            <div className="flex items-center justify-between gap-3 lg:h-20">
              <Link to="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/50">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="leading-tight">
                  <div className="text-lg font-bold tracking-tight text-[var(--text)]">Learnlytica</div>
                  <div className="text-[10px] font-semibold tracking-[0.18em] text-[var(--accent)]">AI-POWERED PLATFORM</div>
                </div>
              </Link>
              <div className="flex items-center gap-2 ml-auto shrink-0">
              {user && (
                <div className="hidden lg:flex flex-col items-end mr-1 max-w-[220px]">
                  <span className="text-xs font-semibold text-[var(--text)] leading-none truncate max-w-full">{user.fullName}</span>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--accent)] font-semibold">{roleLabel}</span>
                </div>
              )}
              <div className="hidden sm:flex items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`p-2 rounded-lg transition ${theme === 'light' ? 'bg-[var(--surface-3)] text-[var(--text)]' : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'}`}
                  title="Light theme"
                >
                  <Sun className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`p-2 rounded-lg transition ${theme === 'dark' ? 'bg-[var(--surface-3)] text-[var(--text)]' : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'}`}
                  title="Dark theme"
                >
                  <Moon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('system')}
                  className={`p-2 rounded-lg transition ${theme === 'system' ? 'bg-[var(--surface-3)] text-[var(--text)]' : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'}`}
                  title={`System theme (${resolvedTheme})`}
                >
                  <Monitor className="w-4 h-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="sm:hidden p-2 text-[var(--text-muted)] hover:text-[var(--text)] rounded-xl hover:bg-[var(--surface)] transition border border-[var(--border)] bg-[var(--surface)]"
                title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
              >
                {resolvedTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="hidden md:inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-[var(--text-2)] hover:text-[var(--text)] rounded-xl hover:bg-[var(--surface-2)] border border-[var(--border)] bg-[var(--surface)] transition shrink-0"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="md:hidden p-2 text-[var(--text-2)] hover:text-[var(--text)] rounded-xl hover:bg-[var(--surface-2)] border border-[var(--border)] bg-[var(--surface)] transition shrink-0"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <nav className="hidden xl:flex items-center gap-2 min-w-0 flex-1 overflow-x-auto no-scrollbar pb-1">
                {visibleNavigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`relative flex items-center px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                        item.highlight
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25 hover:-translate-y-0.5 hover:shadow-purple-500/35'
                          : isActive
                          ? 'bg-[var(--surface-3)] text-[var(--accent-2)] border border-[var(--border-focus)]'
                          : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] border border-transparent'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.name}
                      {item.highlight && <Sparkles className="w-3 h-3 ml-1" />}
                      {!item.highlight && isActive && (
                        <span className="absolute left-3 right-3 -bottom-0.5 h-0.5 rounded-full bg-[var(--accent)]" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            <div className="w-full xl:hidden">
              <nav className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {visibleNavigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg ${
                        item.highlight
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                          : isActive
                          ? 'bg-[var(--surface-3)] text-[var(--accent-2)] border border-[var(--border-focus)]'
                          : 'bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto relative z-10 pb-8">{children}</main>
    </div>
  );
}
