import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Upload, Plus, Eye, Zap, DollarSign, Calendar,
  CheckCircle, AlertCircle, Loader, Camera, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { addressesApi, billsApi, getApiError } from '@/services/api'
import { AddressUnit, UtilityBill, MONTHS_FULL_PT } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { BillStatusBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency, formatKwh, formatMonthYear } from '@/utils/format'

function UploadModal({ bill, onClose }: { bill: UtilityBill; onClose: () => void }) {
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const uploadMutation = useMutation({
    mutationFn: async (f: File) => {
      await billsApi.upload(bill.id, f)
      await billsApi.extract(bill.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      toast.success('Conta enviada! Dados extraídos com sucesso.')
      onClose()
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const handleFile = (f: File) => {
    setFile(f)
    if (f.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = e => setPreview(e.target?.result as string)
      reader.readAsDataURL(f)
    } else {
      setPreview(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Enviar conta de energia</h2>
          <Button variant="ghost" size="sm" icon={<X size={16} />} onClick={onClose} />
        </div>
        <p className="text-sm text-gray-500 mb-4">
          {MONTHS_FULL_PT[bill.referenceMonth - 1]}/{bill.referenceYear} · {bill.addressUnit?.name}
        </p>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
          }`}
        >
          {preview ? (
            <img src={preview} alt="preview" className="max-h-32 mx-auto rounded-lg object-contain" />
          ) : file ? (
            <div className="flex items-center justify-center gap-2 text-primary-600">
              <FileText size={24} />
              <span className="text-sm font-medium">{file.name}</span>
            </div>
          ) : (
            <div>
              <Upload size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-700">Arraste o arquivo aqui</p>
              <p className="text-xs text-gray-400 mt-1">ou clique para selecionar</p>
              <p className="text-xs text-gray-300 mt-1">PDF, JPG ou PNG · máx. 10MB</p>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
        </div>

        {file && (
          <div className="mt-4 flex gap-3">
            <Button
              onClick={() => uploadMutation.mutate(file)}
              loading={uploadMutation.isPending}
              icon={<Upload size={16} />}
              className="flex-1"
            >
              {uploadMutation.isPending ? 'Processando...' : 'Enviar e extrair dados'}
            </Button>
            <Button variant="secondary" onClick={() => { setFile(null); setPreview(null) }}>
              Trocar arquivo
            </Button>
          </div>
        )}

        {uploadMutation.isPending && (
          <div className="mt-3 p-3 bg-blue-50 rounded-xl text-sm text-blue-700 flex items-center gap-2">
            <Loader size={14} className="animate-spin" />
            Extraindo dados da conta automaticamente...
          </div>
        )}
      </Card>
    </div>
  )
}

function CreateBillModal({ unit, onClose }: { unit: AddressUnit; onClose: () => void }) {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: () => billsApi.create(unit.id, { referenceMonth: month, referenceYear: year }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      toast.success('Entrada de conta criada.')
      onClose()
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Nova conta</h2>
          <Button variant="ghost" size="sm" icon={<X size={16} />} onClick={onClose} />
        </div>
        <p className="text-sm text-gray-500 mb-4">Selecione o mês de referência da conta</p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Mês</label>
            <select className="input-field" value={month} onChange={e => setMonth(Number(e.target.value))}>
              {MONTHS_FULL_PT.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Ano</label>
            <select className="input-field" value={year} onChange={e => setYear(Number(e.target.value))}>
              {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} className="w-full">
          Criar entrada de conta
        </Button>
      </Card>
    </div>
  )
}

export default function BillsPage() {
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null)
  const [uploadBill, setUploadBill] = useState<UtilityBill | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const navigate = useNavigate()

  const { data: units = [] } = useQuery<AddressUnit[]>({
    queryKey: ['addresses'],
    queryFn: addressesApi.list,
  })

  const activeUnitId = selectedUnit || units[0]?.id
  const activeUnit = units.find(u => u.id === activeUnitId)

  const { data: bills = [], isLoading } = useQuery<UtilityBill[]>({
    queryKey: ['bills', activeUnitId],
    queryFn: () => billsApi.listByUnit(activeUnitId!),
    enabled: !!activeUnitId,
  })

  return (
    <div className="space-y-6 fade-in">
      {uploadBill && (
        <UploadModal bill={uploadBill} onClose={() => setUploadBill(null)} />
      )}
      {showCreateModal && activeUnit && (
        <CreateBillModal unit={activeUnit} onClose={() => setShowCreateModal(false)} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Contas de Energia</h1>
          <p className="text-muted mt-1">Envie, acompanhe e analise suas contas mensais</p>
        </div>
        {activeUnitId && (
          <Button icon={<Plus size={16} />} onClick={() => setShowCreateModal(true)}>
            Nova conta
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
                activeUnitId === u.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {u.name}
            </button>
          ))}
        </div>
      )}

      {/* Lista de contas */}
      {!activeUnitId ? (
        <Card>
          <EmptyState
            icon={<FileText size={28} />}
            title="Nenhuma unidade cadastrada"
            description="Primeiro, cadastre uma unidade na seção Unidades."
          />
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : bills.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText size={28} />}
            title="Nenhuma conta cadastrada"
            description="Adicione uma conta de energia para começar a análise."
            action={{ label: 'Adicionar conta', onClick: () => setShowCreateModal(true), icon: <Plus size={16} /> }}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {bills.map(bill => (
            <Card key={bill.id} hover className="group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <FileText size={20} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">
                      {formatMonthYear(bill.referenceMonth, bill.referenceYear)}
                    </span>
                    <BillStatusBadge status={bill.status} />
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    {bill.extractedData?.totalAmount && (
                      <span className="flex items-center gap-1 text-sm text-gray-600">
                        <DollarSign size={13} className="text-green-500" />
                        {formatCurrency(bill.extractedData.totalAmount)}
                      </span>
                    )}
                    {bill.extractedData?.consumptionKwh && (
                      <span className="flex items-center gap-1 text-sm text-gray-600">
                        <Zap size={13} className="text-yellow-500" />
                        {formatKwh(bill.extractedData.consumptionKwh)}
                      </span>
                    )}
                    {bill.files && bill.files.length > 0 && (
                      <span className="text-xs text-gray-400">
                        {bill.files.length} arquivo(s)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(bill.status === 'PENDING' || bill.status === 'UPLOADED') && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Upload size={14} />}
                      onClick={() => setUploadBill({ ...bill, addressUnit: activeUnit })}
                    >
                      Enviar PDF
                    </Button>
                  )}
                  {(bill.status === 'EXTRACTED' || bill.status === 'VALIDATED') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Eye size={14} />}
                      onClick={() => navigate(`/contas/${bill.id}`)}
                    >
                      Ver dados
                    </Button>
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
