/**
 * NotificationContext component/module file.
  * This file defines the NotificationContext, which provides a way to show temporary notification messages (such as success, error, info, and warning) in the PhishGuard Academy application.
 */

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  duration?: number
}

interface NotificationContextType {
  showNotification: (type: Notification['type'], message: string, duration?: number) => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) throw new Error('useNotifications must be used within NotificationProvider')
  return context
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

    const showNotification = useCallback((type: Notification['type'], message: string, duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9)
    const notification: Notification = { id, type, message, duration }
    
    setNotifications(prev => [...prev, notification])
    
    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id))
      }, duration)
    }
  }, [])

    const success = useCallback((message: string, duration?: number) => {
    showNotification('success', message, duration)
  }, [showNotification])

    const error = useCallback((message: string, duration?: number) => {
    showNotification('error', message, duration)
  }, [showNotification])

    const info = useCallback((message: string, duration?: number) => {
    showNotification('info', message, duration)
  }, [showNotification])

    const warning = useCallback((message: string, duration?: number) => {
    showNotification('warning', message, duration)
  }, [showNotification])

    const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  useEffect(() => {
        const handler = (event: Event) => {
      const payload = (event as CustomEvent).detail as {
        type?: Notification['type']
        message?: string
        duration?: number
      }

      if (!payload?.message) return
      showNotification(payload.type || 'info', payload.message, payload.duration || 5000)
    }

    window.addEventListener('phishguard:notify', handler)
    return () => window.removeEventListener('phishguard:notify', handler)
  }, [showNotification])

    const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5" />
      case 'error': return <AlertCircle className="w-5 h-5" />
      case 'warning': return <AlertTriangle className="w-5 h-5" />
      case 'info': return <Info className="w-5 h-5" />
    }
  }

    const getColors = (type: Notification['type']) => {
    switch (type) {
      case 'success': return 'bg-green-500/20 border-green-500/50 text-green-400'
      case 'error': return 'bg-red-500/20 border-red-500/50 text-red-400'
      case 'warning': return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
      case 'info': return 'bg-blue-500/20 border-blue-500/50 text-blue-400'
    }
  }

  return (
    <NotificationContext.Provider value={{ showNotification, success, error, info, warning }}>
      {children}
      
      {/* Notification Container */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-md">
        <AnimatePresence>
          {notifications.map(notification => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              className={`flex items-start gap-3 p-4 rounded-lg border backdrop-blur-xl shadow-2xl ${getColors(notification.type)}`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(notification.type)}
              </div>
              <p className="flex-1 text-sm font-medium text-white">
                {notification.message}
              </p>
              <button
                onClick={() => removeNotification(notification.id)}
                className="flex-shrink-0 text-white/60 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  )
}
