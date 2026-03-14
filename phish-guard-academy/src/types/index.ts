export interface Challenge {
  id: string
  title: string
  description: string
  difficulty: string
  time_limit: number
  points: number
  questions: Question[]
  stats?: ChallengeStats
}

export interface Question {
  id: string
  question: string
  type?: string
  options: string[]
  correct_answer?: string
  explanation?: string
}

export interface ChallengeStats {
  attempts: number
  passed: number
  best_score: number
}

export interface Lesson {
  id: string
  title: string
  description: string
  difficulty: string
  duration: number
  points: number
  content: string
  completed?: boolean
}

export interface UserSettings {
  theme: string
  notifications_enabled: boolean
  email_notifications: boolean
  difficulty_level: string
  language: string
  privacy_mode: boolean
  auto_save_enabled: boolean
}

export interface AnalysisResult {
  risk: number
  risk_label?: 'likely_phishing' | 'needs_verification' | 'likely_safe'
  risk_summary?: string
  confidence?: number
  findings: Finding[]
  boxes?: any[]
}

export interface Finding {
  type: string
  label: string
  detail: string
  severity: string
}

export interface URLInfo {
  url: string
  score: number
  suspicious: boolean
  reasons: string[]
  ml_risk_percent?: number
}

export interface UserProgress {
  total_points: number
  lessons_completed: number
  challenges_passed: number
  achievements: Achievement[]
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  points: number
  unlocked: boolean
}
