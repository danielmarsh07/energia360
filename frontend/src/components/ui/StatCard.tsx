import { clsx } from 'clsx'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  iconBg?: string
  trend?: {
    value: number
    label: string
  }
  className?: string
}

export function StatCard({ title, value, subtitle, icon, iconBg = 'bg-primary-50', trend, className }: StatCardProps) {
  const isPositive = trend && trend.value > 0
  const isNegative = trend && trend.value < 0

  return (
    <div className={clsx('bg-white rounded-2xl shadow-card border border-gray-100 p-5', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 font-medium truncate">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {icon && (
          <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ml-3', iconBg)}>
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-3">
          <span className={clsx('flex items-center gap-0.5 text-xs font-medium', {
            'text-green-600': isPositive,
            'text-red-500': isNegative,
            'text-gray-400': !isPositive && !isNegative,
          })}>
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> :
             isNegative ? <TrendingDown className="w-3.5 h-3.5" /> :
             <Minus className="w-3.5 h-3.5" />}
            {Math.abs(trend.value)}%
          </span>
          <span className="text-xs text-gray-400">{trend.label}</span>
        </div>
      )}
    </div>
  )
}
