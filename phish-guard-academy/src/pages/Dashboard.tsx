import { BarChart3, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { useState, useEffect } from 'react'

interface AnalysisStats {
  total: number
  flagged: number
  legitimate: number
  avgTime: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<AnalysisStats>({
    total: 0,
    flagged: 0,
    legitimate: 0,
    avgTime: 0,
  })

  useEffect(() => {
    // Load stats from localStorage
    const saved = localStorage.getItem('phishguard_stats')
    if (saved) {
      setStats(JSON.parse(saved))
    }
  }, [])

  const detectionRate = stats.total > 0 ? ((stats.flagged / stats.total) * 100).toFixed(1) : '0'

  return (
    <div className="w-full px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-bold text-white mb-2">Your Dashboard</h1>
        <p className="text-slate-400 mb-12">Real-time analysis statistics and threat insights</p>

        {/* Main Stats Grid */}
        <div className="grid md:grid-cols-4 gap-4 mb-12">
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-lg p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-3">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded">Total</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{stats.total}</p>
            <p className="text-sm text-slate-400">Analyses completed</p>
          </div>

          <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-lg p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded">Threats</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{stats.flagged}</p>
            <p className="text-sm text-slate-400">Threats detected</p>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-lg p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded">Safe</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{stats.legitimate}</p>
            <p className="text-sm text-slate-400">Legitimate items</p>
          </div>

          <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 rounded-lg p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-3">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">Rate</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{detectionRate}%</p>
            <p className="text-sm text-slate-400">Detection rate</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-6 backdrop-blur-xl">
          <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            Recent Activity
          </h2>
          <div className="space-y-3">
            <p className="text-slate-400 text-center py-8">No recent analyses yet. Start by uploading a screenshot or email!</p>
          </div>
        </div>
      </div>
    </div>
  )
}
