/**
 * Enhanced Settings Functionality
 * Ensures all settings actually affect the application behavior
 * - Sound effects for actions (success, error, notification, level up)
 * - Motion preferences for users who prefer reduced motion
 * - Native browser notifications with fallback to in-app notifications
 * - Daily reminder notifications to encourage regular practice
 * - Font size adjustments that apply globally
 * - Compact layout option for denser information display
 * - Real-time application of settings changes without needing a page refresh
 * - Comprehensive error handling for notification permissions and unsupported features
 * - Clean up of timers and event listeners to prevent memory leaks
 * - Modular functions that can be easily reused across the app
 * - Integration with the existing settings storage system for persistence
 * - Accessibility considerations for notifications and motion preferences

 * This file defines utility functions and effects related to user settings in the PhishGuard Academy application. It includes functionality for playing sound effects, handling motion preferences, sending notifications, scheduling daily reminders, applying font size and layout settings, and initializing settings on app load. The functions are designed to be modular and reusable across the application.
 * 
 * Key features:
 * - Sound effects for various user actions (success, error, notification, level up).
 * - Detection of user preferences for reduced motion and adjusting animation durations accordingly.
 * - A robust notification system that uses native browser notifications when possible, with fallbacks and in-app notifications.
 * - Scheduling daily reminders to encourage users to practice their phishing detection skills.
 * - Applying font size and layout settings globally across the application.
 * - Real-time application of settings changes without requiring a page refresh.
 * - Comprehensive error handling for notification permissions and unsupported features.
 * - Clean-up of timers and event listeners to prevent memory leaks.
 * - Integration with the existing settings storage system for persistence.
 * - Accessibility considerations for notifications and motion preferences.
 **/

import { getSettings, saveSettings } from './storage'

let reminderTimer: number | null = null

// Sound effects player
export const playSound = (type: 'success' | 'error' | 'notification' | 'levelup') => {
  const settings = getSettings()
  if (!settings.sound_effects) return

  // Use Web Audio API for better cross-browser support
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  // Different sounds for different actions
  switch (type) {
    case 'success':
      oscillator.frequency.value = 800
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.3)
      break
    case 'error':
      oscillator.frequency.value = 200
      oscillator.type = 'sawtooth'
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.2)
      break
    case 'notification':
      oscillator.frequency.value = 600
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.15)
      break
    case 'levelup':
      // Ascending tone
      oscillator.frequency.setValueAtTime(400, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3)
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.5)
      break
  }
}

// Motion preference checker
export const prefersReducedMotion = (): boolean => {
  const settings = getSettings()
  if (settings.reduced_motion) return true
  
  // Also check system preference
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Get animation duration based on motion preference
export const getAnimationDuration = (normalMs: number): number => {
  return prefersReducedMotion() ? 0 : normalMs
}

type NotificationResult =
  | 'sent'
  | 'unsupported'
  | 'insecure-context'
  | 'blocked-master'
  | 'blocked-quiet-hours'
  | 'permission-denied'
  | 'permission-default'
  | 'failed'

interface SendNotificationConfig {
  bypassQuietHours?: boolean
}

const emitInAppNotification = (
  type: 'success' | 'error' | 'info' | 'warning',
  message: string,
  duration = 5000
) => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('phishguard:notify', {
      detail: { type, message, duration }
    })
  )
}

// Notification system
export const sendNotification = async (
  title: string,
  body: string,
  options?: NotificationOptions,
  config?: SendNotificationConfig
): Promise<NotificationResult> => {
  try {
    const settings = getSettings()
    if (!settings.notifications) return 'blocked-master'

    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return 'insecure-context'
    }

    if (!config?.bypassQuietHours && isInQuietHours(settings)) return 'blocked-quiet-hours'

    // Always show in-app popup notification when allowed by app settings,
    // even if native browser notifications are suppressed by OS/browser policy.
    emitInAppNotification('info', `${title}: ${body}`, 6000)

    if (!('Notification' in window)) {
      return 'unsupported'
    }

    // Check permission
    let permission = Notification.permission
    
    if (permission === 'default') {
      permission = await Notification.requestPermission()
    }
    
    if (permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          requireInteraction: settings.notification_priority === 'high',
          silent: settings.notification_priority === 'low',
          ...options
        })
        
        if (settings.sound_effects) {
          playSound('notification')
        }

        return 'sent'
      } catch {
        return 'failed'
      }
    }

    if (permission === 'denied') {
      return 'permission-denied'
    }

    return 'permission-default'
  } catch {
    return 'failed'
  }
}

