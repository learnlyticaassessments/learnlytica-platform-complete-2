import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, ClipboardList, User, BarChart3, Book, Sparkles, Settings, LogOut } from 'lucide-react';

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">L</span>
                </div>
                <span className="ml-2 text-xl font-bold text-gray-900">Learnlytica</span>
                <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold">
                  AI-POWERED
                </span>
              </Link>
              <nav className="ml-10 flex space-x-4">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition ${
                        item.highlight
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                          : isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.name}
                      {item.highlight && <Sparkles className="w-3 h-3 ml-1" />}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100">
                <Settings className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto">{children}</main>
    </div>
  );
}
