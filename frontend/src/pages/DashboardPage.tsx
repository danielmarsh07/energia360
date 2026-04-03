import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import {
  Zap, DollarSign, TrendingDown, MapPin, Bell,
  Plus, ChevronRight, AlertTriangle, Info, Sun
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { dashboardApi } from '@/services/api'
import { useAuthStore } from '@/store/auth.store'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { BillStatusBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency, formatKwh, formatMonthYear, formatCurrency as fc } from '@/utils/format'
import { DashboardData, MonthlyHistoryItem, Alert, MONTHS_PT } from '@/types'
import { clsx } from 'clsx'

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-card text-xs">
        <p className="font-semibold text-gray-700 mb-2">{label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ color: p.color }} className="mb-0.5">
            {p.name}: <strong>
              {p.name === 'Valor (R$)' ? fc(p.value) : `${p.value} kWh`}
            </strong>
          </p>
        ))}
      </div>
    )
  }
  return null
}

const AlertIcon = ({ severity }: { severity: string }) => {
  if (severity === 'CRITICAL') return <AlertTriangle size={16} className="text-red-500" />
  if (severity === 'WARNING') return <AlertTriangle size={16} className="text-yellow-500" />
  return <Info size={16} className="text-blue-500" />
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const firstName = user?.fullName?.split(' ')[0] || 'Cliente'

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
  })

  const chartData = (data?.monthlyHistory || []).slice(-12).map((m: MonthlyHistoryItem) => ({
    name: `${MONTHS_PT[m.month - 1]}/${String(m.year).slice(2)}`,
    'Consumo (kWh)': m.consumption,
    'Valor (R$)': m.amount,
    'Economia (R$)': m.savings,
  }))

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-2xl" />)}
        </div>
        <div className="h-72 bg-gray-200 rounded-2xl" />
      </div>
    )
  }

  const hasData = (data?.totalUnits || 0) > 0

  return (
    <div className="space-y-6 fade-in">
      {/* Saudação */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Olá, {firstName}! <span className="text-primary-600">☀️</span>
          </h1>
          <p className="text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Link to="/contas/upload">
          <Button icon={<Plus size={16} />} size="sm">
            Enviar conta
          </Button>
        </Link>
      </div>

      {/* Cards de indicadores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Suas unidades"
          value={data?.totalUnits || 0}
          subtitle="unidades monitoradas"
          icon={<MapPin size={20} className="text-primary-600" />}
          iconBg="bg-primary-50"
        />
        <StatCard
          title="Você consumiu este mês"
          value={data?.currentMonthConsumption ? formatKwh(data.currentMonthConsumption) : '—'}
          subtitle="de energia elétrica"
          icon={<Zap size={20} className="text-yellow-600" />}
          iconBg="bg-yellow-50"
        />
        <StatCard
          title="Sua conta este mês"
          value={data?.currentMonthAmount ? formatCurrency(data.currentMonthAmount) : '—'}
          subtitle="valor estimado"
          icon={<DollarSign size={20} className="text-blue-600" />}
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Você já economizou"
          value={data?.totalSavings ? formatCurrency(data.totalSavings) : '—'}
          subtitle="com energia solar"
          icon={<TrendingDown size={20} className="text-green-600" />}
          iconBg="bg-green-50"
        />
      </div>

      {!hasData ? (
        <Card>
          <EmptyState
            icon={<Sun size={32} />}
            title="Bem-vindo ao Energia360!"
            description="Cadastre sua primeira unidade para começar a acompanhar seu consumo, economia e geração solar de forma inteligente."
            action={{
              label: 'Cadastrar minha primeira unidade',
              onClick: () => window.location.href = '/unidades/nova',
              icon: <Plus size={16} />,
            }}
          />
        </Card>
      ) : (
        <>
          {/* Gráfico de consumo e valor */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader title="Veja quanto você consumiu" subtitle="Últimos 12 meses em kWh" />
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <defs>
                    <linearGradient id="consumptionGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="Consumo (kWh)"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#consumptionGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <CardHeader title="Para onde vai seu dinheiro" subtitle="Valor mensal da conta de energia" />
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Valor (R$)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Gráfico de economia */}
          <Card>
            <CardHeader
              title="Sua economia mês a mês"
              subtitle="Quanto você está economizando com o sistema solar"
            />
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <defs>
                  <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Economia (R$)"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fill="url(#savingsGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Bottom section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Última conta */}
            {data?.lastBill && (
              <Card>
                <CardHeader
                  title="Última conta analisada"
                  action={
                    <Link to={`/contas/${data.lastBill.id}`}>
                      <Button variant="ghost" size="sm" icon={<ChevronRight size={14} />}>
                        Ver detalhes
                      </Button>
                    </Link>
                  }
                />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Unidade</span>
                    <span className="text-sm font-medium">{data.lastBill.addressUnit?.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Mês de referência</span>
                    <span className="text-sm font-medium">
                      {formatMonthYear(data.lastBill.referenceMonth, data.lastBill.referenceYear)}
                    </span>
                  </div>
                  {data.lastBill.extractedData?.totalAmount && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Valor total</span>
                      <span className="text-sm font-bold text-gray-900">
                        {formatCurrency(data.lastBill.extractedData.totalAmount)}
                      </span>
                    </div>
                  )}
                  {data.lastBill.extractedData?.consumptionKwh && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Consumo</span>
                      <span className="text-sm font-medium">
                        {formatKwh(data.lastBill.extractedData.consumptionKwh)}
                      </span>
                    </div>
                  )}
                  <div className="pt-2">
                    <BillStatusBadge status={data.lastBill.status} />
                  </div>
                </div>
              </Card>
            )}

            {/* Alertas recentes */}
            <Card>
              <CardHeader
                title="Alertas recentes"
                action={
                  <Link to="/alertas">
                    <Button variant="ghost" size="sm" icon={<ChevronRight size={14} />}>
                      Ver todos
                    </Button>
                  </Link>
                }
              />
              {(data?.recentAlerts || []).length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mb-2">
                    <Bell size={20} className="text-green-500" />
                  </div>
                  <p className="text-sm text-gray-500">Nenhum alerta no momento</p>
                  <p className="text-xs text-gray-400 mt-0.5">Tudo funcionando dentro do esperado</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {(data?.recentAlerts || []).slice(0, 4).map((alert: Alert) => (
                    <li
                      key={alert.id}
                      className={clsx(
                        'flex items-start gap-3 p-3 rounded-xl',
                        alert.isRead ? 'bg-gray-50' : 'bg-yellow-50'
                      )}
                    >
                      <AlertIcon severity={alert.severity} />
                      <div className="flex-1 min-w-0">
                        <p className={clsx('text-sm font-medium truncate', alert.isRead ? 'text-gray-600' : 'text-gray-900')}>
                          {alert.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{alert.addressUnit?.name}</p>
                      </div>
                      {!alert.isRead && (
                        <span className="w-2 h-2 rounded-full bg-yellow-500 mt-1 shrink-0" />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
