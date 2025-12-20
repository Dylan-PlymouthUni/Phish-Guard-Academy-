// Social Sharing Utilities

export interface ShareData {
  title: string
  text: string
  url?: string
}

export const canShare = (): boolean => {
  return typeof navigator !== 'undefined' && 'share' in navigator
}

export const shareAchievement = async (achievement: {
  title: string
  description: string
  points: number
  icon: string
}): Promise<boolean> => {
  const shareData: ShareData = {
    title: `PhishGuard Achievement Unlocked! ${achievement.icon}`,
    text: `I just unlocked "${achievement.title}" and earned ${achievement.points} points on PhishGuard Academy! Can you beat my score? 🛡️`,
    url: window.location.origin + '/app/'
  }

  if (canShare()) {
    try {
      await navigator.share(shareData)
      return true
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Share failed:', err)
      }
      return false
    }
  } else {
    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(
        `${shareData.text}\n${shareData.url}`
      )
      return true
    } catch (err) {
      console.error('Clipboard failed:', err)
      return false
    }
  }
}

export const shareProgress = async (stats: {
  level: number
  points: number
  analyses: number
  streak: number
}): Promise<boolean> => {
  const shareData: ShareData = {
    title: 'My PhishGuard Progress 🎯',
    text: `Check out my PhishGuard Academy stats:\n🏆 Level ${stats.level}\n⭐ ${stats.points.toLocaleString()} points\n🔍 ${stats.analyses} analyses\n🔥 ${stats.streak} day streak\n\nJoin me in learning to fight phishing!`,
    url: window.location.origin + '/app/'
  }

  if (canShare()) {
    try {
      await navigator.share(shareData)
      return true
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Share failed:', err)
      }
      return false
    }
  } else {
    try {
      await navigator.clipboard.writeText(
        `${shareData.text}\n${shareData.url}`
      )
      return true
    } catch (err) {
      console.error('Clipboard failed:', err)
      return false
    }
  }
}

export const shareLeaderboardRank = async (rank: number, points: number): Promise<boolean> => {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏅'
  
  const shareData: ShareData = {
    title: `PhishGuard Leaderboard Rank ${medal}`,
    text: `I'm ranked #${rank} on the PhishGuard Academy leaderboard with ${points.toLocaleString()} points! ${medal}\n\nThink you can beat me? 💪`,
    url: window.location.origin + '/app/leaderboard'
  }

  if (canShare()) {
    try {
      await navigator.share(shareData)
      return true
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Share failed:', err)
      }
      return false
    }
  } else {
    try {
      await navigator.clipboard.writeText(
        `${shareData.text}\n${shareData.url}`
      )
      return true
    } catch (err) {
      console.error('Clipboard failed:', err)
      return false
    }
  }
}

// Generate shareable image data URL (for future enhancement)
export const generateShareImage = (data: {
  title: string
  stats: Array<{ label: string; value: string }>
}): string => {
  // This would use canvas to generate a nice image
  // For now, return placeholder
  return ''
}

// Twitter/X share URL
export const getTwitterShareUrl = (text: string, url: string = ''): string => {
  const params = new URLSearchParams({
    text,
    url: url || window.location.origin + '/app/',
    hashtags: 'PhishGuard,CyberSecurity,PhishingAwareness'
  })
  return `https://twitter.com/intent/tweet?${params.toString()}`
}

// LinkedIn share URL
export const getLinkedInShareUrl = (url: string = ''): string => {
  const params = new URLSearchParams({
    url: url || window.location.origin + '/app/'
  })
  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`
}

// Facebook share URL
export const getFacebookShareUrl = (url: string = ''): string => {
  const params = new URLSearchParams({
    u: url || window.location.origin + '/app/'
  })
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`
}
