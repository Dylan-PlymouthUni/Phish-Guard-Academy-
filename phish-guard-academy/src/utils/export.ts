import { getAnalytics, getProgress, getAnalyses, getSettings, Analysis } from './storage'

/**
 * Export analytics data as JSON
 */
export function exportAnalyticsJSON(): void {
  const analytics = getAnalytics()
  const progress = getProgress()
  const analyses = getAnalyses()
  
  const exportData = {
    export_date: new Date().toISOString(),
    analytics,
    progress,
    total_analyses: analyses.length,
    analyses_summary: analyses.slice(0, 100) // Last 100 for file size
  }
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  downloadFile(blob, `phishguard-analytics-${getDateString()}.json`)
}

/**
 * Export analytics data as CSV
 */
export function exportAnalyticsCSV(): void {
  const analytics = getAnalytics()
  const progress = getProgress()
  
  const csvRows = [
    ['Metric', 'Value'],
    ['Total Analyses', analytics.total_analyses],
    ['High Risk Count', analytics.high_risk_count],
    ['Medium Risk Count', analytics.medium_risk_count],
    ['Safe Count', analytics.safe_count],
    ['Average Risk %', analytics.avg_risk_percent.toFixed(2)],
    ['Challenges Passed', analytics.challenges_passed],
    ['Lessons Completed', analytics.total_lessons],
    ['Total Points', progress.points],
    ['Current Level', progress.level],
    ['Daily Streak', progress.streak],
    ['Export Date', new Date().toISOString()]
  ]
  
  const csvContent = csvRows.map(row => row.join(',')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv' })
  downloadFile(blob, `phishguard-analytics-${getDateString()}.csv`)
}

/**
 * Export detailed analyses history as CSV
 */
export function exportAnalysesCSV(): void {
  const analyses = getAnalyses()
  
  if (analyses.length === 0) {
    alert('No analyses to export yet!')
    return
  }
  
  const csvRows = [
    ['Timestamp', 'Type', 'Risk Score', 'Findings Count', 'ID']
  ]
  
  analyses.forEach((analysis: Analysis) => {
    csvRows.push([
      analysis.timestamp,
      analysis.type || 'url',
      analysis.risk.toString(),
      analysis.findings.toString(),
      analysis.id
    ])
  })
  
  const csvContent = csvRows.map(row => row.join(',')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv' })
  downloadFile(blob, `phishguard-analyses-history-${getDateString()}.csv`)
}

/**
 * Generate completion certificate data (ready for PDF generation)
 */
export function generateCertificateData() {
  const progress = getProgress()
  const analytics = getAnalytics()
  const settings = getSettings()
  
  return {
    userName: settings.name || 'Security Champion',
    completionDate: new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    level: progress.level,
    totalPoints: progress.points,
    challengesPassed: analytics.challenges_passed,
    lessonsCompleted: analytics.total_lessons,
    totalAnalyses: analytics.total_analyses,
    certificateId: generateCertificateId(),
    achievements: {
      firstAnalysis: analytics.total_analyses > 0,
      firstChallenge: analytics.challenges_passed > 0,
      firstLesson: analytics.total_lessons > 0,
      levelFive: progress.level >= 5,
      streakWeek: progress.streak >= 7,
      analysisMaster: analytics.total_analyses >= 50
    }
  }
}

/**
 * Export certificate as JSON (can be used to generate PDF later)
 */
export function exportCertificate(): void {
  const certificateData = generateCertificateData()
  
  const blob = new Blob([JSON.stringify(certificateData, null, 2)], { type: 'application/json' })
  downloadFile(blob, `phishguard-certificate-${getDateString()}.json`)
}

/**
 * Export all user data (backup)
 */
export function exportAllData(): void {
  const data = {
    export_date: new Date().toISOString(),
    version: '1.0',
    analytics: getAnalytics(),
    progress: getProgress(),
    analyses: getAnalyses(),
    settings: getSettings()
  }
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  downloadFile(blob, `phishguard-backup-${getDateString()}.json`)
}

/**
 * Import user data from backup
 */
export function importData(file: File): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        
        // Validate data structure
        if (!data.analytics || !data.progress) {
          throw new Error('Invalid backup file format')
        }
        
        // Restore data to localStorage
        localStorage.setItem('phishguard_analyses', JSON.stringify(data.analyses || []))
        localStorage.setItem('phishguard_progress', JSON.stringify(data.progress))
        localStorage.setItem('phishguard_settings', JSON.stringify(data.settings || {}))
        
        resolve(true)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

// Helper functions

function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function getDateString(): string {
  return new Date().toISOString().split('T')[0]
}

function generateCertificateId(): string {
  const timestamp = Date.now().toString(36)
  const randomStr = Math.random().toString(36).substring(2, 8)
  return `PGA-${timestamp}-${randomStr}`.toUpperCase()
}
