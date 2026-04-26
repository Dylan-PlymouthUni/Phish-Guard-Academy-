/**
 * GradientButton component/module file.
 * This file defines a reusable GradientButton component for the PhishGuard Academy application. The GradientButton is a styled button that features a gradient background and can be customized with different variants (primary, success, danger) to indicate different actions or statuses. It also supports disabled state and additional class names for further customization.
 * The component includes the following responsibilities:
 * - Providing a visually appealing gradient background for buttons.
 * - Allowing customization through variants to indicate different types of actions (e.g., primary, success, danger).
 * - Supporting a disabled state that visually indicates when the button is not interactive.
 * - Accepting additional class names for further styling flexibility.
 * - Ensuring the component is reusable and can be easily integrated into various parts of the application where buttons are needed.
 */

import React from 'react';

interface GradientButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'success' | 'danger';
  className?: string;
}

export function GradientButton({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  className = '',
}: GradientButtonProps) {
  const variants = {
    primary: 'from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700',
    success: 'from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700',
    danger: 'from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-6 py-2 font-semibold text-white rounded-lg
        bg-gradient-to-r ${variants[variant]}
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all
        ${className}
      `}
    >
      {children}
    </button>
  );
} 