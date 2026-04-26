/**
 * GradientButton component/module file.
  * This file defines the GradientButton component which is a reusable button component with gradient backgrounds. 
  * It supports different variants (primary, success, danger) and can be disabled. 
  * The component uses Tailwind CSS classes for styling and includes transition effects for hover states. 
  * It accepts children as the button label and an optional onClick handler for click events.
 */

import React from 'react';

interface GradientButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'success' | 'danger';
  className?: string;
}

function GradientButton({
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

export default GradientButton;