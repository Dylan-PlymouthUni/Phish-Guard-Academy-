// Persistent storage utility for PhishGuard Academy
import { 
  awardXP, 
  getLevelFromXP, 
  getLevelInfo, 
  XP_REWARDS, 
  calculateStreakBonus 
} from './progression'

export interface Analysis {
  id: string
  timestamp: string
  risk: number
  type: 'screenshot' | 'text' | 'url'
  findings: number
}

export interface UserProgress {
  total_points: number
  level: number
  experience: number
  lessons_completed: string[]
  challenges_completed: string[]
  analyses_performed: Analysis[]
  streak_days: number
  last_activity: string
  achievements: string[]
  points: number
  streak: number
  daily_challenge_completed_date?: string
  daily_challenge_streak?: number
}

interface Settings {
  notifications: boolean
  email_alerts: boolean
  difficulty_preference: string
  theme: string
  auto_save: boolean
  language: string
  reduced_motion: boolean
  sound_effects: boolean
  daily_reminder: boolean
  weekly_report: boolean
  name?: string
  ml_sensitivity?: 'strict' | 'balanced' | 'relaxed'
  ml_whitelist?: string[]
  auto_analyze?: boolean
  show_confidence?: boolean
}

const STORAGE_KEYS = {
  PROGRESS: 'phishguard_progress',
  SETTINGS: 'phishguard_settings',
  ANALYSES: 'phishguard_analyses'
}

// Initialize default data
const DEFAULT_PROGRESS: UserProgress = {
  total_points: 0,
  level: 1,
  experience: 0,
  lessons_completed: [],
  challenges_completed: [],
  analyses_performed: [],
  streak_days: 0,
  last_activity: new Date().toISOString(),
  achievements: [],
  points: 0,
  streak: 0
}

const DEFAULT_SETTINGS: Settings = {
  notifications: true,
  email_alerts: false,
  difficulty_preference: 'medium',
  theme: 'dark',
  auto_save: true,
  language: 'en',
  reduced_motion: false,
  sound_effects: true,
  daily_reminder: true,
  weekly_report: false
}

// Progress Management
export const getProgress = (): UserProgress => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PROGRESS)
    return stored ? JSON.parse(stored) : DEFAULT_PROGRESS
  } catch {
    return DEFAULT_PROGRESS
  }
}

export const saveProgress = (progress: Partial<UserProgress>) => {
  const current = getProgress()
  const updated = { ...current, ...progress, last_activity: new Date().toISOString() }
  localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(updated))
  return updated
}

export const addPoints = (points: number, reason?: string) => {
  const progress = getProgress()
  const result = awardXP(progress.experience, points)
  
  const updates: Partial<UserProgress> = {
    total_points: progress.total_points + points,
    experience: result.newXP,
    level: result.newLevel
  }
  
  // Show level up notification if applicable
  if (result.leveledUp) {
    const levelInfo = getLevelInfo(result.newXP)
    console.log(`🎉 Level Up! You're now level ${result.newLevel}: ${levelInfo.title}`)
    
    // Could trigger a level-up modal/toast here
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('levelup', { 
        detail: { level: result.newLevel, title: levelInfo.title }
      }))
    }
  }
  
  return saveProgress(updates)
}

export const completeLesson = (lessonId: string, points: number = XP_REWARDS.LESSON_COMPLETED) => {
  const progress = getProgress()
  if (!progress.lessons_completed.includes(lessonId)) {
    const updated = saveProgress({
      lessons_completed: [...progress.lessons_completed, lessonId],
    })
    addPoints(points, 'Lesson completed')
    return updated
  }
  return progress
}

export const completeChallenge = (challengeId: string, points: number = XP_REWARDS.CHALLENGE_PASSED, passed: boolean) => {
  const progress = getProgress()
  if (passed && !progress.challenges_completed.includes(challengeId)) {
    const updated = saveProgress({
      challenges_completed: [...progress.challenges_completed, challengeId],
    })
    addPoints(points, 'Challenge completed')
    return updated
  }
  return progress
}

