/**
 * Central TypeScript type definitions used by frontend modules.
 * This file defines interfaces and types for core data structures such as challenges, lessons, user settings, analysis results, and user progress.
 * These types are used throughout the PhishGuard Academy application to ensure type safety and consistency when working with data related to challenges, lessons, user preferences, phishing analysis results, and user progress tracking.
 * - Challenge: Represents a phishing detection challenge, including its title, description, difficulty, time limit, points, and associated questions.
 * - Question: Represents a question within a challenge, including the question text, type, options, correct answer, and explanation.
 * - ChallengeStats: Represents statistics related to a challenge, such as attempts, passes, and best score.
 * - Lesson: Represents an educational lesson, including its title, description, difficulty, duration, points, content, and completion status.
 * - UserSettings: Represents user preferences for the application, such as theme, notification settings, difficulty level, language, privacy mode, and auto-save.
 * - AnalysisResult: Represents the result of analyzing a URL for phishing risk, including risk score, label, summary, confidence level, findings, and any bounding boxes for detected elements.
 * - Finding: Represents a specific finding from a phishing analysis, including its type, label, detail description, and severity level.
 * - URLInfo: Represents information about a URL, including its risk score, whether it's suspicious, reasons for suspicion, and optional machine learning risk percentage.
 * - UserProgress: Represents a user's progress in the PhishGuard Academy, including total points, lessons completed, challenges passed, and achievements.
 * - Achievement: Represents an achievement that a user can earn, including its title, description, icon, points awarded, and unlocked status.
 */

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
