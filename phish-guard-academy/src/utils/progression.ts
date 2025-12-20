/**
 * Experience and Leveling System
 * Manages XP gain, level ups, and progression rewards
 */

export interface LevelInfo {
  level: number
  xp: number
  xpForNextLevel: number
  xpProgress: number // 0-100
  title: string
  unlockedFeatures: string[]
}

// XP constants
const BASE_XP_PER_LEVEL = 100
const XP_MULTIPLIER = 1.5

// XP rewards
export const XP_REWARDS = {
  ANALYSIS_COMPLETED: 10,
  PHISHING_DETECTED: 25,
  LEGITIMATE_CORRECT: 15,
  LESSON_COMPLETED: 50,
  CHALLENGE_PASSED: 100,
  CHALLENGE_PERFECT: 150,
  DAILY_LOGIN: 5,
  STREAK_BONUS_PER_DAY: 10,
  ACHIEVEMENT_UNLOCKED: 75,
}

// Level titles and milestones
const LEVEL_TITLES: Record<number, string> = {
  1: 'Security Novice',
  5: 'Threat Spotter',
  10: 'Cyber Defender',
  15: 'Security Expert',
  20: 'Phishing Hunter',
  25: 'Elite Guardian',
  30: 'Security Master',
  40: 'Legendary Protector',
  50: 'Cyber Sage',
}

const FEATURE_UNLOCKS: Record<number, string[]> = {
  1: ['Basic Analysis', 'Learning Hub'],
  3: ['Challenges', 'Analytics'],
  5: ['Advanced Analysis', 'Streak Tracking'],
  10: ['Custom Sensitivity', 'Whitelist Manager'],
  15: ['Expert Mode', 'Leaderboards'],
  20: ['Screenshot Analysis', 'Report Generator'],
  25: ['API Access', 'Bulk Scanning'],
  30: ['Custom Rules', 'Team Features'],
}

/**
 * Calculate XP required for a specific level
 */
export function calculateXPForLevel(level: number): number {
  if (level <= 1) return 0
  
  let totalXP = 0
  for (let i = 1; i < level; i++) {
    totalXP += Math.floor(BASE_XP_PER_LEVEL * Math.pow(XP_MULTIPLIER, i - 1))
  }
  return totalXP
}

/**
 * Calculate XP needed to reach next level from current level
 */
export function calculateXPForNextLevel(currentLevel: number): number {
  return Math.floor(BASE_XP_PER_LEVEL * Math.pow(XP_MULTIPLIER, currentLevel - 1))
}

/**
 * Get level from total XP
 */
export function getLevelFromXP(xp: number): number {
  let level = 1
  let requiredXP = 0
  
  while (xp >= requiredXP + calculateXPForNextLevel(level)) {
    requiredXP += calculateXPForNextLevel(level)
    level++
  }
  
  return level
}

/**
 * Get complete level information from XP
 */
export function getLevelInfo(totalXP: number): LevelInfo {
  const level = getLevelFromXP(totalXP)
  const xpForCurrentLevel = calculateXPForLevel(level)
  const xpForNextLevel = calculateXPForNextLevel(level)
  const currentLevelXP = totalXP - xpForCurrentLevel
  const xpProgress = (currentLevelXP / xpForNextLevel) * 100
  
  // Get title (use highest achieved or default)
  const titleKeys = Object.keys(LEVEL_TITLES).map(Number).sort((a, b) => b - a)
  const titleKey = titleKeys.find(key => level >= key) || 1
  const title = LEVEL_TITLES[titleKey]
  
  // Get all unlocked features
  const unlockedFeatures = Object.entries(FEATURE_UNLOCKS)
    .filter(([reqLevel]) => level >= Number(reqLevel))
    .flatMap(([, features]) => features)
  
  return {
    level,
    xp: totalXP,
    xpForNextLevel,
    xpProgress: Math.min(100, Math.max(0, xpProgress)),
    title,
    unlockedFeatures,
  }
}

/**
 * Award XP and check for level up
 */
export function awardXP(
  currentXP: number,
  xpToAdd: number
): {
  newXP: number
  leveledUp: boolean
  newLevel: number
  oldLevel: number
  xpGained: number
} {
  const oldLevel = getLevelFromXP(currentXP)
  const newXP = currentXP + xpToAdd
  const newLevel = getLevelFromXP(newXP)
  const leveledUp = newLevel > oldLevel
  
  return {
    newXP,
    leveledUp,
    newLevel,
    oldLevel,
    xpGained: xpToAdd,
  }
}

/**
 * Calculate streak bonus
 */
export function calculateStreakBonus(streakDays: number): number {
  return streakDays * XP_REWARDS.STREAK_BONUS_PER_DAY
}

/**
 * Get XP multiplier based on performance
 */
export function getPerformanceMultiplier(accuracy: number): number {
  if (accuracy >= 95) return 1.5
  if (accuracy >= 80) return 1.2
  if (accuracy >= 60) return 1.0
  return 0.8
}
