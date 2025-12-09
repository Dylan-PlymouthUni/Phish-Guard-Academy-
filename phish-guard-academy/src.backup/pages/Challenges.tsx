import { Target, Clock, Trophy, CheckCircle, XCircle, BarChart3 } from 'lucide-react'
import { useState, useEffect } from 'react'

interface Challenge {
  id: string
  title: string
  description: string
  difficulty: string
  time_limit: number
  points_reward: number
  passing_score: number
  questions: Array<{
    id: string
    question: string
    options: string[]
    correct_answer: string
    explanation: string
  }>
  stats?: {
    attempts: number
    passed: number
    best_score: number
  }
}

export default function Challenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)
  const [activeQuestion, setActiveQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState(0)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    fetchChallenges()
  }, [])

  useEffect(() => {
    if (!started || !selectedChallenge || timeLeft <= 0) return
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(timer)
  }, [started, selectedChallenge, timeLeft])

  const fetchChallenges = async () => {
    try {
      const res = await fetch('/api/challenges')
      if (res.ok) setChallenges(await res.json())
    } catch (err) {
      console.error('Failed to fetch challenges:', err)
    } finally {
      setLoading(false)
    }
  }

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
          time_taken: selectedChallenge.time_limit - timeLeft
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        setResult(data)
        setSubmitted(true)
        fetchChallenges()
      }
    } catch (err) {
      console.error('Failed to submit:', err)
    }
  }

  const getDifficultyColor = (diff: string) => {
    switch(diff) {
      case 'easy': return 'text-green-400 bg-green-500/10 border-green-500/20'
      case 'medium': return 'text-orange-400 bg-orange-500/10 border-orange-500/20'
      case 'hard': return 'text-red-400 bg-red-500/10 border-red-500/20'
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20'
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return <div className="w-full h-screen flex items-center justify-center"><p className="text-white">Loading...</p></div>
  }

  // Challenge in progress
  if (selectedChallenge && !submitted) {
    const question = selectedChallenge.questions[activeQuestion]
    const progress = ((activeQuestion + 1) / selectedChallenge.questions.length) * 100
    
    return (
      <div className="w-full px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">{selectedChallenge.title}</h1>
              <p className="text-slate-400 mt-2">Question {activeQuestion + 1} of {selectedChallenge.questions.length}</p>
            </div>
            <div className={`text-4xl font-bold ${timeLeft < 60 ? 'text-red-400' : 'text-blue-400'}`}>
              {formatTime(timeLeft)}
            </div>
          </div>

          <div className="mb-8 w-full bg-slate-800 rounded-full h-2">
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all" style={{ width: `${progress}%` }} />
          </div>

          <div className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-8 backdrop-blur-xl mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">{question.question}</h2>

            <div className="space-y-3 mb-8">
              {question.options.map((option, idx) => (
                <label key={idx} className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                  answers[question.id] === option
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-600 hover:border-slate-500 bg-slate-900/30'
                }`}>
                  <input
                    type="radio"
                    name={question.id}
                    value={option}
                    checked={answers[question.id] === option}
                    onChange={() => handleAnswer(question.id, option)}
                    className="mr-3"
                  />
                  <span className="text-white">{option}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveQuestion(Math.max(0, activeQuestion - 1))}
                disabled={activeQuestion === 0}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg transition"
              >
                Previous
              </button>

              {activeQuestion === selectedChallenge.questions.length - 1 ? (
                <button
                  onClick={submitChallenge}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition"
                >
                  Submit Challenge
                </button>
              ) : (
                <button
                  onClick={() => setActiveQuestion(activeQuestion + 1)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Challenge submitted
  if (submitted && result) {
    return (
      <div className="w-full px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <div className={`mb-8 p-12 rounded-lg border-2 backdrop-blur-xl ${
            result.passed
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}>
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
              You got {result.correct} out of {result.total} questions correct
            </p>
            {result.points_earned > 0 && (
              <p className="text-yellow-400 font-bold text-lg">+{result.points_earned} points earned!</p>
            )}
          </div>

          <div className="flex gap-4 justify-center mb-12">
            <button
              onClick={() => {
                setSelectedChallenge(null)
                setSubmitted(false)
              }}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition"
            >
              Back to Challenges
            </button>
            {!result.passed && (
              <button
                onClick={() => startChallenge(selectedChallenge!)}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition"
              >
                Retry Challenge
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Challenge list
  return (
    <div className="w-full px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-white mb-2">Challenges</h1>
          <p className="text-slate-400">Test your phishing detection skills and earn points</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {challenges.map(challenge => {
            const stats = challenge.stats || { attempts: 0, passed: 0, best_score: 0 }
            const completed = stats.passed > 0
            
            return (
              <div
                key={challenge.id}
                className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-6 hover:border-blue-500/40 transition backdrop-blur-xl cursor-pointer"
                onClick={() => startChallenge(challenge)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">{challenge.title}</h3>
                    <p className="text-slate-400 text-sm">{challenge.description}</p>
                  </div>
                  {completed && <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />}
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <span className={`text-xs font-bold px-2 py-1 rounded border ${getDifficultyColor(challenge.difficulty)}`}>
                    {challenge.difficulty}
                  </span>
                  <span className="text-sm text-slate-400 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {Math.floor(challenge.time_limit / 60)} min
                  </span>
                  <span className="text-sm text-yellow-400 font-bold flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    +{challenge.points_reward} pts
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

                <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition">
                  {completed ? 'Retry' : 'Start Challenge'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
