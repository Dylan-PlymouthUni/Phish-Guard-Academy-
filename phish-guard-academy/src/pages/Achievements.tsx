/**
 * Achievements component/module file.
  * This file defines the Achievements page, which displays a list of achievements that users can unlock by completing various milestones in the PhishGuard Academy application. 
  * It fetches achievement data from the backend API and also builds local achievements based on user analytics stored in local storage. 
  * The page includes filtering options to view all, unlocked, or locked achievements, and shows overall progress and points earned.
 */

import { Award, Lock, Star, Zap, TrendingUp } from 'lucide-react'
import { useState, useEffect } from 'react'
import { MainLayout } from '../components/layout/MainLayout'
import { Card, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { getAnalytics } from '../utils/storage'

interface AchievementItem {
  id: string
  title: string
  description: string
  icon: string
  points: number
  unlocked: boolean
}

export default function Achievements() {
  const [achievements, setAchievements] = useState<AchievementItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all')
  const { token } = useAuth()
  const API_URL = (import.meta as any)?.env?.VITE_API_URL ?? ''

    const buildLocalAchievements = (): AchievementItem[] => {
    const analytics = getAnalytics()

    const analysesCount = analytics.total_analyses
    const highRiskCount = analytics.high_risk_count
    const challengesPassed = analytics.challenges_passed
    const lessonsCompleted = analytics.lessons_completed

    return [
      {
        id: 'first_analysis',
        title: 'First Steps',
        description: 'Perform your first phishing analysis',
        icon: '🚀',
        points: 10,
        unlocked: analysesCount >= 1,
      },
      {
        id: 'hundred_analyses',
        title: 'Analysis Master',
        description: 'Complete 100 phishing analyses',
        icon: '🎯',
        points: 100,
        unlocked: analysesCount >= 100,
      },
      {
        id: 'first_challenge',
        title: 'Challenge Accepted',
        description: 'Complete your first challenge',
        icon: '⚔️',
        points: 25,
        unlocked: challengesPassed >= 1,
      },
      {
        id: 'all_challenges',
        title: 'Challenge Master',
        description: 'Complete all 6 challenges',
        icon: '👑',
        points: 150,
        unlocked: challengesPassed >= 6,
      },
      {
        id: 'seven_day_streak',
        title: 'On Fire',
        description: 'Maintain a 7-day activity streak',
        icon: '🔥',
        points: 50,
        unlocked: false,
      },
      {
        id: 'level_10',
        title: 'Rising Star',
        description: 'Reach level 10',
        icon: '⭐',
        points: 75,
        unlocked: false,
      },
      {
        id: 'level_25',
        title: 'Cyber Guardian',
        description: 'Reach level 25',
        icon: '🛡️',
        points: 200,
        unlocked: false,
      },
      {
        id: 'first_lesson',
        title: 'Knowledge Seeker',
        description: 'Complete your first lesson',
        icon: '📚',
        points: 20,
        unlocked: lessonsCompleted >= 1,
      },
      {
        id: 'all_lessons',
        title: 'Master Educator',
        description: 'Complete all 7 lessons',
        icon: '🎓',
        points: 180,
        unlocked: lessonsCompleted >= 7,
      },
      {
        id: 'perfect_challenge',
        title: 'Perfect Score',
        description: 'Achieve 100% on a challenge',
        icon: '💯',
        points: 80,
        unlocked: highRiskCount >= 10,
      },
    ]
  }

  const mergeAchievements = (remote: AchievementItem[] = []) => {
    const local = buildLocalAchievements()
    const byId = new Map<string, AchievementItem>()

    for (const achievement of local) {
      byId.set(achievement.id, achievement)
    }

    for (const achievement of remote) {
      const existing = byId.get(achievement.id)
      byId.set(achievement.id, {
        ...achievement,
        unlocked: Boolean(achievement.unlocked || existing?.unlocked),
      })
    }

    return Array.from(byId.values())
  }

  useEffect(() => {
    loadAchievements()
  }, [token])

  // Refresh achievements when page becomes visible or receives focus
  useEffect(() => {
        const handleVisibilityChange = () => {
      if (!document.hidden) loadAchievements()
    }
        const handleFocus = () => loadAchievements()
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

    const loadAchievements = async () => {
    try {
      if (!token) {
        setAchievements(buildLocalAchievements())
        setLoading(false)
        return
      }
      const res = await fetch(`${API_URL}/api/auth/achievements`, {
        headers: { 
          Authorization: `Bearer ${token}`
        }
      })
      if (!res.ok) throw new Error('Failed to load achievements')
      const data = await res.json()
      setAchievements(mergeAchievements(data.achievements || []))
    } catch (err) {
      console.error('Achievements error', err)
      setAchievements(buildLocalAchievements())
    } finally {
      setLoading(false)
    }
  }

    const filtered = achievements.filter(a => {
    if (filter === 'unlocked') return a.unlocked
    if (filter === 'locked') return !a.unlocked
    return true
  })

    const unlockedCount = achievements.filter(a => a.unlocked).length
  const totalPoints = achievements
    .filter(a => a.unlocked)
    .reduce((sum, a) => sum + a.points, 0)
  const completionPercent = achievements.length > 0 ? Math.round((unlockedCount / achievements.length) * 100) : 0

  if (loading) {
    return (
      <MainLayout>
        <div className="w-full h-screen flex items-center justify-center">
          <p className="text-white">Loading achievements...</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="w-full px-4 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-10 h-10 text-yellow-400" />
              <h1 className="text-5xl font-bold text-white">Achievements</h1>
            </div>
            <p className="text-slate-400">Unlock badges and earn points by completing milestones</p>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-4 mb-12">
            <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30">
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <Award className="w-5 h-5 text-purple-400" />
                  <Badge variant="info">Total</Badge>
                </div>
                <p className="text-4xl font-bold text-white mb-1">{unlockedCount}</p>
                <p className="text-sm text-slate-400">of {achievements.length} unlocked</p>
                <div className="mt-3 w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
                    style={{ width: `${completionPercent}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <Badge variant="success">Points</Badge>
                </div>
                <p className="text-4xl font-bold text-white mb-1">{totalPoints}</p>
                <p className="text-sm text-slate-400">Achievement points earned</p>
                <div className="mt-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-yellow-400 font-semibold">+{achievements.filter(a => !a.unlocked).reduce((s, a) => s + a.points, 0)} points available</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <Badge variant="success">Completion</Badge>
                </div>
                <p className="text-4xl font-bold text-white mb-1">
                  {completionPercent}%
                </p>
                <p className="text-sm text-slate-400">Overall progress</p>
                <div className="mt-3 text-center">
                  <p className="text-xs text-green-400 font-semibold">{completionPercent === 100 ? 'All milestones unlocked' : 'Keep going'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Buttons */}
          <div className="mb-8 flex gap-3 flex-wrap">
            {(['all', 'unlocked', 'locked'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-6 py-2 rounded-lg font-medium transition ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {f === 'all' ? 'All' : f === 'unlocked' ? 'Unlocked' : 'Locked'}
              </button>
            ))}
            <span className="text-sm text-slate-400 ml-auto py-2">
              {filtered.length} achievement{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Achievements Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((achievement, index) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div
                  className={`relative group rounded-xl p-6 transition-all duration-300 cursor-pointer ${
                    achievement.unlocked
                      ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 hover:border-yellow-400/50 hover:shadow-lg hover:shadow-yellow-500/20'
                      : 'bg-slate-800/30 border border-slate-700 opacity-60 hover:opacity-75'
                  }`}
                >
                  {/* Unlock Badge */}
                  {!achievement.unlocked && (
                    <div className="absolute top-3 right-3">
                      <Lock className="w-4 h-4 text-slate-500" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="mb-4">
                    <motion.div
                      animate={achievement.unlocked ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-5xl mb-3 inline-block"
                    >
                      {achievement.icon}
                    </motion.div>
                  </div>

                  <h3 className={`text-lg font-bold mb-2 ${
                    achievement.unlocked ? 'text-white' : 'text-slate-300'
                  }`}>
                    {achievement.title}
                  </h3>

                  <p className={`text-sm mb-4 ${
                    achievement.unlocked ? 'text-slate-300' : 'text-slate-500'
                  }`}>
                    {achievement.description}
                  </p>

                  {/* Points Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className={`w-4 h-4 ${
                        achievement.unlocked ? 'text-yellow-400' : 'text-slate-600'
                      }`} />
                      <span className={`text-sm font-semibold ${
                        achievement.unlocked ? 'text-yellow-400' : 'text-slate-500'
                      }`}>
                        +{achievement.points}
                      </span>
                    </div>
                    {achievement.unlocked && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-green-400 text-sm font-bold"
                      >
                        ✓ Unlocked
                      </motion.div>
                    )}
                  </div>

                  {/* Hover Glow */}
                  {achievement.unlocked && (
                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none"
                      style={{
                        background: 'radial-gradient(circle at center, rgba(251, 191, 36, 0.1) 0%, transparent 70%)',
                      }}
                    />
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Empty State */}
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Award className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-2">No achievements yet</p>
              <p className="text-slate-500 text-sm">
                {filter === 'unlocked'
                  ? 'Complete challenges and analyses to unlock achievements!'
                  : 'All achievements unlocked.'}
              </p>
            </div>
          )}

          {/* Tips Section */}
          <div className="mt-16 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-lg p-8 backdrop-blur-xl">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Zap className="w-6 h-6 text-blue-400" />
              Tips to Unlock More Achievements
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <span className="text-yellow-400 font-bold">1.</span>
                  <div>
                    <h3 className="text-white font-semibold">Analyze Regularly</h3>
                    <p className="text-sm text-slate-400">Perform phishing analyses to unlock First Steps and Analysis Master</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-purple-400 font-bold">2.</span>
                  <div>
                    <h3 className="text-white font-semibold">Take Challenges</h3>
                    <p className="text-sm text-slate-400">Complete security challenges to earn Challenge Master and Perfect Score</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <span className="text-green-400 font-bold">3.</span>
                  <div>
                    <h3 className="text-white font-semibold">Build a Streak</h3>
                    <p className="text-sm text-slate-400">Stay active daily to maintain your streak and unlock the On Fire badge</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-blue-400 font-bold">4.</span>
                  <div>
                    <h3 className="text-white font-semibold">Learn & Level Up</h3>
                    <p className="text-sm text-slate-400">Complete lessons to unlock Knowledge Seeker and reach higher levels</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
