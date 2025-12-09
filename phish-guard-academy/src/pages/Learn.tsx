import { BookOpen, CheckCircle, Trophy } from 'lucide-react'
import { useState, useEffect } from 'react'
import { MainLayout } from '../components/layout/MainLayout'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { useApi } from '../hooks/useApi'
import { SkeletonCard } from '../components/ui/Skeleton'
import { Lesson, UserProgress } from '../types'

export default function Learn() {
  const { data: lessons, loading } = useApi<Lesson[]>('/api/lessons')
  const { data: progress } = useApi<UserProgress>('/api/progress')
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)

  const completeLesson = async (lessonId: string) => {
    try {
      const res = await fetch(`/api/complete-lesson/${lessonId}`, { method: 'POST' })
      if (res.ok) {
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
          <Button variant="secondary" className="mb-6">
            ← Back to Lessons
          </Button>

          <Card>
            <CardContent>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="info">{selectedLesson.difficulty}</Badge>
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

              <Button
                onClick={() => completeLesson(selectedLesson.id)}
                variant="success"
                fullWidth
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Mark Complete & Earn {selectedLesson.points_reward} Points
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
                <p className="text-4xl font-bold text-yellow-400">{progress.total_points}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center">
                <p className="text-slate-400 mb-2">Lessons Completed</p>
                <p className="text-4xl font-bold text-blue-400">{progress.lessons_completed}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center">
                <p className="text-slate-400 mb-2">Achievements</p>
                <p className="text-4xl font-bold text-purple-400">{progress.achievements.filter(a => a.unlocked).length}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {lessons?.map(lesson => (
            <Card
              key={lesson.id}
              hover
              onClick={() => setSelectedLesson(lesson)}
            >
              <CardContent>
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
                  <span className="text-sm text-yellow-400 font-bold ml-auto">+{lesson.points_reward} pts</span>
                </div>

                <Button fullWidth variant={lesson.completed ? 'secondary' : 'primary'}>
                  {lesson.completed ? 'Review' : 'Start Lesson'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  )
}
