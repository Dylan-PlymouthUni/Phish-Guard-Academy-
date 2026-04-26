/**
 * Learn component/module file.
  * This file defines the Learn page, which displays a list of educational lessons that users can read to improve their phishing detection skills in the PhishGuard Academy application.
 */

import { CheckCircle, AlertTriangle, Clock3, Target } from 'lucide-react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Link } from 'react-router-dom'
import { MainLayout } from '../components/layout/MainLayout'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Toast } from '../components/ui/Toast'
import { useApi } from '../hooks/useApi'
import { SkeletonCard } from '../components/ui/Skeleton'
import { Lesson } from '../types'
import { completeLesson as recordLessonCompletion, getProgress } from '../utils/storage'
import { useAuth } from '../contexts/AuthContext'

const FALLBACK_LESSONS: Lesson[] = [
  {
    id: 'lsn-basics-1',
    title: 'Phishing Basics',
    description: 'A practical starter on what to check first before you click.',
    difficulty: 'easy',
    duration: 6,
    points: 150,
    content: `## What to check first\n\n- Urgent pressure like "verify now" or "your account will be closed"\n- Sender address does not match the claimed company\n- Link destination and brand name do not line up\n- Requests for passwords, payment details, or MFA codes\n\n## Fast rule\nIf a message asks for sensitive action, pause and verify through a trusted channel.`,
    completed: false
  },
  {
    id: 'lsn-urls-1',
    title: 'URL Safety 101',
    description: 'How to quickly judge if a link is trustworthy.',
    difficulty: 'medium',
    duration: 8,
    points: 200,
    content: `### Check the real domain\n\n1. Read the domain from right to left, not left to right.\n2. Watch for lookalikes: paypa1.com, micr0soft.com, rnicrosoft.com.\n3. Be careful with short links that hide the destination.\n\n### Better habit\nOpen important sites directly from bookmarks or by typing the address yourself.`,
    completed: false
  }
]

export default function Learn() {
  const { data: lessons, loading, error } = useApi<Lesson[]>('/api/lessons')
  const { refreshUser, token } = useAuth()
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [showToast, setShowToast] = useState(false)
  const [localStats, setLocalStats] = useState(() => getProgress())

    const stripEmojis = (value: string) =>
    value
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
      .replace(/[\u{2600}-\u{27BF}]/gu, '')
      .replace(/[\u{FE0F}\u{200D}]/gu, '')

    const extractTakeaways = (content: string) => {
    const bullets = stripEmojis(content)
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('- ') || line.startsWith('* '))
      .map((line) => line.replace(/^[-*]\s+/, '').trim())
      .filter(Boolean)
    return bullets.slice(0, 4)
  }

    const cleanContent = (content: string) =>
    stripEmojis(content)
      .replace(/\n{3,}/g, '\n\n')

  const rawLessonList = lessons && lessons.length > 0 ? lessons : FALLBACK_LESSONS
    const lessonList = rawLessonList.map(l => ({ ...l, completed: localStats.lessons_completed.includes(l.id) }))
  const usingFallback = !loading && (!lessons || lessons.length === 0 || !!error)

    const completeLesson = async (lessonId: string) => {
    try {
      const res = await fetch(`/api/complete-lesson/${lessonId}`, { 
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      if (res.ok) {
        if (selectedLesson) {
          recordLessonCompletion(lessonId, selectedLesson.points)
          setLocalStats(getProgress())
          await refreshUser()
          setShowToast(true)
        }
        setSelectedLesson(null)
        return
      }
    } catch (err) {
      // offline fallback below
    }

    if (selectedLesson) {
      recordLessonCompletion(lessonId, selectedLesson.points)
      setLocalStats(getProgress())
      await refreshUser()
      setShowToast(true)
      setSelectedLesson(null)
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
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Badge variant="info">{selectedLesson.difficulty}</Badge>
                  <span className="text-xs text-yellow-400 font-bold">+{selectedLesson.points} pts</span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock3 className="w-3 h-3" />
                    {selectedLesson.duration} min read
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-white mb-2 leading-tight">{stripEmojis(selectedLesson.title)}</h1>
                <p className="text-slate-300">{stripEmojis(selectedLesson.description)}</p>
              </div>

              {extractTakeaways(selectedLesson.content).length > 0 && (
                <div className="mb-8 p-4 rounded-lg border border-blue-500/30 bg-blue-500/10">
                  <div className="text-sm text-blue-300 font-semibold mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Key Takeaways
                  </div>
                  <ul className="space-y-1">
                    {extractTakeaways(selectedLesson.content).map((takeaway, idx) => (
                      <li key={idx} className="text-sm text-slate-200">• {takeaway}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="max-w-none mb-8 text-slate-200 leading-relaxed rounded-xl border border-slate-700/60 bg-slate-900/50 p-6 md:p-8">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h1 className="text-3xl font-semibold text-white mt-2 mb-5 leading-tight">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-2xl font-semibold text-white mt-8 mb-4 leading-tight">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-xl font-semibold text-slate-100 mt-6 mb-3">{children}</h3>,
                    p: ({ children }) => <p className="mb-4 text-[1.01rem] text-slate-200 leading-7">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-6 mb-5 space-y-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-6 mb-5 space-y-2">{children}</ol>,
                    li: ({ children }) => <li className="text-slate-200 leading-7">{children}</li>,
                    code: ({ children }) => <code className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 text-sm">{children}</code>,
                    pre: ({ children }) => <pre className="mb-5 p-4 rounded-lg bg-slate-950 border border-slate-800 overflow-x-auto">{children}</pre>,
                  }}
                >
                  {cleanContent(selectedLesson.content)}
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
          <p className="text-slate-300 max-w-2xl">Short, practical lessons for spotting phishing fast. Built for real inboxes and real mistakes.</p>
          {usingFallback && (
            <div className="mt-3 flex items-center gap-2 text-amber-300 text-sm">
              <AlertTriangle className="w-4 h-4" />
              Showing sample lessons (API unavailable)
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-12">
          <Card>
            <CardContent className="text-center">
              <p className="text-slate-400 mb-2">Total Points</p>
              <p className="text-4xl font-bold text-yellow-400">{localStats.total_points}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center">
              <p className="text-slate-400 mb-2">Lessons Completed</p>
              <p className="text-4xl font-bold text-blue-400">{localStats.lessons_completed.length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {lessonList.map(lesson => (
            <button
              key={lesson.id}
              onClick={() => setSelectedLesson(lesson)}
              className="w-full text-left bg-slate-900/60 border border-slate-700/60 rounded-xl p-6 hover:border-blue-500/60 hover:bg-slate-900 transition cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1 leading-tight">{stripEmojis(lesson.title)}</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">{stripEmojis(lesson.description)}</p>
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

        <Card className="mt-10 border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
          <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Turn knowledge into reflexes</h3>
              <p className="text-slate-300 text-sm">After each lesson, run a challenge to reinforce what you just learned.</p>
            </div>
            <Link to="/challenges">
              <Button variant="primary">Practice in Challenges</Button>
            </Link>
          </CardContent>
        </Card>
        
        {showToast && (
          <Toast
            message="Lesson completed. Progress saved."
            type="success"
            onClose={() => setShowToast(false)}
          />
        )}
      </div>
    </MainLayout>
  )
}
