import { Zap, AlertCircle, Eye, Send, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import { MainLayout } from '../components/layout/MainLayout'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Toast } from '../components/ui/Toast'
import { AnalysisResult } from '../types'
import { recordAnalysis } from '../utils/storage'
import { useAuth } from '../contexts/AuthContext'

export default function Analyze() {
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [activeTab, setActiveTab] = useState<'screenshot' | 'email' | 'url'>('screenshot')
  const [error, setError] = useState<string | null>(null)
  const [showToast, setShowToast] = useState(false)
  const [screenshotForMarkup, setScreenshotForMarkup] = useState<string | null>(null)
  const { refreshUser, token } = useAuth()

  const analyzeScreenshot = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      // Store file for markup display
      const reader = new FileReader()
      reader.onload = (e) => {
        setScreenshotForMarkup(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      
      const formData = new FormData()
      formData.append('image', file)
      const res = await fetch('/api/analyze', { 
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      })
      if (res.ok) {
        const analysisResult = await res.json()
        setResult(analysisResult)
        // Record the analysis
        recordAnalysis({
          risk: analysisResult.risk,
          type: 'screenshot',
          findings: analysisResult.findings?.length || 0
        })
        // Refresh user stats to get updated XP
        await refreshUser()
        // Show success notification
        setShowToast(true)
      } else {
        setError('Failed to analyze screenshot')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error analyzing')
    } finally {
      setLoading(false)
    }
  }

  const analyzeText = async () => {
    if (!text && !url) return
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('text', text)
      formData.append('url', url)
      const res = await fetch('/api/analyze', { 
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      })
      if (res.ok) {
        const analysisResult = await res.json()
        setResult(analysisResult)
        // Record the analysis
        recordAnalysis({
          risk: analysisResult.risk,
          type: url ? 'url' : 'text',
          findings: analysisResult.findings?.length || 0
        })
        // Refresh user stats to get updated XP
        await refreshUser()
      } else {
        setError('Failed to analyze')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error analyzing')
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (percent: number) => {
    if (percent >= 70) return 'text-red-500'
    if (percent >= 40) return 'text-orange-500'
    return 'text-green-500'
  }

  const getRiskBg = (percent: number) => {
    if (percent >= 70) return 'bg-red-500/10 border-red-500/30'
    if (percent >= 40) return 'bg-orange-500/10 border-orange-500/30'
    return 'bg-green-500/10 border-green-500/30'
  }

  const getRecommendations = (percent: number) => {
    if (percent >= 70) {
      return [
        '⛔ DO NOT click any links or download attachments',
        '⛔ DO NOT enter personal or financial information',
        '🔴 Report to your IT/Security team immediately',
        '🔴 Mark as spam/phishing if possible',
        '📸 Take a screenshot for your records',
      ]
    }
    if (percent >= 40) {
      return [
        '⚠️ Be cautious before clicking links',
        '⚠️ Verify the sender through another method',
        '⚠️ Hover over links to see actual URL',
        '⚠️ Check for spelling/grammar errors',
        '⚠️ Contact your IT team if unsure',
      ]
    }
    return [
      '✅ Appears to be legitimate',
      '✅ Safe to interact with cautiously',
      '✅ Standard security practices still apply',
      '✅ Keep antivirus/firewall enabled',
      '✅ Report suspicious emails even if they pass checks',
    ]
  }

  if (result) {
    const risk = result.risk
    const recommendations = getRecommendations(risk)

    return (
      <MainLayout>
        <div className="w-full px-4 py-12">
          <div className="max-w-4xl mx-auto">
            {/* Risk Banner */}
            <div className={`mb-8 p-8 rounded-lg border-2 ${getRiskBg(risk)}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-5xl font-bold mb-2 ${getRiskColor(risk)}`}>{risk}%</p>
                  <p className={`text-2xl font-bold ${getRiskColor(risk)}`}>
                    {risk >= 70 ? 'HIGH RISK' : risk >= 40 ? 'MEDIUM RISK' : 'SAFE'}
                  </p>
                </div>
                <div className="text-6xl">{risk >= 70 ? '🚨' : risk >= 40 ? '⚠️' : '✅'}</div>
              </div>
            </div>

            {/* Screenshot with Markup */}
            {screenshotForMarkup && (
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-white mb-4">Analysis Visualization</h3>
                <Card>
                  <div className="relative inline-block w-full">
                    <img 
                      src={screenshotForMarkup} 
                      alt="Analyzed screenshot" 
                      className="w-full rounded-lg border border-slate-600"
                    />
                    {/* Overlay boxes for detected elements */}
                    {result.boxes && result.boxes.length > 0 && (
                      <svg 
                        className="absolute top-0 left-0 w-full h-full pointer-events-none"
                        style={{aspectRatio: 'auto'}}
                      >
                        {result.boxes.map((box, idx) => {
                          const [x1, y1, x2, y2] = box
                          if (!x1 || !y1 || !x2 || !y2) return null
                          return (
                            <rect
                              key={idx}
                              x={`${(x1 / 1000) * 100}%`}
                              y={`${(y1 / 1000) * 100}%`}
                              width={`${((x2-x1) / 1000) * 100}%`}
                              height={`${((y2-y1) / 1000) * 100}%`}
                              fill="none"
                              stroke="#ef4444"
                              strokeWidth="2"
                              opacity="0.8"
                            />
                          )
                        })}
                      </svg>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm mt-2">Red boxes indicate detected suspicious elements</p>
                </Card>
              </div>
            )}

            {/* Findings */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-4">Analysis Findings</h3>
              <div className="space-y-3">
                {result.findings?.map((finding, i) => (
                  <Card key={i}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        finding.severity === 'high' ? 'bg-red-500/20' :
                        finding.severity === 'med' ? 'bg-orange-500/20' :
                        'bg-green-500/20'
                      }`}>
                        {finding.severity === 'high' ? '🚨' :
                         finding.severity === 'med' ? '⚠️' : 'ℹ️'}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-white mb-1">{finding.label}</h4>
                        <p className="text-slate-400 text-sm">{finding.detail}</p>
                      </div>
                      <Badge variant={
                        finding.severity === 'high' ? 'error' :
                        finding.severity === 'med' ? 'warning' :
                        'success'
                      }>
                        {finding.severity.toUpperCase()}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <Alert variant={risk >= 70 ? 'error' : risk >= 40 ? 'warning' : 'success'} title="What You Should Do">
              <ul className="space-y-2 mt-2">
                {recommendations.map((rec, i) => (
                  <li key={i} className="text-white">{rec}</li>
                ))}
              </ul>
            </Alert>

            <Button
              onClick={() => setResult(null)}
              fullWidth
              className="mt-8"
            >
              Analyze Something Else
            </Button>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="w-full px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <h1 className="text-5xl font-bold text-white mb-2">Analyze for Phishing</h1>
            <p className="text-slate-400">Upload screenshots, paste emails, or check URLs</p>
          </div>

          {error && <Alert variant="error" title="Error">{error}</Alert>}

          <div className="mb-6">
            <Alert variant="info" title="Reminder">
              <p className="text-sm text-slate-200">
                Our analysis blends machine learning and threat intelligence, but it can still be wrong. Double-check sensitive requests, and follow your organization&apos;s policies even when results look safe.
              </p>
            </Alert>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-8 border-b border-slate-700">
            {(['screenshot', 'email', 'url'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
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
            <Card>
              <CardContent>
                <div
                  className="border-2 border-dashed border-slate-600 rounded-lg p-12 text-center cursor-pointer hover:border-slate-500 transition"
                  onDrop={(e) => {
                    e.preventDefault()
                    setFile(e.dataTransfer.files[0])
                  }}
                  onDragOver={(e) => e.preventDefault()}
                >
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
                  <label htmlFor="file-input" className="cursor-pointer text-blue-400 hover:text-blue-300">
                    Click here to browse
                  </label>
                </div>
                {file && <p className="text-slate-300 mt-4">Selected: {file.name}</p>}
                <Button
                  onClick={analyzeScreenshot}
                  disabled={!file || loading}
                  fullWidth
                  className="mt-6"
                >
                  {loading ? 'Analyzing...' : 'Analyze Screenshot'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Email/Text */}
          {activeTab === 'email' && (
            <Card>
              <CardContent>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste email content here..."
                  className="w-full h-40 p-4 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 mb-4"
                />
                <Button onClick={analyzeText} disabled={!text || loading} fullWidth>
                  {loading ? 'Analyzing...' : 'Analyze Email'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* URL */}
          {activeTab === 'url' && (
            <Card>
              <CardContent>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full p-4 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 mb-4"
                />
                <Button onClick={analyzeText} disabled={!url || loading} fullWidth>
                  {loading ? 'Checking...' : 'Check URL'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Tips */}
          <div className="mt-8">
            <Alert variant="info" title="💡 Analysis Tips">
              <ul className="space-y-1 text-sm mt-2">
                <li>• Look for official logos and branding</li>
                <li>• Check sender email address carefully</li>
                <li>• Hover over links to see actual URL</li>
                <li>• Real companies never ask for passwords via email</li>
                <li>• Look for urgency, fear, or unusual requests</li>
              </ul>
            </Alert>
          </div>
        </div>
        
        {showToast && (
          <Toast
            message="✅ Analysis recorded! Check Analytics to see your progress."
            type="success"
            onClose={() => setShowToast(false)}
          />
        )}
      </div>
    </MainLayout>
  )
}
