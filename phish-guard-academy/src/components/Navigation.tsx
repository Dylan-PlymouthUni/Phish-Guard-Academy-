/**
 * Navigation component/module file.
  * This file defines the Navigation component which is responsible for rendering the navigation bar of the PhishGuard Academy application. 
  * The navigation bar includes links to different sections of the app, such as Dashboard, Analyze, Sandbox, Challenges, Learn, Leaderboard, Achievements, Analytics, and Settings. 
  * It also features a responsive design that adapts to different screen sizes, providing a mobile-friendly menu toggle.
  *  The component uses React Router's Link for navigation and highlights the active link based on the current URL path. 
  * Additionally, it displays a greeting with the user's name when they are authenticated.
 */

import { Menu, X, Zap, BarChart3, BookOpen, Target, Settings, Shield, LayoutDashboard, Beaker, Trophy, Award } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Navigation() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const { user, isAuthenticated } = useAuth()

    const isActive = (path: string) => location.pathname === path

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/analyze', label: 'Analyze', icon: Shield },
    { path: '/sandbox', label: 'Sandbox', icon: Beaker },
    { path: '/challenges', label: 'Challenges', icon: Target },
    { path: '/learning', label: 'Learn', icon: BookOpen },
    { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { path: '/achievements', label: 'Achievements', icon: Award },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <nav className="border-b border-blue-500/20 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50 touch-manipulation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-base sm:text-lg text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 active:scale-95 transition-transform">
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 flex-shrink-0" />
            <span className="hidden xs:inline">PhishGuard Academy</span>
            <span className="xs:hidden">PhishGuard</span>
          </Link>

          {/* Desktop */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`px-3 py-2 rounded-lg flex items-center gap-2 transition active:scale-95 ${
                  isActive(path)
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{label}</span>
              </Link>
            ))}
            {isAuthenticated && (
              <div className="flex items-center gap-3 pl-3 ml-3 border-l border-slate-700">
                <span className="text-sm text-slate-300 hidden xl:inline">Hi, {user?.name || 'you'}</span>
              </div>
            )}
          </div>

          {/* Mobile */}
          <div className="lg:hidden flex items-center gap-2">
            <button
              onClick={() => setOpen(!open)}
              className="text-slate-400 hover:text-slate-300 active:scale-95 transition touch-manipulation p-2"
              aria-label="Toggle menu"
            >
              {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="lg:hidden pb-4 space-y-2 animate-in slide-in-from-top-5 duration-200">
            {navLinks.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setOpen(false)}
                className={`block px-4 py-3 rounded-lg flex items-center gap-3 transition active:scale-95 touch-manipulation ${
                  isActive(path)
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-base font-medium">{label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
