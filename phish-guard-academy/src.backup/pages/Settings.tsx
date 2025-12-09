import { Settings, Bell, Shield, Palette, Lock, HardDrive, RotateCcw, LogOut, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

interface UserSettings {
  theme: string
  notifications_enabled: boolean
  email_notifications: boolean
  difficulty_level: string
  language: string
  privacy_mode: boolean
  auto_save_enabled: boolean
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setError(null)
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      } else {
        setError(`Failed to load settings (${res.status})`)
      }
    } catch (err) {
      setError(`Error: ${err}`)
      console.error('Failed to fetch settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!settings) return
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        setError(`Failed to save (${res.status})`)
      }
    } catch (err) {
      setError(`Error: ${err}`)
    }
  }

  const updateSetting = (key: keyof UserSettings, value: any) => {
    if (settings) {
      setSettings({ ...settings, [key]: value })
    }
  }

  const resetSettings = () => {
    if (confirm('Reset all settings to defaults?')) {
      fetch('/api/settings/reset', { method: 'POST' }).then(() => {
        fetchSettings()
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      })
    }
  }

  const exportData = () => {
    window.location.href = '/api/export-data'
  }

  if (loading) {
    return (
      <div className="w-full px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-8 backdrop-blur-xl text-center">
            <p className="text-slate-300">Loading settings...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="w-full px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 backdrop-blur-xl">
            <p className="text-red-400 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Failed to load settings
            </p>
            <button
              onClick={fetchSettings}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-white mb-2">Settings</h1>
          <p className="text-slate-400">Customize your PhishGuard experience</p>
        </div>

        {saved && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 flex items-center gap-2 animate-pulse">
            <span>✓</span>
            <span>Settings saved successfully</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Appearance */}
        <div className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-6 backdrop-blur-xl mb-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Palette className="w-5 h-5 text-blue-400" />
            Appearance
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 mb-2 font-medium">Theme</label>
              <select
                value={settings.theme}
                onChange={(e) => updateSetting('theme', e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                <option value="dark">Dark (Default)</option>
                <option value="light">Light</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-2 font-medium">Language</label>
              <select
                value={settings.language}
                onChange={(e) => updateSetting('language', e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
              </select>
            </div>
          </div>
        </div>

        {/* Learning */}
        <div className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-6 backdrop-blur-xl mb-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            Learning
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 mb-3 font-medium">Challenge Difficulty</label>
              <div className="grid grid-cols-3 gap-3">
                {['beginner', 'intermediate', 'advanced'].map(level => (
                  <button
                    key={level}
                    onClick={() => updateSetting('difficulty_level', level)}
                    className={`px-4 py-3 rounded-lg font-medium transition ${
                      settings.difficulty_level === level
                        ? 'bg-blue-600 text-white border border-blue-500'
                        : 'bg-slate-700 text-slate-300 border border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer mt-4">
              <input
                type="checkbox"
                checked={settings.auto_save_enabled}
                onChange={(e) => updateSetting('auto_save_enabled', e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-slate-300">Auto-save progress</span>
            </label>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-6 backdrop-blur-xl mb-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-400" />
            Notifications
          </h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications_enabled}
                onChange={(e) => updateSetting('notifications_enabled', e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-slate-300">Enable notifications</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.email_notifications}
                onChange={(e) => updateSetting('email_notifications', e.target.checked)}
                disabled={!settings.notifications_enabled}
                className="w-4 h-4 rounded disabled:opacity-50"
              />
              <span className={settings.notifications_enabled ? 'text-slate-300' : 'text-slate-500'}>
                Email notifications
              </span>
            </label>
          </div>
        </div>

        {/* Privacy */}
        <div className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-6 backdrop-blur-xl mb-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-400" />
            Privacy
          </h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.privacy_mode}
              onChange={(e) => updateSetting('privacy_mode', e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <div>
              <span className="text-slate-300 block">Privacy Mode</span>
              <span className="text-xs text-slate-500">Don't store analysis history</span>
            </div>
          </label>
        </div>

        {/* Data Management */}
        <div className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-6 backdrop-blur-xl mb-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-400" />
            Data & Export
          </h2>
          <div className="space-y-3">
            <button
              onClick={exportData}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
            >
              📥 Export My Data (JSON)
            </button>
            <button
              onClick={resetSettings}
              className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </button>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={saveSettings}
          className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition flex items-center justify-center gap-2 text-lg"
        >
          <Settings className="w-5 h-5" />
          Save Settings
        </button>
      </div>
    </div>
  )
}
