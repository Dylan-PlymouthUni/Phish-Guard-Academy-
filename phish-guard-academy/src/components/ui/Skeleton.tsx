import React from 'react'

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-700/50 rounded animate-pulse ${className}`} />
}

export function SkeletonCard() {
  return (
    <div className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-6">
      <Skeleton className="h-6 w-3/4 mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  )
}
