import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Phone, Lock, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { profileApi, getApiError } from '@/services/api'
import { ClientProfile } from '@/types'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { getInitials } from '@/utils/format'
import { useAuthStore } from '@/store/auth.store'

const profileSchema = z.object({
  fullName: z.string().min(3),
  document: z.string().optional(),
  documentType: z.enum(['CPF', 'CNPJ']).optional(),
  responsibleName: z.string().optional(),
  observations: z.string().optional(),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual'),
  newPassword: z.string().min(8, 'Nova senha deve ter pelo menos 8 caracteres'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'As senhas não conferem',
  path: ['confirmPassword'],
})

export default function ProfilePage() {
  const queryClient = useQueryClient()
  const { user, updateUser } = useAuthStore()

  const { data: profile } = useQuery<ClientProfile>({
    queryKey: ['profile'],
    queryFn: profileApi.get,
  })

  const profileForm = useForm({ resolver: zodResolver(profileSchema), values: profile })
  const passwordForm = useForm({ resolver: zodResolver(passwordSchema) })

  const updateMutation = useMutation({
    mutationFn: profileApi.update,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      updateUser({ fullName: data.fullName })
      toast.success('Perfil atualizado!')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const changePasswordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      profileApi.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      toast.success('Senha alterada com sucesso!')
      passwordForm.reset()
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const deleteContactMutation = useMutation({
    mutationFn: profileApi.deleteContact,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  })

  const addContactMutation = useMutation({
    mutationFn: profileApi.addContact,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  })

  return (
    <div className="space-y-6 fade-in max-w-2xl">
      <div>
        <h1 className="page-title">Meu Perfil</h1>
        <p className="text-muted mt-1">Gerencie suas informações pessoais e de contato</p>
      </div>

      {/* Avatar e info */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xl">
            {profile?.fullName ? getInitials(profile.fullName) : <User size={24} />}
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-lg">{profile?.fullName}</h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <p className="text-xs text-primary-600 font-medium mt-0.5">
              {user?.role === 'ADMIN' ? '🔑 Administrador' : '👤 Cliente'}
            </p>
          </div>
        </div>
      </Card>

      {/* Dados pessoais */}
      <Card>
        <CardHeader title="Dados pessoais" />
        <form onSubmit={profileForm.handleSubmit(data => updateMutation.mutate(data))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nome completo" error={profileForm.formState.errors.fullName?.message} {...profileForm.register('fullName')} />
            <div>
              <label className="label">Tipo de documento</label>
              <select className="input-field" {...profileForm.register('documentType')}>
                <option value="CPF">CPF</option>
                <option value="CNPJ">CNPJ</option>
              </select>
            </div>
            <Input label="CPF / CNPJ" placeholder="000.000.000-00" {...profileForm.register('document')} />
            <Input label="Nome do responsável" placeholder="Para empresas" {...profileForm.register('responsibleName')} />
          </div>
          <div>
            <label className="label">Observações</label>
            <textarea className="input-field resize-none" rows={2} {...profileForm.register('observations')} />
          </div>
          <Button type="submit" loading={updateMutation.isPending}>Salvar dados</Button>
        </form>
      </Card>

      {/* Contatos */}
      <Card>
        <CardHeader
          title="Contatos"
          action={
            <Button
              variant="secondary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => addContactMutation.mutate({ type: 'PHONE', value: '', isPrimary: false })}
            >
              Adicionar
            </Button>
          }
        />
        {profile?.contacts?.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhum contato cadastrado</p>
        ) : (
          <ul className="space-y-2">
            {profile?.contacts?.map(c => (
              <li key={c.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500">
                  <Phone size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{c.value}</p>
                  <p className="text-xs text-gray-400">{c.label || c.type} {c.isPrimary && '· Principal'}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 size={14} />}
                  className="text-gray-400 hover:text-red-500 hover:bg-red-50"
                  onClick={() => deleteContactMutation.mutate(c.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Alterar senha */}
      <Card>
        <CardHeader title="Alterar senha" />
        <form
          onSubmit={passwordForm.handleSubmit(data => changePasswordMutation.mutate(data))}
          className="space-y-4"
        >
          <Input
            label="Senha atual"
            type="password"
            leftIcon={<Lock size={16} />}
            error={passwordForm.formState.errors.currentPassword?.message}
            {...passwordForm.register('currentPassword')}
          />
          <Input
            label="Nova senha"
            type="password"
            leftIcon={<Lock size={16} />}
            error={passwordForm.formState.errors.newPassword?.message}
            {...passwordForm.register('newPassword')}
          />
          <Input
            label="Confirmar nova senha"
            type="password"
            leftIcon={<Lock size={16} />}
            error={passwordForm.formState.errors.confirmPassword?.message}
            {...passwordForm.register('confirmPassword')}
          />
          <Button type="submit" loading={changePasswordMutation.isPending}>
            Alterar senha
          </Button>
        </form>
      </Card>
    </div>
  )
}
