import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Shield, ChevronRight, Filter, AlertTriangle, Download } from 'lucide-react'
import { clsx } from 'clsx'
import { billsApi, plansApi, type AuditSummary } from '@/services/api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/utils/format'

const PERIOD_OPTIONS = [
  { value: 3, label: '3 meses' },
  { value: 6, label: '6 meses' },
  { value: 12, label: '12 meses' },
  { value: 24, label: '24 meses' },
]

export default function RecuperacoesPage() {
  const [months, setMonths] = useState(12)
  const [ruleFilter, setRuleFilter] = useState<string | null>(null)

  const { data, isLoading } = useQuery<AuditSummary>({
    queryKey: ['audit-summary', months],
    queryFn: () => billsApi.auditSummary(months),
    staleTime: 5 * 60 * 1000,
  })

  const { data: subscription } = useQuery<{ plan?: { allowAuditPdfExport?: boolean } }>({
    queryKey: ['subscription'],
    queryFn: plansApi.getSubscription,
    staleTime: 10 * 60 * 1000,
  })
  const canExportPdf = !!subscription?.plan?.allowAuditPdfExport

  const filteredBills = useMemo(() => {
    if (!data) return []
    if (!ruleFilter) return data.perBill
    return data.perBill.filter((b) =>
      b.findings.some((f) => f.ruleId === ruleFilter && f.status === 'OVERCHARGE_DETECTED')
    )
  }, [data, ruleFilter])

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-gray-100 rounded w-64" />
        <div className="h-32 bg-gray-100 rounded-2xl" />
        <div className="h-96 bg-gray-100 rounded-2xl" />
      </div>
    )
  }

  const hasFindings = data && data.totalYearlyProjection > 0

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Shield className="text-primary-600" /> Minhas Recuperações
        </h1>
        <p className="text-muted mt-1">
          Cobranças indevidas detectadas pela IA nas suas contas de energia — base jurídica: Tema 176 STF, LC 194/2022, Lei 14.300/2022.
        </p>
      </div>

      {!data || data.billsAudited === 0 ? (
        <Card>
          <EmptyState
            icon={<Shield size={28} />}
            title="Nenhuma conta auditada ainda"
            description="Envie suas contas de energia e clique em 'Analisar' em cada uma para que a IA identifique cobranças indevidas."
            action={{ label: 'Enviar conta', onClick: () => { window.location.href = '/contas/upload' } }}
          />
        </Card>
      ) : hasFindings ? (
        <>
          {/* Hero */}
          <div className="rounded-2xl bg-gradient-to-br from-red-500 via-rose-600 to-amber-600 text-white p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <Shield size={24} />
              <span className="text-sm opacity-90">Últimos {data.periodMonths} meses</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold leading-tight">
              {formatCurrency(data.totalYearlyProjection)} <span className="text-lg font-normal opacity-90">de recuperação potencial/ano</span>
            </h2>
            <p className="text-sm opacity-90 mt-2">
              {formatCurrency(data.totalMonthlyOvercharge)}/mês em {data.billsWithOvercharge} de {data.billsAudited} contas analisadas
            </p>
          </div>

          {/* Breakdown por regra com filtros */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title flex items-center gap-2">
                <Filter size={16} /> Filtrar por regra
              </h2>
              <select
                className="text-sm border border-gray-200 rounded-lg px-2 py-1"
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className={clsx(
                  'px-3 py-1.5 rounded-full text-sm transition',
                  !ruleFilter ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:border-primary-300'
                )}
                onClick={() => setRuleFilter(null)}
              >
                Todas · {formatCurrency(data.totalYearlyProjection)}/ano
              </button>
              {data.byRule.map((r) => (
                <button
                  key={r.ruleId}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-sm transition',
                    ruleFilter === r.ruleId ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:border-primary-300'
                  )}
                  onClick={() => setRuleFilter(r.ruleId)}
                >
                  {r.ruleName} · {formatCurrency(r.yearly)}/ano · {r.occurrences}×
                </button>
              ))}
            </div>
          </div>

          {/* Lista de contas */}
          <div>
            <h2 className="section-title mb-3">
              {filteredBills.length} conta{filteredBills.length > 1 ? 's' : ''} com cobrança indevida
            </h2>
            <div className="space-y-3">
              {filteredBills.map((b) => (
                <Link key={b.billId} to={`/contas/${b.billId}`} className="block">
                  <Card className="hover:border-primary-200 hover:shadow-card-hover transition">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                        <AlertTriangle size={18} className="text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{b.unitName || 'Conta'}</h3>
                          <span className="text-xs text-gray-400">Ref. {b.ref}</span>
                        </div>
                        <p className="text-xl font-bold text-red-600 mt-0.5">
                          {formatCurrency(b.monthlyOvercharge)}<span className="text-xs font-normal text-gray-500">/mês</span>
                          <span className="ml-2 text-sm font-medium text-gray-500">
                            ({formatCurrency(b.yearlyProjection)}/ano)
                          </span>
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {b.findings
                            .filter((f) => f.status === 'OVERCHARGE_DETECTED' && f.severity !== 'INFO')
                            .slice(0, 3)
                            .map((f, i) => (
                              <span
                                key={i}
                                className={clsx(
                                  'text-xs px-2 py-0.5 rounded-full',
                                  f.severity === 'CRITICAL'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-amber-100 text-amber-700'
                                )}
                              >
                                {f.ruleName}
                              </span>
                            ))}
                          {b.findings.filter((f) => f.status === 'OVERCHARGE_DETECTED' && f.severity !== 'INFO').length > 3 && (
                            <span className="text-xs text-gray-400">
                              +{b.findings.filter((f) => f.status === 'OVERCHARGE_DETECTED' && f.severity !== 'INFO').length - 3} outras
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {canExportPdf && (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Download size={14} />}
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              window.open(billsApi.auditPdfUrl(b.billId), '_blank')
                            }}
                          >
                            PDF
                          </Button>
                        )}
                        <ChevronRight size={18} className="text-gray-300" />
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </>
      ) : (
        <Card>
          <div className="rounded-xl bg-green-50 border border-green-200 p-5 text-green-800">
            <div className="flex items-center gap-3">
              <Shield size={22} />
              <div>
                <p className="font-semibold">Tudo certo nas suas contas!</p>
                <p className="text-sm mt-1">
                  Auditamos {data.billsAudited} conta{data.billsAudited > 1 ? 's' : ''} nos últimos {data.periodMonths} meses — nenhuma cobrança indevida identificada.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