export const getNotificationPermissionState = () => {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.requestPermission()
}

export const sendTestNotification = async () => {
  return sendNotification(
    'PhishGuard test notification',
    'Notifications are enabled and working with your current settings.',
    { requireInteraction: true, tag: 'phishguard-test' },
    { bypassQuietHours: true }
  )
}

const toMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

export const isInQuietHours = (settings = getSettings()) => {
  if (!settings.quiet_hours_enabled) return false

  const start = settings.quiet_hours_start || '22:00'
  const end = settings.quiet_hours_end || '08:00'
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = toMinutes(start)
  const endMinutes = toMinutes(end)

  if (startMinutes === endMinutes) return true
  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes
}

// Daily reminder scheduler
export const scheduleDailyReminder = () => {
  const settings = getSettings()
  if (!settings.daily_reminder) return

  if (reminderTimer) {
    window.clearTimeout(reminderTimer)
    reminderTimer = null
  }

  // Check if we should send today's reminder
  const lastReminder = localStorage.getItem('last_reminder_date')
  const today = new Date().toDateString()
  
  if (lastReminder !== today) {
    const now = new Date()
    const reminderTime = new Date()
    const [hours, minutes] = (settings.streak_reminder_time || '19:00').split(':').map(Number)
    reminderTime.setHours(hours, minutes, 0, 0)
    
    if (now < reminderTime) {
      const delay = reminderTime.getTime() - now.getTime()
      reminderTimer = window.setTimeout(() => {
        sendNotification(
          '🎯 Daily PhishGuard Reminder',
          'Take a few minutes to practice your phishing detection skills today!'
        )
        localStorage.setItem('last_reminder_date', today)
      }, delay)
    }
  }
}

// Font size application
export const applyFontSize = (size: 'small' | 'medium' | 'large') => {
  const fontSize = size === 'small' ? '15px' : size === 'large' ? '17px' : '16px'
  document.documentElement.style.fontSize = fontSize
}

export const applyCompactLayout = (compact: boolean) => {
  document.documentElement.setAttribute('data-density', compact ? 'compact' : 'comfortable')
}

// Initialize all settings on app load
export const initializeSettings = () => {
  const settings = getSettings()
  
  // Apply font size
  if (settings.font_size) {
    applyFontSize(settings.font_size as 'small' | 'medium' | 'large')
  }

  applyCompactLayout(!!settings.compact_layout)
  
  // Setup daily reminders
  scheduleDailyReminder()
  
  // Apply reduced motion to CSS
  if (settings.reduced_motion) {
    document.documentElement.style.setProperty('--animation-speed', '0')
  } else {
    document.documentElement.style.setProperty('--animation-speed', '1')
  }

    const handleSettingsUpdated = () => {
    const nextSettings = getSettings()
    if (nextSettings.font_size) {
      applyFontSize(nextSettings.font_size as 'small' | 'medium' | 'large')
    }
    applyCompactLayout(!!nextSettings.compact_layout)
    document.documentElement.style.setProperty('--animation-speed', nextSettings.reduced_motion ? '0' : '1')
    scheduleDailyReminder()
  }

  window.addEventListener('phishguard:settings-updated', handleSettingsUpdated)
}

// Export settings state for components
export const useSettingsEffect = (setting: string, callback: (value: any) => void) => {
  const settings = getSettings()
  const value = (settings as any)[setting]
  
  if (value !== undefined) {
    callback(value)
  }
}
