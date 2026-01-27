/**
 * Keyboard Shortcuts Handler for PhishGuard Academy
 */

import { getSettings } from './storage'

export interface Shortcut {
  key: string
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  description: string
  action: () => void
}

const shortcuts: Map<string, Shortcut> = new Map()

export const registerShortcut = (id: string, shortcut: Shortcut) => {
  shortcuts.set(id, shortcut)
}

export const unregisterShortcut = (id: string) => {
  shortcuts.delete(id)
}

export const initKeyboardShortcuts = () => {
  document.addEventListener('keydown', handleKeyPress)
}

export const cleanupKeyboardShortcuts = () => {
  document.removeEventListener('keydown', handleKeyPress)
}

const handleKeyPress = (event: KeyboardEvent) => {
  const settings = getSettings()
  if (!settings.keyboard_shortcuts) return

  // Don't trigger in input fields
  if (
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement ||
    event.target instanceof HTMLSelectElement
  ) {
    return
  }

  for (const [_, shortcut] of shortcuts) {
    const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey
    const altMatch = shortcut.alt ? event.altKey : !event.altKey
    const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey
    const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()

    if (ctrlMatch && altMatch && shiftMatch && keyMatch) {
      event.preventDefault()
      shortcut.action()
      break
    }
  }
}

// Common shortcuts
export const setupCommonShortcuts = (navigate: (path: string) => void) => {
  registerShortcut('search', {
    key: 'k',
    ctrl: true,
    description: 'Open search',
    action: () => {
      const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement
      searchInput?.focus()
    }
  })

  registerShortcut('dashboard', {
    key: 'd',
    ctrl: true,
    description: 'Go to dashboard',
    action: () => navigate('/dashboard')
  })

  registerShortcut('analyze', {
    key: 'a',
    ctrl: true,
    description: 'Go to analyze',
    action: () => navigate('/analyze')
  })

  registerShortcut('challenges', {
    key: 'c',
    ctrl: true,
    description: 'Go to challenges',
    action: () => navigate('/challenges')
  })

  registerShortcut('settings', {
    key: ',',
    ctrl: true,
    description: 'Open settings',
    action: () => navigate('/settings')
  })

  registerShortcut('help', {
    key: '?',
    shift: true,
    description: 'Show keyboard shortcuts',
    action: () => showShortcutsHelp()
  })
}

export const showShortcutsHelp = () => {
  const modal = document.createElement('div')
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50'
  modal.innerHTML = `
    <div class="bg-slate-800 rounded-lg p-6 max-w-md mx-4 border border-slate-700">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-bold text-white">⌨️ Keyboard Shortcuts</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-slate-400 hover:text-white">✕</button>
      </div>
      <div class="space-y-2 text-sm">
        ${Array.from(shortcuts.values()).map(s => `
          <div class="flex items-center justify-between p-2 bg-slate-700/50 rounded">
            <span class="text-slate-300">${s.description}</span>
            <kbd class="px-2 py-1 bg-slate-900 rounded text-slate-400 font-mono text-xs">
              ${s.ctrl ? 'Ctrl+' : ''}${s.alt ? 'Alt+' : ''}${s.shift ? 'Shift+' : ''}${s.key.toUpperCase()}
            </kbd>
          </div>
        `).join('')}
      </div>
    </div>
  `
  document.body.appendChild(modal)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove()
  })
}
