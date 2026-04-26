/**
 * AchievementBadge component/module file.
 * This file defines the AchievementBadge component which is used to display user achievements in the PhishGuard Academy application. The badge visually indicates whether an achievement is unlocked or locked, and can optionally show progress towards unlocking it.
 * It includes the following responsibilities:
 * - Displaying an icon, title, and description for the achievement.
 * - Indicating whether the achievement is unlocked or locked with different styles.
 * - Optionally showing a progress bar if a progress value is provided.
 * - Using the Lock icon to indicate locked achievements.
 * - Using a gradient background for unlocked achievements to make them visually appealing.
 * - Ensuring the component is reusable and can be easily integrated into different parts of the application where achievements are displayed.
 */

import React from 'react';
import { Lock } from 'lucide-react';

interface AchievementBadgeProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  unlocked: boolean;
  progress?: number; // 0-100
}

export function AchievementBadge({ icon, title, description, unlocked, progress }: AchievementBadgeProps) {
  return (
    <div
      className={`
        relative p-4 rounded-lg border-2 text-center
        ${unlocked 
          ? 'bg-amber-500/10 border-amber-500/50' 
          : 'bg-slate-800/30 border-slate-700/30'
        }
      `}
    >
      <div className={`text-3xl mb-2 ${unlocked ? '' : 'opacity-30'}`}>
        {icon}
      </div>
      <h4 className={`font-semibold ${unlocked ? 'text-white' : 'text-slate-400'}`}>
        {title}
      </h4>
      <p className="text-xs text-slate-400 mt-1">{description}</p>
      
      {!unlocked && (
        <div className="absolute top-2 right-2">
          <Lock className="w-4 h-4 text-slate-500" />
        </div>
      )}
      
      {progress !== undefined && (
        <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}