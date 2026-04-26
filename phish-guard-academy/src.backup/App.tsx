/**
 * App component/module file.
  * This file defines the main App component which sets up routing, context providers, and global effects for the PhishGuard Academy application.
  * It includes the following responsibilities:
  * - Setting up React Router for navigation between pages.
  * - Wrapping the application in various context providers for authentication, notifications, achievements, and ML settings.
  * - Initializing global settings and keyboard shortcuts on app load.
  * - Defining a ProtectedRoute component to guard routes that require authentication.
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout'
import Home from './pages/Home';
import Analyze from './pages/Analyze';
import Challenges from './pages/Challenges';
import Learning from './pages/Learning';
import Analytics from './pages/Analytics';
import History from './pages/History'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Router basename="/app/">
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/analyze" element={<Analyze />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/learning" element={<Learning />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
}
