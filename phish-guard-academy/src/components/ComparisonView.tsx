/**
 * ComparisonView component/module file.
 * This file defines the ComparisonView component, which is used to display a side-by-side comparison of legitimate and suspicious indicators in the PhishGuard Academy application. The component visually distinguishes between the two categories using color coding and icons, making it easier for users to understand the differences at a glance.
 * It includes the following responsibilities:
 * - Accepting props for legitimate and suspicious indicators, each with a title and a list of indicators.
 * - Rendering two distinct sections for legitimate and suspicious indicators, styled with different colors and icons.
 * - Displaying each indicator in a clear and organized manner, using checkmarks for legitimate indicators and crosses for suspicious ones.
 * The ComparisonView component is designed to help users quickly identify key differences between safe and potentially harmful elements, enhancing their learning experience in the PhishGuard Academy.
 */

import { CheckCircle, AlertCircle } from 'lucide-react'

interface ComparisonViewProps {
  legitimate: {
    title: string
    indicators: string[]
  }
  suspicious: {
    title: string
    indicators: string[]
  }
}

export default function ComparisonView({ legitimate, suspicious }: ComparisonViewProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-6 h-6 text-green-400" />
          <h3 className="text-white font-bold text-lg">{legitimate.title}</h3>
        </div>
        <ul className="space-y-2">
          {legitimate.indicators.map((ind, i) => (
            <li key={i} className="text-green-300 text-sm flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>{ind}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-6 h-6 text-red-400" />
          <h3 className="text-white font-bold text-lg">{suspicious.title}</h3>
        </div>
        <ul className="space-y-2">
          {suspicious.indicators.map((ind, i) => (
            <li key={i} className="text-red-300 text-sm flex items-start gap-2">
              <span className="text-red-400 mt-1">✕</span>
              <span>{ind}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
