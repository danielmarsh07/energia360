import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Zap, Plus, Edit2, Trash2, Sun, Home, Building2, Tractor, Factory } from 'lucide-react'
import toast from 'react-hot-toast'
import { addressesApi, energyPointsApi, getApiError } from '@/services/api'
import { AddressUnit, EnergyPoint, ENERGY_POINT_TYPE_LABELS } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatKwp } from '@/utils/format'

const schema = z.object({
  name: z.string().min(2, 'Informe um nome'),
  pointType: z.enum(['RESIDENTIAL', 'COMMERCIAL', 'RURAL', 'INDUSTRIAL']).default('RESIDENTIAL'),
  hasSolar: z.boolean().default(false),
  solarPowerKwp: z.coerce.number().positive().optional(),
  panelsCount: z.coerce.number().int().positive().optional(),
  installDate: z.string().optional(),
  inverterModel: z.string().optional(),
  technicalNotes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const typeIcons: Record<string, React.ReactNode> = {
  RESIDENTIAL: <Home size={18} />,
  COMMERCIAL: <Building2 size={18} />,
  RURAL: <Tractor size={18} />,
  INDUSTRIAL: <Factory size={18} />,
}

export default function EnergyPointsPage() {
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<EnergyPoint | null>(null)
  const queryClient = useQueryClient()

  const { data: units = [] } = useQuery<AddressUnit[]>({
    queryKey: ['addresses'],
    queryFn: addressesApi.list,
  })

  const activeUnit = selectedUnit || units[0]?.id

  const { data: points = [], isLoading } = useQuery<EnergyPoint[]>({
    queryKey: ['energy-points', activeUnit],
    queryFn: () => energyPointsApi.list(activeUnit!),
    enabled: !!activeUnit,
  })

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: editing || undefined,
  })
  const hasSolar = watch('hasSolar')

  const createMutation = useMutation({
    mutationFn: (data: FormData) => energyPointsApi.create(activeUnit!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['energy-points'] })
      setShowForm(false)
      reset()
      toast.success('Ponto de energia cadastrado!')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => energyPointsApi.update(editing!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['energy-points'] })
      setEditing(null)
      toast.success('Ponto atualizado!')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: energyPointsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['energy-points'] })
      toast.success('Ponto removido.')
    },
  })

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Pontos de Energia</h1>
          <p className="text-muted mt-1">Gerencie seus pontos de monitoramento por unidade</p>
        </div>
        {activeUnit && (
          <Button icon={<Plus size={16} />} onClick={() => { setShowForm(true); setEditing(null); reset() }}>
            Novo ponto
          </Button>
        )}
      </div>

      {/* Seletor de unidade */}
      {units.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {units.map(u => (
            <button
              key={u.id}
              onClick={() => setSelectedUnit(u.id)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                (selectedUnit || units[0]?.id) === u.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {u.name}
            </button>
          ))}
        </div>
      )}

      {/* Formulário */}
      {(showForm || editing) && (
        <Card>
          <h2 className="section-title mb-4">{editing ? 'Editar ponto' : 'Novo ponto de energia'}</h2>
          <form onSubmit={handleSubmit((data) => editing ? updateMutation.mutate(data) : createMutation.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Nome do ponto *" placeholder="Sistema Solar, Medidor Principal..." error={errors.name?.message} {...register('name')} />
              <div>
                <label className="label">Tipo</label>
                <select className="input-field" {...register('pointType')}>
                  {Object.entries(ENERGY_POINT_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <input type="checkbox" id="hasSolar" className="rounded" {...register('hasSolar')} />
              <label htmlFor="hasSolar" className="text-sm font-medium text-gray-700 cursor-pointer">
                Este ponto possui sistema de energia solar
              </label>
            </div>

            {hasSolar && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-primary-50 rounded-xl border border-primary-100">
                <Input label="Potência (kWp)" type="number" step="0.01" placeholder="6.60" {...register('solarPowerKwp')} />
                <Input label="Quantidade de placas" type="number" placeholder="15" {...register('panelsCount')} />
                <Input label="Data de instalação" type="date" {...register('installDate')} />
                <Input label="Modelo do inversor" placeholder="Fronius Primo 6.0" {...register('inverterModel')} />
              </div>
            )}

            <div>
              <label className="label">Observações técnicas</label>
              <textarea className="input-field resize-none" rows={2} placeholder="Notas técnicas..." {...register('technicalNotes')} />
            </div>

            <div className="flex gap-3">
              <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                Salvar ponto
              </Button>
              <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setEditing(null) }}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Lista de pontos */}
      {!activeUnit ? (
        <Card>
          <EmptyState
            icon={<Zap size={28} />}
            title="Nenhuma unidade cadastrada"
            description="Primeiro, cadastre uma unidade na seção Unidades."
          />
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => <div key={i} className="h-36 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : points.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Zap size={28} />}
            title="Nenhum ponto cadastrado"
            description="Cadastre um ponto de energia para começar o monitoramento."
            action={{ label: 'Adicionar ponto', onClick: () => setShowForm(true), icon: <Plus size={16} /> }}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {points.map(point => (
            <Card key={point.id} hover className="group">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${point.hasSolar ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-500'}`}>
                  {point.hasSolar ? <Sun size={18} /> : typeIcons[point.pointType]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-gray-900 text-sm">{point.name}</h3>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                      <Button variant="ghost" size="sm" icon={<Edit2 size={12} />}
                        onClick={() => { setEditing(point); setShowForm(false) }} />
                      <Button variant="ghost" size="sm" icon={<Trash2 size={12} />}
                        className="hover:text-red-600 hover:bg-red-50"
                        onClick={() => deleteMutation.mutate(point.id)} />
                    </div>
                  </div>
                  <Badge variant="default" size="sm">
                    {ENERGY_POINT_TYPE_LABELS[point.pointType]}
                  </Badge>
                  {point.hasSolar && (
                    <div className="mt-2 space-y-0.5">
                      {point.solarPowerKwp && (
                        <p className="text-xs text-gray-500">
                          ⚡ <strong>{formatKwp(point.solarPowerKwp)}</strong>
                          {point.panelsCount && ` · ${point.panelsCount} placas`}
                        </p>
                      )}
                      {point.inverterModel && (
                        <p className="text-xs text-gray-400">{point.inverterModel}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
