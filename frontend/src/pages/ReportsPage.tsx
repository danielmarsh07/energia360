import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { TrendingDown, Zap, DollarSign, Download } from 'lucide-react'
import { dashboardApi, addressesApi } from '@/services/api'
import { AddressUnit, MONTHS_PT, MONTHS_FULL_PT } from '@/types'
import { Card, CardHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatKwh } from '@/utils/format'

function exportToCSV(history: Array<{
  month: number; year: number; consumptionKwh: number
  totalAmount: number; estimatedSavings: number; addressUnit?: { name: string }
}>, year: number) {
  const headers = ['Mês', 'Ano', 'Unidade', 'Consumo (kWh)', 'Valor (R$)', 'Economia (R$)']
  const rows = history.map(h => [
    MONTHS_FULL_PT[h.month - 1],
    h.year,
    h.addressUnit?.name || '',
    (h.consumptionKwh || 0).toFixed(2),
    (h.totalAmount || 0).toFixed(2),
    (h.estimatedSavings || 0).toFixed(2),
  ])
  const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n')
  const bom = '\uFEFF'
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `energia360-relatorio-${year}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const [selectedUnit, setSelectedUnit] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())

  const { data: units = [] } = useQuery<AddressUnit[]>({
    queryKey: ['addresses'],
    queryFn: addressesApi.list,
  })

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports', selectedUnit, selectedYear],
    queryFn: () => dashboardApi.reports({
      unitId: selectedUnit || undefined,
      year: selectedYear,
    }),
  })

  const chartData = (reports?.history || []).map((h: {
    month: number; year: number; consumptionKwh: number; totalAmount: number; estimatedSavings: number
    addressUnit?: { name: string }
  }) => ({
    name: MONTHS_PT[h.month - 1],
    'Consumo (kWh)': h.consumptionKwh || 0,
    'Valor (R$)': h.totalAmount || 0,
    'Economia (R$)': h.estimatedSavings || 0,
    unit: h.addressUnit?.name || '',
  }))

  const years = [2023, 2024, 2025, 2026]

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="page-title">Relatórios</h1>
        <p className="text-muted mt-1">Análise consolidada do seu consumo e economia</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <select
            className="input-field w-auto min-w-40"
            value={selectedUnit}
            onChange={e => setSelectedUnit(e.target.value)}
          >
            <option value="">Todas as unidades</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select
            className="input-field w-auto"
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {reports?.history?.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => exportToCSV(reports.history, selectedYear)}
            icon={<Download size={14} />}
          >
            Exportar CSV
          </Button>
        )}
      </div>

      {/* Cards de totais */}
      {reports?.totals && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Total pago no período"
            value={formatCurrency(reports.totals.totalPaid)}
            icon={<DollarSign size={20} className="text-blue-600" />}
            iconBg="bg-blue-50"
          />
          <StatCard
            title="Total consumido"
            value={formatKwh(reports.totals.totalConsumed)}
            icon={<Zap size={20} className="text-yellow-600" />}
            iconBg="bg-yellow-50"
          />
          <StatCard
            title="Economia estimada"
            value={formatCurrency(reports.totals.totalSavings)}
            subtitle="com energia solar"
            icon={<TrendingDown size={20} className="text-primary-600" />}
            iconBg="bg-primary-50"
          />
        </div>
      )}

      {/* Gráfico consumo */}
      <Card>
        <CardHeader title="Consumo mensal (kWh)" subtitle={`Ano ${selectedYear}`} />
        {isLoading ? (
          <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(v: number) => [`${v} kWh`, 'Consumo']}
                contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '12px' }}
              />
              <Bar dataKey="Consumo (kWh)" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Gráfico valor + economia */}
      <Card>
        <CardHeader title="Valor da conta vs. Economia estimada" subtitle={`Ano ${selectedYear}`} />
        {isLoading ? (
          <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(v: number, name: string) => [formatCurrency(v), name]}
                contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '12px' }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
              <Line type="monotone" dataKey="Valor (R$)" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Economia (R$)" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Tabela detalhada */}
      {reports?.history && reports.history.length > 0 && (
        <Card padding="none">
          <div className="p-5 border-b border-gray-100">
            <h3 className="section-title">Detalhe mensal</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Mês</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unidade</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Consumo</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Economia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reports.history.map((h: {
                  id: string; month: number; year: number; consumptionKwh: number
                  totalAmount: number; estimatedSavings: number; addressUnit?: { name: string }
                }) => (
                  <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium">{MONTHS_PT[h.month - 1]}/{h.year}</td>
                    <td className="px-5 py-3 text-gray-500">{h.addressUnit?.name}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{formatKwh(h.consumptionKwh || 0)}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-medium">{formatCurrency(h.totalAmount || 0)}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-green-600 font-medium">{formatCurrency(h.estimatedSavings || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
