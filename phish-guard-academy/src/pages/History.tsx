/**
 * History component/module file.
  * This file defines the History page, which displays a list of past phishing analyses performed by the user in the PhishGuard Academy application.
 */

import { Clock, AlertCircle, CheckCircle, Trash2, Download, Filter } from 'lucide-react'
import { useState, useEffect } from 'react'
import { MainLayout } from '../components/layout/MainLayout'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { getProgress, saveProgress } from '../utils/storage'

interface Analysis {
  id: string
  timestamp: string
  type: string
  risk: number
  findings: number
}

export default function History() {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [filtered, setFiltered] = useState<Analysis[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    fetchHistory()
  }, [])

  useEffect(() => {
    filterAnalyses()
  }, [analyses, filterStatus])

    const fetchHistory = () => {
    const progress = getProgress()
    setAnalyses(progress.analyses_performed || [])
  }

    const filterAnalyses = () => {
    if (filterStatus === 'all') {
      setFiltered(analyses)
    } else if (filterStatus === 'high') {
      setFiltered(analyses.filter(a => a.risk >= 70))
    } else if (filterStatus === 'medium') {
      setFiltered(analyses.filter(a => a.risk >= 40 && a.risk < 70))
    } else if (filterStatus === 'safe') {
      setFiltered(analyses.filter(a => a.risk < 40))
    }
  }

    const deleteAnalysis = (id: string) => {
        const updatedAnalyses = analyses.filter(a => a.id !== id)
    setAnalyses(updatedAnalyses)
    saveProgress({ analyses_performed: updatedAnalyses as any })
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

    const getRiskColor = (risk: number) => {
    if (risk >= 70) return 'text-red-400 bg-red-500/10 border-red-500/20'
    if (risk >= 40) return 'text-orange-400 bg-orange-500/10 border-orange-500/20'
    return 'text-green-400 bg-green-500/10 border-green-500/20'
  }

    const getRiskIcon = (risk: number) => {
    if (risk >= 70) return <AlertCircle className="w-4 h-4" />
    return <CheckCircle className="w-4 h-4" />
  }

    const getRiskLabel = (risk: number) => {
    if (risk >= 70) return 'High Risk'
    if (risk >= 40) return 'Medium Risk'
    return 'Safe'
  }

  return (
    <MainLayout>
      <div className="w-full px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-white mb-2">Analysis History</h1>
            <p className="text-slate-400">All your phishing analysis results</p>
          </div>

          <div className="flex items-center gap-4 mb-8">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Results</option>
                <option value="high">High Risk Only</option>
                <option value="medium">Medium Risk Only</option>
                <option value="safe">Safe Only</option>
              </select>
            </div>

            <Button onClick={exportHistory} variant="primary" className="ml-auto">
              <Download className="w-4 h-4 mr-2" />
              Export History
            </Button>
          </div>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-lg">No analyses yet</p>
                <p className="text-slate-500 text-sm mt-2">Start analyzing screenshots to see your history here!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filtered.map(analysis => (
                <Card key={analysis.id} hover>
                  <CardContent>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge variant={
                            analysis.risk >= 70 ? 'danger' : 
                            analysis.risk >= 40 ? 'warning' : 
                            'success'
                          }>
                            {getRiskIcon(analysis.risk)}
                            <span className="ml-1">{getRiskLabel(analysis.risk)}</span>
                          </Badge>
                          <span className="text-xs text-slate-400 capitalize">{analysis.type}</span>
                          <span className="text-xs text-slate-500">
                            {new Date(analysis.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm text-slate-400">
                          <span className="font-medium">Findings:</span> {analysis.findings} detected
                        </div>
                      </div>

                      <div className="ml-4 text-right flex-shrink-0">
                        <p className={`text-3xl font-bold mb-2 ${
                          analysis.risk >= 70 ? 'text-red-400' :
                          analysis.risk >= 40 ? 'text-orange-400' :
                          'text-green-400'
                        }`}>
                          {analysis.risk}%
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card className="mt-8">
            <CardContent>
              <p className="text-slate-300">
                <span className="font-bold text-white">{analyses.length}</span> total analyses
                {` • ${filtered.length} shown`}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
