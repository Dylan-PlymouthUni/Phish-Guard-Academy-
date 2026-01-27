import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { NotificationProvider } from './contexts/NotificationContext'
import { AchievementProvider } from './contexts/AchievementContext'
import { MLSettingsProvider } from './contexts/MLSettingsContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Analyze from './pages/Analyze'
import Challenges from './pages/Challenges'
import Learn from './pages/Learn'
import Settings from './pages/Settings'
import Analytics from './pages/Analytics'
import Sandbox from './pages/Sandbox'
import History from './pages/History'
import Leaderboard from './pages/Leaderboard'
import Achievements from './pages/Achievements'
import { initializeSettings } from './utils/settingsEffects'
import { initKeyboardShortcuts, cleanupKeyboardShortcuts, setupCommonShortcuts } from './utils/keyboardShortcuts'
import { useNavigate } from 'react-router-dom'

// Protected route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
    const navigate = useNavigate()
  
    // Setup keyboard shortcuts
    useEffect(() => {
      setupCommonShortcuts(navigate)
    }, [navigate])
  
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/analyze" element={<ProtectedRoute><Analyze /></ProtectedRoute>} />
      <Route path="/challenges" element={<ProtectedRoute><Challenges /></ProtectedRoute>} />
      <Route path="/learning" element={<ProtectedRoute><Learn /></ProtectedRoute>} />
      <Route path="/sandbox" element={<ProtectedRoute><Sandbox /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
      <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
    </Routes>
  );
}

export default function App() {
  // Initialize settings on app load
  useEffect(() => {
    initializeSettings()
    initKeyboardShortcuts()

    return () => {
      cleanupKeyboardShortcuts()
    }
  }, [])

  return (
    <ErrorBoundary>
      <AuthProvider>
        <MLSettingsProvider>
          <NotificationProvider>
            <AchievementProvider>
              <Router>
                <AppRoutes />
              </Router>
            </AchievementProvider>
          </NotificationProvider>
        </MLSettingsProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
