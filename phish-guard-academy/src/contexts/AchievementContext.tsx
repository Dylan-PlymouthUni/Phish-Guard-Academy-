/**
 * AchievementContext component/module file.
  * This file defines the AchievementContext, which provides a way to trigger and display achievement notifications in the PhishGuard Academy application.
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import confetti from 'canvas-confetti'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Star, Zap } from 'lucide-react'

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  points: number
}

interface AchievementContextType {
  triggerAchievement: (achievement: Achievement) => void
}

const AchievementContext = createContext<AchievementContextType | undefined>(undefined)

export function useAchievements() {
  const context = useContext(AchievementContext)
  if (!context) throw new Error('useAchievements must be used within AchievementProvider')
  return context
}

export function AchievementProvider({ children }: { children: ReactNode }) {
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null)

    const triggerAchievement = (achievement: Achievement) => {
    setCurrentAchievement(achievement)
    
    // Trigger confetti
    const duration = 3000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 }

        function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      })
    }, 250)

    // Auto-hide after 5 seconds
    setTimeout(() => {
      setCurrentAchievement(null)
    }, 5000)
  }

  return (
    <AchievementContext.Provider value={{ triggerAchievement }}>
      {children}
      
      {/* Achievement Popup */}
      <AnimatePresence>
        {currentAchievement && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -100 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none"
          >
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                repeatDelay: 1
              }}
              className="bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-pink-500/20 border-2 border-yellow-500/50 rounded-2xl p-8 backdrop-blur-xl shadow-2xl max-w-md mx-4 pointer-events-auto"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="text-6xl mb-4"
                >
                  {currentAchievement.icon}
                </motion.div>
                
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                  <h2 className="text-2xl font-bold text-white">Achievement Unlocked!</h2>
                </div>
                
                <h3 className="text-xl font-bold text-yellow-400 mb-2">
                  {currentAchievement.title}
                </h3>
                
                <p className="text-slate-300 mb-4">
                  {currentAchievement.description}
                </p>
                
                <div className="flex items-center justify-center gap-2 text-yellow-400 font-bold text-lg">
                  <Star className="w-5 h-5" />
                  +{currentAchievement.points} points
                  <Zap className="w-5 h-5" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AchievementContext.Provider>
  )
}
