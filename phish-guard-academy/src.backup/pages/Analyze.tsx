/**
 * Analyze component/module file.
  * This file defines the Analyze page component for the PhishGuard Academy application. The Analyze page allows users to upload screenshots, paste email content, or enter URLs to analyze them for phishing indicators. The component handles user input, communicates with the backend API to perform analysis, and displays the results in a clear and informative way.
  * The Analyze component includes the following responsibilities:
  * - Handling user input for different analysis methods (screenshot, email text, URL).
  * - Communicating with the backend API to perform analysis.
  * - Displaying the analysis results in a clear and informative way.
  * - Providing visual feedback during the analysis process.
  * - Offering actionable recommendations based on the analysis results.
 */

import { Zap, AlertCircle, CheckCircle, Info, Eye, Send } from 'lucide-react'
import { useState } from 'react'

interface URLInfo {
  url: string
  score: number
  suspicious: boolean
  reasons: string[]
  ml_risk_percent?: number
}

interface AnalysisResult {
  ocr_text: string
  urls: URLInfo[]
  overall_risk_percent: number
  detected_phrases: string[]
  phrase_risk_percent: number
  model_risk_percent: number
  url_risk_percent: number
}

export default function Analyze() {
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [activeTab, setActiveTab] = useState<'screenshot' | 'email' | 'url'>('screenshot')

    const analyzeScreenshot = async () => {
    if (!file) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/analyze_screenshot', { method: 'POST', body: formData })
      if (res.ok) setResult(await res.json())
    } catch (err) {
      console.error('Analysis failed:', err)
    } finally {
      setLoading(false)
    }
  }

    const analyzeText = async () => {
    if (!text && !url) return
    setLoading(true)
    try {
      const res = await fetch('/analyze_text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, url })
      })
      if (res.ok) setResult(await res.json())
    } catch (err) {
      console.error('Analysis failed:', err)
    } finally {
      setLoading(false)
    }
  }

    const getRiskColor = (percent: number) => {
    if (percent >= 70) return 'text-red-500 bg-red-500/10'
    if (percent >= 40) return 'text-orange-500 bg-orange-500/10'
    return 'text-green-500 bg-green-500/10'
  }

    const getRiskLevel = (percent: number) => {
    if (percent >= 70) return 'HIGH RISK'
    if (percent >= 40) return 'MEDIUM RISK'
    return 'SAFE'
  }

    const getRecommendations = (percent: number) => {
    if (percent >= 70) {
      return [
        '⛔ DO NOT click any links or download attachments',
        '⛔ DO NOT enter personal or financial information',
        '🔴 Report to your IT/Security team immediately',
        '🔴 Mark as spam/phishing if possible',
        '📸 Take a screenshot for your records'
      ]
    }
    if (percent >= 40) {
      return [
        '⚠️ Be cautious before clicking links',
        '⚠️ Verify the sender through another method',
        '⚠️ Hover over links to see actual URL',
        '⚠️ Check for spelling/grammar errors',
        '⚠️ Contact your IT team if unsure'
      ]
    }
    return [
      '✅ Appears to be legitimate',
      '✅ Safe to interact with cautiously',
      '✅ Standard security practices still apply',
      '✅ Keep antivirus/firewall enabled',
      '✅ Report suspicious emails even if they pass checks'
    ]
  }

  if (result) {
    const risk = result.overall_risk_percent
    const riskColor = getRiskColor(risk)
    const riskLevel = getRiskLevel(risk)
    const recommendations = getRecommendations(risk)

    return (
      <div className="w-full px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Risk Banner */}
          <div className={`mb-8 p-8 rounded-lg border-2 ${
            risk >= 70 ? 'bg-red-500/10 border-red-500/30' :
            risk >= 40 ? 'bg-orange-500/10 border-orange-500/30' :
            'bg-green-500/10 border-green-500/30'
          }`}>
            <div className="flex items-start justify-between">
              <div>
                <h1 className={`text-5xl font-bold mb-2 ${riskColor}`}>
                  {risk}%
                </h1>
                <p className={`text-2xl font-bold ${riskColor}`}>
                  {riskLevel}
                </p>
              </div>
              <div className={`text-6xl ${riskColor}`}>
                {risk >= 70 ? '🚨' : risk >= 40 ? '⚠️' : '✅'}
              </div>
            </div>
          </div>

          {/* Risk Breakdown */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-4 backdrop-blur-xl">
              <p className="text-slate-400 mb-2">Visual Analysis</p>
              <p className="text-3xl font-bold text-blue-400">{result.model_risk_percent}%</p>
              <p className="text-xs text-slate-500 mt-1">Screenshot patterns & design</p>
            </div>
            <div className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-4 backdrop-blur-xl">
              <p className="text-slate-400 mb-2">URL Risk</p>
              <p className="text-3xl font-bold text-orange-400">{result.url_risk_percent}%</p>
              <p className="text-xs text-slate-500 mt-1">{result.urls.length} URLs detected</p>
            </div>
            <div className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-4 backdrop-blur-xl">
              <p className="text-slate-400 mb-2">Text Phrases</p>
              <p className="text-3xl font-bold text-red-400">{result.phrase_risk_percent}%</p>
              <p className="text-xs text-slate-500 mt-1">{result.detected_phrases.length} suspicious phrases</p>
            </div>
          </div>

          {/* Recommendations */}
          <div className={`mb-8 p-6 rounded-lg border ${
            risk >= 70 ? 'bg-red-500/10 border-red-500/30' :
            risk >= 40 ? 'bg-orange-500/10 border-orange-500/30' :
            'bg-green-500/10 border-green-500/30'
          }`}>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              What You Should Do
            </h2>
            <ul className="space-y-2">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="text-white flex items-start gap-3">
                  <span className="mt-1">{rec.split(' ')[0]}</span>
                  <span>{rec.substring(rec.indexOf(' ') + 1)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Details */}
          {result.detected_phrases.length > 0 && (
            <div className="mb-8 bg-slate-800/30 border border-blue-500/20 rounded-lg p-6 backdrop-blur-xl">
              <h3 className="font-bold text-white mb-4">Suspicious Phrases Found</h3>
              <div className="flex flex-wrap gap-2">
                {result.detected_phrases.map((p, i) => (
                  <span key={i} className="px-3 py-1 bg-red-500/20 border border-red-500/30 rounded text-red-300 text-sm">
                    "{p}"
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.urls.length > 0 && (
            <div className="mb-8 bg-slate-800/30 border border-blue-500/20 rounded-lg p-6 backdrop-blur-xl">
              <h3 className="font-bold text-white mb-4">URLs Detected</h3>
              <div className="space-y-3">
                {result.urls.map((u, i) => (
                  <div key={i} className="p-3 bg-slate-900/50 rounded border border-slate-700">
                    <p className="text-blue-400 text-sm break-all mb-1">{u.url}</p>
                    <div className="flex items-center gap-2">
                      {u.suspicious ? (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      )}
                      <span className="text-xs text-slate-400">
                        Risk: {u.ml_risk_percent || Math.round(u.score * 100)}%
                      </span>
                    </div>
                    {u.reasons.length > 0 && (
                      <p className="text-xs text-slate-500 mt-2">
                        Issues: {u.reasons.join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setResult(null)}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition"
          >
            Analyze Something Else
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-white mb-2">Analyze for Phishing</h1>
          <p className="text-slate-400">Upload screenshots, paste emails, or check URLs for phishing indicators</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-700">
          {['screenshot', 'email', 'url'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-3 font-medium transition ${
                activeTab === tab
                  ? 'text-blue-400 border-b-2 border-blue-500'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Screenshot Upload */}
        {activeTab === 'screenshot' && (
          <div className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-8 backdrop-blur-xl mb-8">
            <div className="border-2 border-dashed border-slate-600 rounded-lg p-12 text-center mb-6 hover:border-slate-500 transition cursor-pointer"
              onDrop={(e) => { e.preventDefault(); setFile(e.dataTransfer.files[0]) }}
              onDragOver={(e) => e.preventDefault()}>
              <Eye className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-white font-bold mb-2">Drop screenshot here or click to browse</p>
              <p className="text-slate-400 text-sm">PNG, JPG, GIF up to 8MB</p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="file-input"
              />
              <label htmlFor="file-input" className="cursor-pointer">Click here to browse</label>
            </div>
            {file && <p className="text-slate-300 mb-6">Selected: {file.name}</p>}
            <button
              onClick={analyzeScreenshot}
              disabled={!file || loading}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold transition flex items-center justify-center gap-2"
            >
              {loading ? 'Analyzing...' : <><Zap className="w-5 h-5" /> Analyze Screenshot</>}
            </button>
          </div>
        )}

        {/* Email/Text */}
        {activeTab === 'email' && (
          <div className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-8 backdrop-blur-xl mb-8">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste email content here..."
              className="w-full h-40 p-4 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 mb-6"
            />
            <button
              onClick={analyzeText}
              disabled={!text || loading}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold transition flex items-center justify-center gap-2"
            >
              {loading ? 'Analyzing...' : <><Zap className="w-5 h-5" /> Analyze Email</>}
            </button>
          </div>
        )}

        {/* URL Check */}
        {activeTab === 'url' && (
          <div className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-8 backdrop-blur-xl mb-8">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full p-4 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 mb-6"
            />
            <button
              onClick={analyzeText}
              disabled={!url || loading}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold transition flex items-center justify-center gap-2"
            >
              {loading ? 'Checking...' : <><Send className="w-5 h-5" /> Check URL</>}
            </button>
          </div>
        )}

        {/* Tips */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
          <h3 className="font-bold text-blue-400 mb-3">💡 Analysis Tips</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Look for official company logos and branding (phishing often has poor design)</li>
            <li>• Check sender email address carefully (not just display name)</li>
            <li>• Hover over links to see actual URL (don't click!)</li>
            <li>• Real companies never ask for passwords via email</li>
            <li>• Look for urgency, fear, or unusual requests as red flags</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
