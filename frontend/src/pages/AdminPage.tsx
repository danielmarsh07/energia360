import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, Building2, FileText, AlertTriangle, Clock, RefreshCw,
  UserCheck, UserX, Brain, Zap, DollarSign, TrendingUp, BarChart3,
  MapPin, CheckCircle, XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { adminApi } from '@/services/api'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { BillStatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatMonthYear } from '@/utils/format'

type Tab = 'overview' | 'ai'

const BILL_STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'UPLOADED', label: 'Enviada' },
  { value: 'PROCESSING', label: 'Processando' },
  { value: 'EXTRACTED', label: 'Extraída' },
  { value: 'VALIDATED', label: 'Validada' },
  { value: 'FAILED', label: 'Com falha' },
]

const PLAN_COLORS: Record<string, string> = {
  start: 'bg-gray-100 text-gray-700',
  solar: 'bg-yellow-100 text-yellow-700',
  plus: 'bg-blue-100 text-blue-700',
  business: 'bg-purple-100 text-purple-700',
  partner: 'bg-primary-100 text-primary-700',
  'sem-plano': 'bg-red-100 text-red-600',
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [billStatus, setBillStatus] = useState('')
  const [aiPeriod, setAiPeriod] = useState<'month' | 'all'>('month')
  const queryClient = useQueryClient()

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminApi.stats,
  })

  const { data: usersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.users(),
  })

  const { data: billsData } = useQuery({
    queryKey: ['admin-bills', billStatus],
    queryFn: () => adminApi.bills(1, billStatus || undefined),
  })

  const { data: aiUsage } = useQuery({
    queryKey: ['admin-ai-usage', aiPeriod],
    queryFn: () => adminApi.aiUsage(aiPeriod),
    enabled: tab === 'ai',
  })

  const { data: plansQuota } = useQuery({
    queryKey: ['admin-ai-plans-quota'],
    queryFn: adminApi.aiUsagePlansQuota,
    enabled: tab === 'ai',
  })

  const { data: byUnit } = useQuery({
    queryKey: ['admin-ai-by-unit', aiPeriod],
    queryFn: () => adminApi.aiUsageByUnit(aiPeriod),
    enabled: tab === 'ai',
  })

  const { data: byBill } = useQuery({
    queryKey: ['admin-ai-by-bill', aiPeriod],
    queryFn: () => adminApi.aiUsageByBill(aiPeriod),
    enabled: tab === 'ai',
  })

  const toggleUserMutation = useMutation({
    mutationFn: (id: string) => adminApi.toggleUser(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success(data.isActive ? 'Usuário ativado.' : 'Usuário desativado.')
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erro ao alterar usuário.'
      toast.error(msg)
    },
  })

  const reprocessMutation = useMutation({
    mutationFn: (id: string) => adminApi.reprocessBill(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bills'] })
      toast.success('Conta marcada para reprocessamento.')
    },
    onError: () => toast.error('Erro ao reprocessar conta.'),
  })

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="page-title">Painel Administrativo</h1>
        <p className="text-muted mt-1">Visão geral do sistema</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab('overview')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'overview'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2"><BarChart3 size={15} /> Visão Geral</span>
        </button>
        <button
          onClick={() => setTab('ai')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'ai'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2"><Brain size={15} /> IA & Tokens</span>
        </button>
      </div>

      {/* ─── ABA OVERVIEW ─── */}
      {tab === 'overview' && (
        <>
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard title="Usuários" value={stats.totalUsers} icon={<Users size={18} className="text-blue-600" />} iconBg="bg-blue-50" />
              <StatCard title="Unidades" value={stats.totalUnits} icon={<Building2 size={18} className="text-primary-600" />} iconBg="bg-primary-50" />
              <StatCard title="Contas enviadas" value={stats.totalBills} icon={<FileText size={18} className="text-purple-600" />} iconBg="bg-purple-50" />
              <StatCard title="Pendentes" value={stats.pendingBills} icon={<Clock size={18} className="text-yellow-600" />} iconBg="bg-yellow-50" />
              <StatCard title="Com falha" value={stats.failedBills} icon={<AlertTriangle size={18} className="text-red-600" />} iconBg="bg-red-50" />
            </div>
          )}

          {/* Usuários */}
          <Card padding="none">
            <div className="p-5 border-b border-gray-100">
              <h3 className="section-title">Usuários cadastrados</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">E-mail</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Perfil</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unidades</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cadastro</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {usersData?.data?.map((u: {
                    id: string; email: string; role: string; isActive: boolean; createdAt: string
                    profile?: { fullName?: string; _count?: { addressUnits: number } }
                  }) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium">{u.profile?.fullName || '—'}</td>
                      <td className="px-5 py-3 text-gray-500">{u.email}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">{u.profile?._count?.addressUnits || 0}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {u.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">
                        {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-5 py-3">
                        {u.role !== 'ADMIN' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={toggleUserMutation.isPending && toggleUserMutation.variables === u.id}
                            onClick={() => toggleUserMutation.mutate(u.id)}
                            icon={u.isActive ? <UserX size={14} className="text-red-500" /> : <UserCheck size={14} className="text-green-600" />}
                          >
                            {u.isActive ? 'Desativar' : 'Ativar'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Contas */}
          <Card padding="none">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-4">
              <h3 className="section-title">Uploads de contas</h3>
              <select
                className="input-field w-auto text-sm"
                value={billStatus}
                onChange={e => setBillStatus(e.target.value)}
              >
                {BILL_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Referência</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unidade</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Enviado em</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {billsData?.data?.map((b: {
                    id: string; referenceMonth: number; referenceYear: number; status: string; createdAt: string
                    addressUnit?: { name: string; clientProfile?: { fullName?: string } }
                  }) => (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium">{formatMonthYear(b.referenceMonth, b.referenceYear)}</td>
                      <td className="px-5 py-3 text-gray-500">{b.addressUnit?.clientProfile?.fullName || '—'}</td>
                      <td className="px-5 py-3 text-gray-500">{b.addressUnit?.name || '—'}</td>
                      <td className="px-5 py-3"><BillStatusBadge status={b.status as never} /></td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{new Date(b.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td className="px-5 py-3">
                        {b.status === 'FAILED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={reprocessMutation.isPending && reprocessMutation.variables === b.id}
                            onClick={() => reprocessMutation.mutate(b.id)}
                            icon={<RefreshCw size={13} className="text-blue-500" />}
                          >
                            Reprocessar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* ─── ABA IA & TOKENS ─── */}
      {tab === 'ai' && (
        <>
          {/* Filtro de período */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Período:</span>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              <button
                onClick={() => setAiPeriod('month')}
                className={`px-4 py-1.5 transition-colors ${aiPeriod === 'month' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                Este mês
              </button>
              <button
                onClick={() => setAiPeriod('all')}
                className={`px-4 py-1.5 transition-colors ${aiPeriod === 'all' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                Todo período
              </button>
            </div>
          </div>

          {/* Cards totais */}
          {aiUsage && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Extrações realizadas"
                value={aiUsage.totals.extractions}
                icon={<Brain size={18} className="text-purple-600" />}
                iconBg="bg-purple-50"
              />
              <StatCard
                title="Tokens totais"
                value={aiUsage.totals.totalTokens.toLocaleString('pt-BR')}
                icon={<Zap size={18} className="text-yellow-600" />}
                iconBg="bg-yellow-50"
              />
              <StatCard
                title="Tokens entrada"
                value={aiUsage.totals.inputTokens.toLocaleString('pt-BR')}
                icon={<TrendingUp size={18} className="text-blue-600" />}
                iconBg="bg-blue-50"
              />
              <StatCard
                title="Custo estimado"
                value={`$${aiUsage.totals.costUsd.toFixed(4)}`}
                icon={<DollarSign size={18} className="text-green-600" />}
                iconBg="bg-green-50"
              />
            </div>
          )}

          {/* Gráfico diário */}
          {aiUsage?.daily?.length > 0 && (
            <Card>
              <h3 className="section-title mb-4">Tokens por dia</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aiUsage.daily} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: string) => {
                        const d = new Date(v + 'T00:00:00')
                        return `${d.getDate()}/${d.getMonth() + 1}`
                      }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v: number) => [v.toLocaleString('pt-BR'), 'Tokens']}
                      labelFormatter={(l: string) => new Date(l + 'T00:00:00').toLocaleDateString('pt-BR')}
                    />
                    <Bar dataKey="tokens" fill="#7c3aed" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Uso por plano (métricas) */}
            {aiUsage?.byPlan?.length > 0 && (
              <Card padding="none">
                <div className="p-5 border-b border-gray-100">
                  <h3 className="section-title">Uso por plano</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {aiUsage.byPlan.map((p: { planSlug: string; extractions: number; totalTokens: number; costUsd: number }) => (
                    <div key={p.planSlug} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${PLAN_COLORS[p.planSlug] ?? 'bg-gray-100 text-gray-600'}`}>
                          {p.planSlug}
                        </span>
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

            {/* Top usuários */}
            {aiUsage?.byUser?.length > 0 && (
              <Card padding="none">
                <div className="p-5 border-b border-gray-100">
                  <h3 className="section-title">Top usuários</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {aiUsage.byUser.map((u: { userId: string; email: string; name: string; extractions: number; totalTokens: number; costUsd: number }) => (
                    <div key={u.userId} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium">{u.name !== '—' ? u.name : u.email}</p>
                        {u.name !== '—' && <p className="text-xs text-gray-400">{u.email}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{u.totalTokens.toLocaleString('pt-BR')} tokens</p>
                        <p className="text-xs text-gray-400">{u.extractions} extrações · ${u.costUsd.toFixed(4)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Por unidade */}
          {byUnit && byUnit.length > 0 && (
            <Card padding="none">
              <div className="p-5 border-b border-gray-100 flex items-center gap-2">
                <MapPin size={16} className="text-primary-600" />
                <h3 className="section-title">Tokens por unidade consumidora</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unidade</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Extrações</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tokens</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Custo</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {byUnit.map((u: { unitId: string; unitName: string; clientName: string; extractions: number; totalTokens: number; costUsd: number }) => {
                      const pct = byUnit[0]?.totalTokens ? Math.round((u.totalTokens / byUnit[0].totalTokens) * 100) : 0
                      return (
                        <tr key={u.unitId} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3 font-medium flex items-center gap-2">
                            <Building2 size={14} className="text-gray-400" />
                            {u.unitName}
                          </td>
                          <td className="px-5 py-3 text-gray-500 text-xs">{u.clientName}</td>
                          <td className="px-5 py-3 text-right">{u.extractions}</td>
                          <td className="px-5 py-3 text-right font-mono text-xs">{u.totalTokens.toLocaleString('pt-BR')}</td>
                          <td className="px-5 py-3 text-right font-mono text-xs">${u.costUsd.toFixed(4)}</td>
                          <td className="px-5 py-3 w-32">
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Por conta */}
          {byBill && byBill.length > 0 && (
            <Card padding="none">
              <div className="p-5 border-b border-gray-100 flex items-center gap-2">
                <FileText size={16} className="text-blue-600" />
                <h3 className="section-title">Detalhe por conta analisada</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Conta</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unidade</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Modelo</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Entrada</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Saída</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Custo</th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {byBill.map((b: {
                      logId: string; refMonth: number; refYear: number
                      unitName: string; clientName: string; model: string
                      inputTokens: number; outputTokens: number; totalTokens: number
                      costUsd: number; success: boolean; createdAt: string
                    }) => (
                      <tr key={b.logId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-medium">{formatMonthYear(b.refMonth, b.refYear)}</td>
                        <td className="px-5 py-3 text-gray-600 text-xs">{b.unitName}</td>
                        <td className="px-5 py-3 text-gray-500 text-xs">{b.clientName}</td>
                        <td className="px-5 py-3">
                          <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-mono">
                            {b.model.replace('claude-', '').replace('-20251001', '')}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-xs text-gray-500">{b.inputTokens.toLocaleString('pt-BR')}</td>
                        <td className="px-5 py-3 text-right font-mono text-xs text-gray-500">{b.outputTokens.toLocaleString('pt-BR')}</td>
                        <td className="px-5 py-3 text-right font-mono text-xs font-semibold">{b.totalTokens.toLocaleString('pt-BR')}</td>
                        <td className="px-5 py-3 text-right font-mono text-xs">${b.costUsd.toFixed(4)}</td>
                        <td className="px-5 py-3 text-center">
                          {b.success
                            ? <CheckCircle size={15} className="text-green-500 mx-auto" />
                            : <XCircle size={15} className="text-red-500 mx-auto" />}
                        </td>
                        <td className="px-5 py-3 text-gray-400 text-xs">
                          {new Date(b.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Quotas por plano */}
          {plansQuota && (
            <Card padding="none">
              <div className="p-5 border-b border-gray-100">
                <h3 className="section-title">Quotas por plano (mês atual)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plano</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Assinantes</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Limite/mês</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usadas</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tokens</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Custo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {plansQuota.map((p: {
                      planSlug: string; planName: string; subscribers: number
                      aiExtractionsPerMonth: number | null; extractionsUsed: number
                      totalTokens: number; costUsd: number
                    }) => (
                      <tr key={p.planSlug} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <div>
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${PLAN_COLORS[p.planSlug] ?? 'bg-gray-100 text-gray-600'}`}>
                              {p.planSlug}
                            </span>
                            <span className="ml-2 text-gray-500 text-xs">{p.planName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right text-gray-600">{p.subscribers}</td>
                        <td className="px-5 py-3 text-right">
                          {p.aiExtractionsPerMonth === null
                            ? <span className="text-xs font-medium text-green-600">Ilimitado</span>
                            : <span className="text-gray-600">{p.aiExtractionsPerMonth}</span>}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className={`font-medium ${
                            p.aiExtractionsPerMonth !== null && p.extractionsUsed >= p.aiExtractionsPerMonth
                              ? 'text-red-600' : 'text-gray-700'
                          }`}>
                            {p.extractionsUsed}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-gray-600 font-mono text-xs">
                          {p.totalTokens.toLocaleString('pt-BR')}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-600 font-mono text-xs">
                          ${p.costUsd.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
