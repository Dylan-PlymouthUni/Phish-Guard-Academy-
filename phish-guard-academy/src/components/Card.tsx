import React from 'react';

interface CardProps {
  className?: string;
  children: React.ReactNode;
  hover?: boolean;
  onClick?: () => void;
  badge?: { label: string; variant: 'success' | 'warning' | 'danger' };
}

export function Card({ className = '', children, hover = false, onClick, badge }: CardProps) {
  const handleClick = (e: React.MouseEvent) => {
    console.log('🔥 CARD CLICKED!', { onClick: typeof onClick, hover })
    alert('Card was clicked! onClick type: ' + typeof onClick)
    if (onClick) {
      onClick()
    }
  }

  return (
    <div
      onClick={handleClick}
      style={{ position: 'relative', zIndex: 1 }}
      className={`
        bg-slate-800/50 border-4 border-red-500 rounded-lg p-6
        ${hover ? 'hover:border-blue-500 hover:bg-slate-800 transition cursor-pointer' : ''}
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