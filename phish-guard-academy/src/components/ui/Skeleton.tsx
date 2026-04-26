/**
 * Skeleton component/module file.
  * This file defines the Skeleton component, which is a reusable UI component for displaying loading placeholders in the PhishGuard Academy application.
 */

import React from 'react'
import { motion } from 'framer-motion'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  animation?: boolean
}

export function Skeleton({ 
  className = '', 
  variant = 'rectangular',
  width,
  height,
  animation = true
}: SkeletonProps) {
  const baseClasses = 'bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-[length:200%_100%]'
  
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  }
  
  const style = {
    width: width,
    height: height
  }
  
  if (animation) {
    return (
      <motion.div
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        style={style}
        animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      />
    )
  }
  
  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className} animate-pulse`}
      style={style}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton variant="circular" width={40} height={40} />
        <Skeleton variant="rectangular" width={60} height={24} />
      </div>
      <Skeleton variant="text" className="w-3/4 h-6" />
      <Skeleton variant="text" className="w-1/2 h-4" />
    </div>
  )
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          variant="text" 
          className={i === lines - 1 ? 'w-2/3' : 'w-full'}
        />
      ))}
    </div>
  )
}

export function SkeletonChart() {
  return (
    <div className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton variant="circular" width={20} height={20} />
        <Skeleton variant="text" className="w-32 h-5" />
      </div>
      <div className="flex items-end justify-center gap-4 h-48">
        {[60, 80, 40, 90, 50].map((height, i) => (
          <Skeleton 
            key={i} 
            variant="rectangular" 
            className="w-12" 
            height={height + '%'} 
          />
        ))}
      </div>
    </div>
  )
}

