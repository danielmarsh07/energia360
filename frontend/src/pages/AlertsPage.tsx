import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, AlertTriangle, Info, CheckCircle, BellOff } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { alertsApi } from '@/services/api'
import { Alert } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AlertSeverityBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'

const AlertIcon = ({ severity }: { severity: Alert['severity'] }) => {
  if (severity === 'CRITICAL') return <AlertTriangle size={18} className="text-red-500" />
  if (severity === 'WARNING') return <AlertTriangle size={18} className="text-yellow-500" />
  return <Info size={18} className="text-blue-500" />
}

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
                        <AlertIcon severity={alert.severity} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 text-sm">{alert.title}</h3>
                          <AlertSeverityBadge severity={alert.severity} />
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                        </div>
                        <p className="text-sm text-gray-500 mt-1 leading-relaxed">{alert.message}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-400">{alert.addressUnit?.name}</span>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400">
                            {new Date(alert.createdAt).toLocaleDateString('pt-BR')}
                          </span>
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
