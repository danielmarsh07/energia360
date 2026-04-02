import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Building2, FileText, AlertTriangle, Clock, RefreshCw, UserCheck, UserX } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '@/services/api'
import { Card, CardHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { BillStatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatMonthYear } from '@/utils/format'

const BILL_STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'UPLOADED', label: 'Enviada' },
  { value: 'PROCESSING', label: 'Processando' },
  { value: 'EXTRACTED', label: 'Extraída' },
  { value: 'VALIDATED', label: 'Validada' },
  { value: 'FAILED', label: 'Com falha' },
]

export default function AdminPage() {
  const [billStatus, setBillStatus] = useState('')
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

      {/* Stats */}
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
    </div>
  )
}