export const recordAnalysis = (analysis: Omit<Analysis, 'id' | 'timestamp'>) => {
  const progress = getProgress()
  const newAnalysis: Analysis = {
    ...analysis,
    id: Date.now().toString(),
    timestamp: new Date().toISOString()
  }
  
  const updated = saveProgress({
    analyses_performed: [...progress.analyses_performed, newAnalysis]
  })
  
  // Award XP based on analysis type
  if (analysis.risk >= 70) {
    addPoints(XP_REWARDS.PHISHING_DETECTED, 'Phishing detected')
  } else if (analysis.risk < 30) {
    addPoints(XP_REWARDS.LEGITIMATE_CORRECT, 'Legitimate identified')
  } else {
    addPoints(XP_REWARDS.ANALYSIS_COMPLETED, 'Analysis completed')
  }
  
  return updated
}

// Settings Management
export const getSettings = (): Settings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS)
    return stored ? JSON.parse(stored) : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export const saveSettings = (settings: Partial<Settings>) => {
  const current = getSettings()
  const updated = { ...current, ...settings }
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated))
  return updated
}

export const resetSettings = () => {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS))
  return DEFAULT_SETTINGS
}

// Analytics
export const getAnalytics = () => {
  const progress = getProgress()
  const analyses = progress.analyses_performed

  const highRisk = analyses.filter(a => a.risk >= 70).length
  const mediumRisk = analyses.filter(a => a.risk >= 40 && a.risk < 70).length
  const lowRisk = analyses.filter(a => a.risk < 40).length

  const avgRisk = analyses.length > 0
    ? analyses.reduce((sum, a) => sum + a.risk, 0) / analyses.length
    : 0

  return {
    total_analyses: analyses.length,
    high_risk_count: highRisk,
    medium_risk_count: mediumRisk,
    safe_count: lowRisk,
    avg_risk_percent: Math.round(avgRisk),
    challenges_passed: progress.challenges_completed.length,
    total_lessons: 7,
    lessons_completed: progress.lessons_completed.length
  }
}

// Export all data
export const exportAllData = () => {
  return {
    progress: getProgress(),
    settings: getSettings(),
    exportDate: new Date().toISOString(),
    version: '1.0'
  }
}

// Reset all data
export const resetAllData = () => {
  localStorage.removeItem(STORAGE_KEYS.PROGRESS)
  localStorage.removeItem(STORAGE_KEYS.SETTINGS)
  localStorage.removeItem(STORAGE_KEYS.ANALYSES)
}

// Get all analyses
export const getAnalyses = (): Analysis[] => {
  const progress = getProgress()
  return progress.analyses_performed || []
}

// Daily Challenge System
export const getDailyChallenge = () => {
  const today = new Date().toISOString().split('T')[0]
  const challengeTypes = ['phishing-email', 'suspicious-link', 'fake-login', 'urgent-scam']
  const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  const challengeIndex = dayOfYear % challengeTypes.length
  
  return {
    id: `daily-${today}`,
    type: challengeTypes[challengeIndex],
    date: today,
    title: `Daily Challenge: ${challengeTypes[challengeIndex].split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`,
    description: 'Complete this special challenge for bonus points!',
    bonus_points: 500,
    completed: false
  }
}

export const completeDailyChallenge = () => {
  const progress = getProgress()
  const today = new Date().toISOString().split('T')[0]
  const lastCompleted = progress.daily_challenge_completed_date
  
  let newStreak = progress.daily_challenge_streak || 0
  if (lastCompleted) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    if (lastCompleted === yesterday) {
      newStreak += 1
    } else if (lastCompleted !== today) {
      newStreak = 1
    }
  } else {
    newStreak = 1
  }
  
  return saveProgress({
    daily_challenge_completed_date: today,
    daily_challenge_streak: newStreak,
    total_points: progress.total_points + 500,
    experience: progress.experience + 500
  })
}

export const isDailyChallengeCompleted = () => {
  const progress = getProgress()
  const today = new Date().toISOString().split('T')[0]
  return progress.daily_challenge_completed_date === today
}

