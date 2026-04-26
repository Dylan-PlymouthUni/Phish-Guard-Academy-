/**
 * Analytics component/module file.
  * This file defines the Analytics page, which displays various statistics and visualizations related to the user's phishing detection activity in the PhishGuard Academy application.
 */

import { BarChart3, TrendingUp, AlertCircle, CheckCircle, PieChart as PieChartIcon, Activity, Calendar, Download, Target, Zap, Shield } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { MainLayout } from '../components/layout/MainLayout'
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import { exportAnalyticsJSON, exportAnalyticsCSV, exportAnalysesCSV, exportCertificate } from '../utils/export'
import { Button } from '../components/ui/Button'
import { useLocation } from 'react-router-dom'

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
  const { token, refreshUser } = useAuth()
  const API_URL = (import.meta as any)?.env?.VITE_API_URL ?? ''
  const location = useLocation()

  // Helper function to generate daily stats
    const generateDailyStats = (analyses: any[]): DailyStats[] => {
        const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (29 - i))
      return date.toISOString().split('T')[0]
    })

    return last30Days.map(date => {
            const dayAnalyses = analyses.filter(a => a.timestamp?.startsWith(date))
      const avgRisk = dayAnalyses.length > 0
        ? dayAnalyses.reduce((sum, a) => sum + a.risk_score, 0) / dayAnalyses.length
        : 0

      return {
        date,
        analyses_count: dayAnalyses.length,
        avg_risk_percent: avgRisk,
        challenges_passed: 0,
        lessons_completed: 0
      }
    })
  }

  useEffect(() => {
    fetchData()
  }, [token])

  // Refresh data when page becomes visible or receives focus
  useEffect(() => {
        const handleVisibilityChange = () => {
      if (!document.hidden) fetchData()
    }
        const handleFocus = () => fetchData()
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  // Force refresh on route changes
  useEffect(() => {
    fetchData()
  }, [location.key])

    const fetchData = async () => {
    try {
      if (!token) {
        setSummary({
          total_analyses: 0,
          high_risk_count: 0,
          medium_risk_count: 0,
          safe_count: 0,
          avg_risk_percent: 0,
          challenges_passed: 0,
          total_lessons: 0
        })
        setDistribution({ high: 0, medium: 0, safe: 0 })
        setDailyStats([])
        return
      }
      // Summary
      const sRes = await fetch(`${API_URL}/api/analytics/summary?t=${Date.now()}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      const sJson = await sRes.json()
      setSummary({
        total_analyses: sJson.total_analyses || 0,
        high_risk_count: sJson.high_risk_count || 0,
        medium_risk_count: sJson.medium_risk_count || 0,
        safe_count: (sJson.low_risk_count || 0),
        avg_risk_percent: sJson.average_risk || 0,
        challenges_passed: sJson.challenges_passed || 0,
        total_lessons: sJson.total_lessons || 0
      })
      
      // Sync user stats
      if (sJson.user_stats) {
        await refreshUser()
      }

      // Distribution
      const dRes = await fetch(`${API_URL}/api/analytics/distribution?t=${Date.now()}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      const dJson = await dRes.json()
      setDistribution({
        high: dJson.high || 0,
        medium: dJson.medium || 0,
        safe: dJson.low || 0
      })

      // Daily
      const dayRes = await fetch(`${API_URL}/api/analytics/daily?t=${Date.now()}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      const dayJson = await dayRes.json()
            const ds: DailyStats[] = (dayJson.daily_stats || []).map((d: any) => ({
        date: d.date,
        analyses_count: d.count || 0,
        avg_risk_percent: 0,
        challenges_passed: 0,
        lessons_completed: 0
      }))
      setDailyStats(ds)
      
      // Refresh user stats
      await refreshUser()
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
      setSummary({
        total_analyses: 0,
        high_risk_count: 0,
        medium_risk_count: 0,
        safe_count: 0,
        avg_risk_percent: 0,
        challenges_passed: 0,
        total_lessons: 0
      })
      setDistribution({ high: 0, medium: 0, safe: 0 })
      setDailyStats([])
    } finally {
      setLoading(false)
    }
  }

  if (loading || !summary) {
    return (
      <MainLayout>
        <div className="w-full h-screen flex items-center justify-center">
          <p className="text-white">Loading analytics...</p>
        </div>
      </MainLayout>
    )
  }

  const total = summary.high_risk_count + summary.medium_risk_count + summary.safe_count
  const highPercent = total > 0 ? (summary.high_risk_count / total) * 100 : 0
  const mediumPercent = total > 0 ? (summary.medium_risk_count / total) * 100 : 0
  const safePercent = total > 0 ? (summary.safe_count / total) * 100 : 0

  // Chart data
  const pieData = [
    { name: 'High Risk', value: summary.high_risk_count, color: '#ef4444' },
    { name: 'Medium Risk', value: summary.medium_risk_count, color: '#f97316' },
    { name: 'Safe', value: summary.safe_count, color: '#22c55e' }
  ]

  const barData = [
    { name: 'High', count: summary.high_risk_count, fill: '#ef4444' },
    { name: 'Medium', count: summary.medium_risk_count, fill: '#f97316' },
    { name: 'Safe', count: summary.safe_count, fill: '#22c55e' }
  ]

  const challengeMasteryPercent = Math.min(100, summary.challenges_passed * 20)
  const learningProgressPercent = Math.min(100, (summary.total_lessons / 7) * 100)
  const readinessScore = Math.round((challengeMasteryPercent * 0.6) + (learningProgressPercent * 0.4))
  const hasRiskInsight = summary.avg_risk_percent > 60
  const hasHighRiskInsight = summary.high_risk_count > summary.safe_count
  const hasChallengeInsight = summary.challenges_passed >= 3
  const hasActivityInsight = summary.total_analyses > 10
  const hasGettingStartedInsight = summary.total_analyses === 0 && summary.challenges_passed < 3
  const hasAnyInsight = hasRiskInsight || hasHighRiskInsight || hasChallengeInsight || hasActivityInsight || hasGettingStartedInsight

  return (
    <MainLayout>
      <div className="w-full px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-5xl font-bold text-white mb-2">Analytics</h1>
                <p className="text-slate-400">Your phishing detection activity and trends</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={exportAnalyticsJSON}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export JSON
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={exportAnalyticsCSV}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              </div>
            </div>
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
              <PieChartIcon className="w-5 h-5 text-blue-400" />
              Risk Distribution
            </h2>
            {total > 0 ? (
              <div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '8px',
                        color: '#fff'
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-4 justify-center mt-4">
                  {pieData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                      <span className="text-sm text-slate-300">{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-400">
                No data yet. Start analyzing!
              </div>
            )}
          </div>

          {/* Risk Count Bar Chart */}
          <div className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-6 backdrop-blur-xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Risk Analysis Count
            </h2>
            {total > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#94a3b8"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '8px',
                      color: '#fff'
                    }} 
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-400">
                No data yet. Start analyzing!
              </div>
            )}
          </div>
        </div>

        {/* Key Metrics & Activity Trend */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Analysis Risk Metrics */}
          <div className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-6 backdrop-blur-xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Analysis Risk Metrics
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-slate-300">Average Analyzed Content Risk</span>
                  <span className="font-bold text-white">{summary.avg_risk_percent.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                    style={{ width: `${summary.avg_risk_percent}%` }}
                  ></div>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Based only on your analysis results, not challenge or lesson completion.
                </p>
              </div>
              
              <div className="pt-4 border-t border-slate-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300">High Risk Analyses</span>
                  <span className="text-lg font-bold text-red-400">{summary.high_risk_count}</span>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Safe Analyses</span>
                  <span className="text-lg font-bold text-green-400">{summary.safe_count}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Training Progress */}
          <div className="bg-slate-800/30 border border-emerald-500/20 rounded-lg p-6 backdrop-blur-xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              Training Progress
            </h2>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-slate-300">Security Readiness Score</span>
                  <span className="font-bold text-white">{readinessScore}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                    style={{ width: `${readinessScore}%` }}
                  ></div>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Derived from challenge mastery and lesson completion only.
                </p>
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
        <div className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-6 backdrop-blur-xl mb-12">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            30-Day Activity Trend
          </h2>
          
          {dailyStats.length > 0 && dailyStats.some(d => d.analyses_count > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8"
                  style={{ fontSize: '10px' }}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return `${date.getMonth() + 1}/${date.getDate()}`
                  }}
                />
                <YAxis 
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  labelFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString()
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="analyses_count" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Analyses"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-400">No data yet. Start analyzing to see trends!</p>
            </div>
          )}
        </div>

        {/* Advanced Analytics Row */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Skill Radar Chart */}
          <div className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-6 backdrop-blur-xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-400" />
              Security Skills Assessment
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={[
                { skill: 'Threat Detection', value: Math.min(100, (summary.high_risk_count / Math.max(1, summary.total_analyses)) * 200), fullMark: 100 },
                { skill: 'Analysis Speed', value: Math.min(100, summary.total_analyses * 5), fullMark: 100 },
                { skill: 'Learning Progress', value: Math.min(100, (summary.total_lessons / 7) * 100), fullMark: 100 },
                { skill: 'Challenge Mastery', value: Math.min(100, summary.challenges_passed * 20), fullMark: 100 },
                { skill: 'Consistency', value: Math.min(100, summary.total_analyses * 2), fullMark: 100 },
              ]}>
                <PolarGrid stroke="rgba(148, 163, 184, 0.2)" />
                <PolarAngleAxis 
                  dataKey="skill" 
                  stroke="#94a3b8"
                  style={{ fontSize: '11px' }}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]}
                  stroke="#94a3b8"
                  style={{ fontSize: '10px' }}
                />
                <Radar 
                  name="Your Skills" 
                  dataKey="value" 
                  stroke="#8b5cf6" 
                  fill="#8b5cf6" 
                  fillOpacity={0.6} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center text-xs text-slate-400">
              Based on your activity and performance metrics
            </div>
          </div>

          {/* Peer Comparison */}
          <div className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-6 backdrop-blur-xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Peer Comparison
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { metric: 'Analyses', you: summary.total_analyses, average: 15, top: 50 },
                { metric: 'Challenges', you: summary.challenges_passed, average: 2, top: 8 },
                { metric: 'Lessons', you: summary.total_lessons, average: 3, top: 7 },
                { metric: 'Accuracy', you: Math.round((summary.safe_count / Math.max(1, summary.total_analyses)) * 100), average: 60, top: 95 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis dataKey="metric" stroke="#94a3b8" style={{ fontSize: '11px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '11px' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Legend />
                <Bar dataKey="you" fill="#3b82f6" name="You" />
                <Bar dataKey="average" fill="#64748b" name="Average" />
                <Bar dataKey="top" fill="#22c55e" name="Top 10%" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center text-xs text-slate-400">
              How you compare to other PhishGuard users
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="mt-12 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg p-6 backdrop-blur-xl">
          <h2 className="text-xl font-bold text-white mb-4">Insights & Recommendations</h2>
          <ul className="space-y-3 text-slate-300">
            {hasRiskInsight && (
              <li className="flex gap-3">
                <span className="text-orange-400">⚠️</span>
                <span>Your average analyzed-content risk is high. Consider reviewing flagged items more carefully.</span>
              </li>
            )}
            {hasHighRiskInsight && (
              <li className="flex gap-3">
                <span className="text-red-400">🔴</span>
                <span>More than half of your analyses show high risk. Stay vigilant when browsing.</span>
              </li>
            )}
            {hasChallengeInsight && (
              <li className="flex gap-3">
                <span className="text-green-400">✓</span>
                <span>Great job! You've passed {summary.challenges_passed} challenges. Keep learning!</span>
              </li>
            )}
            {hasActivityInsight && (
              <li className="flex gap-3">
                <span className="text-blue-400">📊</span>
                <span>You've analyzed {summary.total_analyses} items. Your security awareness is improving.</span>
              </li>
            )}
            {hasGettingStartedInsight && (
              <li className="flex gap-3">
                <span className="text-slate-400">💡</span>
                <span>Start analyzing phishing attempts and completing challenges to unlock personalized security insights!</span>
              </li>
            )}
            {!hasAnyInsight && (
              <li className="flex gap-3">
                <span className="text-cyan-400">💡</span>
                <span>
                  Balanced progress so far. To improve faster, complete one lesson and one challenge, then run 2 to 3 new analyses this week.
                </span>
              </li>
            )}
          </ul>
        </div>
        </div>
      </div>
    </MainLayout>
  )
}
