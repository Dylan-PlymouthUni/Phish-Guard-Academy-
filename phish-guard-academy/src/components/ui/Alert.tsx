/**
 * Alert component/module file.
  * This file defines the Alert component, which is a reusable UI component for displaying different types of alert messages (info, success, warning, error) in the PhishGuard Academy application.
 */

import React from 'react'
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'

interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  children: React.ReactNode
}

export function Alert({ variant = 'info', title, children }: AlertProps) {
  const variants = {
    info: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Info, color: 'text-blue-400' },
    success: { bg: 'bg-green-500/10', border: 'border-green-500/30', icon: CheckCircle, color: 'text-green-400' },
    warning: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: AlertTriangle, color: 'text-yellow-400' },
    error: { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: AlertCircle, color: 'text-red-400' },
  }

  const config = variants[variant]
  const Icon = config.icon

  return (
    <div className={`${config.bg} border ${config.border} rounded-lg p-4`}>
      <div className="flex gap-3">
        <Icon className={`w-5 h-5 flex-shrink-0 ${config.color} mt-0.5`} />
        <div>
          {title && <p className={`font-semibold ${config.color}`}>{title}</p>}
          <p className="text-slate-300 text-sm">{children}</p>
        </div>
      </div>
    </div>
  )
}
