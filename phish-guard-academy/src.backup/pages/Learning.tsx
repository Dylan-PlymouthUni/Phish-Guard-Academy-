/**
 * Learning component/module file.
  * This file defines the Learning page component for the PhishGuard Academy application. 
  * The Learning page provides users with a structured learning experience to master phishing detection skills. 
  * It includes a list of lessons, each with a title, description, difficulty level, duration, and points reward. 
  * Users can click on a lesson to view its content and mark it as complete to earn points.
 */

import { BookOpen, Trophy, Clock, Zap, Target, Lock, Eye, Award, ChevronRight, Play } from 'lucide-react'
import { useState, useEffect } from 'react'

interface Lesson {
  id: string
  title: string
  description: string
  difficulty: string
  estimated_time: number
  points_reward: number
  completed: boolean
}

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  points: number
  unlocked: boolean
}

interface UserProgress {
  total_points: number
  level: number
  experience: number
  lessons_completed: number
  challenges_passed: number
  achievements: Achievement[]
}

export default function Learning() {
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

    const fetchData = async () => {
    try {
      const [progressRes, lessonsRes] = await Promise.all([
        fetch('/api/progress'),
        fetch('/api/lessons')
      ])
      
      if (progressRes.ok) setProgress(await progressRes.json())
      if (lessonsRes.ok) setLessons(await lessonsRes.json())
    } catch (err) {
      console.error('Failed to fetch:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !progress) {
    return <div className="w-full h-screen flex items-center justify-center"><p className="text-white">Loading...</p></div>
  }

    const getDifficultyColor = (diff: string) => {
    switch(diff) {
      case 'beginner': return 'text-green-400 bg-green-500/10'
      case 'intermediate': return 'text-orange-400 bg-orange-500/10'
      case 'advanced': return 'text-red-400 bg-red-500/10'
      default: return 'text-slate-400 bg-slate-500/10'
    }
  }

  const expPercent = (progress.experience / 500) * 100

  return (
    <div className="w-full px-4 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-white mb-2">Security Training</h1>
          <p className="text-slate-400 mb-8">Master phishing detection with interactive lessons</p>

          {/* Profile Card */}
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg p-6 backdrop-blur-xl">
            <div className="grid md:grid-cols-4 gap-6 mb-6">
              <div>
                <p className="text-slate-400 text-sm mb-1">Level</p>
                <p className="text-4xl font-bold text-blue-400">{progress.level}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">Total Points</p>
                <p className="text-4xl font-bold text-purple-400">{progress.total_points}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">Lessons</p>
                <p className="text-4xl font-bold text-cyan-400">{progress.lessons_completed}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">Achievements</p>
                <p className="text-4xl font-bold text-pink-400">{progress.achievements.filter(a => a.unlocked).length}</p>
              </div>
            </div>

            {/* XP Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Experience to next level</span>
                <span className="text-sm font-bold text-white">{progress.experience}/500</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${expPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Achievements ({progress.achievements.filter(a => a.unlocked).length}/{progress.achievements.length})
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {progress.achievements.map(ach => (
              <div
                key={ach.id}
                className={`p-4 rounded-lg border transition ${
                  ach.unlocked
                    ? 'bg-blue-500/10 border-blue-500/30 hover:border-blue-500/50'
                    : 'bg-slate-800/30 border-slate-700 opacity-50'
                }`}
              >
                <div className="text-3xl mb-2">{ach.icon}</div>
                <h3 className="text-white font-bold">{ach.name}</h3>
                <p className="text-sm text-slate-400 mb-2">{ach.description}</p>
                <p className="text-xs font-bold text-yellow-400">+{ach.points} pts</p>
                {ach.unlocked && <p className="text-xs text-green-400 mt-1">✓ Unlocked</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Lessons */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-400" />
            Lessons ({progress.lessons_completed} completed)
          </h2>

          {selectedLesson ? (
            <div className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-8 backdrop-blur-xl mb-8">
              <button
                onClick={() => setSelectedLesson(null)}
                className="text-blue-400 hover:text-blue-300 mb-4 flex items-center gap-1"
              >
                ← Back to Lessons
              </button>
              <h3 className="text-3xl font-bold text-white mb-4">
                {lessons.find(l => l.id === selectedLesson)?.title}
              </h3>
              <div className="bg-slate-900/50 p-6 rounded-lg text-slate-300 mb-6 max-h-96 overflow-y-auto">
                <p>Lesson content loads here...</p>
              </div>
              <button className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition">
                Mark as Complete
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {lessons.map(lesson => (
                <div
                  key={lesson.id}
                  className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-6 hover:border-blue-500/40 transition cursor-pointer"
                  onClick={() => setSelectedLesson(lesson.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-white">{lesson.title}</h3>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${getDifficultyColor(lesson.difficulty)}`}>
                          {lesson.difficulty}
                        </span>
                      </div>
                      <p className="text-slate-400 mb-3">{lesson.description}</p>
                      <div className="flex items-center gap-6 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {lesson.estimated_time} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="w-4 h-4" />
                          +{lesson.points_reward} pts
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-slate-600" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
