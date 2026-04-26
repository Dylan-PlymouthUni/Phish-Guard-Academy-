/**
 * Challenges component/module file.
  * This file defines the Challenges page, which allows users to test their phishing detection skills by completing various challenges. 
  * Each challenge consists of multiple questions related to identifying phishing indicators in URLs, emails, and other scenarios. Users can earn points based on their performance and track their progress over time.
 */

import { Target, Clock, Trophy, CheckCircle, XCircle, AlertTriangle, Lightbulb, RotateCcw } from 'lucide-react'
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
import { useAuth } from '../contexts/AuthContext'

const FALLBACK_CHALLENGES: Challenge[] = [
  {
    id: 'url-spotting-1',
    title: 'Spot the Phishy URL',
    description: 'Decide which links are safe vs suspicious.',
    difficulty: 'medium',
    time_limit: 180,
    points: 250,
    questions: [
      {
        id: 'q1',
        question: 'Which URL is more suspicious?',
        options: ['https://login.microsoftonline.com', 'https://micr0soft-login.com/security'],
        correct_answer: 'https://micr0soft-login.com/security',
        explanation: 'Misspelled brand with extra path – classic phishing domain.'
      },
      {
        id: 'q2',
        question: 'A link claims to be PayPal but shows paypal.com.secure-checkout.info. What do you do?',
        options: ['Trust it because it has paypal.com', 'Treat as phishing'],
        correct_answer: 'Treat as phishing',
        explanation: 'Real domain is secure-checkout.info; paypal.com is just a subdomain fragment.'
      }
    ],
    stats: { attempts: 0, passed: 0, best_score: 0 }
  },
  {
    id: 'email-red-flags-1',
    title: 'Email Red Flags',
    description: 'Identify urgent and credential-stealing language.',
    difficulty: 'easy',
    time_limit: 180,
    points: 200,
    questions: [
      {
        id: 'q3',
        question: 'Subject: “URGENT: Verify your account now or it will be closed.” Safe or phishy?',
        options: ['Safe', 'Phishy'],
        correct_answer: 'Phishy',
        explanation: 'Urgency + threat of closure are common phishing tactics.'
      }
    ],
    stats: { attempts: 0, passed: 0, best_score: 0 }
  }
]

