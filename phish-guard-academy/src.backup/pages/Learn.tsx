/**
 * Learn component/module file.
 * This file defines the Learn page component for the PhishGuard Academy application. The Learn page provides users with a structured learning experience to master phishing detection skills. It includes a list of lessons, each with a title, description, difficulty level, duration, and points reward. Users can click on a lesson to view its content and mark it as complete to earn points.
 * The Learn component is responsible for:
 * - Fetching and displaying a list of lessons from the backend API.
 * - Showing the user's progress, including total points, lessons completed, and achievements.
 * - Allowing users to view lesson content and mark lessons as complete to earn points.
 * - Providing a visually appealing and user-friendly interface with appropriate use of colors, typography, and spacing.
 * - Encouraging users to engage with the learning material and track their progress effectively.
 * - Ensuring a responsive design that works well on both desktop and mobile devices.
 * - Using icons and visual indicators to enhance the user experience and make it easy to identify lesson difficulty and rewards.
 */

import { BookOpen, CheckCircle, Lock, Trophy, Zap } from 'lucide-react'
import { useState, useEffect } from 'react'

interface Lesson {
  id: string
  title: string
  description: string
  category: string
  difficulty: string
  duration: number
  points_reward: number
  content: string
  completed?: boolean
}

interface Progress {
  total_points: number
  lessons_completed: number
  achievements: any[]
}

export default function Learn() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [progress, setProgress] = useState<Progress | null>(null)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

    const fetchData = async () => {
    try {
      const [lessonsRes, progressRes] = await Promise.all([
        fetch('/api/lessons'),
        fetch('/api/progress')
      ])
      if (lessonsRes.ok) setLessons(await lessonsRes.json())
      if (progressRes.ok) setProgress(await progressRes.json())
    } catch (err) {
      console.error('Failed to fetch:', err)
    } finally {
      setLoading(false)
    }
  }

    const completeLesson = async (lessonId: string) => {
    try {
      const res = await fetch(`/api/complete-lesson/${lessonId}`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setProgress(data.progress)
        setSelectedLesson(null)
        await fetchData()
      }
    } catch (err) {
      console.error('Failed to complete lesson:', err)
    }
  }

  if (loading) {
    return <div className="w-full h-screen flex items-center justify-center"><p className="text-white">Loading lessons...</p></div>
  }

  if (selectedLesson) {
    return (
      <div className="w-full px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setSelectedLesson(null)}
            className="text-blue-400 hover:text-blue-300 mb-6"
          >
            ← Back to Lessons
          </button>

          <div className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-8 backdrop-blur-xl">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-bold px-2 py-1 rounded ${
                  selectedLesson.difficulty === 'beginner' ? 'bg-green-500/20 text-green-400' :
                  selectedLesson.difficulty === 'intermediate' ? 'bg-orange-500/20 text-orange-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {selectedLesson.difficulty}
                </span>
                <span className="text-xs text-yellow-400 font-bold">+{selectedLesson.points_reward} pts</span>
              </div>
              <h1 className="text-4xl font-bold text-white mb-2">{selectedLesson.title}</h1>
              <p className="text-slate-400">{selectedLesson.duration} min read</p>
            </div>

            <div className="prose prose-invert max-w-none mb-8">
              <div className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                {selectedLesson.content}
              </div>
            </div>

            <button
              onClick={() => completeLesson(selectedLesson.id)}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Mark Complete & Earn {selectedLesson.points_reward} Points
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-white mb-2">Learning Hub</h1>
          <p className="text-slate-400">Master phishing detection skills and earn points</p>
        </div>

        {progress && (
          <div className="grid md:grid-cols-3 gap-4 mb-12">
            <div className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-6 backdrop-blur-xl">
              <p className="text-slate-400 mb-2">Total Points</p>
              <p className="text-4xl font-bold text-yellow-400">{progress.total_points}</p>
            </div>
            <div className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-6 backdrop-blur-xl">
              <p className="text-slate-400 mb-2">Lessons Completed</p>
              <p className="text-4xl font-bold text-blue-400">{progress.lessons_completed}</p>
            </div>
            <div className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-6 backdrop-blur-xl">
              <p className="text-slate-400 mb-2">Achievements</p>
              <p className="text-4xl font-bold text-purple-400">{progress.achievements.length}</p>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {lessons.map(lesson => {
            const isCompleted = progress?.lessons_completed && lessons.indexOf(lesson) < progress.lessons_completed
            
            return (
              <div
                key={lesson.id}
                onClick={() => setSelectedLesson(lesson)}
                className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-6 hover:border-blue-500/40 transition cursor-pointer backdrop-blur-xl"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{lesson.title}</h3>
                    <p className="text-slate-400 text-sm">{lesson.description}</p>
                  </div>
                  {isCompleted && <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />}
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    lesson.difficulty === 'beginner' ? 'bg-green-500/20 text-green-400' :
                    lesson.difficulty === 'intermediate' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {lesson.difficulty}
                  </span>
                  <span className="text-sm text-slate-400">{lesson.duration} min</span>
                  <span className="text-sm text-yellow-400 font-bold ml-auto">+{lesson.points_reward} pts</span>
                </div>

                <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition">
                  {isCompleted ? 'Review' : 'Start Lesson'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
