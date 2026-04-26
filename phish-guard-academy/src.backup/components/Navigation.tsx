/**
 * Navigation component/module file.
  * This file defines the Navigation component which provides a responsive navigation bar for the PhishGuard Academy application. The navigation bar includes links to different pages of the app, such as Dashboard, Analyze, Challenges, Learn, Analytics, and Settings. It also features a logo and adapts to different screen sizes by showing a hamburger menu on mobile devices.
  * The Navigation component is responsible for:
  * - Displaying the application logo and name.
  * - Providing navigation links to different pages of the application.
  * - Highlighting the active navigation link based on the current route.
  * - Implementing a responsive design that shows a hamburger menu on smaller screens.
  * - Ensuring a visually appealing and user-friendly interface with appropriate use of colors, typography, and spacing.
 */

import { Menu, X, Zap, BarChart3, BookOpen, Target, Settings } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Navigation() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

    const isActive = (path: string) => location.pathname === path

  const navLinks = [
    { path: '/app/', label: 'Dashboard', icon: BarChart3 },
    { path: '/app/analyze', label: 'Analyze', icon: Zap },
    { path: '/app/challenges', label: 'Challenges', icon: Target },
    { path: '/app/learning', label: 'Learn', icon: BookOpen },
    { path: '/app/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/app/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <nav className="border-b border-blue-500/20 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/app/" className="flex items-center gap-2 font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
            <Zap className="w-6 h-6" />
            PhishGuard
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`px-3 py-2 rounded-lg flex items-center gap-2 transition ${
                  isActive(path)
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{label}</span>
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden text-slate-400 hover:text-slate-300"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {open && (
          <div className="md:hidden pb-4 space-y-2">
            {navLinks.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setOpen(false)}
                className={`block px-3 py-2 rounded-lg flex items-center gap-2 transition ${
                  isActive(path)
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
