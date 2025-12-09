import { useState, useEffect } from 'react'

interface RiskGaugeProps {
  risk: number
  size?: number
}

export default function RiskGauge({ risk, size = 200 }: RiskGaugeProps) {
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    setRotation((risk / 100) * 180 - 90)
  }, [risk])

  const getColor = () => {
    if (risk >= 70) return '#ef4444'
    if (risk >= 40) return '#f97316'
    return '#22c55e'
  }

  return (
    <div style={{ width: size, height: size }} className="relative mx-auto">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
        <circle cx={size/2} cy={size/2} r={size/2 - 10} fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle
          cx={size/2}
          cy={size/2}
          r={size/2 - 10}
          fill="none"
          stroke={getColor()}
          strokeWidth="8"
          strokeDasharray={`${(risk / 100) * Math.PI * (size - 20)} ${Math.PI * (size - 20)}`}
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
        <line
          x1={size/2}
          y1={size/2}
          x2={size/2 + Math.cos((rotation + 90) * Math.PI / 180) * (size/2 - 20)}
          y2={size/2 + Math.sin((rotation + 90) * Math.PI / 180) * (size/2 - 20)}
          stroke={getColor()}
          strokeWidth="3"
          style={{ transition: 'all 0.5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-3xl font-bold text-white">{risk}%</span>
      </div>
    </div>
  )
}
