import { Bell, Shield, Palette, Lock, Database, Download, RotateCcw, Trash2, Eye, Key, Brain, Zap, Award, Sparkles, X, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MainLayout } from '../components/layout/MainLayout'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Toast } from '../components/ui/Toast'
import { getSettings, saveSettings as saveToStorage, resetSettings as resetToDefaults, exportAllData, resetAllData } from '../utils/storage'
import { applyCompactLayout, applyFontSize } from '../utils/settingsEffects'
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
}

export default function SettingsPage() {
  const { token, logout } = useAuth()
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
    font_size: 'medium',
    default_analyze_tab: 'screenshot',
    compact_layout: false
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'ml' | 'data'>('general')
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [mfaStatus, setMfaStatus] = useState<{ mfa_enabled: boolean; backup_codes_remaining: number; setup_complete: boolean } | null>(null)
  const [mfaSetup, setMfaSetup] = useState<{ qr_code: string; secret: string; backup_codes: string[] } | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaPassword, setMfaPassword] = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)
  const [whitelistInput, setWhitelistInput] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    if (token) {
      void fetchMfaStatus()
    }
  }, [token])

  const fetchSettings = async () => {
    try {
      const data = getSettings() as Settings
      setSettings(data)
    } catch (err) {
      console.error('Failed to fetch settings:', err)
    } finally {
      setLoading(false)
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
      setToastMessage('Scan the QR with your authenticator app')
      setShowToast(true)
    } catch (err) {
      console.error(err)
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
      setToastMessage('MFA enabled successfully')
      setShowToast(true)
      setMfaSetup(null)
      setMfaCode('')
      await fetchMfaStatus()
    } catch (err) {
      console.error(err)
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
      setToastMessage('MFA disabled')
      setShowToast(true)
      setMfaStatus({ mfa_enabled: false, backup_codes_remaining: 0, setup_complete: false })
      setMfaSetup(null)
      setMfaPassword('')
      setMfaCode('')
    } catch (err) {
      console.error(err)
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
      setToastMessage(`Difficulty preference set to ${value}.`)
      setShowToast(true)
    }
  }

  const resetSettings = async () => {
    if (confirm('Reset all settings to defaults?')) {
      try {
        const defaults = resetToDefaults()
        setSettings(defaults)
      } catch (err) {
        console.error('Failed to reset:', err)
      }
    }
  }

  const resetDisplaySettings = () => {
    updateSetting('font_size', 'medium')
    updateSetting('reduced_motion', false)
    updateSetting('compact_layout', false)
    setToastMessage('Display settings reset to default view.')
    setShowToast(true)
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
      setToastMessage('Enter a domain before adding it.')
      setShowToast(true)
      return
    }

    if (!isValidTrustedDomain(domain)) {
      setToastMessage('Use a valid domain (example.com) or localhost.')
      setShowToast(true)
      return
    }

    if (settings.ml_whitelist?.includes(domain)) {
      setToastMessage(`${domain} is already in your trusted list.`)
      setShowToast(true)
      return
    }

    updateSetting('ml_whitelist', [...(settings.ml_whitelist || []), domain])
    setWhitelistInput('')
    setToastMessage(`Added ${domain} to trusted websites.`)
    setShowToast(true)
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
      setToastMessage('Applied preset: Security First')
      setShowToast(true)
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
      setToastMessage('Applied preset: Balanced')
      setShowToast(true)
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
    setToastMessage('Applied preset: Quiet Mode')
    setShowToast(true)
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
            <Card>
              <CardContent>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-400" />
                  Notification Preferences
                </h3>
                
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg cursor-pointer hover:bg-slate-800/50 transition">
                    <div>
                      <div className="text-white font-medium">Push Notifications</div>
                      <div className="text-sm text-slate-400">Get browser notifications</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications}
                      onChange={(e) => updateSetting('notifications', e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg cursor-pointer hover:bg-slate-800/50 transition">
                    <div>
                      <div className="text-white font-medium">Email Alerts</div>
                      <div className="text-sm text-slate-400">Receive email notifications</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.email_alerts}
                      onChange={(e) => updateSetting('email_alerts', e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg cursor-pointer hover:bg-slate-800/50 transition">
                    <div>
                      <div className="text-white font-medium">Daily Reminder</div>
                      <div className="text-sm text-slate-400">Daily practice reminders</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.daily_reminder}
                      onChange={(e) => updateSetting('daily_reminder', e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg cursor-pointer hover:bg-slate-800/50 transition">
                    <div>
                      <div className="text-white font-medium">Weekly Report</div>
                      <div className="text-sm text-slate-400">Weekly progress summary</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.weekly_report}
                      onChange={(e) => updateSetting('weekly_report', e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                  </label>
                </div>
              </CardContent>
            </Card>

            <Alert variant="info">
              💡 Notifications help you stay on track with your learning goals.
            </Alert>
          </div>
        )}


        {activeTab === 'data' && (
          <div className="space-y-6">
            <Card>
              <CardContent>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-400" />
                  Data Management
                </h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="flex items-start gap-3 mb-3">
                      <Download className="w-5 h-5 text-blue-400 mt-1" />
                      <div>
                        <div className="text-white font-medium mb-1">Export Your Data</div>
                        <div className="text-sm text-slate-400">Download all settings and progress</div>
                      </div>
                    </div>
                    <Button onClick={exportData} variant="primary" fullWidth>
                      📥 Export Data
                    </Button>
                  </div>

                  <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                    <div className="flex items-start gap-3 mb-3">
                      <RotateCcw className="w-5 h-5 text-orange-400 mt-1" />
                      <div>
                        <div className="text-white font-medium mb-1">Reset Settings</div>
                        <div className="text-sm text-slate-400">Restore defaults</div>
                      </div>
                    </div>
                    <Button onClick={resetSettings} variant="secondary" fullWidth>
                      Reset to Defaults
                    </Button>
                  </div>

                  <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-lg">
                    <div className="flex items-start gap-3 mb-3">
                      <LogOut className="w-5 h-5 text-slate-300 mt-1" />
                      <div>
                        <div className="text-white font-medium mb-1">Log Out</div>
                        <div className="text-sm text-slate-400">Sign out of this device</div>
                      </div>
                    </div>
                    <Button onClick={handleLogout} variant="secondary" fullWidth>
                      Log Out
                    </Button>
                  </div>

                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-start gap-3 mb-3">
                      <Trash2 className="w-5 h-5 text-red-400 mt-1" />
                      <div>
                        <div className="text-white font-medium mb-1">Delete All Data</div>
                        <div className="text-sm text-slate-400">Permanently remove all data</div>
                      </div>
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

            <Alert variant="warning">
              ⚠️ Data deletion is permanent. Export first if needed.
            </Alert>
          </div>
        )}
        
        {showToast && (
          <Toast
            message={toastMessage}
            type="success"
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
