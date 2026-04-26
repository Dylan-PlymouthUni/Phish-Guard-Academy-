/**
 * MainLayout component/module file.
  * This file defines the MainLayout component which serves as the overall layout for the PhishGuard Academy application.
 */

import React from 'react'
import Navigation from '../Navigation'
import { Zap } from 'lucide-react'

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Navigation />
      <main className="w-full">{children}</main>
      
      {/* Footer */}
      <footer className="border-t border-slate-700/50 bg-slate-900/50 mt-20">
        <div className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-400">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-white">PhishGuard Academy</span>
          </div>
          <p>Protecting users from phishing attacks</p>
          <p className="text-xs mt-2">© 2025 PhishGuard. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
