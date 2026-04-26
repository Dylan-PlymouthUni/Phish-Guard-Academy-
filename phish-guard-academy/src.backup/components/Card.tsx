/**
 * Card component/module file.
  * This file defines a reusable Card component along with its subcomponents (CardHeader, CardContent, CardFooter) for structuring content in the PhishGuard Academy application.
  * The Card component provides a styled container with optional hover effects and badges, while the subcomponents allow for consistent formatting of headers, content, and footers within the card.
  * It includes the following responsibilities:
  * - Providing a flexible Card component that can be used across different pages and features of the application.
  * - Allowing optional hover effects to enhance interactivity.
  * - Supporting badges to highlight important information or statuses.
  * - Structuring content with CardHeader, CardContent, and CardFooter for better readability and organization.
 */

import React from 'react';

interface CardProps {
  className?: string;
  children: React.ReactNode;
  hover?: boolean;
  badge?: { label: string; variant: 'success' | 'warning' | 'danger' };
}

export function Card({ className = '', children, hover = false, badge }: CardProps) {
  return (
    <div
      className={`
        bg-slate-800/50 border border-slate-700/50 rounded-lg p-6
        ${hover ? 'hover:border-blue-500/50 hover:bg-slate-800 transition' : ''}
        ${className}
      `}
    >
      {badge && (
        <div className={`
          inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4
          ${badge.variant === 'success' ? 'bg-green-500/20 text-green-400' : ''}
          ${badge.variant === 'warning' ? 'bg-yellow-500/20 text-yellow-400' : ''}
          ${badge.variant === 'danger' ? 'bg-red-500/20 text-red-400' : ''}
        `}>
          {badge.label}
        </div>
      )}
      {children}
    </div>
  );
}

interface CardHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export function CardHeader({ className = '', children }: CardHeaderProps) {
  return <div className={`pb-4 border-b border-slate-700/50 ${className}`}>{children}</div>;
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`pt-4 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`pt-4 border-t border-slate-700/50 ${className}`}>{children}</div>;
}