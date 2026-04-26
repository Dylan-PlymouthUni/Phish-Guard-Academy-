/**
 * Settings component/module file.
  * This file defines the Settings page, which allows users to customize their preferences and account settings in the PhishGuard Academy application.
 */

import { Bell, Shield, Palette, Lock, Database, Download, RotateCcw, Trash2, Eye, Brain, Zap, Award, Sparkles, X, LogOut, User, KeyRound, Clock, Info, HardDrive, CheckCircle2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MainLayout } from '../components/layout/MainLayout'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Toast } from '../components/ui/Toast'
import { getSettings, saveSettings as saveToStorage, resetSettings as resetToDefaults, exportAllData, resetAllData, clearAnalysisHistory } from '../utils/storage'
import { applyCompactLayout, applyFontSize, getNotificationPermissionState, requestNotificationPermission, sendTestNotification } from '../utils/settingsEffects'
import { useAuth } from '../contexts/AuthContext'

interface Settings {
  notifications: boolean
  email_alerts: boolean
  difficulty_preference: string
  auto_save: boolean
  language?: string
  reduced_motion?: boolean
  sound_effects?: boolean
  daily_reminder?: boolean
  weekly_report?: boolean
  ml_sensitivity?: "strict" | "balanced" | "relaxed"
  ml_whitelist?: string[]
  auto_analyze?: boolean
  show_confidence?: boolean
  keyboard_shortcuts?: boolean
  font_size?: 'small' | 'medium' | 'large'
  default_analyze_tab?: 'screenshot' | 'email' | 'url'
  compact_layout?: boolean
  // Notifications extended
  quiet_hours_enabled?: boolean
  quiet_hours_start?: string
  quiet_hours_end?: string
  streak_reminder_time?: string
  notification_priority?: 'low' | 'normal' | 'high'
  challenge_complete_alert?: boolean
  threat_detection_alert?: boolean
  leaderboard_alert?: boolean
  save_analysis_history?: boolean
  retention_days?: 7 | 30 | 90 | 365
  analysis_macros_enabled?: boolean
}

