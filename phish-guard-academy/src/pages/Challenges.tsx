import { Target, Clock, Trophy, CheckCircle, XCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { MainLayout } from '../components/layout/MainLayout'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Alert'
import { Toast } from '../components/ui/Toast'
import { useApi } from '../hooks/useApi'
import { SkeletonCard } from '../components/ui/Skeleton'
import { Challenge } from '../types'
import { completeChallenge, getProgress } from '../utils/storage'

export default function Challenges() {
  const { data: challenges, loading } = useApi<Challenge[]>('/api/challenges')
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)
  const [activeQuestion, setActiveQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [started, setStarted] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // DEBUG: Show alert when component mounts
  useEffect(() => {
    console.log('🎯 Challenges page loaded! Challenges:', challenges?.length || 0)
  }, [challenges])

  useEffect(() => {
    if (!started || !selectedChallenge || timeLeft <= 0) return
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(timer)
  }, [started, selectedChallenge, timeLeft])

  const startChallenge = (challenge: Challenge) => {
    setSelectedChallenge(challenge)
    setAnswers({})
    setSubmitted(false)
    setResult(null)
    setActiveQuestion(0)
    setTimeLeft(challenge.time_limit)
    setStarted(true)
  }

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const submitChallenge = async () => {
    if (!selectedChallenge) return
    try {
      const res = await fetch('/api/submit-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_id: selectedChallenge.id,
          answers,
          time_taken: selectedChallenge.time_limit - timeLeft,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setResult(data)
        setSubmitted(true)
        
        // Record challenge completion in localStorage
        const passed = data.passed || data.score >= 70
        completeChallenge(selectedChallenge.id, selectedChallenge.points, passed)
        
        // Show toast notification
        if (passed) {
          setToastMessage(`🎉 Challenge passed! +${selectedChallenge.points} points earned!`)
        } else {
          setToastMessage(`💪 Keep trying! You can retake this challenge.`)
        }
        setShowToast(true)
      }
    } catch (err) {
      console.error('Failed to submit:', err)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </MainLayout>
    )
  }

  // Challenge in progress
  if (selectedChallenge && !submitted) {
    const question = selectedChallenge.questions[activeQuestion]
    const progress = ((activeQuestion + 1) / selectedChallenge.questions.length) * 100

    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">{selectedChallenge.title}</h1>
              <p className="text-slate-400 mt-2">
                Question {activeQuestion + 1} of {selectedChallenge.questions.length}
              </p>
            </div>
            <div className={`text-4xl font-bold ${timeLeft < 60 ? 'text-red-400' : 'text-blue-400'}`}>
              {formatTime(timeLeft)}
            </div>
          </div>

          <div className="mb-8 w-full bg-slate-800 rounded-full h-2">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <Card>
            <CardContent>
              <h2 className="text-2xl font-bold text-white mb-6">{question.question}</h2>

              <div className="space-y-3 mb-8">
                {question.options.map((option, idx) => (
                  <label
                    key={idx}
                    className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition ${
                      answers[question.id] === option
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-600 hover:border-slate-500 bg-slate-900/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={option}
                      checked={answers[question.id] === option}
                      onChange={() => handleAnswer(question.id, option)}
                      className="w-4 h-4 mr-3 flex-shrink-0"
                    />
                    <span className="text-white text-left flex-1">{option}</span>
                  </label>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <Button
                  onClick={() => setActiveQuestion(Math.max(0, activeQuestion - 1))}
                  variant="secondary"
                  disabled={activeQuestion === 0}
                >
                  Previous
                </Button>

                {activeQuestion === selectedChallenge.questions.length - 1 ? (
                  <Button onClick={submitChallenge} variant="success">
                    Submit Challenge
                  </Button>
                ) : (
                  <Button
                    onClick={() => setActiveQuestion(activeQuestion + 1)}
                    variant="primary"
                  >
                    Next
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    )
  }

  // Challenge submitted
  if (submitted && result) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <div
            className={`mb-8 p-12 rounded-lg border-2 backdrop-blur-xl ${
              result.passed
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div className="text-6xl mb-4">
              {result.passed ? <Trophy className="w-16 h-16 mx-auto text-green-400" /> : <XCircle className="w-16 h-16 mx-auto text-red-400" />}
            </div>
            <h1 className={`text-4xl font-bold mb-2 ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
              {result.passed ? 'Challenge Passed! 🎉' : 'Keep Trying'}
            </h1>
            <p className={`text-2xl font-bold mb-6 ${result.passed ? 'text-green-300' : 'text-red-300'}`}>
              {result.score}%
            </p>
            <p className="text-slate-300 mb-8">
              You got {result.correct} out of {result.total} correct
            </p>
            {result.points_earned > 0 && (
              <p className="text-yellow-400 font-bold text-lg">+{result.points_earned} points!</p>
            )}
          </div>

          <div className="flex gap-4 justify-center mb-12">
            <Button
              onClick={() => {
                setSelectedChallenge(null)
                setSubmitted(false)
              }}
              variant="primary"
            >
              Back to Challenges
            </Button>
            {!result.passed && (
              <Button onClick={() => startChallenge(selectedChallenge!)} variant="success">
                Retry Challenge
              </Button>
            )}
          </div>
        </div>
      </MainLayout>
    )
  }

  // Challenge list
  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-white mb-2">Challenges</h1>
          <p className="text-slate-400">Test your skills and earn points</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {challenges?.map(challenge => {
            const stats = challenge.stats || { attempts: 0, passed: 0, best_score: 0 }
            const completed = stats.passed > 0

            return (
              <button
                key={challenge.id}
                onClick={() => startChallenge(challenge)}
                className="w-full text-left bg-slate-800/50 border border-slate-700/50 rounded-lg p-6 hover:border-blue-500/50 hover:bg-slate-800 transition cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1">{challenge.title}</h3>
                      <p className="text-slate-400 text-sm">{challenge.description}</p>
                    </div>
                    {completed && <CheckCircle className="w-6 h-6 text-green-400" />}
                  </div>

                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <Badge variant="info">{challenge.difficulty}</Badge>
                    <span className="text-sm text-slate-400 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {Math.floor(challenge.time_limit / 60)} min
                    </span>
                    <span className="text-sm text-yellow-400 font-bold flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      +{challenge.points} pts
                    </span>
                  </div>

                  {stats.attempts > 0 && (
                    <div className="p-3 bg-slate-900/50 rounded-lg mb-4">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-slate-400">Attempts</p>
                          <p className="text-white font-bold">{stats.attempts}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Best Score</p>
                          <p className="text-white font-bold">{stats.best_score}%</p>
                        </div>
                      </div>
                    </div>
                  )}
              </button>
            )
          })}
        </div>
        
        {showToast && (
          <Toast
            message={toastMessage}
            type="success"
            onClose={() => setShowToast(false)}
          />
        )}
      </div>
    </MainLayout>
  )
}
