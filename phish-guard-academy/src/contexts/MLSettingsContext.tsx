/**
 * MLSettingsContext component/module file.
  * This file defines the MLSettingsContext, which provides a way to manage machine learning-related settings (such as sensitivity, whitelist, auto-analyze, and confidence display) in the PhishGuard Academy application.
  *  It allows components to access and update these settings, as well as check if a URL is whitelisted or get the current sensitivity threshold for phishing detection.
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getSettings, saveSettings as saveToStorage } from '../utils/storage'

interface MLSettings {
  ml_sensitivity: 'strict' | 'balanced' | 'relaxed'
  ml_whitelist: string[]
  auto_analyze: boolean
  show_confidence: boolean
}

interface MLSettingsContextType {
  settings: MLSettings
  updateSettings: (updates: Partial<MLSettings>) => void
  isWhitelisted: (url: string) => boolean
  getSensitivityThreshold: () => number
}

const MLSettingsContext = createContext<MLSettingsContextType | undefined>(undefined)

export function MLSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<MLSettings>({
    ml_sensitivity: 'balanced',
    ml_whitelist: ['github.dev', 'localhost', 'codespaces.app', '127.0.0.1'],
    auto_analyze: true,
    show_confidence: true
  })

  useEffect(() => {
    const stored = getSettings()
    setSettings({
      ml_sensitivity: stored.ml_sensitivity || 'balanced',
      ml_whitelist: stored.ml_whitelist || ['github.dev', 'localhost', 'codespaces.app', '127.0.0.1'],
      auto_analyze: stored.auto_analyze !== undefined ? stored.auto_analyze : true,
      show_confidence: stored.show_confidence !== undefined ? stored.show_confidence : true
    })
  }, [])

    const updateSettings = (updates: Partial<MLSettings>) => {
    const newSettings = { ...settings, ...updates }
    setSettings(newSettings)
    saveToStorage(newSettings)
  }

    const isWhitelisted = (url: string): boolean => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      const hostname = urlObj.hostname
      return settings.ml_whitelist.some(domain => 
        hostname.includes(domain) || hostname.endsWith(domain)
      )
    } catch {
      return false
    }
  }

    const getSensitivityThreshold = (): number => {
    switch (settings.ml_sensitivity) {
      case 'strict':
        return 0.5  // Flag if risk > 50%
      case 'relaxed':
        return 0.75 // Flag if risk > 75%
      default:
        return 0.65 // balanced: Flag if risk > 65%
    }
  }

  return (
    <MLSettingsContext.Provider value={{ settings, updateSettings, isWhitelisted, getSensitivityThreshold }}>
      {children}
    </MLSettingsContext.Provider>
  )
}

export function useMLSettings() {
  const context = useContext(MLSettingsContext)
  if (!context) {
    throw new Error('useMLSettings must be used within MLSettingsProvider')
  }
  return context
}