export default function SettingsPage() {
  const { user, token, logout, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [settings, setSettings] = useState<Settings>({
    notifications: true,
    email_alerts: false,
    difficulty_preference: 'medium',
    auto_save: true,
    language: 'en',
    reduced_motion: false,
    sound_effects: true,
    daily_reminder: true,
    weekly_report: false,
    ml_sensitivity: 'balanced',
    ml_whitelist: ['github.dev', 'localhost', 'codespaces.app'],
    auto_analyze: true,
    show_confidence: true,
    keyboard_shortcuts: true,
    analysis_macros_enabled: true,
    font_size: 'medium',
    default_analyze_tab: 'screenshot',
    compact_layout: false,
    save_analysis_history: true,
    retention_days: 90,
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'ml' | 'account' | 'data'>('general')
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success')
  const [mfaStatus, setMfaStatus] = useState<{ mfa_enabled: boolean; backup_codes_remaining: number; setup_complete: boolean } | null>(null)
  const [mfaSetup, setMfaSetup] = useState<{ qr_code: string; secret: string; backup_codes: string[] } | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaPassword, setMfaPassword] = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)
  const [whitelistInput, setWhitelistInput] = useState('')
  const [displayNameInput, setDisplayNameInput] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [storageUsage, setStorageUsage] = useState<{ used: number; quota: number } | null>(null)
  const [notificationPermission, setNotificationPermission] = useState<'default' | 'denied' | 'granted' | 'unsupported'>('unsupported')
  const [notificationPreview, setNotificationPreview] = useState<{
    tone: 'success' | 'warning' | 'error' | 'info'
    title: string
    detail: string
  } | null>(null)
  const [notificationTestCount, setNotificationTestCount] = useState(0)
  const [notificationLastTestAt, setNotificationLastTestAt] = useState<string | null>(null)

  const handleSessionExpired = () => {
    logout()
    setToastType('warning')
    setToastMessage('Session expired. Please sign in again.')
    setShowToast(true)
    navigate('/login')
  }

  useEffect(() => {
    fetchSettings()
    estimateStorageUsage()
    setNotificationPermission(getNotificationPermissionState() as 'default' | 'denied' | 'granted' | 'unsupported')
  }, [])

  useEffect(() => {
    if (token) {
      void fetchMfaStatus()
    }
  }, [token])

  useEffect(() => {
    if (user) setDisplayNameInput(user.name || '')
  }, [user])

    const fetchSettings = async () => {
    try {
      const data = getSettings() as Settings
      setSettings({
        ...data,
        quiet_hours_enabled: data.quiet_hours_enabled ?? false,
        quiet_hours_start: data.quiet_hours_start ?? '22:00',
        quiet_hours_end: data.quiet_hours_end ?? '08:00',
        streak_reminder_time: data.streak_reminder_time ?? '19:00',
        notification_priority: data.notification_priority ?? 'normal',
        challenge_complete_alert: data.challenge_complete_alert ?? true,
        threat_detection_alert: data.threat_detection_alert ?? true,
        leaderboard_alert: data.leaderboard_alert ?? false,
        save_analysis_history: data.save_analysis_history ?? true,
        retention_days: data.retention_days ?? 90,
        analysis_macros_enabled: data.analysis_macros_enabled ?? true,
      })
    } catch (err) {
      console.error('Failed to fetch settings:', err)
    } finally {
      setLoading(false)
    }
  }

    const estimateStorageUsage = () => {
    try {
      let used = 0
      for (const key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
          used += (localStorage.getItem(key) || '').length * 2 // UTF-16 bytes
        }
      }
      setStorageUsage({ used, quota: 5 * 1024 * 1024 })
    } catch {
      // storage API not available
    }
  }

    const saveDisplayName = async () => {
    if (!token || !displayNameInput.trim()) return
    setProfileSaving(true)
    try {
      const nextName = displayNameInput.trim()
      const res = await fetch(`/api/auth/profile?name=${encodeURIComponent(nextName)}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.status === 401) {
        handleSessionExpired()
        return
      }

      if (res.ok) {
        await refreshUser()
        setDisplayNameInput(nextName)
        setProfileSaved(true)
        setTimeout(() => setProfileSaved(false), 3000)
        setToastType('success')
        setToastMessage('Display name updated.')
        setShowToast(true)
      } else {
                const err = await res.json().catch(() => ({}))
        setToastType('error')
        setToastMessage(err.detail || 'Could not update name.')
        setShowToast(true)
      }
    } catch {
      setToastType('error')
      setToastMessage('Network error.')
      setShowToast(true)
    } finally {
      setProfileSaving(false)
    }
  }

    const changePassword = async () => {
    setPasswordError(null)
    if (!passwordForm.next || passwordForm.next.length < 8) {
      setPasswordError('New password must be at least 8 characters.')
      return
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError('Passwords do not match.')
      return
    }
    if (!passwordForm.current) {
      setPasswordError('Enter your current password.')
      return
    }
    setPasswordSaving(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: passwordForm.current, new_password: passwordForm.next }),
      })

      if (res.status === 401) {
        handleSessionExpired()
        return
      }

      if (res.ok) {
        setPasswordForm({ current: '', next: '', confirm: '' })
        setToastType('success')
        setToastMessage('Password changed successfully.')
        setShowToast(true)
      } else {
                const err = await res.json().catch(() => ({}))
        setPasswordError(err.detail || 'Failed to change password.')
      }
    } catch {
      setPasswordError('Network error. Try again.')
    } finally {
      setPasswordSaving(false)
    }
  }

    const fetchMfaStatus = async () => {
    if (!token) return
    try {
      const res = await fetch('/api/mfa/status', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setMfaStatus(data)
      }
    } catch (err) {
      console.error('Failed to fetch MFA status', err)
    }
  }

    const startMfaSetup = async () => {
    if (!token) return
    setMfaLoading(true)
    try {
      const res = await fetch('/api/mfa/setup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.detail || 'Failed to start MFA setup')
      }
      const data = await res.json()
      setMfaSetup(data)
      setMfaCode('')
      setToastType('info')
      setToastMessage('Scan the QR with your authenticator app')
      setShowToast(true)
    } catch (err) {
      console.error(err)
      setToastType('error')
      setToastMessage(err instanceof Error ? err.message : 'Failed to start MFA')
      setShowToast(true)
    } finally {
      setMfaLoading(false)
    }
  }

    const handleLogout = () => {
    logout()
    navigate('/login')
  }

    const verifyMfaSetup = async () => {
    if (!token || !mfaCode) return
    setMfaLoading(true)
    try {
      const res = await fetch('/api/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ token: mfaCode })
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.detail || 'Invalid code')
      }
      setToastType('success')
      setToastMessage('MFA enabled successfully')
      setShowToast(true)
      setMfaSetup(null)
      setMfaCode('')
      await fetchMfaStatus()
    } catch (err) {
      console.error(err)
      setToastType('error')
      setToastMessage(err instanceof Error ? err.message : 'Verification failed')
      setShowToast(true)
    } finally {
      setMfaLoading(false)
    }
  }

    const disableMfa = async () => {
    if (!token) return
    setMfaLoading(true)
    try {
      const res = await fetch('/api/mfa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password: mfaPassword })
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.detail || 'Failed to disable')
      }
      setToastType('success')
      setToastMessage('MFA disabled')
      setShowToast(true)
      setMfaStatus({ mfa_enabled: false, backup_codes_remaining: 0, setup_complete: false })
      setMfaSetup(null)
      setMfaPassword('')
      setMfaCode('')
    } catch (err) {
      console.error(err)
      setToastType('error')
      setToastMessage(err instanceof Error ? err.message : 'Failed to disable MFA')
      setShowToast(true)
    } finally {
      setMfaLoading(false)
    }
  }

    const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    // Auto-save immediately
    saveToStorage(updated)
    estimateStorageUsage()

    if (key === 'font_size') {
      applyFontSize(value as 'small' | 'medium' | 'large')
    }

    if (key === 'reduced_motion') {
      document.documentElement.style.setProperty('--animation-speed', value ? '0' : '1')
    }

    if (key === 'compact_layout') {
      applyCompactLayout(!!value)
    }

    if (key === 'difficulty_preference') {
      setToastType('info')
      setToastMessage(`Difficulty preference set to ${value}.`)
      setShowToast(true)
    }
  }

    const showFeedback = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToastType(type)
    setToastMessage(message)
    setShowToast(true)
  }

    const requestBrowserNotifications = async () => {
    const permission = await requestNotificationPermission()
    setNotificationPermission(permission as 'default' | 'denied' | 'granted' | 'unsupported')
    if (permission === 'granted') {
      showFeedback('Browser notifications enabled.', 'success')
      return
    }
    if (permission === 'denied') {
      showFeedback('Notifications are blocked in your browser.', 'warning')
      return
    }
    showFeedback('Notification permission not changed.', 'info')
  }

    const triggerTestNotification = async () => {
    setNotificationTestCount((count) => count + 1)
    setNotificationLastTestAt(new Date().toLocaleTimeString())
    showFeedback('Notification test button clicked.', 'info')

    const showPreview = (
      tone: 'success' | 'warning' | 'error' | 'info',
      title: string,
      detail: string
    ) => {
      setNotificationPreview({ tone, title, detail })
    }

    showPreview('info', 'Running notification test', 'Checking browser and app notification pipeline...')

    let result: Awaited<ReturnType<typeof sendTestNotification>>
    try {
      result = await sendTestNotification()
    } catch {
      showPreview('error', 'Notification test crashed', 'The browser API threw an unexpected error. Check console and browser settings.')
      showFeedback('Notification test failed unexpectedly.', 'error')
      return
    }

    if (result === 'sent') {
      showPreview(
        'success',
        'PhishGuard test notification delivered',
        'The test event fired. If you did not see a native popup, check your OS notification center and browser-level delivery style.'
      )
      showFeedback('Test notification sent.', 'success')
      return
    }
    if (result === 'blocked-master') {
      showPreview('warning', 'Notifications are turned off', 'Enable the main Notifications toggle above, then run the test again.')
      showFeedback('Enable notifications first using the master switch.', 'warning')
      return
    }
    if (result === 'permission-denied') {
      showPreview('warning', 'Browser permission is blocked', 'Allow notifications for this site in browser settings, then retry.')
      showFeedback('Browser notifications are blocked. Re-enable them in site settings.', 'warning')
      return
    }
    if (result === 'unsupported') {
      showPreview('error', 'Notifications not supported', 'This browser/runtime does not support the Notification API.')
      showFeedback('This browser does not support Notifications.', 'error')
      return
    }
    if (result === 'insecure-context') {
      showPreview('warning', 'Insecure context', 'Notifications require localhost or HTTPS. Open this app on a secure origin.')
      showFeedback('Notifications require a secure context. Use localhost or HTTPS.', 'warning')
      return
    }
    if (result === 'failed') {
      showPreview('error', 'Browser rejected notification', 'The API call failed even with permission granted. Check OS/browser notification settings.')
      showFeedback('The browser rejected the notification. Check OS-level notification settings.', 'error')
      return
    }

    showPreview('warning', 'Notification not delivered', 'The notification request did not complete. Try requesting permission again.')
    showFeedback('Notification could not be delivered.', 'warning')
  }

    const clearLocalAnalyses = () => {
    clearAnalysisHistory()
    estimateStorageUsage()
    showFeedback('Analysis history cleared from this device.', 'success')
  }

    const resetSettings = async () => {
    if (confirm('Reset all settings to defaults?')) {
      try {
        const defaults = resetToDefaults()
        setSettings(defaults)
        estimateStorageUsage()
      } catch (err) {
        console.error('Failed to reset:', err)
      }
    }
  }

    const resetDisplaySettings = () => {
    updateSetting('font_size', 'medium')
    updateSetting('reduced_motion', false)
    updateSetting('compact_layout', false)
    showFeedback('Display settings reset to default view.', 'success')
  }

    const normalizeDomain = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')

    const isValidTrustedDomain = (domain: string) => {
    if (domain === 'localhost') return true
    if (/^localhost:\d+$/.test(domain)) return true
    if (/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return true
    return false
  }

    const addTrustedDomain = () => {
    const domain = normalizeDomain(whitelistInput)

    if (!domain) {
      showFeedback('Enter a domain before adding it.', 'warning')
      return
    }

    if (!isValidTrustedDomain(domain)) {
      showFeedback('Use a valid domain (example.com) or localhost.', 'warning')
      return
    }

    if (settings.ml_whitelist?.includes(domain)) {
      showFeedback(`${domain} is already in your trusted list.`, 'info')
      return
    }

    updateSetting('ml_whitelist', [...(settings.ml_whitelist || []), domain])
    setWhitelistInput('')
    showFeedback(`Added ${domain} to trusted websites.`, 'success')
  }

    const applyProtectionPreset = (preset: 'security-first' | 'balanced' | 'quiet') => {
    if (preset === 'security-first') {
      const updated = {
        ...settings,
        ml_sensitivity: 'strict' as const,
        auto_analyze: true,
        show_confidence: true,
        notifications: true,
      }
      setSettings(updated)
      saveToStorage(updated)
      showFeedback('Applied preset: Security First', 'success')
      return
    }

    if (preset === 'balanced') {
      const updated = {
        ...settings,
        ml_sensitivity: 'balanced' as const,
        auto_analyze: true,
        show_confidence: true,
        notifications: true,
      }
      setSettings(updated)
      saveToStorage(updated)
      showFeedback('Applied preset: Balanced', 'success')
      return
    }

    const updated = {
      ...settings,
      ml_sensitivity: 'relaxed' as const,
      auto_analyze: false,
      show_confidence: false,
      notifications: false,
    }
    setSettings(updated)
    saveToStorage(updated)
    showFeedback('Applied preset: Quiet Mode', 'success')
  }

    const exportData = () => {
    const data = exportAllData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `phishguard-data-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center text-white">Loading settings...</div>
        </div>
      </MainLayout>
    )
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Palette },
    { id: 'ml', label: 'ML Detection', icon: Brain },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'account', label: 'Account', icon: User },
    { id: 'data', label: 'Data', icon: Database }
  ] as const

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header with gradient */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-3xl -z-10"></div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Settings
          </h1>
          <p className="text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            All changes save automatically
          </p>
        </div>

        {/* Profile Banner */}
        {user && (
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-slate-800/80 via-slate-800/60 to-slate-800/80 border border-slate-700/60 flex items-center gap-5">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg">
              <span className="text-2xl font-bold text-white">
                {user.name?.charAt(0).toUpperCase() ?? '?'}
              </span>
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-xl truncate">{user.name}</div>
              <div className="text-slate-400 text-sm truncate">{user.email}</div>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-medium">Level {user.level}</span>
                <span className="text-xs text-slate-400">{user.xp.toLocaleString()} XP</span>
                {user.streak > 0 && (
                  <span className="text-xs text-orange-300">🔥 {user.streak} day streak</span>
                )}
              </div>
            </div>
            {/* Quick link to account tab */}
            <button
              onClick={() => setActiveTab('account')}
              className="text-xs text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700/50 transition whitespace-nowrap flex-shrink-0"
            >
              Edit Profile
            </button>
          </div>
        )}

        {/* Enhanced tabs with icons */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/50 scale-105'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white hover:scale-102'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {activeTab === 'general' && (
          <div className="space-y-6">
            <Card>
              <CardContent>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-blue-400" />
                  Interface
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                    <div>
                      <div className="text-white font-medium">Display Reset</div>
                      <div className="text-sm text-slate-400">Restore default size and motion settings</div>
                    </div>
                    <Button variant="secondary" size="sm" onClick={resetDisplaySettings}>
                      Reset View
                    </Button>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-3 font-medium">Font Size</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'small', label: 'Compact' },
                        { value: 'medium', label: 'Comfort' },
                        { value: 'large', label: 'Readable' }
                      ].map(size => (
                        <button
                          key={size.value}
                          onClick={() => updateSetting('font_size', size.value as 'small' | 'medium' | 'large')}
                          className={`p-3 rounded-lg border-2 transition ${
                            settings.font_size === size.value
                              ? 'border-blue-500 bg-blue-500/10 text-blue-200'
                              : 'border-slate-700 bg-slate-800/30 text-slate-200 hover:border-slate-600'
                          }`}
                        >
                          {size.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                    <div>
                      <div className="text-white font-medium">Compact Layout</div>
                      <div className="text-sm text-slate-400">Reduce spacing for better screen fit</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!settings.compact_layout}
                        onChange={(e) => updateSetting('compact_layout', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                    <div>
                      <div className="text-white font-medium">Keyboard Shortcuts</div>
                      <div className="text-sm text-slate-400">Enable quick actions with the keyboard</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!settings.keyboard_shortcuts}
                        onChange={(e) => updateSetting('keyboard_shortcuts', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                    <div>
                      <div className="text-white font-medium">Analysis Macros</div>
                      <div className="text-sm text-slate-400">Enable one-tap phishing analysis templates in Analyze (Alt+1/2/3/4)</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.analysis_macros_enabled !== false}
                        onChange={(e) => updateSetting('analysis_macros_enabled', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>

                  <div className="text-xs text-slate-500">
                    Dark theme is currently enabled to keep visual contrast and focus consistent.
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-400" />
                  Account Security (MFA)
                  {mfaStatus?.mfa_enabled ? (
                    <Badge variant="success">Enabled</Badge>
                  ) : (
                    <Badge variant="warning">Off</Badge>
                  )}
                </h3>

                {!token && (
                  <Alert variant="info">
                    Login to manage MFA for your account.
                  </Alert>
                )}

                {token && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                      <span className="font-medium">Status:</span>
                      <span className={mfaStatus?.mfa_enabled ? 'text-emerald-300' : 'text-slate-400'}>
                        {mfaStatus?.mfa_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      {mfaStatus && mfaStatus.backup_codes_remaining !== undefined && (
                        <span className="text-slate-400">Backup codes left: {mfaStatus.backup_codes_remaining}</span>
                      )}
                      <Button size="sm" variant="secondary" onClick={fetchMfaStatus} disabled={mfaLoading}>
                        Refresh
                      </Button>
                    </div>

                    {!mfaStatus?.mfa_enabled && (
                      <div className="space-y-3 p-4 rounded-lg bg-slate-800/40 border border-slate-700">
                        <p className="text-sm text-slate-300">Protect your account with a 6-digit code from an authenticator app.</p>
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={startMfaSetup} disabled={mfaLoading}>
                            {mfaLoading ? 'Starting...' : 'Enable MFA'}
                          </Button>
                        </div>

                        {mfaSetup && (
                          <div className="space-y-3 mt-3">
                            <div className="flex gap-4 items-center flex-wrap">
                              <img src={mfaSetup.qr_code} alt="MFA QR" className="w-32 h-32 rounded border border-slate-700" />
                              <div className="text-xs text-slate-400 break-all">
                                <div className="font-semibold text-slate-200">Secret:</div>
                                <div>{mfaSetup.secret}</div>
                              </div>
                            </div>
                            <div className="text-xs text-slate-300">
                              Backup codes (store safely):
                              <div className="mt-2 grid grid-cols-2 gap-2 text-slate-200">
                                {mfaSetup.backup_codes.map(code => (
                                  <div key={code} className="px-3 py-2 rounded bg-slate-900/70 border border-slate-700 text-center font-mono text-sm">{code}</div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-200 mb-2">Enter 6-digit code to activate</label>
                              <div className="flex gap-2 flex-wrap">
                                <input
                                  type="text"
                                  value={mfaCode}
                                  onChange={(e) => setMfaCode(e.target.value)}
                                  maxLength={6}
                                  className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                                  placeholder="123456"
                                />
                                <Button onClick={verifyMfaSetup} disabled={mfaLoading || !mfaCode}>
                                  {mfaLoading ? 'Verifying...' : 'Verify & Enable'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {mfaStatus?.mfa_enabled && (
                      <div className="space-y-3 p-4 rounded-lg bg-slate-800/40 border border-slate-700">
                        <p className="text-sm text-slate-300">MFA is active. Use a backup code if you lose your device. To turn off, confirm with your password.</p>
                        <div>
                          <label className="block text-sm font-medium text-slate-200 mb-2">Password</label>
                          <input
                            type="password"
                            value={mfaPassword}
                            onChange={(e) => setMfaPassword(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-rose-500"
                            placeholder="••••••••"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" onClick={disableMfa} disabled={mfaLoading || !mfaPassword}>
                            {mfaLoading ? 'Disabling...' : 'Disable MFA'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  Learning Preferences
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-300 mb-3 font-medium">Default Challenge Difficulty</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'easy', label: 'Easy' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'hard', label: 'Hard' }
                      ].map(level => (
                        <button
                          key={level.value}
                          onClick={() => updateSetting('difficulty_preference', level.value)}
                          className={`px-4 py-3 rounded-lg font-medium border-2 transition ${
                            settings.difficulty_preference === level.value
                              ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                              : 'border-slate-700 bg-slate-800/30 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          {level.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                    <div>
                      <div className="text-white font-medium">Auto-save Progress</div>
                      <div className="text-sm text-slate-400">Automatically save your progress</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.auto_save}
                        onChange={(e) => updateSetting('auto_save', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-400" />
                  Accessibility
                </h3>
                
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg cursor-pointer hover:bg-slate-800/50 transition">
                    <div>
                      <div className="text-white font-medium">Reduced Motion</div>
                      <div className="text-sm text-slate-400">Minimize animations</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.reduced_motion}
                      onChange={(e) => updateSetting('reduced_motion', e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg cursor-pointer hover:bg-slate-800/50 transition">
                    <div>
                      <div className="text-white font-medium">Sound Effects</div>
                      <div className="text-sm text-slate-400">Play audio feedback</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.sound_effects}
                      onChange={(e) => updateSetting('sound_effects', e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'ml' && (
          <div className="space-y-6">
            {/* Friendly intro banner */}
            <div className="bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-cyan-500/20 border border-purple-500/30 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="text-4xl">🛡️</div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Smart Protection Settings</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Tune how aggressively PhishGuard warns you, choose what details to show,
                    and set trusted domains to reduce noise while keeping protection strong.
                  </p>
                </div>
              </div>
            </div>

            <Card>
              <CardContent>
                <h3 className="text-lg font-bold text-white mb-2">Quick Presets</h3>
                <p className="text-sm text-slate-400 mb-4">Apply a ready-to-use setup in one click.</p>
                <div className="grid md:grid-cols-3 gap-3">
                  <button
                    onClick={() => applyProtectionPreset('security-first')}
                    className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-left hover:bg-red-500/20 transition"
                  >
                    <div className="text-white font-medium">Security First</div>
                    <div className="text-xs text-slate-300 mt-1">Strict detection and full visibility.</div>
                  </button>
                  <button
                    onClick={() => applyProtectionPreset('balanced')}
                    className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/10 text-left hover:bg-blue-500/20 transition"
                  >
                    <div className="text-white font-medium">Balanced</div>
                    <div className="text-xs text-slate-300 mt-1">Recommended default for daily use.</div>
                  </button>
                  <button
                    onClick={() => applyProtectionPreset('quiet')}
                    className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-left hover:bg-emerald-500/20 transition"
                  >
                    <div className="text-white font-medium">Quiet Mode</div>
                    <div className="text-xs text-slate-300 mt-1">Fewer alerts and fewer interruptions.</div>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* How Sensitive Should Protection Be? */}
            <Card>
              <CardContent>
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-400" />
                    Detection Sensitivity
                  </h3>
                  <p className="text-sm text-slate-400">
                    Choose how much evidence is required before a warning is shown.
                  </p>
                </div>
                
                <div className="space-y-3">
                  {[
                    { 
                      value: 'strict', 
                      label: 'Strict', 
                      emoji: '🚨',
                      title: 'Strict',
                      desc: 'Best if you prefer early warnings.',
                      example: 'More alerts, including borderline cases.',
                      threshold: 'Warn at 50% estimated phishing risk'
                    },
                    { 
                      value: 'balanced', 
                      label: 'Balanced (Recommended)', 
                      emoji: '✅',
                      title: 'Balanced',
                      desc: 'Best default for most users.',
                      example: 'Good phishing coverage with fewer false alarms.',
                      threshold: 'Warn at 65% estimated phishing risk'
                    },
                    { 
                      value: 'relaxed', 
                      label: 'Relaxed', 
                      emoji: '😊',
                      title: 'Relaxed',
                      desc: 'Fewer warnings, only stronger signals.',
                      example: 'Useful if you are comfortable reviewing alerts manually.',
                      threshold: 'Warn at 75% estimated phishing risk'
                    }
                  ].map(level => (
                    <button
                      key={level.value}
                      onClick={() => {
                        updateSetting('ml_sensitivity', level.value as "strict" | "balanced" | "relaxed")
                        setToastMessage(`Detection mode set to ${level.title}.`)
                        setShowToast(true)
                      }}
                      className={`w-full p-4 rounded-lg border-2 transition text-left ${
                        settings.ml_sensitivity === level.value
                          ? 'border-purple-500 bg-purple-500/10 shadow-lg'
                          : 'border-slate-700 bg-slate-800/30 hover:border-purple-400 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{level.emoji}</div>
                        <div className="flex-1">
                          <div className="text-white font-medium mb-1 flex items-center gap-2">
                            {level.title}
                            {settings.ml_sensitivity === level.value && (
                              <Badge variant="success">Active</Badge>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mb-2">{level.desc}</div>
                          <div className="text-xs text-slate-500 italic">Example: {level.example}</div>
                          <div className="text-xs text-purple-400 mt-2">{level.threshold}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* What does this mean? */}
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="text-sm text-blue-300 font-medium mb-1">How to choose quickly</div>
                  <div className="text-xs text-slate-400 leading-relaxed">
                    Use <strong className="text-white">Strict</strong> if missing a phish is unacceptable,
                    <strong className="text-white"> Balanced</strong> for everyday browsing,
                    and <strong className="text-white"> Relaxed</strong> when you want fewer interruptions.
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Convenience Features */}
            <Card>
              <CardContent>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Convenience Features
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-start justify-between p-4 bg-slate-800/30 rounded-lg">
                    <div className="flex-1 pr-4">
                      <div className="text-white font-medium mb-1">Default Analyze Tab</div>
                      <div className="text-sm text-slate-400">
                        Choose which tab opens first on the Analyze page.
                      </div>
                    </div>
                    <select
                      value={settings.default_analyze_tab || 'screenshot'}
                      onChange={(e) => updateSetting('default_analyze_tab', e.target.value as 'screenshot' | 'email' | 'url')}
                      className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
                    >
                      <option value="screenshot">Screenshot</option>
                      <option value="email">Email</option>
                      <option value="url">URL</option>
                    </select>
                  </div>

                  <div className="flex items-start justify-between p-4 bg-slate-800/30 rounded-lg">
                    <div className="flex-1 pr-4">
                      <div className="text-white font-medium mb-1">Auto-Analyze URLs</div>
                      <div className="text-sm text-slate-400">
                        Start URL checks automatically while you type.
                      </div>
                      <div className="text-xs text-slate-500 mt-2 italic">
                        Faster workflow, slightly higher resource use.
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={settings.auto_analyze}
                        onChange={(e) => updateSetting('auto_analyze', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-purple-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>

                  <div className="flex items-start justify-between p-4 bg-slate-800/30 rounded-lg">
                    <div className="flex-1 pr-4">
                      <div className="text-white font-medium mb-1">Show Confidence Scores</div>
                      <div className="text-sm text-slate-400">
                        Display model certainty for each result.
                      </div>
                      <div className="text-xs text-slate-500 mt-2 italic">
                        Helpful for advanced users and debugging.
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={settings.show_confidence}
                        onChange={(e) => updateSetting('show_confidence', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-purple-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trusted Websites */}
            <Card>
              <CardContent>
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-400" />
                    Trusted Websites
                  </h3>
                  <p className="text-sm text-slate-400">
                    Domains on this list skip phishing warnings.
                  </p>
                </div>

                {/* Why use this */}
                <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="text-sm text-green-300 font-medium mb-1">Good candidates for this list</div>
                  <ul className="text-xs text-slate-400 space-y-1 ml-4 list-disc">
                    <li>Your work or school websites</li>
                    <li>Development/testing sites (like localhost)</li>
                    <li>Personal projects you're building</li>
                    <li>Sites you visit daily that get false warnings</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  {(settings.ml_whitelist || []).map((domain, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg group hover:bg-slate-800/50 transition">
                      <div className="flex items-center gap-3">
                        <div className="text-green-400">✓</div>
                        <code className="text-sm text-slate-300">{domain}</code>
                      </div>
                      <button
                        onClick={() => {
                                                    const newWhitelist = settings.ml_whitelist?.filter((_, i) => i !== index)
                          updateSetting('ml_whitelist', newWhitelist)
                          setToastMessage(`Removed ${domain} from trusted websites.`)
                          setShowToast(true)
                        }}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-sm transition px-3 py-1 rounded hover:bg-red-500/10"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-4">
                  <input
                    type="text"
                    placeholder="example.com (without https://)"
                    value={whitelistInput}
                    onChange={(e) => setWhitelistInput(e.target.value)}
                    className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addTrustedDomain()
                      }
                    }}
                  />
                  <Button 
                    variant="primary"
                    onClick={addTrustedDomain}
                  >
                    Add
                  </Button>
                </div>

                <div className="text-xs text-slate-500 mt-2 italic">
                  Enter only the domain, for example: github.com or localhost:5173
                </div>
              </CardContent>
            </Card>

            {/* How Good Is the Protection? */}
            <Card>
              <CardContent>
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-blue-400" />
                    Model Performance
                  </h3>
                  <p className="text-sm text-slate-400">
                    Snapshot of training and evaluation metrics.
                  </p>
                </div>

                {/* Simple stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="p-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg border border-green-500/30">
                    <div className="text-3xl font-bold text-white mb-1">95.2%</div>
                    <div className="text-sm text-slate-300">Detection Accuracy</div>
                    <div className="text-xs text-slate-500 mt-1">Ensemble model on test set</div>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg border border-blue-500/30">
                    <div className="text-3xl font-bold text-white mb-1">2,274</div>
                    <div className="text-sm text-slate-300">Real Examples</div>
                    <div className="text-xs text-slate-500 mt-1">Learned from real phishing attempts</div>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/30">
                    <div className="text-3xl font-bold text-white mb-1">61+</div>
                    <div className="text-sm text-slate-300">URL Features</div>
                    <div className="text-xs text-slate-500 mt-1">Signals include DNS, age, intel feeds</div>
                  </div>
                </div>

                {/* What we look for */}
                <div className="mt-4 p-4 bg-slate-800/30 rounded-lg">
                  <div className="text-sm font-medium text-white mb-3">What We Check</div>
                  <div className="grid md:grid-cols-2 gap-3 text-xs text-slate-400">
                    <div className="flex items-start gap-2">
                      <div className="text-purple-400">✓</div>
                      <div>
                        <div className="text-white font-medium">Email Server Records</div>
                        <div>Real companies have proper email setup</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="text-purple-400">✓</div>
                      <div>
                        <div className="text-white font-medium">Website Age</div>
                        <div>Suspicious sites are usually brand new</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="text-purple-400">✓</div>
                      <div>
                        <div className="text-white font-medium">Redirects & Tricks</div>
                        <div>Phishing sites often bounce you around</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="text-purple-400">✓</div>
                      <div>
                        <div className="text-white font-medium">Security Certificates</div>
                        <div>Checks if the site has valid HTTPS</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Plain language explanation */}
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="text-sm text-blue-300 font-medium mb-1">Plain-language summary</div>
                  <div className="text-xs text-slate-400 leading-relaxed">
                    The system compares each sample against patterns found in known phishing campaigns.
                    It scores risk from multiple signals, then combines them into a final decision.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            {/* Master switch */}
            <Card>
              <CardContent>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Bell className="w-5 h-5 text-blue-400" />
                      Notifications
                      {settings.notifications
                        ? <Badge variant="success">On</Badge>
                        : <Badge variant="warning">Off</Badge>}
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">Master switch — disabling this silences all notifications below.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={settings.notifications}
                      onChange={(e) => updateSetting('notifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Channels */}
            <Card>
              <CardContent>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-purple-400" />
                  Channels
                </h3>
                <div className="space-y-3">
                  {/* Email */}
                  <div className="flex items-start justify-between p-4 bg-slate-800/30 rounded-lg">
                    <div>
                      <div className="text-white font-medium">Email Alerts</div>
                      <div className="text-sm text-slate-400">Critical threat detections sent to your inbox</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input type="checkbox" checked={settings.email_alerts} onChange={(e) => updateSetting('email_alerts', e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>

                  {/* Priority */}
                  <div className="flex items-start justify-between p-4 bg-slate-800/30 rounded-lg">
                    <div className="flex-1 pr-4">
                      <div className="text-white font-medium mb-1">Notification Priority</div>
                      <div className="text-sm text-slate-400">Controls urgency level of browser alerts</div>
                    </div>
                    <select
                      value={settings.notification_priority ?? 'normal'}
                      onChange={(e) => updateSetting('notification_priority', e.target.value as 'low' | 'normal' | 'high')}
                      className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Browser Permission
                </h3>
                <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div>
                      <div className="text-white font-medium">Notification Access</div>
                      <div className="text-sm text-slate-400">Needed for browser alerts and daily reminders.</div>
                    </div>
                    <Badge variant={notificationPermission === 'granted' ? 'success' : notificationPermission === 'denied' ? 'warning' : 'default'}>
                      {notificationPermission}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="primary" onClick={requestBrowserNotifications}>
                      Request Permission
                    </Button>
                    <Button variant="secondary" onClick={triggerTestNotification}>
                      Send Test Notification
                    </Button>
                  </div>
                  <div className="text-xs text-slate-500 mt-3">
                    {notificationPermission !== 'granted'
                      ? 'Notifications will not appear until browser permission is granted.'
                      : settings.quiet_hours_enabled
                        ? 'Manual test notifications bypass quiet hours. Scheduled reminders do not.'
                        : 'Notifications are ready. Use the test button to verify browser delivery.'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Test clicks recorded: {notificationTestCount}{notificationLastTestAt ? ` (last at ${notificationLastTestAt})` : ''}
                  </div>

                  {notificationPreview && (
                    <div className={`mt-4 rounded-xl p-4 border ${
                      notificationPreview.tone === 'success'
                        ? 'border-emerald-500/30 bg-emerald-500/10'
                        : notificationPreview.tone === 'error'
                          ? 'border-red-500/30 bg-red-500/10'
                          : notificationPreview.tone === 'warning'
                            ? 'border-yellow-500/30 bg-yellow-500/10'
                            : 'border-blue-500/30 bg-blue-500/10'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 text-lg">🔔</div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-white">{notificationPreview.title}</div>
                          <div className="mt-1 text-sm text-slate-300">
                            {notificationPreview.detail}
                          </div>
                          <div className="mt-2 text-xs text-slate-400">This status card is generated by the app and confirms what happened to your test request.</div>
                        </div>
                        <button
                          onClick={() => setNotificationPreview(null)}
                          className="text-slate-400 hover:text-white text-sm"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Notification types */}
            <Card>
              <CardContent>
                <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Notification Types
                </h3>
                <p className="text-sm text-slate-400 mb-4">Choose which events trigger a notification.</p>
                <div className="space-y-3">
                  <div className="flex items-start justify-between p-4 bg-slate-800/30 rounded-lg">
                    <div>
                      <div className="text-white font-medium">🚨 Threat Detected</div>
                      <div className="text-sm text-slate-400">Alert when a phishing attempt is found</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input type="checkbox" checked={settings.threat_detection_alert ?? true} onChange={(e) => updateSetting('threat_detection_alert', e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-red-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>

                  <div className="flex items-start justify-between p-4 bg-slate-800/30 rounded-lg">
                    <div>
                      <div className="text-white font-medium">🎯 Challenge Completed</div>
                      <div className="text-sm text-slate-400">Notify when you finish a training challenge</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input type="checkbox" checked={settings.challenge_complete_alert ?? true} onChange={(e) => updateSetting('challenge_complete_alert', e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-green-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>

                  <div className="flex items-start justify-between p-4 bg-slate-800/30 rounded-lg">
                    <div>
                      <div className="text-white font-medium">🏆 Leaderboard Changes</div>
                      <div className="text-sm text-slate-400">Get notified when your rank changes</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input type="checkbox" checked={settings.leaderboard_alert ?? false} onChange={(e) => updateSetting('leaderboard_alert', e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-yellow-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>

                  <div className="flex items-start justify-between p-4 bg-slate-800/30 rounded-lg">
                    <div>
                      <div className="text-white font-medium">📅 Weekly Report</div>
                      <div className="text-sm text-slate-400">A summary of your weekly progress</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input type="checkbox" checked={settings.weekly_report ?? false} onChange={(e) => updateSetting('weekly_report', e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reminders */}
            <Card>
              <CardContent>
                <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-400" />
                  Reminders
                </h3>
                <p className="text-sm text-slate-400 mb-4">Keep your streak alive with scheduled reminders.</p>
                <div className="space-y-4">
                  <div className="flex items-start justify-between p-4 bg-slate-800/30 rounded-lg">
                    <div>
                      <div className="text-white font-medium">Daily Practice Reminder</div>
                      <div className="text-sm text-slate-400">Nudge to complete at least one challenge daily</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input type="checkbox" checked={settings.daily_reminder ?? true} onChange={(e) => updateSetting('daily_reminder', e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-orange-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>

                  {settings.daily_reminder && (
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-800/20 rounded-lg border border-slate-700/50">
                      <div>
                        <div className="text-sm text-slate-300 font-medium">Reminder Time</div>
                        <div className="text-xs text-slate-500">When should we remind you?</div>
                      </div>
                      <input
                        type="time"
                        value={settings.streak_reminder_time ?? '19:00'}
                        onChange={(e) => updateSetting('streak_reminder_time', e.target.value)}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quiet hours */}
            <Card>
              <CardContent>
                <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-indigo-400" />
                  Quiet Hours (Do Not Disturb)
                </h3>
                <p className="text-sm text-slate-400 mb-4">Suppress all non-critical notifications during these hours.</p>
                <div className="space-y-4">
                  <div className="flex items-start justify-between p-4 bg-slate-800/30 rounded-lg">
                    <div>
                      <div className="text-white font-medium">Enable Quiet Hours</div>
                      <div className="text-sm text-slate-400">Only threat alerts will get through</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input type="checkbox" checked={settings.quiet_hours_enabled ?? false} onChange={(e) => updateSetting('quiet_hours_enabled', e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>

                  {settings.quiet_hours_enabled && (
                    <div className="grid grid-cols-2 gap-3 px-1">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">From</label>
                        <input
                          type="time"
                          value={settings.quiet_hours_start ?? '22:00'}
                          onChange={(e) => updateSetting('quiet_hours_start', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Until</label>
                        <input
                          type="time"
                          value={settings.quiet_hours_end ?? '08:00'}
                          onChange={(e) => updateSetting('quiet_hours_end', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <p className="col-span-2 text-xs text-slate-500 italic">
                        Quiet hours apply to reminders and progress alerts. Threat detections always show.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}


        {activeTab === 'account' && (
          <div className="space-y-6">
            {/* Profile editing */}
            <Card>
              <CardContent>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-400" />
                  Profile
                </h3>

                {!token && (
                  <Alert variant="info">Log in to manage your profile.</Alert>
                )}

                {token && user && (
                  <div className="space-y-4">
                    {/* Avatar + name row */}
                    <div className="flex items-center gap-4 p-4 bg-slate-800/30 rounded-lg">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md">
                        <span className="text-xl font-bold text-white">
                          {user.name?.charAt(0).toUpperCase() ?? '?'}
                        </span>
                      </div>
                      <div>
                        <div className="text-white font-semibold">{user.name}</div>
                        <div className="text-slate-400 text-sm">{user.email}</div>
                        <div className="text-slate-500 text-xs mt-0.5">
                          Member since {new Date(user.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long' })}
                        </div>
                      </div>
                    </div>

                    {/* Edit display name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Display Name</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={displayNameInput}
                          onChange={e => setDisplayNameInput(e.target.value)}
                          maxLength={40}
                          className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm"
                          placeholder="Your display name"
                        />
                        <Button
                          onClick={saveDisplayName}
                          disabled={profileSaving || !displayNameInput.trim() || displayNameInput.trim() === user.name}
                          variant="primary"
                        >
                          {profileSaving ? 'Saving…' : profileSaved ? '✓ Saved' : 'Save'}
                        </Button>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-slate-800/40 rounded-lg text-center border border-slate-700/50">
                        <div className="text-2xl font-bold text-blue-300">{user.level}</div>
                        <div className="text-xs text-slate-400 mt-0.5">Level</div>
                      </div>
                      <div className="p-3 bg-slate-800/40 rounded-lg text-center border border-slate-700/50">
                        <div className="text-2xl font-bold text-purple-300">{user.xp.toLocaleString()}</div>
                        <div className="text-xs text-slate-400 mt-0.5">XP Earned</div>
                      </div>
                      <div className="p-3 bg-slate-800/40 rounded-lg text-center border border-slate-700/50">
                        <div className="text-2xl font-bold text-orange-300">{user.streak}</div>
                        <div className="text-xs text-slate-400 mt-0.5">Day Streak</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Change password */}
            <Card>
              <CardContent>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-purple-400" />
                  Change Password
                </h3>

                {!token ? (
                  <Alert variant="info">Log in to change your password.</Alert>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Current Password</label>
                      <input
                        type="password"
                        value={passwordForm.current}
                        onChange={e => setPasswordForm(f => ({ ...f, current: e.target.value }))}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">New Password</label>
                      <input
                        type="password"
                        value={passwordForm.next}
                        onChange={e => setPasswordForm(f => ({ ...f, next: e.target.value }))}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm"
                        placeholder="At least 8 characters"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        value={passwordForm.confirm}
                        onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm"
                        placeholder="••••••••"
                      />
                    </div>

                    {passwordError && (
                      <Alert variant="error">{passwordError}</Alert>
                    )}

                    <div className="pt-1">
                      <Button
                        onClick={changePassword}
                        disabled={passwordSaving || !passwordForm.current || !passwordForm.next || !passwordForm.confirm}
                        variant="primary"
                      >
                        {passwordSaving ? 'Changing…' : 'Change Password'}
                      </Button>
                    </div>

                    <div className="text-xs text-slate-500">
                      Use a strong password with uppercase, numbers, and symbols for best security.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Session info */}
            <Card>
              <CardContent>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-cyan-400" />
                  Session Info
                </h3>
                <div className="space-y-2 text-sm text-slate-300">
                  <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                    <span className="text-slate-400">Status</span>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      Active session
                    </span>
                  </div>
                  {user && (
                    <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                      <span className="text-slate-400">User ID</span>
                      <code className="text-xs text-slate-300">{user.user_id}</code>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                    <span className="text-slate-400">Authentication</span>
                    <span className="flex items-center gap-2">
                      {mfaStatus?.mfa_enabled ? (
                        <><CheckCircle2 className="w-4 h-4 text-green-400" /><span className="text-green-300 text-xs">MFA active</span></>
                      ) : (
                        <span className="text-yellow-300 text-xs">Password only</span>
                      )}
                    </span>
                  </div>
                  <div className="mt-3">
                    <Button variant="secondary" onClick={() => { logout(); navigate('/login') }} fullWidth>
                      <span className="flex items-center justify-center gap-2"><LogOut className="w-4 h-4" /> Sign Out</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}


        {activeTab === 'data' && (
          <div className="space-y-6">
            {/* Storage usage */}
            <Card>
              <CardContent>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-cyan-400" />
                  Local Storage Usage
                </h3>
                {storageUsage ? (
                  <div>
                    <div className="flex items-end justify-between mb-2">
                      <span className="text-sm text-slate-400">
                        {(storageUsage.used / 1024).toFixed(1)} KB used of&nbsp;
                        {(storageUsage.quota / 1024 / 1024).toFixed(0)} MB
                      </span>
                      <span className="text-xs text-slate-500">
                        {((storageUsage.used / storageUsage.quota) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
                        style={{ width: `${Math.min((storageUsage.used / storageUsage.quota) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Stores your settings, progress, and cached analyses.</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Storage estimate unavailable.</p>
                )}
              </CardContent>
            </Card>

            {/* Export / Import */}
            <Card>
              <CardContent>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-400" />
                  Backup &amp; Restore
                </h3>

                <div className="space-y-4">
                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="flex items-start gap-3 mb-3">
                      <Download className="w-5 h-5 text-blue-400 mt-0.5" />
                      <div>
                        <div className="text-white font-medium mb-0.5">Export Your Data</div>
                        <div className="text-sm text-slate-400">Download all settings, progress, and analyses as JSON</div>
                      </div>
                    </div>
                    <Button onClick={exportData} variant="primary" fullWidth>
                      📥 Export Data
                    </Button>
                  </div>

                  <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <div className="flex items-start gap-3 mb-3">
                      <Database className="w-5 h-5 text-purple-400 mt-0.5" />
                      <div>
                        <div className="text-white font-medium mb-0.5">Import Data</div>
                        <div className="text-sm text-slate-400">Restore from a previously exported JSON file</div>
                      </div>
                    </div>
                    <label className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg cursor-pointer transition font-medium text-sm">
                      📂 Choose File to Import
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const reader = new FileReader()
                          reader.onload = (ev) => {
                            try {
                              const parsed = JSON.parse(ev.target?.result as string)
                              if (parsed.settings) {
                                saveToStorage(parsed.settings)
                                setSettings(parsed.settings)
                                estimateStorageUsage()
                                setToastMessage('Data imported successfully.')
                                setShowToast(true)
                              } else {
                                setToastMessage('Invalid file — no settings found.')
                                setShowToast(true)
                              }
                            } catch {
                              setToastMessage('Could not read file.')
                              setShowToast(true)
                            }
                          }
                          reader.readAsText(file)
                          // reset so same file can be chosen again
                          e.target.value = ''
                        }}
                      />
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-400" />
                  Privacy &amp; Retention
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start justify-between p-4 bg-slate-800/30 rounded-lg">
                    <div className="flex-1 pr-4">
                      <div className="text-white font-medium mb-1">Save Analysis History</div>
                      <div className="text-sm text-slate-400">Store analyzed URLs, screenshots, and email checks on this device.</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={settings.save_analysis_history ?? true}
                        onChange={(e) => updateSetting('save_analysis_history', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-emerald-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>

                  <div className="flex items-start justify-between p-4 bg-slate-800/30 rounded-lg">
                    <div className="flex-1 pr-4">
                      <div className="text-white font-medium mb-1">Retention Window</div>
                      <div className="text-sm text-slate-400">Automatically discard older analysis history after this many days.</div>
                    </div>
                    <select
                      value={settings.retention_days ?? 90}
                      onChange={(e) => updateSetting('retention_days', Number(e.target.value) as 7 | 30 | 90 | 365)}
                      className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
                    >
                      <option value={7}>7 days</option>
                      <option value={30}>30 days</option>
                      <option value={90}>90 days</option>
                      <option value={365}>1 year</option>
                    </select>
                  </div>

                  <div className="p-4 bg-slate-800/20 rounded-lg border border-slate-700/50">
                    <div className="text-white font-medium mb-1">Clear Analysis History</div>
                    <div className="text-sm text-slate-400 mb-3">Remove all locally stored analysis records without touching your account.</div>
                    <Button variant="secondary" onClick={clearLocalAnalyses}>
                      Clear Local History
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Danger zone */}
            <Card>
              <CardContent>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-orange-400" />
                  Account Actions
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                    <div className="flex items-start gap-3 mb-3">
                      <RotateCcw className="w-5 h-5 text-orange-400 mt-0.5" />
                      <div>
                        <div className="text-white font-medium mb-0.5">Reset Settings</div>
                        <div className="text-sm text-slate-400">Restore all preferences to factory defaults</div>
                      </div>
                    </div>
                    <Button onClick={resetSettings} variant="secondary" fullWidth>
                      Reset to Defaults
                    </Button>
                  </div>

                  <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-lg">
                    <div className="flex items-start gap-3 mb-3">
                      <LogOut className="w-5 h-5 text-slate-300 mt-0.5" />
                      <div>
                        <div className="text-white font-medium mb-0.5">Log Out</div>
                        <div className="text-sm text-slate-400">Sign out of this device</div>
                      </div>
                    </div>
                    <Button onClick={handleLogout} variant="secondary" fullWidth>
                      Log Out
                    </Button>
                  </div>

                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-start gap-3 mb-3">
                      <Trash2 className="w-5 h-5 text-red-400 mt-0.5" />
                      <div>
                        <div className="text-white font-medium mb-0.5">Delete All Data</div>
                        <div className="text-sm text-slate-400">Permanently wipe all local progress, settings, and analyses</div>
                      </div>
                    </div>
                    <div className="mb-3">
                      <Alert variant="warning">
                        ⚠️ This action is irreversible. Export your data first.
                      </Alert>
                    </div>
                    <Button
                      onClick={() => {
                        if (confirm('⚠️ This cannot be undone. Delete all progress, settings, and analyses?')) {
                          resetAllData()
                          window.location.reload()
                        }
                      }}
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                    >
                      🗑️ Delete All Data
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* About */}
            <Card>
              <CardContent>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-slate-400" />
                  About PhishGuard Academy
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                    <span className="text-slate-400">Application</span>
                    <span className="text-white font-medium">PhishGuard Academy</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                    <span className="text-slate-400">Version</span>
                    <span className="text-slate-300 font-mono text-xs">2.0.0</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                    <span className="text-slate-400">ML Model</span>
                    <span className="text-slate-300 text-xs">Ensemble v2 — 95.2% accuracy</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                    <span className="text-slate-400">Purpose</span>
                    <span className="text-slate-300 text-xs">Anti-phishing education &amp; detection</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-700/50">
                    Built as part of a dissertation project at the University of Plymouth.
                    Not for commercial use.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {showToast && (
          <Toast
            message={toastMessage}
            type={toastType}
            onClose={() => setShowToast(false)}
          />
        )}
      </div>

      <LevelUpModal />
    </MainLayout>
  )
}

interface LevelUpData {
  level: number
  title: string
  unlockedFeatures: string[]
}

export function LevelUpModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [levelUpData, setLevelUpData] = useState<LevelUpData | null>(null)

  useEffect(() => {
        const handleLevelUp = (event: Event) => {
      const customEvent = event as CustomEvent
      const data = customEvent.detail as LevelUpData
      setLevelUpData(data)
      setIsOpen(true)

      // Auto-close after 5 seconds
            const timer = setTimeout(() => {
        setIsOpen(false)
      }, 5000)

      return () => clearTimeout(timer)
    }

    window.addEventListener('levelup', handleLevelUp)
    return () => window.removeEventListener('levelup', handleLevelUp)
  }, [])

  return (
    <AnimatePresence>
      {isOpen && levelUpData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="bg-gradient-to-br from-purple-900 via-blue-900 to-cyan-900 rounded-2xl p-8 max-w-sm mx-4 border border-purple-500/50 shadow-2xl"
          >
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Celebration animation */}
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-6xl mb-4 inline-block"
              >
                🎉
              </motion.div>

              <h2 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                <Award className="w-8 h-8 text-yellow-400" />
                Level Up!
                <Sparkles className="w-8 h-8 text-yellow-400" />
              </h2>

              <p className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                Level {levelUpData.level}
              </p>

              <p className="text-2xl text-slate-200 mb-6">{levelUpData.title}</p>

              {levelUpData.unlockedFeatures.length > 0 && (
                <div className="bg-green-500/10 border border-green-500/30 p-3 rounded-lg">
                  <p className="text-sm text-green-300">🎯 New features unlocked!</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {levelUpData.unlockedFeatures.join(', ')}
                  </p>
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(false)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-8 rounded-lg transition"
              >
                Continue Learning 🚀
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
