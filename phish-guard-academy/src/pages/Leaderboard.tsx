/**
 * Leaderboard component/module file.
  * This file defines the Leaderboard page, which displays a ranked list of users based on their points, levels, streaks, and other statistics in the PhishGuard Academy application.
 */

import { Trophy, Medal, Star, TrendingUp, Award, Flame, Target } from 'lucide-react'
import { useState, useEffect } from 'react'
import { MainLayout } from '../components/layout/MainLayout'
import { Card, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { getAnalytics, getProgress } from '../utils/storage'

interface LeaderboardEntry {
  rank: number
  user_id: string
  name: string
  points: number
  level: number
  streak: number
  analyses: number
  achievements: number
  avatar: string
}

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [currentUser, setCurrentUser] = useState<LeaderboardEntry | null>(null)
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'all-time'>('all-time')
  const { token, user } = useAuth()
  const API_URL = (import.meta as any)?.env?.VITE_API_URL ?? ''

  const getLocalUnlockedBadges = () => {
    const analytics = getAnalytics()
    let unlocked = 0

    if (analytics.total_analyses >= 1) unlocked += 1
    if (analytics.total_analyses >= 100) unlocked += 1
    if (analytics.challenges_passed >= 1) unlocked += 1
    if (analytics.challenges_passed >= 6) unlocked += 1
    if (analytics.lessons_completed >= 1) unlocked += 1
    if (analytics.lessons_completed >= 7) unlocked += 1
    if (analytics.high_risk_count >= 10) unlocked += 1

    return unlocked
  }

  const buildLocalCurrentUser = (): LeaderboardEntry | null => {
    const analytics = getAnalytics()
    const progress = getProgress()
    const hasLocalActivity =
      analytics.total_analyses > 0 ||
      progress.total_points > 0 ||
      progress.lessons_completed.length > 0 ||
      progress.challenges_completed.length > 0

    if (!user && !hasLocalActivity) return null

    return {
      rank: 1,
      user_id: user?.user_id ?? 'local-user',
      name: user?.name ?? 'You',
      points: user?.xp ?? progress.total_points ?? progress.experience ?? 0,
      level: user?.level ?? progress.level ?? 1,
      streak: user?.streak ?? progress.streak_days ?? progress.streak ?? 0,
      analyses: analytics.total_analyses,
      achievements: Math.max(progress.achievements.length, getLocalUnlockedBadges()),
      avatar: '😎'
    }
  }

  useEffect(() => {
    loadLeaderboard()
  }, [timeframe, token])

  // Refresh data when component becomes visible or receives focus
  useEffect(() => {
        const onVis = () => { if (!document.hidden) loadLeaderboard() }
        const onFocus = () => loadLeaderboard()
    
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onFocus)
    
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

    const loadLeaderboard = async () => {
    try {
        const localCurrentUser = buildLocalCurrentUser()

      const res = await fetch(`${API_URL}/api/leaderboard`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (!res.ok) throw new Error(`Failed to load leaderboard (${res.status})`)

      const data = await res.json()
            const entries: LeaderboardEntry[] = (data.leaderboard || []).map((e: any) => ({
        rank: e.rank,
        user_id: e.user_id,
        name: e.name,
        points: e.xp,
        level: e.level,
        streak: e.streak || 0,
        analyses: e.analyses_count || 0,
        achievements: e.achievements_count || 0,
        avatar: '😎'
      }))

      setFallbackNotice(null)

      if (entries.length === 0 && localCurrentUser) {
        setFallbackNotice('Live leaderboard returned no rows. Showing your local profile instead.')
        setLeaderboard([localCurrentUser])
        setCurrentUser(localCurrentUser)
        return
      }

      setLeaderboard(entries)
      
      // Sync user stats if returned
      if (data.user_stats && user) {
        const updated = { ...user, xp: data.user_stats.xp, level: data.user_stats.level, streak: data.user_stats.streak }
        localStorage.setItem('auth_user', JSON.stringify(updated))
      }

      // current user: either part of top, or provided separately
            const me = entries.find(en => user && en.user_id === user.user_id) || (data.current_user ? {
        rank: data.current_user.rank,
        user_id: data.current_user.user_id,
        name: data.current_user.name,
        points: data.current_user.xp,
        level: data.current_user.level,
        streak: data.current_user.streak || 0,
        analyses: data.current_user.analyses_count || 0,
        achievements: data.current_user.achievements_count || 0,
        avatar: '😎'
      } as LeaderboardEntry : localCurrentUser)
      setCurrentUser(me || null)
    } catch (err) {
      console.error('Leaderboard error', err)
      const localCurrentUser = buildLocalCurrentUser()
      setFallbackNotice('Could not load live leaderboard. Showing local profile only. Check backend/API auth and retry.')
      setLeaderboard(localCurrentUser ? [localCurrentUser] : [])
      setCurrentUser(localCurrentUser)
    }
  }

    const getRankColor = (rank: number) => {
    if (rank === 1) return 'from-yellow-500 to-yellow-600'
    if (rank === 2) return 'from-gray-300 to-gray-400'
    if (rank === 3) return 'from-orange-600 to-orange-700'
    return 'from-blue-500 to-purple-500'
  }

    const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-400" />
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />
    if (rank === 3) return <Medal className="w-6 h-6 text-orange-400" />
    return <Star className="w-5 h-5 text-blue-400" />
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-10 h-10 text-yellow-400" />
            <h1 className="text-5xl font-bold text-white">Leaderboard</h1>
          </div>
          <p className="text-slate-400">Compete with the best phishing hunters worldwide</p>
        </div>

        {fallbackNotice && (
          <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-200">
            {fallbackNotice}
          </div>
        )}

        {/* Timeframe Selector */}
        <div className="mb-8 flex gap-3">
          {(['daily', 'weekly', 'all-time'] as const).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-6 py-3 rounded-lg font-medium transition ${
                timeframe === tf
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {tf === 'all-time' ? 'All Time' : tf.charAt(0).toUpperCase() + tf.slice(1)}
            </button>
          ))}
        </div>

        {/* Current User Card */}
        {currentUser && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/50">
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{currentUser.avatar}</div>
                    <div>
                      <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                        {currentUser.name}
                        <Badge variant="info">Rank #{currentUser.rank}</Badge>
                      </h3>
                      <p className="text-slate-400">Your current position</p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-yellow-400">{currentUser.points.toLocaleString()}</p>
                      <p className="text-xs text-slate-400">Points</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-blue-400">{currentUser.level}</p>
                      <p className="text-xs text-slate-400">Level</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-orange-400 flex items-center gap-1">
                        <Flame className="w-6 h-6" />{currentUser.streak}
                      </p>
                      <p className="text-xs text-slate-400">Streak</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Leaderboard Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-hidden">
              {leaderboard.map((entry, index) => (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center gap-4 p-6 border-b border-slate-700 hover:bg-slate-800/50 transition ${
                    entry.name === 'You' ? 'bg-blue-600/10' : ''
                  }`}
                >
                  {/* Rank */}
                  <div className="w-16 flex items-center justify-center">
                    {entry.rank <= 3 ? (
                      <div className={`flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br ${getRankColor(entry.rank)}`}>
                        {getRankIcon(entry.rank)}
                      </div>
                    ) : (
                      <span className="text-2xl font-bold text-slate-400">#{entry.rank}</span>
                    )}
                  </div>

                  {/* Avatar & Name */}
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-3xl">{entry.avatar}</div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{entry.name}</h3>
                      <p className="text-sm text-slate-400">Level {entry.level}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="hidden md:flex gap-6">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-yellow-400 font-bold">
                        <Star className="w-4 h-4" />
                        {entry.points.toLocaleString()}
                      </div>
                      <p className="text-xs text-slate-500">Points</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-orange-400 font-bold">
                        <Flame className="w-4 h-4" />
                        {entry.streak}
                      </div>
                      <p className="text-xs text-slate-500">Streak</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-blue-400 font-bold">
                        <Target className="w-4 h-4" />
                        {entry.analyses}
                      </div>
                      <p className="text-xs text-slate-500">Analyses</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-purple-400 font-bold">
                        <Award className="w-4 h-4" />
                        {entry.achievements}
                      </div>
                      <p className="text-xs text-slate-500">Badges</p>
                    </div>
                  </div>

                  {/* Mobile Stats */}
                  <div className="md:hidden">
                    <p className="text-xl font-bold text-yellow-400">{entry.points.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">points</p>
                  </div>

                  {/* Trend */}
                  <div className="hidden lg:block">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                </motion.div>
              ))}

              {leaderboard.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  No leaderboard data has synced to the backend yet. Start some signed-in activity to populate rankings.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Season Info */}
        <div className="mt-8 text-center text-slate-400 text-sm">
          <p>🏆 Season 1 ends in 23 days • Rewards: Exclusive badges & bonus XP</p>
        </div>
      </div>
    </MainLayout>
  )
}
