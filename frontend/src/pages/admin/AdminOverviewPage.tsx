import { useQuery } from '@tanstack/react-query'
import { Users, Building2, FileText, AlertTriangle, Clock, Brain, Zap, DollarSign } from 'lucide-react'
import { adminApi } from '@/services/api'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'

export default function AdminOverviewPage() {
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: adminApi.stats })
  const { data: aiUsage } = useQuery({ queryKey: ['admin-ai-usage', 'month'], queryFn: () => adminApi.aiUsage('month') })

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="page-title">Visão Geral</h1>
        <p className="text-muted mt-1">Resumo da plataforma Energia360</p>
      </div>

      {/* Stats plataforma */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Clientes" value={stats.totalUsers} icon={<Users size={18} className="text-blue-600" />} iconBg="bg-blue-50" />
          <StatCard title="Unidades" value={stats.totalUnits} icon={<Building2 size={18} className="text-primary-600" />} iconBg="bg-primary-50" />
          <StatCard title="Contas enviadas" value={stats.totalBills} icon={<FileText size={18} className="text-purple-600" />} iconBg="bg-purple-50" />
          <StatCard title="Pendentes" value={stats.pendingBills} icon={<Clock size={18} className="text-yellow-600" />} iconBg="bg-yellow-50" />
          <StatCard title="Com falha" value={stats.failedBills} icon={<AlertTriangle size={18} className="text-red-600" />} iconBg="bg-red-50" />
        </div>
      )}

      {/* Stats IA este mês */}
      {aiUsage && (
        <>
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">IA — Este mês</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                title="Extrações realizadas"
                value={aiUsage.totals.extractions}
                icon={<Brain size={18} className="text-purple-600" />}
                iconBg="bg-purple-50"
              />
              <StatCard
                title="Tokens consumidos"
                value={aiUsage.totals.totalTokens.toLocaleString('pt-BR')}
                icon={<Zap size={18} className="text-yellow-600" />}
                iconBg="bg-yellow-50"
              />
              <StatCard
                title="Custo estimado"
                value={`$${aiUsage.totals.costUsd.toFixed(4)}`}
                icon={<DollarSign size={18} className="text-green-600" />}
                iconBg="bg-green-50"
              />
            </div>
          </div>

          {/* Top uso por plano */}
          {aiUsage.byPlan?.length > 0 && (
            <Card padding="none">
              <div className="p-5 border-b border-gray-100">
                <h3 className="section-title">Uso de IA por plano (mês atual)</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {aiUsage.byPlan.map((p: { planSlug: string; extractions: number; totalTokens: number; costUsd: number }) => (
                  <div key={p.planSlug} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">{p.planSlug}</span>
                      <span className="text-sm text-gray-500">{p.extractions} extrações</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{p.totalTokens.toLocaleString('pt-BR')} tokens</p>
                      <p className="text-xs text-gray-400">${p.costUsd.toFixed(4)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
