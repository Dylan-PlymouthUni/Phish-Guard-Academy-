import { Bell, Shield, Palette, Lock, HardDrive, RotateCcw, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { MainLayout } from '../components/layout/MainLayout'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { useApi } from '../hooks/useApi'
import { UserSettings } from '../types'

export default function SettingsPage() {
  const { data: initialSettings, loading } = useApi<UserSettings>('/api/settings')
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialSettings) setSettings(initialSettings)
  }, [initialSettings])

  const saveSettings = async () => {
    if (!settings) return
    try {
      setError(null)
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        setError(`Failed to save (${res.status})`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    if (settings) setSettings({ ...settings, [key]: value })
  }

  const resetSettings = () => {
    if (confirm('Reset all settings to defaults?')) {
      fetch('/api/settings/reset', { method: 'POST' }).then(() => {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      })
    }
  }

  const exportData = () => {
    window.location.href = '/api/export-data'
  }

  if (loading || !settings) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto px-4 py-12">
          <Card>
            <CardContent className="text-center">Loading settings...</CardContent>
          </Card>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-white mb-2">Settings</h1>
          <p className="text-slate-400">Customize your experience</p>
        </div>

        {saved && (
          <Alert variant="success" className="mb-6">✓ Settings saved</Alert>
        )}
        {error && (
          <Alert variant="error" className="mb-6">{error}</Alert>
        )}

        {/* Appearance */}
        <Card className="mb-6">
          <CardContent>
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
                  <option value="dark">Dark</option>
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
          </CardContent>
        </Card>

        {/* Learning */}
        <Card className="mb-6">
          <CardContent>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              Learning
            </h2>
            <div>
              <label className="block text-slate-300 mb-3 font-medium">Challenge Difficulty</label>
              <div className="grid grid-cols-3 gap-3">
                {(['beginner', 'intermediate', 'advanced'] as const).map(level => (
                  <button
                    key={level}
                    onClick={() => updateSetting('difficulty_level', level)}
                    className={`px-4 py-3 rounded-lg font-medium transition ${
                      settings.difficulty_level === level
                        ? 'bg-blue-600 text-white border border-blue-500'
                        : 'bg-slate-700 text-slate-300 border border-slate-600'
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="mb-6">
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card className="mb-6">
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Data */}
        <Card className="mb-6">
          <CardContent>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-blue-400" />
              Data & Export
            </h2>
            <div className="space-y-3">
              <Button onClick={exportData} variant="primary" fullWidth>
                📥 Export My Data
              </Button>
              <Button onClick={resetSettings} variant="secondary" fullWidth>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Defaults
              </Button>
            </div>
          </CardContent>
        </Card>

        <Button onClick={saveSettings} variant="success" size="lg" fullWidth>
          Save Settings
        </Button>
      </div>
    </MainLayout>
  )
}
