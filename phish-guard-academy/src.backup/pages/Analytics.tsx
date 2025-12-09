import { BarChart3, TrendingUp, AlertCircle, CheckCircle, PieChart, Activity, Calendar } from 'lucide-react'
import { useState, useEffect } from 'react'

interface DailyStats {
  date: string
  analyses_count: number
  avg_risk_percent: number
  challenges_passed: number
  lessons_completed: number
}

interface SummaryStats {
  total_analyses: number
  high_risk_count: number
  medium_risk_count: number
  safe_count: number
  avg_risk_percent: number
  challenges_passed: number
  total_lessons: number
}

interface RiskDistribution {
  high: number
  medium: number
  safe: number
}

export default function Analytics() {
  const [summary, setSummary] = useState<SummaryStats | null>(null)
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [distribution, setDistribution] = useState<RiskDistribution | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [summaryRes, dailyRes, distRes] = await Promise.all([
        fetch('/api/analytics/summary'),
        fetch('/api/analytics/daily?days=30'),
        fetch('/api/analytics/distribution')
      ])
      
      if (summaryRes.ok) setSummary(await summaryRes.json())
      if (dailyRes.ok) setDailyStats(await dailyRes.json())
      if (distRes.ok) setDistribution(await distRes.json())
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !summary) {
    return <div className="w-full h-screen flex items-center justify-center"><p className="text-white">Loading analytics...</p></div>
  }

  const total = summary.high_risk_count + summary.medium_risk_count + summary.safe_count
  const highPercent = total > 0 ? (summary.high_risk_count / total) * 100 : 0
  const mediumPercent = total > 0 ? (summary.medium_risk_count / total) * 100 : 0
  const safePercent = total > 0 ? (summary.safe_count / total) * 100 : 0

  return (
    <div className="w-full px-4 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-white mb-2">Analytics</h1>
          <p className="text-slate-400">Your phishing detection activity and trends</p>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-12">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 backdrop-blur-xl hover:border-blue-500/50 transition">
            <div className="flex items-center justify-between mb-3">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded">Total</span>
            </div>
            <p className="text-4xl font-bold text-white mb-1">{summary.total_analyses}</p>
            <p className="text-sm text-slate-400">Analyses performed</p>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 backdrop-blur-xl hover:border-red-500/50 transition">
            <div className="flex items-center justify-between mb-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded">High</span>
            </div>
            <p className="text-4xl font-bold text-white mb-1">{summary.high_risk_count}</p>
            <p className="text-sm text-slate-400">{highPercent.toFixed(0)}% of analyses</p>
          </div>

          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-6 backdrop-blur-xl hover:border-orange-500/50 transition">
            <div className="flex items-center justify-between mb-3">
              <TrendingUp className="w-5 h-5 text-orange-400" />
              <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-1 rounded">Medium</span>
            </div>
            <p className="text-4xl font-bold text-white mb-1">{summary.medium_risk_count}</p>
            <p className="text-sm text-slate-400">{mediumPercent.toFixed(0)}% of analyses</p>
          </div>

          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 backdrop-blur-xl hover:border-green-500/50 transition">
            <div className="flex items-center justify-between mb-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded">Safe</span>
            </div>
            <p className="text-4xl font-bold text-white mb-1">{summary.safe_count}</p>
            <p className="text-sm text-slate-400">{safePercent.toFixed(0)}% of analyses</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Risk Distribution Pie Chart */}
          <div className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-6 backdrop-blur-xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-400" />
              Risk Distribution
            </h2>
            <div className="flex items-end justify-center gap-4 h-48">
              {/* Simplified bar chart representation */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 bg-gradient-to-t from-red-500 to-red-400 rounded-t-lg" style={{ height: `${Math.max(20, highPercent * 1.5)}px` }}></div>
                <span className="text-sm font-bold text-white">{summary.high_risk_count}</span>
                <span className="text-xs text-slate-400">High</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 bg-gradient-to-t from-orange-500 to-orange-400 rounded-t-lg" style={{ height: `${Math.max(20, mediumPercent * 1.5)}px` }}></div>
                <span className="text-sm font-bold text-white">{summary.medium_risk_count}</span>
                <span className="text-xs text-slate-400">Medium</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 bg-gradient-to-t from-green-500 to-green-400 rounded-t-lg" style={{ height: `${Math.max(20, safePercent * 1.5)}px` }}></div>
                <span className="text-sm font-bold text-white">{summary.safe_count}</span>
                <span className="text-xs text-slate-400">Safe</span>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-6 backdrop-blur-xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Key Metrics
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-slate-300">Average Risk Level</span>
                  <span className="font-bold text-white">{summary.avg_risk_percent.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                    style={{ width: `${summary.avg_risk_percent}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300">Challenges Passed</span>
                  <span className="text-lg font-bold text-green-400">{summary.challenges_passed}</span>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Lessons Completed</span>
                  <span className="text-lg font-bold text-blue-400">{summary.total_lessons}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Trend Chart */}
        <div className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-6 backdrop-blur-xl">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            30-Day Activity Trend
          </h2>
          
          {dailyStats.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400">No data yet. Start analyzing to see trends!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex gap-2 pb-4" style={{ minWidth: '100%' }}>
                {dailyStats.map((day, idx) => {
                  const maxCount = Math.max(...dailyStats.map(d => d.analyses_count), 5)
                  const height = (day.analyses_count / maxCount) * 120
                  
                  return (
                    <div key={idx} className="flex flex-col items-center gap-2 flex-shrink-0">
                      <div
                        className="w-8 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-sm transition-all hover:from-blue-600 hover:to-blue-500"
                        style={{ minHeight: `${Math.max(5, height)}px` }}
                        title={`${day.date}: ${day.analyses_count} analyses`}
                      ></div>
                      <span className="text-xs text-slate-500">{day.date.split('-')[2]}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Insights */}
        <div className="mt-12 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg p-6 backdrop-blur-xl">
          <h2 className="text-xl font-bold text-white mb-4">Insights & Recommendations</h2>
          <ul className="space-y-3 text-slate-300">
            {summary.avg_risk_percent > 60 && (
              <li className="flex gap-3">
                <span className="text-orange-400">⚠️</span>
                <span>Your average risk level is high. Consider reviewing flagged items more carefully.</span>
              </li>
            )}
            {summary.high_risk_count > summary.safe_count && (
              <li className="flex gap-3">
                <span className="text-red-400">🔴</span>
                <span>More than half of your analyses show high risk. Stay vigilant when browsing.</span>
              </li>
            )}
            {summary.challenges_passed >= 3 && (
              <li className="flex gap-3">
                <span className="text-green-400">✓</span>
                <span>Great job! You've passed {summary.challenges_passed} challenges. Keep learning!</span>
              </li>
            )}
            {summary.total_analyses > 10 && (
              <li className="flex gap-3">
                <span className="text-blue-400">📊</span>
                <span>You've analyzed {summary.total_analyses} items. Your security awareness is improving.</span>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
