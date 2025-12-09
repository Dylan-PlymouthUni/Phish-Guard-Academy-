import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Analyze from './pages/Analyze'
import Challenges from './pages/Challenges'
import Learn from './pages/Learn'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Router basename="/app/">
      <Routes>
        <Route path="/" element={<Analyze />} />
        <Route path="/analyze" element={<Analyze />} />
        <Route path="/challenges" element={<Challenges />} />
        <Route path="/learning" element={<Learn />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  )
}
