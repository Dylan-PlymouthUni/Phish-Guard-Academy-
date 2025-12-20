import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { NotificationProvider } from './contexts/NotificationContext'
import { AchievementProvider } from './contexts/AchievementContext'
import { MLSettingsProvider } from './contexts/MLSettingsContext'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Analyze from './pages/Analyze'
import Challenges from './pages/Challenges'
import Learn from './pages/Learn'
import Settings from './pages/Settings'
import Analytics from './pages/Analytics'
import Sandbox from './pages/Sandbox'
import History from './pages/History'
import Leaderboard from './pages/Leaderboard'

export default function App() {
  return (
    <ErrorBoundary>
      <MLSettingsProvider>
        <NotificationProvider>
          <AchievementProvider>
            <Router basename="/app/">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/analyze" element={<Analyze />} />
                <Route path="/challenges" element={<Challenges />} />
                <Route path="/learning" element={<Learn />} />
                <Route path="/sandbox" element={<Sandbox />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/history" element={<History />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
              </Routes>
            </Router>
          </AchievementProvider>
        </NotificationProvider>
      </MLSettingsProvider>
    </ErrorBoundary>
  )
}
