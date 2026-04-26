/**
 * Badge component/module file.
  * This file defines the Badge component, which is a reusable UI component for displaying small labels or tags with different variants (default, success, warning, danger, info) in the PhishGuard Academy application. 
  * The Badge component uses Tailwind CSS classes for styling and accepts children as the content to be displayed within the badge.
 */

import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const variants = {
    default: 'bg-slate-500/20 text-slate-300',
    success: 'bg-green-500/20 text-green-400',
    warning: 'bg-yellow-500/20 text-yellow-400',
    danger: 'bg-red-500/20 text-red-400',
    info: 'bg-blue-500/20 text-blue-400',
  }

  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${variants[variant]}`}>
      {children}
    </span>
  )
}
