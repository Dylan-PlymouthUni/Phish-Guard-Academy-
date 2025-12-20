import { BookOpen, CheckCircle, Trophy } from 'lucide-react'
import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { MainLayout } from '../components/layout/MainLayout'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Toast } from '../components/ui/Toast'
import { useApi } from '../hooks/useApi'
import { SkeletonCard } from '../components/ui/Skeleton'
import { Lesson, UserProgress } from '../types'
import { completeLesson as recordLessonCompletion } from '../utils/storage'

export default function Learn() {
  const { data: lessons, loading } = useApi<Lesson[]>('/api/lessons')
  const { data: progress } = useApi<UserProgress>('/api/progress')
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [showToast, setShowToast] = useState(false)

  // DEBUG
  useEffect(() => {
    console.log('📚 Learn page - lessons:', lessons?.length || 0, 'loading:', loading)
  }, [lessons, loading])

  const completeLesson = async (lessonId: string) => {
    try {
      const res = await fetch(`/api/complete-lesson/${lessonId}`, { method: 'POST' })
      if (res.ok) {
        // Record completion in localStorage
        if (selectedLesson) {
          recordLessonCompletion(lessonId, selectedLesson.points)
          setShowToast(true)
        }
        setSelectedLesson(null)
      }
    } catch (err) {
      console.error('Failed:', err)
    }
  }

  if (selectedLesson) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Button variant="secondary" className="mb-6" onClick={() => setSelectedLesson(null)}>
            ← Back to Lessons
          </Button>

          <Card>
            <CardContent>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="info">{selectedLesson.difficulty}</Badge>
                  <span className="text-xs text-yellow-400 font-bold">+{selectedLesson.points} pts</span>
                </div>
                <h1 className="text-4xl font-bold text-white mb-2">{selectedLesson.title}</h1>
                <p className="text-slate-400">{selectedLesson.duration} min read</p>
              </div>

              <div className="prose prose-invert prose-slate max-w-none mb-8 text-slate-300 leading-relaxed">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-4">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
                    li: ({ children }) => <li className="text-slate-300">{children}</li>,
                    h2: ({ children }) => <h2 className="text-2xl font-bold text-white mt-8 mb-4">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-xl font-bold text-white mt-6 mb-3">{children}</h3>,
                  }}
                >
                  {selectedLesson.content}
                </ReactMarkdown>
              </div>

              <Button
                onClick={() => completeLesson(selectedLesson.id)}
                variant="success"
                fullWidth
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Mark Complete & Earn {selectedLesson.points} Points
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    )
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-white mb-2">Learning Hub</h1>
          <p className="text-slate-400">Master phishing detection skills</p>
        </div>

        {progress && (
          <div className="grid md:grid-cols-3 gap-4 mb-12">
            <Card>
              <CardContent className="text-center">
                <p className="text-slate-400 mb-2">Total Points</p>
                <p className="text-4xl font-bold text-yellow-400">{progress.total_points || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center">
                <p className="text-slate-400 mb-2">Lessons Completed</p>
                <p className="text-4xl font-bold text-blue-400">{progress.lessons_completed || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center">
                <p className="text-slate-400 mb-2">Achievements</p>
                <p className="text-4xl font-bold text-purple-400">{progress.achievements?.filter(a => a.unlocked).length || 0}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {lessons?.map(lesson => (
            <button
              key={lesson.id}
              onClick={() => setSelectedLesson(lesson)}
              className="w-full text-left bg-slate-800/50 border border-slate-700/50 rounded-lg p-6 hover:border-blue-500/50 hover:bg-slate-800 transition cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{lesson.title}</h3>
                    <p className="text-slate-400 text-sm">{lesson.description}</p>
                  </div>
                  {lesson.completed && <CheckCircle className="w-6 h-6 text-green-400" />}
                </div>

                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <Badge variant="info">{lesson.difficulty}</Badge>
                  <span className="text-sm text-slate-400">{lesson.duration} min</span>
                  <span className="text-sm text-yellow-400 font-bold ml-auto">+{lesson.points} pts</span>
                </div>
            </button>
          ))}
        </div>
        
        {showToast && (
          <Toast
            message="📚 Lesson completed! Progress saved."
            type="success"
            onClose={() => setShowToast(false)}
          />
        )}
      </div>
    </MainLayout>
  )
}
