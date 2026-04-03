import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MapPin, Plus, Edit2, Trash2, Zap, FileText, Sun, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { addressesApi, getApiError } from '@/services/api'
import { AddressUnit } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'

const schema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  consumerUnitCode: z.string().optional(),
  utility: z.string().optional(),
  zipCode: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().max(2).optional(),
  observations: z.string().optional(),
})
type FormData = z.infer<typeof schema>

function UnitCard({ unit, onEdit, onDelete }: {
  unit: AddressUnit
  onEdit: (unit: AddressUnit) => void
  onDelete: (unit: AddressUnit) => void
}) {
  const hasSolar = unit.energyPoints?.some(p => p.hasSolar)

  return (
    <Card hover className="group">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${hasSolar ? 'bg-primary-50' : 'bg-gray-100'}`}>
          {hasSolar ? <Sun size={22} className="text-primary-600" /> : <Building2 size={22} className="text-gray-500" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900">{unit.name}</h3>
              {unit.city && (
                <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                  <MapPin size={12} />
                  {unit.city}, {unit.state}
                </p>
              )}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="sm" icon={<Edit2 size={14} />} onClick={() => onEdit(unit)} />
              <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => onDelete(unit)}
                className="hover:text-red-600 hover:bg-red-50" />
            </div>
          </div>

          {unit.consumerUnitCode && (
            <p className="text-xs text-gray-400 mt-1">UC: {unit.consumerUnitCode} · {unit.utility}</p>
          )}

          <div className="flex gap-4 mt-3">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Zap size={12} className="text-yellow-500" />
              {unit._count?.energyPoints || 0} pontos
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <FileText size={12} className="text-blue-500" />
              {unit._count?.utilityBills || 0} contas
            </span>
            {hasSolar && (
              <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                ☀️ Solar
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

function UnitForm({ defaultValues, onSubmit, loading, onCancel }: {
  defaultValues?: Partial<FormData>
  onSubmit: (data: FormData) => void
  loading: boolean
  onCancel: () => void
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Nome da unidade *" placeholder="Casa principal, Loja Centro..." error={errors.name?.message} {...register('name')} />
        <Input label="Concessionária" placeholder="CEMIG, ENEL, CPFL..." {...register('utility')} />
        <Input label="Código UC" placeholder="Número da unidade consumidora" {...register('consumerUnitCode')} />
        <Input label="CEP" placeholder="00000-000" {...register('zipCode')} />
        <Input label="Logradouro" placeholder="Rua, Avenida..." {...register('street')} />
        <Input label="Número" placeholder="123" {...register('number')} />
        <Input label="Complemento" placeholder="Apto 4, Bloco B..." {...register('complement')} />
        <Input label="Bairro" placeholder="Centro, Lourdes..." {...register('neighborhood')} />
        <Input label="Cidade" placeholder="Belo Horizonte" {...register('city')} />
        <Input label="Estado" placeholder="MG" maxLength={2} {...register('state')} />
      </div>
      <div>
        <label className="label">Observações</label>
        <textarea
          className="input-field resize-none"
          rows={2}
          placeholder="Observações sobre esta unidade..."
          {...register('observations')}
        />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading}>Salvar unidade</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  )
}

export default function AddressesPage() {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<AddressUnit | null>(null)
  const queryClient = useQueryClient()

  const { data: units = [], isLoading } = useQuery<AddressUnit[]>({
    queryKey: ['addresses'],
    queryFn: addressesApi.list,
  })

  const createMutation = useMutation({
    mutationFn: (data: FormData) => addressesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setShowForm(false)
      toast.success('Unidade cadastrada com sucesso!')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => addressesApi.update(editing!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
      setEditing(null)
      toast.success('Unidade atualizada!')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => addressesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Unidade removida.')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const handleDelete = (unit: AddressUnit) => {
    if (confirm(`Remover a unidade "${unit.name}"?`)) {
      deleteMutation.mutate(unit.id)
    }
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Unidades</h1>
          <p className="text-muted mt-1">{units.length} unidade{units.length !== 1 ? 's' : ''} cadastrada{units.length !== 1 ? 's' : ''}</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => { setShowForm(true); setEditing(null) }}>
          Nova unidade
        </Button>
      </div>

      {/* Formulário de criação */}
      {showForm && !editing && (
        <Card>
          <h2 className="section-title mb-4">Nova Unidade</h2>
          <UnitForm
            onSubmit={createMutation.mutate}
            loading={createMutation.isPending}
            onCancel={() => setShowForm(false)}
          />
        </Card>
      )}

      {/* Formulário de edição */}
      {editing && (
        <Card>
          <h2 className="section-title mb-4">Editar: {editing.name}</h2>
          <UnitForm
            defaultValues={editing}
            onSubmit={updateMutation.mutate}
            loading={updateMutation.isPending}
            onCancel={() => setEditing(null)}
          />
        </Card>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : units.length === 0 ? (
        <Card>
          <EmptyState
            icon={<MapPin size={28} />}
            title="Nenhuma unidade cadastrada"
            description="Adicione sua residência, chácara, comércio ou qualquer local com consumo de energia para começar o monitoramento."
            action={{ label: 'Adicionar unidade', onClick: () => setShowForm(true), icon: <Plus size={16} /> }}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {units.map(unit => (
            <UnitCard
              key={unit.id}
              unit={unit}
              onEdit={(u) => { setEditing(u); setShowForm(false) }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
