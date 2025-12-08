import React, { useState } from 'react';
import { CheckCircle, AlertCircle, Lock, Unlock } from 'lucide-react';
import Layout from '../components/Layout';

export default function Challenges() {
  const [selectedChallenge, setSelectedChallenge] = useState<number | null>(null);
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  const challenges = [
    {
      id: 1,
      title: 'Spot the Fake Login',
      difficulty: 'Easy',
      description: 'Identify the phishing email from three options',
      points: 10,
      content: 'Which email is the phishing attempt?\n\nOption A: Email from your bank with HTTPS link\nOption B: Email asking to "verify account immediately"\nOption C: Official notification with company branding',
      answer: 'B',
    },
    {
      id: 2,
      title: 'URL Detective',
      difficulty: 'Medium',
      description: 'Analyze suspicious URLs and find the red flags',
      points: 25,
      content: 'Analyze this URL: http://secure-bank-verif1.tk/login.php\n\nRed flags:\n- Missing HTTPS\n- Suspicious TLD (.tk)\n- Extra characters in domain\n- Suspicious path',
      answer: 'All of the above',
    },
    {
      id: 3,
      title: 'Design Analysis',
      difficulty: 'Hard',
      description: 'Identify phishing based on design and layout',
      points: 50,
      content: 'Phishing sites often have:\n- Inconsistent colors\n- Poor alignment\n- Multiple urgent buttons\n- No contact information\n- Suspicious footer',
      answer: 'Visual inconsistencies',
    },
  ];

  const toggleChallenge = (id: number) => {
    const newCompleted = new Set(completed);
    if (newCompleted.has(id)) {
      newCompleted.delete(id);
    } else {
      newCompleted.add(id);
    }
    setCompleted(newCompleted);
  };

  const totalPoints = Array.from(completed).reduce((sum, id) => {
    const challenge = challenges.find(c => c.id === id);
    return sum + (challenge?.points || 0);
  }, 0);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Interactive Challenges
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl">
            Test your phishing detection skills with real-world scenarios
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-white font-semibold">Your Progress</h2>
            <span className="text-2xl font-bold text-blue-400">{totalPoints} points</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all"
              style={{ width: `${(completed.size / challenges.length) * 100}%` }}
            />
          </div>
          <p className="text-sm text-slate-400 mt-2">{completed.size} of {challenges.length} completed</p>
        </div>

        {/* Challenges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {challenges.map(challenge => (
            <div
              key={challenge.id}
              className={`border rounded-lg p-6 cursor-pointer transition ${
                completed.has(challenge.id)
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
              }`}
              onClick={() => setSelectedChallenge(selectedChallenge === challenge.id ? null : challenge.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-white font-bold text-lg">{challenge.title}</h3>
                  <p className="text-sm text-slate-400">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      challenge.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                      challenge.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {challenge.difficulty}
                    </span>
                  </p>
                </div>
                {completed.has(challenge.id) ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <Lock className="w-6 h-6 text-slate-400" />
                )}
              </div>

              <p className="text-slate-300 text-sm mb-4">{challenge.description}</p>

              <div className="flex items-center justify-between">
                <span className="text-blue-400 font-bold">+{challenge.points} points</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleChallenge(challenge.id);
                  }}
                  className={`px-3 py-1 rounded text-sm font-medium transition ${
                    completed.has(challenge.id)
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {completed.has(challenge.id) ? '✓ Completed' : 'Start'}
                </button>
              </div>

              {/* Challenge Details */}
              {selectedChallenge === challenge.id && (
                <div className="mt-6 pt-6 border-t border-slate-700/50">
                  <p className="text-slate-300 whitespace-pre-wrap text-sm mb-4">{challenge.content}</p>
                  <div className="bg-slate-900/50 border border-slate-700/50 rounded p-4">
                    <p className="text-sm text-slate-400 mb-2">Answer:</p>
                    <p className="text-green-400 font-mono">{challenge.answer}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
