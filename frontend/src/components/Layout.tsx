import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, ClipboardList, User, BarChart3, Book, Sparkles, Settings, LogOut, Zap } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navigation = [
    { name: 'Questions', href: '/questions', icon: FileText },
    { name: 'AI Generator', href: '/ai/generate', icon: Sparkles, highlight: true },
    { name: 'Assessments', href: '/assessments', icon: ClipboardList },
    { name: 'My Assessments', href: '/student/assessments', icon: User },
    { name: 'Library', href: '/library', icon: Book },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 }
  ];

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-x-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_15%_10%,rgba(99,102,241,0.12),transparent_55%),radial-gradient(circle_at_85%_15%,rgba(236,72,153,0.10),transparent_50%)]" />
      <header className="sticky top-0 z-50 border-b border-white/30 bg-white/70 backdrop-blur-xl shadow-[0_1px_0_rgba(255,255,255,0.7),0_8px_30px_rgba(15,23,42,0.06)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 py-3 lg:h-20 lg:flex-row lg:items-center lg:justify-between lg:py-0">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/50">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="leading-tight">
                  <div className="text-lg font-bold tracking-tight text-slate-900">Learnlytica</div>
                  <div className="text-[10px] font-semibold tracking-[0.18em] text-purple-600">AI-POWERED PLATFORM</div>
                </div>
              </Link>
              <nav className="hidden xl:flex items-center gap-2">
                {navigation.map((item) => {
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
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-600 hover:bg-white hover:text-slate-900'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.name}
                      {item.highlight && <Sparkles className="w-3 h-3 ml-1" />}
                      {!item.highlight && isActive && (
                        <span className="absolute left-3 right-3 -bottom-0.5 h-0.5 rounded-full bg-indigo-500" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex items-center justify-between gap-3">
              <nav className="flex xl:hidden items-center gap-2 overflow-x-auto no-scrollbar">
                {navigation.slice(0, 4).map((item) => {
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
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-white/80 text-slate-600'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
              <div className="flex items-center gap-2 ml-auto">
              <button className="p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-white/90 transition">
                <Settings className="w-5 h-5" />
              </button>
              <button className="p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-white/90 transition">
                <LogOut className="w-5 h-5" />
              </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto relative z-10">{children}</main>
    </div>
  );
}
