import { cn } from '@/lib/utils'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

interface ConfidenceIndicatorProps {
  confidence: number
  showLabel?: boolean
  className?: string
}

const confidenceConfig: Record<ConfidenceLevel, { label: string; color: string; dotColor: string }> = {
  high: {
    label: 'High confidence',
    color: 'text-green-600 dark:text-green-400',
    dotColor: 'bg-green-500',
  },
  medium: {
    label: 'Medium confidence',
    color: 'text-yellow-600 dark:text-yellow-400',
    dotColor: 'bg-yellow-500',
  },
  low: {
    label: 'Low confidence - verify',
    color: 'text-red-600 dark:text-red-400',
    dotColor: 'bg-red-500',
  },
}

function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.9) return 'high'
  if (confidence >= 0.7) return 'medium'
  return 'low'
}

export function ConfidenceIndicator({ confidence, showLabel = false, className }: ConfidenceIndicatorProps) {
  const level = getConfidenceLevel(confidence)
  const config = confidenceConfig[level]

  return (
    <span
      className={cn('inline-flex items-center gap-1 ml-2', config.color, className)}
      title={config.label}
      data-testid="confidence-indicator"
      data-confidence={level}
    >
      <span className={cn('h-2 w-2 rounded-full', config.dotColor)} aria-hidden="true" />
      {showLabel && <span className="text-xs">{config.label}</span>}
      <span className="sr-only">{config.label}</span>
    </span>
  )
}

export function isLowConfidence(confidence: number): boolean {
  return confidence < 0.7
}

export function hasLowConfidenceFields(confidence: Record<string, number>): boolean {
  return Object.values(confidence).some((c) => isLowConfidence(c))
}
