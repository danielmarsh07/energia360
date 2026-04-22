import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Info, CheckCircle, BellOff, Shield, Zap, Clock, Scale, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { alertsApi } from '@/services/api'
import { Alert } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AlertSeverityBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/utils/format'

const AlertIcon = ({ type, severity }: { type?: Alert['type']; severity: Alert['severity'] }) => {
  // Ícones específicos por tipo quando for alerta de auditoria
  if (type === 'ICMS_OVERCHARGE') return <Scale size={18} className="text-red-500" />
  if (type === 'FIO_B_OVER_LIMIT') return <Zap size={18} className="text-red-500" />
  if (type === 'CREDITS_EXPIRING') return <Clock size={18} className="text-amber-500" />
  if (type === 'PIS_COFINS_REFUND') return <Shield size={18} className="text-blue-500" />
  if (type === 'GENERATION_DROP') return <AlertTriangle size={18} className="text-amber-500" />
  // Fallback por severidade
  if (severity === 'CRITICAL') return <AlertTriangle size={18} className="text-red-500" />
  if (severity === 'WARNING') return <AlertTriangle size={18} className="text-yellow-500" />
  return <Info size={18} className="text-blue-500" />
}

const isAuditAlert = (t: Alert['type']) =>
  t === 'ICMS_OVERCHARGE' || t === 'FIO_B_OVER_LIMIT' ||
  t === 'CREDITS_EXPIRING' || t === 'PIS_COFINS_REFUND' || t === 'GENERATION_DROP'

export default function AlertsPage() {
  const queryClient = useQueryClient()

  const { data: alerts = [], isLoading } = useQuery<Alert[]>({
    queryKey: ['alerts'],
    queryFn: alertsApi.list,
  })

  const markReadMutation = useMutation({
    mutationFn: alertsApi.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  })

  const markAllReadMutation = useMutation({
    mutationFn: alertsApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast.success('Todos os alertas marcados como lidos.')
    },
  })

  const unread = alerts.filter(a => !a.isRead)
  const read = alerts.filter(a => a.isRead)

  // Totalizador de cobrança indevida entre os alertas de auditoria
  const totalYearlyImpact = alerts
    .filter(a => isAuditAlert(a.type))
    .reduce((sum, a) => sum + (a.yearlyImpact ?? 0), 0)

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Alertas</h1>
          <p className="text-muted mt-1">
            {unread.length > 0 ? `${unread.length} alerta(s) não lido(s)` : 'Tudo em dia'}
          </p>
        </div>
        {unread.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            icon={<CheckCircle size={14} />}
            onClick={() => markAllReadMutation.mutate()}
            loading={markAllReadMutation.isPending}
          >
            Marcar todos como lidos
          </Button>
        )}
      </div>

      {totalYearlyImpact > 0 && (
        <Link to="/recuperacoes" className="block">
          <div className="rounded-2xl bg-gradient-to-br from-red-500 via-rose-600 to-amber-600 text-white p-4 shadow-lg hover:shadow-xl transition">
            <div className="flex items-center gap-3">
              <Shield size={22} />
              <div className="flex-1">
                <p className="text-sm opacity-90">Cobrança indevida detectada nas suas contas</p>
                <p className="text-2xl font-bold leading-tight">
                  {formatCurrency(totalYearlyImpact)}<span className="text-sm font-normal opacity-90">/ano potencialmente recuperáveis</span>
                </p>
              </div>
              <ChevronRight size={18} className="opacity-80" />
            </div>
          </div>
        </Link>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : alerts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BellOff size={28} />}
            title="Nenhum alerta"
            description="Você não tem alertas no momento. Continue monitorando sua energia regularmente."
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Não lidos */}
          {unread.length > 0 && (
            <div>
              <h2 className="section-title mb-3">Novos alertas</h2>
              <div className="space-y-3">
                {unread.map(alert => (
                  <Card key={alert.id} className={clsx(
                    'border-l-4',
                    alert.severity === 'CRITICAL' ? 'border-l-red-400' :
                    alert.severity === 'WARNING' ? 'border-l-yellow-400' : 'border-l-blue-400'
                  )}>
                    <div className="flex items-start gap-4">
                      <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', {
                        'bg-red-50': alert.severity === 'CRITICAL',
                        'bg-yellow-50': alert.severity === 'WARNING',
                        'bg-blue-50': alert.severity === 'INFO',
                      })}>
                        <AlertIcon type={alert.type} severity={alert.severity} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 text-sm">{alert.title}</h3>
                          <AlertSeverityBadge severity={alert.severity} />
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                        </div>
                        <p className="text-sm text-gray-500 mt-1 leading-relaxed">{alert.message}</p>
                        {(alert.monthlyImpact ?? 0) > 0 && (
                          <p className="text-sm font-semibold text-red-600 mt-1.5">
                            Impacto: {formatCurrency(alert.monthlyImpact ?? 0)}/mês
                            {alert.yearlyImpact ? ` · ${formatCurrency(alert.yearlyImpact)}/ano` : ''}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-400">{alert.addressUnit?.name}</span>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400">
                            {new Date(alert.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                          {alert.actionUrl && (
                            <>
                              <span className="text-xs text-gray-300">·</span>
                              <Link to={alert.actionUrl} className="text-xs font-semibold text-primary-600 hover:underline inline-flex items-center gap-0.5">
                                Ver conta <ChevronRight size={12} />
                              </Link>
                            </>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markReadMutation.mutate(alert.id)}
                        className="shrink-0 text-gray-400"
                      >
                        Marcar lido
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Lidos */}
          {read.length > 0 && (
            <div>
              <h2 className="section-title mb-3 text-gray-400">Anteriores</h2>
              <div className="space-y-2">
                {read.map(alert => (
                  <Card key={alert.id} className="opacity-60">
                    <div className="flex items-start gap-3">
                      <AlertIcon severity={alert.severity} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600">{alert.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{alert.addressUnit?.name} · {new Date(alert.createdAt).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
