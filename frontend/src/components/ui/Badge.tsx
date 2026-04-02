import { clsx } from 'clsx'
import { BillStatus, AlertSeverity } from '@/types'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  size?: 'sm' | 'md'
  dot?: boolean
}

export function Badge({ children, variant = 'default', size = 'sm', dot }: BadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 font-medium rounded-full',
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      {
        'bg-gray-100 text-gray-700': variant === 'default',
        'bg-green-100 text-green-700': variant === 'success',
        'bg-yellow-100 text-yellow-700': variant === 'warning',
        'bg-red-100 text-red-700': variant === 'danger',
        'bg-blue-100 text-blue-700': variant === 'info',
        'bg-purple-100 text-purple-700': variant === 'purple',
      }
    )}>
      {dot && (
        <span className={clsx('w-1.5 h-1.5 rounded-full', {
          'bg-gray-500': variant === 'default',
          'bg-green-500': variant === 'success',
          'bg-yellow-500': variant === 'warning',
          'bg-red-500': variant === 'danger',
          'bg-blue-500': variant === 'info',
          'bg-purple-500': variant === 'purple',
        })} />
      )}
      {children}
    </span>
  )
}

export function BillStatusBadge({ status }: { status: BillStatus }) {
  const config: Record<BillStatus, { label: string; variant: BadgeProps['variant'] }> = {
    PENDING: { label: 'Pendente', variant: 'default' },
    UPLOADED: { label: 'Enviada', variant: 'info' },
    PROCESSING: { label: 'Processando', variant: 'purple' },
    EXTRACTED: { label: 'Extraída', variant: 'warning' },
    VALIDATED: { label: 'Validada', variant: 'success' },
    FAILED: { label: 'Falhou', variant: 'danger' },
  }
  const { label, variant } = config[status]
  return <Badge variant={variant} dot>{label}</Badge>
}

export function AlertSeverityBadge({ severity }: { severity: AlertSeverity }) {
  const config: Record<AlertSeverity, { label: string; variant: BadgeProps['variant'] }> = {
    INFO: { label: 'Info', variant: 'info' },
    WARNING: { label: 'Atenção', variant: 'warning' },
    CRITICAL: { label: 'Crítico', variant: 'danger' },
  }
  const { label, variant } = config[severity]
  return <Badge variant={variant}>{label}</Badge>
}
