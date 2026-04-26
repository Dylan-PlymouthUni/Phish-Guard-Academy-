/**
 * Card component/module file.
  * This file defines the Card component, which is a reusable UI component for displaying content in a card layout with optional hover effects.
 */

import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export function Card({ children, className = '', hover = false }: CardProps) {
  return (
    <div
      className={`
        bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 backdrop-blur-xl
        shadow-lg transition-all duration-300
        ${hover ? 'hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`pb-4 border-b border-slate-700/30 ${className}`}>{children}</div>
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`pt-4 ${className}`}>{children}</div>
}
