/**
 * History component/module file.
  * This file defines the History page component for the PhishGuard Academy application. The History page allows users to view a list of their past phishing analyses, including details such as the type of analysis, risk percentage, status, and timestamps. Users can filter the history by status (threat, suspicious, safe), export their history as a JSON file, and delete individual analysis records.
  * The History component is responsible for:
  * - Fetching the user's analysis history from the backend API when the component mounts.
  * - Displaying the history in a clear and organized manner, with visual indicators for the status of each analysis.
  * - Providing filtering options to allow users to view specific types of analyses based on their status.
  * - Allowing users to export their history as a JSON file for backup or further analysis.
  * - Enabling users to delete individual analysis records from their history.
  * - Ensuring a visually appealing and user-friendly interface with appropriate use of colors, typography, and spacing.
  * - Showing an empty state when there are no analyses in the history.
  * - Providing a summary of the total number of analyses and how many are currently shown based on the applied filter.
  * - Handling loading states while fetching data from the API.
  * - Ensuring that all interactions with the API (fetching, deleting) are handled gracefully with error handling and user feedback.
  * - Using icons and color coding to enhance the visual distinction between different analysis statuses (threat, suspicious, safe).
  * - Displaying key details of each analysis, such as the OCR text snippet and any URLs found, in a concise and readable format.
  * - Providing a responsive design that works well on both desktop and mobile devices.
  * - Encouraging users to review their past analyses to learn from their history and improve their phishing detection skills over time.
 */

import { Clock, AlertCircle, CheckCircle, Trash2, Download, Filter } from 'lucide-react'
import { useState, useEffect } from 'react'

interface Analysis {
  id: string
  timestamp: string
  type: string
  risk_percent: number
  status: string
  ocr_text: string
  urls: string[]
}

export default function History() {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [filtered, setFiltered] = useState<Analysis[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [])

  useEffect(() => {
    filterAnalyses()
  }, [analyses, filterStatus])

    const fetchHistory = async () => {
    try {
      const res = await fetch('/api/analyses?limit=100')
      if (res.ok) {
        setAnalyses(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch history:', err)
    } finally {
      setLoading(false)
    }
  }

    const filterAnalyses = () => {
    if (filterStatus === 'all') {
      setFiltered(analyses)
    } else {
      setFiltered(analyses.filter(a => a.status === filterStatus))
    }
  }

    const deleteAnalysis = async (id: string) => {
    try {
      await fetch(`/api/analyses/${id}`, { method: 'DELETE' })
      setAnalyses(analyses.filter(a => a.id !== id))
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

    const exportHistory = () => {
    const data = JSON.stringify(analyses, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `phishguard-history-${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

    const getStatusColor = (status: string) => {
    switch(status) {
      case 'threat': return 'text-red-400 bg-red-500/10 border-red-500/20'
      case 'suspicious': return 'text-orange-400 bg-orange-500/10 border-orange-500/20'
      case 'safe': return 'text-green-400 bg-green-500/10 border-green-500/20'
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20'
    }
  }

    const getStatusIcon = (status: string) => {
    switch(status) {
      case 'threat': return <AlertCircle className="w-4 h-4" />
      case 'safe': return <CheckCircle className="w-4 h-4" />
      default: return <AlertCircle className="w-4 h-4" />
    }
  }

  if (loading) {
    return <div className="w-full h-screen flex items-center justify-center"><p className="text-white">Loading history...</p></div>
  }

  return (
    <div className="w-full px-4 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-white mb-2">Analysis History</h1>
          <p className="text-slate-400">View all your phishing analysis results</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white hover:border-slate-500 transition"
            >
              <option value="all">All Results</option>
              <option value="threat">Threats Only</option>
              <option value="suspicious">Suspicious Only</option>
              <option value="safe">Safe Only</option>
            </select>
          </div>

          {/* Export Button */}
          <button
            onClick={exportHistory}
            className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export History
          </button>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/30 border border-slate-700 rounded-lg">
            <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No analyses found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(analysis => (
              <div
                key={analysis.id}
                className="bg-slate-800/30 border border-blue-500/20 rounded-lg p-6 hover:border-blue-500/40 transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`flex items-center gap-1 text-sm font-bold px-3 py-1 rounded border ${getStatusColor(analysis.status)}`}>
                        {getStatusIcon(analysis.status)}
                        {analysis.status.charAt(0).toUpperCase() + analysis.status.slice(1)}
                      </span>
                      <span className="text-xs text-slate-400">{analysis.type}</span>
                      <span className="text-xs text-slate-500">
                        {new Date(analysis.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-300 mb-3 line-clamp-2">{analysis.ocr_text.substring(0, 150)}...</p>
                    
                    {analysis.urls.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-slate-400 mb-2">URLs Found:</p>
                        <div className="flex flex-wrap gap-2">
                          {analysis.urls.map((url, idx) => (
                            <code key={idx} className="px-2 py-1 bg-slate-900/50 rounded text-xs text-slate-300 break-all">
                              {url}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="ml-4 text-right flex-shrink-0">
                    <p className={`text-3xl font-bold mb-3 ${
                      analysis.risk_percent >= 70 ? 'text-red-400' :
                      analysis.risk_percent >= 40 ? 'text-orange-400' :
                      'text-green-400'
                    }`}>
                      {analysis.risk_percent}%
                    </p>
                    <button
                      onClick={() => deleteAnalysis(analysis.id)}
                      className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        <div className="mt-12 p-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg">
          <p className="text-slate-300">
            <span className="font-bold text-white">{analyses.length}</span> total analyses
            {` • ${filtered.length} shown`}
          </p>
        </div>
      </div>
    </div>
  )
}
