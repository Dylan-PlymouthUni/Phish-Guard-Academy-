import { Shield, Menu, X, Zap, BookOpen, Award, BarChart3, History, Settings, LayoutDashboard } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/analyze', label: 'Analyze', icon: Zap },
    { path: '/challenges', label: 'Challenges', icon: Award },
    { path: '/learning', label: 'Learn', icon: BookOpen },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/history', label: 'History', icon: History },
    { path: '/settings', label: 'Settings', icon: Settings },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex flex-col">
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-blue-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg group-hover:shadow-lg group-hover:shadow-blue-500/50 transition">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">PhishGuard</h1>
                <p className="text-xs text-slate-400">Academy</p>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {navItems.map(item => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 text-sm ${
                      isActive(item.path)
                        ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                )
              })}
            </div>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-slate-300 hover:text-white transition"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {mobileOpen && (
            <div className="md:hidden pb-4 space-y-2 border-t border-blue-500/20">
              {navItems.map(item => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                      isActive(item.path)
                        ? 'bg-blue-600/20 text-blue-300'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </nav>

      <main className="flex-1 w-full">
        {children}
      </main>

      <footer className="border-t border-blue-500/20 bg-slate-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-white font-bold mb-3">PhishGuard</h3>
              <p className="text-sm text-slate-400">AI-powered phishing detection and security awareness</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link to="/analyze" className="hover:text-blue-400 transition">Analyzer</Link></li>
                <li><a href="#" className="hover:text-blue-400 transition">API</a></li>
                <li><a href="#" className="hover:text-blue-400 transition">Status</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Resources</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link to="/learning" className="hover:text-blue-400 transition">Docs</Link></li>
                <li><a href="#" className="hover:text-blue-400 transition">Blog</a></li>
                <li><a href="#" className="hover:text-blue-400 transition">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-blue-400 transition">Privacy</a></li>
                <li><a href="#" className="hover:text-blue-400 transition">Terms</a></li>
                <li><a href="#" className="hover:text-blue-400 transition">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-blue-500/20 pt-8 text-center text-sm text-slate-500">
            © 2025 PhishGuard Academy. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
