/**
 * Button component/module file.
  * This file defines the Button component, which is a reusable UI component for rendering buttons with different variants (primary, secondary, danger, success) and sizes (sm, md, lg) in the PhishGuard Academy application.
 */

import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-blue-500/25',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-100 shadow-md hover:shadow-slate-500/15',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-500/25',
    success: 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-green-500/25',
  }

  const sizes = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <button
      disabled={disabled}
      className={`
        font-semibold rounded-lg transition duration-200
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  )
}
