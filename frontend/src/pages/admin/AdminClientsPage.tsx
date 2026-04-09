import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Building2, FileText, UserCheck, UserX, Zap, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '@/services/api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { BillStatusBadge } from '@/components/ui/Badge'
import { formatCurrency, formatKwh, formatMonthYear } from '@/utils/format'

type Unit = {
  id: string; name: string; city?: string; state?: string; utility?: string
  _count?: { utilityBills: number }
  utilityBills?: Array<{
    id: string; referenceMonth: number; referenceYear: number; status: string
    extractedData?: { totalAmount?: number; consumptionKwh?: number } | null
  }>
}

type User = {
  id: string; email: string; role: string; isActive: boolean; createdAt: string
  profile?: { fullName?: string; _count?: { addressUnits: number } }
}

function ClientRow({ user }: { user: User }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: units, isLoading } = useQuery<Unit[]>({
    queryKey: ['admin-client-units', user.id],
    queryFn: () => adminApi.clientUnits(user.id),
    enabled: open,
  })

  const toggleMutation = useMutation({
    mutationFn: () => adminApi.toggleUser(user.id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success(data.isActive ? 'Usuário ativado.' : 'Usuário desativado.')
    },
  })

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      {/* Header do cliente */}
      <div
        className="flex items-center gap-4 px-5 py-4 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <button className="text-gray-400 shrink-0">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm shrink-0">
          {user.profile?.fullName?.charAt(0) ?? user.email.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{user.profile?.fullName || '—'}</p>
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
            <Building2 size={12} />
            {user.profile?._count?.addressUnits ?? 0} unid.
          </span>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
            {user.isActive ? 'Ativo' : 'Inativo'}
          </span>
          {user.role !== 'ADMIN' && user.role !== 'ADMIN_MASTER' && (
            <Button
              variant="ghost"
              size="sm"
              loading={toggleMutation.isPending}
              onClick={e => { e.stopPropagation(); toggleMutation.mutate() }}
              icon={user.isActive ? <UserX size={14} className="text-red-400" /> : <UserCheck size={14} className="text-green-600" />}
            />
          )}
        </div>
      </div>

      {/* Unidades expandidas */}
      {open && (
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 space-y-3">
          {isLoading && <p className="text-sm text-gray-400">Carregando unidades...</p>}
          {!isLoading && (!units || units.length === 0) && (
            <p className="text-sm text-gray-400">Nenhuma unidade cadastrada.</p>
          )}
          {units?.map(unit => (
            <div key={unit.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
                <Building2 size={15} className="text-primary-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900">{unit.name}</p>
                  {(unit.city || unit.utility) && (
                    <p className="text-xs text-gray-400">
                      {unit.utility && `${unit.utility} · `}{unit.city}{unit.state && `/${unit.state}`}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400">{unit._count?.utilityBills ?? 0} contas</span>
              </div>

              {/* Contas da unidade */}
              {unit.utilityBills && unit.utilityBills.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {unit.utilityBills.map(bill => (
                    <div key={bill.id} className="flex items-center gap-3 px-4 py-2.5">
                      <FileText size={13} className="text-gray-400 shrink-0" />
                      <span className="text-sm font-medium text-gray-700 w-24 shrink-0">
                        {formatMonthYear(bill.referenceMonth, bill.referenceYear)}
                      </span>
                      <BillStatusBadge status={bill.status as never} />
                      <div className="flex items-center gap-3 ml-auto text-xs text-gray-500">
                        {bill.extractedData?.totalAmount && (
                          <span className="flex items-center gap-1">
                            <DollarSign size={11} className="text-green-500" />
                            {formatCurrency(bill.extractedData.totalAmount)}
                          </span>
                        )}
                        {bill.extractedData?.consumptionKwh && (
                          <span className="flex items-center gap-1">
                            <Zap size={11} className="text-yellow-500" />
                            {formatKwh(bill.extractedData.consumptionKwh)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-4 py-2 text-xs text-gray-400">Nenhuma conta enviada.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminClientsPage() {
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.users(),
  })

  const clients = usersData?.data?.filter((u: User) => u.role === 'CLIENT') ?? []

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="page-title">Clientes & Unidades</h1>
        <p className="text-muted mt-1">{clients.length} cliente{clients.length !== 1 ? 's' : ''} cadastrado{clients.length !== 1 ? 's' : ''}</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : clients.length === 0 ? (
        <Card>
          <p className="text-center text-gray-500 py-8">Nenhum cliente cadastrado ainda.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {clients.map((u: User) => <ClientRow key={u.id} user={u} />)}
        </div>
      )}
    </div>
  )
}
