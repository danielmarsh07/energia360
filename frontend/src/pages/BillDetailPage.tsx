import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { ArrowLeft, CheckCircle, Edit2, Save, Zap, DollarSign, Sun, Activity } from 'lucide-react'
import toast from 'react-hot-toast'
import { billsApi, getApiError } from '@/services/api'
import { UtilityBill } from '@/types'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { BillStatusBadge } from '@/components/ui/Badge'
import { formatCurrency, formatKwh, formatMonthYear } from '@/utils/format'

function DataRow({ label, value, unit }: { label: string; value?: number | null; unit?: string }) {
  if (value == null) return null
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900">
        {unit === 'R$' ? formatCurrency(value) : unit ? `${value.toLocaleString('pt-BR')} ${unit}` : value}
      </span>
    </div>
  )
}

export default function BillDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)

  const { data: bill, isLoading } = useQuery<UtilityBill>({
    queryKey: ['bill', id],
    queryFn: () => billsApi.get(id!),
    enabled: !!id,
  })

  const { register, handleSubmit } = useForm({
    values: bill?.extractedData || {},
  })

  const validateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => billsApi.validate(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill', id] })
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      setEditing(false)
      toast.success('Dados confirmados e salvos!')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="h-64 bg-gray-200 rounded-2xl" />
      </div>
    )
  }

  if (!bill) return null
  const ext = bill.extractedData

  return (
    <div className="space-y-6 fade-in max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
          Voltar
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">
            Conta — {formatMonthYear(bill.referenceMonth, bill.referenceYear)}
          </h1>
          <p className="text-muted mt-1">{bill.addressUnit?.name}</p>
        </div>
        <BillStatusBadge status={bill.status} />
      </div>

      {/* Resumo */}
      {ext && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Valor total', value: ext.totalAmount ? formatCurrency(ext.totalAmount) : '—', icon: <DollarSign size={16} className="text-blue-500" />, bg: 'bg-blue-50' },
            { label: 'Consumo', value: ext.consumptionKwh ? formatKwh(ext.consumptionKwh) : '—', icon: <Zap size={16} className="text-yellow-500" />, bg: 'bg-yellow-50' },
            { label: 'Injetado', value: ext.injectedEnergyKwh ? formatKwh(ext.injectedEnergyKwh) : '—', icon: <Sun size={16} className="text-primary-500" />, bg: 'bg-primary-50' },
            { label: 'Créditos', value: ext.energyCreditsKwh ? formatKwh(ext.energyCreditsKwh) : '—', icon: <Activity size={16} className="text-green-500" />, bg: 'bg-green-50' },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-card">
              <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center mb-2`}>{item.icon}</div>
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="text-base font-bold text-gray-900 mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Dados detalhados */}
      <Card>
        <CardHeader
          title="Dados extraídos da conta"
          subtitle={ext?.isManuallyReviewed ? '✓ Revisado manualmente' : 'Aguardando confirmação'}
          action={
            !editing ? (
              <Button variant="secondary" size="sm" icon={<Edit2 size={14} />} onClick={() => setEditing(true)}>
                Editar dados
              </Button>
            ) : null
          }
        />

        {!editing ? (
          <div>
            <DataRow label="Concessionária" value={ext?.utilityName as unknown as number} unit="" />
            <DataRow label="Unidade consumidora" value={ext?.consumerUnitCode as unknown as number} unit="" />
            <DataRow label="Consumo" value={ext?.consumptionKwh} unit="kWh" />
            <DataRow label="Leitura anterior" value={ext?.previousReading} unit="kWh" />
            <DataRow label="Leitura atual" value={ext?.currentReading} unit="kWh" />
            <DataRow label="Energia injetada" value={ext?.injectedEnergyKwh} unit="kWh" />
            <DataRow label="Créditos disponíveis" value={ext?.energyCreditsKwh} unit="kWh" />
            <DataRow label="Média de consumo" value={ext?.avgConsumption} unit="kWh" />
            <DataRow label="Valor total" value={ext?.totalAmount} unit="R$" />
            <DataRow label="Valor energia" value={ext?.energyAmount} unit="R$" />
            <DataRow label="Taxa de uso da rede" value={ext?.networkUsageFee} unit="R$" />

            {bill.status === 'EXTRACTED' && (
              <div className="pt-4">
                <Button
                  icon={<CheckCircle size={16} />}
                  onClick={() => validateMutation.mutate(ext as unknown as Record<string, unknown>)}
                  loading={validateMutation.isPending}
                >
                  Confirmar dados
                </Button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit(validateMutation.mutate)} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Consumo (kWh)" type="number" step="0.01" {...register('consumptionKwh', { valueAsNumber: true })} />
              <Input label="Valor total (R$)" type="number" step="0.01" {...register('totalAmount', { valueAsNumber: true })} />
              <Input label="Energia injetada (kWh)" type="number" step="0.01" {...register('injectedEnergyKwh', { valueAsNumber: true })} />
              <Input label="Créditos (kWh)" type="number" step="0.01" {...register('energyCreditsKwh', { valueAsNumber: true })} />
              <Input label="Leitura anterior" type="number" step="0.01" {...register('previousReading', { valueAsNumber: true })} />
              <Input label="Leitura atual" type="number" step="0.01" {...register('currentReading', { valueAsNumber: true })} />
              <Input label="Valor energia (R$)" type="number" step="0.01" {...register('energyAmount', { valueAsNumber: true })} />
              <Input label="Taxa da rede (R$)" type="number" step="0.01" {...register('networkUsageFee', { valueAsNumber: true })} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={validateMutation.isPending} icon={<Save size={16} />}>
                Salvar e confirmar
              </Button>
              <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </Card>

      {/* Arquivos */}
      {bill.files && bill.files.length > 0 && (
        <Card>
          <CardHeader title="Arquivos enviados" />
          <ul className="space-y-2">
            {bill.files.map(f => (
              <li key={f.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Zap size={14} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{f.originalName}</p>
                  <p className="text-xs text-gray-400">{new Date(f.uploadedAt).toLocaleDateString('pt-BR')}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
