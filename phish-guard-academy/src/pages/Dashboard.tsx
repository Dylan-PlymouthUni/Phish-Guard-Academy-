import { BarChart3, TrendingUp, AlertCircle, CheckCircle, Clock, Award, Target, Flame, Zap, Brain, TrendingDown, Activity, Users, Star, BookOpen, ArrowRight, Shield, Share2, Calendar } from 'lucide-react'
import { useState, useEffect } from 'react'
import { MainLayout } from '../components/layout/MainLayout'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Link } from 'react-router-dom'
import { getProgress, getAnalytics, getDailyChallenge, isDailyChallengeCompleted, completeDailyChallenge } from '../utils/storage'
import { getLevelInfo } from '../utils/progression'
import { shareProgress } from '../utils/share'
import { useNotifications } from '../contexts/NotificationContext'
import { useAchievements } from '../contexts/AchievementContext'
import { motion } from 'framer-motion'

interface AnalysisStats {
  total: number
  flagged: number
  legitimate: number
  avgTime: number
}

interface ActivityItem {
  id: string
  type: 'analysis' | 'challenge' | 'lesson'
  title: string
  result?: string
  timestamp: Date
  risk?: number
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlocked: boolean
  progress: number
  total: number
}

export default function Dashboard() {
  const { success, error: showError } = useNotifications()
  const { triggerAchievement } = useAchievements()
  const [stats, setStats] = useState<AnalysisStats>({
    total: 0,
    flagged: 0,
    legitimate: 0,
    avgTime: 0,
  })
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [userLevel, setUserLevel] = useState(1)
  const [userXP, setUserXP] = useState(0)
  const [streak, setStreak] = useState(0)
  const [dailyChallenge, setDailyChallenge] = useState(getDailyChallenge())
  const [dailyChallengeCompleted, setDailyChallengeCompleted] = useState(isDailyChallengeCompleted())
  const [achievements, setAchievements] = useState<Achievement[]>([
    { id: '1', title: 'First Analysis', description: 'Complete your first phishing analysis', icon: '🎯', unlocked: false, progress: 0, total: 1 },
    { id: '2', title: 'Threat Hunter', description: 'Detect 10 phishing attempts', icon: '🛡️', unlocked: false, progress: 0, total: 10 },
    { id: '3', title: 'Learning Enthusiast', description: 'Complete 5 lessons', icon: '📚', unlocked: false, progress: 0, total: 5 },
    { id: '4', title: 'Challenge Master', description: 'Pass 3 challenges', icon: '🏆', unlocked: false, progress: 0, total: 3 },
  ])

  const handleShareProgress = async () => {
    const analytics = getAnalytics()
    const shared = await shareProgress({
      level: userLevel,
      points: getProgress().total_points,
      analyses: analytics.total_analyses,
      streak
    })
    
    if (shared) {
      success('Progress shared successfully! 🎉')
    } else {
      success('Progress copied to clipboard! 📋')
    }
  }

  const handleCompleteDailyChallenge = () => {
    completeDailyChallenge()
    setDailyChallengeCompleted(true)
    success('Daily challenge completed! +500 bonus points! 🎉')
    triggerAchievement({
      id: 'daily-challenge',
      title: 'Daily Dedication',
      description: 'Completed daily challenge',
      icon: '📅',
      points: 500
    })
  }

  useEffect(() => {
    // Load progress from localStorage
    const progress = getProgress()
    const analytics = getAnalytics()
    const levelInfo = getLevelInfo(progress.experience)
    
    setStats({
      total: analytics.total_analyses,
      flagged: analytics.high_risk_count + analytics.medium_risk_count,
      legitimate: analytics.safe_count,
      avgTime: 0
    })
    
    setUserLevel(levelInfo.level)
    setUserXP(progress.experience)
    setStreak(progress.streak_days)
    
    // Update achievement progress
    setAchievements(prev => prev.map(ach => {
      if (ach.id === '1') return { ...ach, progress: analytics.total_analyses, unlocked: analytics.total_analyses >= 1 }
      if (ach.id === '2') return { ...ach, progress: analytics.high_risk_count, unlocked: analytics.high_risk_count >= 10 }
      if (ach.id === '3') return { ...ach, progress: analytics.lessons_completed, unlocked: analytics.lessons_completed >= 5 }
      if (ach.id === '4') return { ...ach, progress: analytics.challenges_passed, unlocked: analytics.challenges_passed >= 3 }
      return ach
    }))

    // Create recent activity feed from analyses
    const recentAnalyses = progress.analyses_performed.slice(-5).reverse().map((analysis, idx) => ({
      id: `analysis-${idx}`,
      type: 'analysis' as const,
      title: `Screenshot Analysis`,
      result: analysis.risk >= 70 ? 'High Risk' : analysis.risk >= 40 ? 'Medium Risk' : 'Safe',
      timestamp: new Date(analysis.timestamp),
      risk: analysis.risk
    }))
    setRecentActivity(recentAnalyses)
    
    // Refresh when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const freshProgress = getProgress()
        const freshAnalytics = getAnalytics()
        const freshLevelInfo = getLevelInfo(freshProgress.experience)
        setStats({
          total: freshAnalytics.total_analyses,
          flagged: freshAnalytics.high_risk_count + freshAnalytics.medium_risk_count,
          legitimate: freshAnalytics.safe_count,
          avgTime: 0
        })
        setUserLevel(freshLevelInfo.level)
        setUserXP(freshProgress.experience)
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const detectionRate = stats.total > 0 ? ((stats.flagged / stats.total) * 100).toFixed(1) : '0'
  const levelInfo = getLevelInfo(userXP)
  const xpProgress = levelInfo.xpProgress

  return (
    <MainLayout>
      <div className="w-full px-4 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Header */}
          <div className="mb-12">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-5xl font-bold text-white mb-2">
                  Welcome Back! 👋
                </h1>
                <p className="text-slate-400">Your personalized phishing defense dashboard</p>
              </div>
              <div className="flex items-center gap-4">
                {streak > 0 && (
                  <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-lg px-6 py-3 flex items-center gap-3">
                    <Flame className="w-6 h-6 text-orange-400" />
                    <div>
                      <p className="text-2xl font-bold text-white">{streak}</p>
                      <p className="text-xs text-slate-400">Day Streak!</p>
                    </div>
                  </div>
                )}
                <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-lg px-6 py-3 flex items-center gap-3">
                  <Star className="w-6 h-6 text-purple-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">Level {userLevel}</p>
                    <p className="text-xs text-slate-400">{userXP}/{levelInfo.xpForNextLevel} XP</p>
                    <p className="text-xs text-purple-400 font-semibold mt-0.5">{levelInfo.title}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* XP Progress Bar */}
            <div className="mt-6 bg-slate-800/50 rounded-full h-3 overflow-hidden border border-slate-700">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <Link to="/analyze" className="group bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 hover:border-blue-400 rounded-xl p-6 transition cursor-pointer active:scale-95 touch-manipulation">
              <div className="flex items-center justify-between mb-3">
                <Shield className="w-8 h-8 text-blue-400" />
                <ArrowRight className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Analyze Threat</h3>
              <p className="text-sm text-slate-400">Scan emails, URLs, or screenshots</p>
            </Link>

            <Link to="/challenges" className="group bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/30 hover:border-orange-400 rounded-xl p-6 transition cursor-pointer active:scale-95 touch-manipulation">
              <div className="flex items-center justify-between mb-3">
                <Target className="w-8 h-8 text-orange-400" />
                <ArrowRight className="w-5 h-5 text-orange-400 group-hover:translate-x-1 transition" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Take Challenge</h3>
              <p className="text-sm text-slate-400">Test your detection skills</p>
            </Link>

            <Link to="/learning" className="group bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 hover:border-green-400 rounded-xl p-6 transition cursor-pointer active:scale-95 touch-manipulation sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between mb-3">
                <BookOpen className="w-8 h-8 text-green-400" />
                <ArrowRight className="w-5 h-5 text-green-400 group-hover:translate-x-1 transition" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Learn More</h3>
              <p className="text-sm text-slate-400">Expand your knowledge</p>
            </Link>
          </div>

          {/* Daily Challenge + Share Row */}
          <div className="grid lg:grid-cols-3 gap-4 mb-8">
            {/* Daily Challenge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:col-span-2"
            >
              <Card className={`${dailyChallengeCompleted ? 'bg-green-500/10 border-green-500/30' : 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30'}`}>
                <CardContent>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-3 bg-yellow-500/20 rounded-lg flex-shrink-0">
                        <Calendar className="w-6 h-6 text-yellow-400" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg sm:text-xl font-bold text-white flex flex-wrap items-center gap-2">
                          <span className="truncate">{dailyChallenge.title}</span>
                          {dailyChallengeCompleted && <Badge variant="success">Completed! ✓</Badge>}
                        </h3>
                        <p className="text-sm text-slate-400 line-clamp-2">{dailyChallenge.description}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-2xl font-bold text-yellow-400">+{dailyChallenge.bonus_points}</p>
                      <p className="text-xs text-slate-400 whitespace-nowrap">Bonus Points</p>
                    </div>
                  </div>
                  {!dailyChallengeCompleted ? (
                    <Link to="/challenges">
                      <Button variant="primary" fullWidth className="active:scale-95 transition-transform touch-manipulation">
                        <Target className="w-4 h-4 mr-2" />
                        Start Daily Challenge
                      </Button>
                    </Link>
                  ) : (
                    <div className="text-center py-2 text-green-400 font-semibold text-sm sm:text-base">
                      🎉 Challenge complete! Come back tomorrow for a new one
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Share Progress */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-1"
            >
              <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30 h-full">
                <CardContent className="flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Share2 className="w-5 h-5 text-purple-400 flex-shrink-0" />
                      <h3 className="text-lg font-bold text-white">Share Progress</h3>
                    </div>
                    <p className="text-sm text-slate-400 mb-4">
                      Show off your achievements on social media!
                    </p>
                  </div>
                  <Button 
                    variant="secondary" 
                    fullWidth
                    onClick={handleShareProgress}
                    className="active:scale-95 transition-transform touch-manipulation"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Now
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
            <Card className="hover:scale-105 transition-transform duration-300">
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  <Badge variant="info">Total</Badge>
                </div>
                <p className="text-4xl font-bold text-white mb-1">{stats.total}</p>
                <p className="text-sm text-slate-400">Analyses completed</p>
                <div className="mt-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-green-400 font-semibold">+12% this week</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:scale-105 transition-transform duration-300">
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <Badge variant="danger">Threats</Badge>
                </div>
                <p className="text-4xl font-bold text-white mb-1">{stats.flagged}</p>
                <p className="text-sm text-slate-400">Threats detected</p>
                <div className="mt-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-slate-400">Protected you!</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:scale-105 transition-transform duration-300">
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <Badge variant="success">Safe</Badge>
                </div>
                <p className="text-4xl font-bold text-white mb-1">{stats.legitimate}</p>
                <p className="text-sm text-slate-400">Legitimate items</p>
                <div className="mt-3 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-400">No threats found</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:scale-105 transition-transform duration-300">
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  <Badge variant="info">Rate</Badge>
                </div>
                <p className="text-4xl font-bold text-white mb-1">{detectionRate}%</p>
                <p className="text-sm text-slate-400">Detection accuracy</p>
                <div className="mt-3 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-cyan-400 font-semibold">Advanced Protection</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Recent Activity */}
            <Card>
              <CardContent>
                <h2 className="text-white font-bold text-xl mb-6 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  Recent Activity
                </h2>
                <div className="space-y-3">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:border-blue-500/30 transition">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            activity.type === 'analysis' ? 'bg-blue-500/10' :
                            activity.type === 'challenge' ? 'bg-orange-500/10' : 'bg-green-500/10'
                          }`}>
                            {activity.type === 'analysis' && <Shield className="w-5 h-5 text-blue-400" />}
                            {activity.type === 'challenge' && <Target className="w-5 h-5 text-orange-400" />}
                            {activity.type === 'lesson' && <BookOpen className="w-5 h-5 text-green-400" />}
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">{activity.title}</p>
                            <p className="text-xs text-slate-500">{new Date(activity.timestamp).toLocaleDateString()}</p>
                          </div>
                        </div>
                        {activity.result && (
                          <Badge variant={activity.result === 'pass' ? 'success' : activity.result === 'fail' ? 'danger' : 'warning'}>
                            {activity.result}
                          </Badge>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No recent activity yet</p>
                      <p className="text-sm text-slate-500 mt-2">Start analyzing threats to see your activity here</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card>
              <CardContent>
                <h2 className="text-white font-bold text-xl mb-6 flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-400" />
                  Achievements
                </h2>
                <div className="space-y-3">
                  {achievements.map((achievement) => (
                    <div key={achievement.id} className={`p-4 rounded-lg border ${
                      achievement.unlocked 
                        ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30' 
                        : 'bg-slate-800/30 border-slate-700/50'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{achievement.icon}</span>
                          <div>
                            <p className={`font-bold ${achievement.unlocked ? 'text-yellow-400' : 'text-white'}`}>
                              {achievement.title}
                            </p>
                            <p className="text-xs text-slate-400">{achievement.description}</p>
                          </div>
                        </div>
                        {achievement.unlocked && <CheckCircle className="w-5 h-5 text-yellow-400" />}
                      </div>
                      {!achievement.unlocked && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                            <span>Progress</span>
                            <span>{achievement.progress}/{achievement.total}</span>
                          </div>
                          <div className="bg-slate-700/50 rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                              style={{ width: `${(achievement.progress / achievement.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommended Actions */}
          <Card>
            <CardContent>
              <h2 className="text-white font-bold text-xl mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Recommended for You
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                <Link to="/challenges" className="group p-4 bg-gradient-to-br from-orange-500/5 to-orange-600/5 border border-orange-500/20 hover:border-orange-400 rounded-lg transition">
                  <Target className="w-8 h-8 text-orange-400 mb-3" />
                  <h3 className="text-white font-bold mb-1">New Challenge Available</h3>
                  <p className="text-sm text-slate-400 mb-3">Test your skills with "Email Phishing Detection"</p>
                  <span className="text-xs text-orange-400 font-semibold group-hover:underline">Take Challenge →</span>
                </Link>

                <Link to="/learning" className="group p-4 bg-gradient-to-br from-green-500/5 to-green-600/5 border border-green-500/20 hover:border-green-400 rounded-lg transition">
                  <BookOpen className="w-8 h-8 text-green-400 mb-3" />
                  <h3 className="text-white font-bold mb-1">Continue Learning</h3>
                  <p className="text-sm text-slate-400 mb-3">Resume "Advanced URL Analysis Techniques"</p>
                  <span className="text-xs text-green-400 font-semibold group-hover:underline">Continue Lesson →</span>
                </Link>

                <Link to="/analyze" className="group p-4 bg-gradient-to-br from-blue-500/5 to-blue-600/5 border border-blue-500/20 hover:border-blue-400 rounded-lg transition">
                  <Shield className="w-8 h-8 text-blue-400 mb-3" />
                  <h3 className="text-white font-bold mb-1">Daily Practice</h3>
                  <p className="text-sm text-slate-400 mb-3">Analyze a suspicious email to maintain your streak</p>
                  <span className="text-xs text-blue-400 font-semibold group-hover:underline">Start Analysis →</span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