export default function Challenges() {
  const { data: challenges, loading, error } = useApi<Challenge[]>('/api/challenges')
  const { refreshUser, token } = useAuth()
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)
  const [activeQuestion, setActiveQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [started, setStarted] = useState(false)
  const [practiceMode, setPracticeMode] = useState(false)
  const [pendingAnswer, setPendingAnswer] = useState<{ questionId: string; answer: string } | null>(null)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const challengeList = (challenges && challenges.length > 0 ? challenges : FALLBACK_CHALLENGES)
  const usingFallback = !loading && (!challenges || challenges.length === 0 || !!error)

  useEffect(() => {
    if (!started || !selectedChallenge || timeLeft <= 0) return
        const timer = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(timer)
  }, [started, selectedChallenge, timeLeft])

  useEffect(() => {
    if (!started || !selectedChallenge || submitted || timeLeft > 0) return
    submitChallenge()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, started, selectedChallenge, submitted])

    const startChallenge = (challenge: Challenge, options?: { practiceMode?: boolean }) => {
    setSelectedChallenge(challenge)
    setAnswers({})
    setPendingAnswer(null)
    setSubmitted(false)
    setResult(null)
    setActiveQuestion(0)
    setTimeLeft(challenge.time_limit)
    setPracticeMode(Boolean(options?.practiceMode))
    setStarted(true)
  }

    const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => {
      if (prev[questionId]) return prev
      return { ...prev, [questionId]: answer }
    })
  }

    const queueAnswer = (questionId: string, answer: string) => {
    if (answers[questionId]) return
    setPendingAnswer({ questionId, answer })
  }

    const submitChallenge = async () => {
    if (!selectedChallenge) return

        const locallyGrade = () => {
      const total = selectedChallenge.questions.length
      let correct = 0
      selectedChallenge.questions.forEach(q => {
        if (q.correct_answer && answers[q.id] === q.correct_answer) correct += 1
      })
      const score = Math.round((correct / total) * 100)
      const passed = score >= 70
      const points_earned = passed ? selectedChallenge.points : 0
      return { passed, score, correct, total, points_earned }
    }

    if (practiceMode) {
      const data = locallyGrade()
      setResult({ ...data, points_earned: 0, practice_mode: true })
      setSubmitted(true)
      setToastMessage('Practice round complete. Review what you missed and try again.')
      setShowToast(true)
      return
    }

    try {
      const res = await fetch('/api/submit-challenge', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
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
        const passed = data.passed || data.score >= 70
        completeChallenge(selectedChallenge.id, selectedChallenge.points, passed)
        // Refresh user stats to get updated XP
        await refreshUser()
        setToastMessage(passed ? `Challenge passed. +${selectedChallenge.points} points earned.` : 'Keep trying. You can retake this challenge.')
        setShowToast(true)
        return
      }
    } catch (err) {
      console.error('Failed to submit to API, falling back to local grading:', err)
    }

    // Offline/local grading fallback
    const data = locallyGrade()
    setResult(data)
    setSubmitted(true)
    completeChallenge(selectedChallenge.id, selectedChallenge.points, data.passed)
    // Refresh user stats even in offline mode
    await refreshUser()
    setToastMessage(data.passed ? `Challenge passed. +${selectedChallenge.points} points earned.` : 'Keep trying. You can retake this challenge.')
    setShowToast(true)
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
    const selectedAnswer = answers[question.id]
    const pendingForCurrent = pendingAnswer?.questionId === question.id ? pendingAnswer.answer : null
    const hasAnswered = Boolean(selectedAnswer)
    const hasGroundTruth = Boolean(question.correct_answer)
    const isCorrect = hasGroundTruth && selectedAnswer === question.correct_answer
        const unansweredCount = selectedChallenge.questions.filter(q => !answers[q.id]).length

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
                    className={`flex items-center p-4 rounded-lg border-2 transition ${
                      hasAnswered && hasGroundTruth
                        ? option === question.correct_answer
                          ? 'border-green-500 bg-green-500/10'
                          : selectedAnswer === option
                            ? 'border-red-500 bg-red-500/10'
                            : 'border-slate-600 bg-slate-900/30'
                        : selectedAnswer === option
                          ? 'border-blue-500 bg-blue-500/10'
                          : pendingForCurrent === option
                            ? 'border-amber-500 bg-amber-500/10'
                          : 'border-slate-600 hover:border-slate-500 bg-slate-900/30'
                    } ${hasAnswered ? 'cursor-not-allowed opacity-95' : 'cursor-pointer'}`}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={option}
                      checked={answers[question.id] === option || pendingForCurrent === option}
                      onChange={() => queueAnswer(question.id, option)}
                      disabled={hasAnswered}
                      className="w-4 h-4 mr-3 flex-shrink-0"
                    />
                    <span className="text-white text-left flex-1">{option}</span>
                  </label>
                ))}
              </div>

              {!hasAnswered && pendingForCurrent && (
                <div className="mb-8 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
                  <p className="text-sm text-amber-100 mb-3">
                    Confirm this answer to lock it in. If you want a different option, click it before confirming.
                  </p>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => {
                        handleAnswer(question.id, pendingForCurrent)
                        setPendingAnswer(null)
                      }}
                    >
                      Confirm Answer
                    </Button>
                  </div>
                </div>
              )}

              {hasAnswered && (
                <div
                  className={`mb-8 rounded-lg border p-4 ${
                    !hasGroundTruth
                      ? 'border-blue-500/30 bg-blue-500/10'
                      : isCorrect
                        ? 'border-green-500/30 bg-green-500/10'
                        : 'border-amber-500/30 bg-amber-500/10'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold mb-2">
                    {!hasGroundTruth ? (
                      <>
                        <Lightbulb className="w-4 h-4 text-blue-300" />
                        <span className="text-blue-200">Answer recorded</span>
                      </>
                    ) : isCorrect ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-300" />
                        <span className="text-green-200">Correct - great catch</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-amber-300" />
                        <span className="text-amber-200">Not quite - here is what to look for</span>
                      </>
                    )}
                  </div>

                  {hasGroundTruth && !isCorrect && question.correct_answer && (
                    <p className="text-sm text-amber-100 mb-2">
                      Correct answer: <span className="font-semibold">{question.correct_answer}</span>
                    </p>
                  )}

                  {question.explanation && (
                    <p className="text-sm text-slate-100 leading-relaxed">{question.explanation}</p>
                  )}

                  <p className="text-xs text-slate-300 mt-3">
                    Answer locked for this question. Use the review screen to learn from mistakes.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Button
                  onClick={() => {
                    setPendingAnswer(null)
                    setActiveQuestion(Math.max(0, activeQuestion - 1))
                  }}
                  variant="secondary"
                  disabled={activeQuestion === 0}
                >
                  Previous
                </Button>

                {activeQuestion === selectedChallenge.questions.length - 1 ? (
                  <Button onClick={submitChallenge} variant="success" disabled={unansweredCount > 0}>
                    Submit Challenge
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setPendingAnswer(null)
                      setActiveQuestion(activeQuestion + 1)
                    }}
                    variant="primary"
                    disabled={!hasAnswered}
                  >
                    Next
                  </Button>
                )}
              </div>

              {unansweredCount > 0 && (
                <p className="text-xs text-slate-400 mt-4">
                  {unansweredCount} question{unansweredCount === 1 ? '' : 's'} remaining before submit.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    )
  }

  // Challenge submitted
  if (submitted && result) {
    const missedQuestions = selectedChallenge?.questions.filter(
      q => q.correct_answer && answers[q.id] !== q.correct_answer
    ) || []

    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div
            className={`mb-8 p-12 rounded-lg border-2 backdrop-blur-xl text-center ${
              result.passed
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div className="text-6xl mb-4">
              {result.passed ? <Trophy className="w-16 h-16 mx-auto text-green-400" /> : <XCircle className="w-16 h-16 mx-auto text-red-400" />}
            </div>
            <h1 className={`text-4xl font-bold mb-2 ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
              {result.practice_mode ? 'Practice Review' : result.passed ? 'Challenge Passed' : 'Keep Trying'}
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
            {missedQuestions.length > 0 && (
              <Button
                onClick={() => {
                  if (!selectedChallenge) return
                  startChallenge(
                    {
                      ...selectedChallenge,
                      id: `${selectedChallenge.id}-retry`,
                      title: `${selectedChallenge.title} (Missed Questions)`,
                      description: 'Practice only the questions you missed.',
                      questions: missedQuestions,
                    },
                    { practiceMode: true }
                  )
                }}
                variant="secondary"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry Missed
              </Button>
            )}
          </div>

          <Card>
            <CardContent>
              <h2 className="text-2xl font-bold text-white mb-2">Answer Review</h2>
              <p className="text-slate-400 mb-6">See what was correct, what was missed, and why.</p>

              <div className="space-y-4">
                {selectedChallenge?.questions.map((q, idx) => {
                  const chosen = answers[q.id]
                  const hasGroundTruth = Boolean(q.correct_answer)
                  const correct = hasGroundTruth && chosen === q.correct_answer

                  return (
                    <div
                      key={q.id}
                      className={`rounded-lg border p-4 ${
                        !hasGroundTruth
                          ? 'border-blue-500/30 bg-blue-500/5'
                          : correct
                            ? 'border-green-500/30 bg-green-500/5'
                            : 'border-red-500/30 bg-red-500/5'
                      }`}
                    >
                      <p className="text-xs text-slate-400 mb-2">Question {idx + 1}</p>
                      <p className="text-white font-semibold mb-3">{q.question}</p>

                      <p className="text-sm text-slate-300 mb-1">
                        Your answer: <span className="font-semibold text-slate-100">{chosen || 'No answer'}</span>
                      </p>

                      {q.correct_answer && (
                        <p className="text-sm text-slate-300 mb-2">
                          Correct answer: <span className="font-semibold text-green-300">{q.correct_answer}</span>
                        </p>
                      )}

                      {q.explanation && (
                        <p className="text-sm text-slate-200 leading-relaxed">{q.explanation}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
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
          {usingFallback && (
            <div className="mt-3 flex items-center gap-2 text-amber-300 text-sm">
              <AlertTriangle className="w-4 h-4" />
              Showing sample challenges (API unavailable)
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {challengeList.map(challenge => {
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
