/**
 * Enhanced Settings Functionality
 * Ensures all settings actually affect the application behavior
 */

import { getSettings, saveSettings } from './storage'

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

// Notification system
export const sendNotification = async (title: string, body: string, options?: NotificationOptions) => {
  const settings = getSettings()
  if (!settings.notifications) return

  // Check permission
  if ('Notification' in window) {
    let permission = Notification.permission
    
    if (permission === 'default') {
      permission = await Notification.requestPermission()
    }
    
    if (permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      })
      
      if (settings.sound_effects) {
        playSound('notification')
      }
    }
  }
}

// Daily reminder scheduler
export const scheduleDailyReminder = () => {
  const settings = getSettings()
  if (!settings.daily_reminder) return

  // Check if we should send today's reminder
  const lastReminder = localStorage.getItem('last_reminder_date')
  const today = new Date().toDateString()
  
  if (lastReminder !== today) {
    // Schedule for later today if not already past 6 PM
    const now = new Date()
    const reminderTime = new Date()
    reminderTime.setHours(18, 0, 0, 0) // 6 PM
    
    if (now < reminderTime) {
      const delay = reminderTime.getTime() - now.getTime()
      setTimeout(() => {
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
  const fontSize = size === 'small' ? '14px' : size === 'large' ? '18px' : '16px'
  document.documentElement.style.fontSize = fontSize
}

// Initialize all settings on app load
export const initializeSettings = () => {
  const settings = getSettings()
  
  // Apply font size
  if (settings.font_size) {
    applyFontSize(settings.font_size as 'small' | 'medium' | 'large')
  }
  
  // Setup daily reminders
  scheduleDailyReminder()
  
  // Apply reduced motion to CSS
  if (settings.reduced_motion) {
    document.documentElement.style.setProperty('--animation-speed', '0')
  } else {
    document.documentElement.style.setProperty('--animation-speed', '1')
  }
}

// Export settings state for components
export const useSettingsEffect = (setting: string, callback: (value: any) => void) => {
  const settings = getSettings()
  const value = (settings as any)[setting]
  
  if (value !== undefined) {
    callback(value)
  }
}
