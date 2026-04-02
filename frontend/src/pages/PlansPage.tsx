import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Zap, Star, Building2, Handshake, Sun, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { plansApi } from '@/services/api'
import { Plan } from '@/types'
import { Button } from '@/components/ui/Button'
import { clsx } from 'clsx'

const PLAN_ICONS: Record<string, React.ReactNode> = {
  start: <Sun size={24} className="text-gray-500" />,
  solar: <Zap size={24} className="text-yellow-500" />,
  plus: <Star size={24} className="text-primary-600" />,
  business: <Building2 size={24} className="text-blue-600" />,
  partner: <Handshake size={24} className="text-purple-600" />,
}

const PLAN_COLORS: Record<string, string> = {
  start: 'border-gray-200',
  solar: 'border-yellow-300',
  plus: 'border-primary-400 ring-2 ring-primary-200',
  business: 'border-blue-300',
  partner: 'border-purple-300',
}

const PLAN_BADGE: Record<string, string | null> = {
  start: null,
  solar: null,
  plus: 'Mais popular',
  business: null,
  partner: null,
}

export default function PlansPage() {
  const queryClient = useQueryClient()

  const { data: plans = [], isLoading: loadingPlans } = useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: plansApi.list,
  })

  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: plansApi.getSubscription,
  })

  const changePlanMutation = useMutation({
    mutationFn: (slug: string) => plansApi.changePlan(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
      toast.success('Plano atualizado com sucesso!')
    },
    onError: () => toast.error('Erro ao atualizar plano. Tente novamente.'),
  })

  const currentPlanSlug = subscription?.plan?.slug

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900">Escolha o plano ideal para você</h1>
        <p className="text-gray-500 mt-3 text-lg">
          Do monitoramento básico ao gerenciamento completo — encontre o plano certo para o seu perfil.
        </p>
      </div>

      {/* Plano atual */}
      {subscription && (
        <div className="max-w-lg mx-auto bg-primary-50 border border-primary-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center">
            <Zap size={18} className="text-primary-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-primary-900">Seu plano atual</p>
            <p className="text-sm text-primary-700">{subscription.plan?.name}</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-200 text-primary-800">
            Ativo
          </span>
        </div>
      )}

      {/* Cards de planos */}
      {loadingPlans ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-96 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.slug === currentPlanSlug
            const badge = PLAN_BADGE[plan.slug]

            return (
              <div
                key={plan.id}
                className={clsx(
                  'relative bg-white rounded-2xl border-2 p-5 flex flex-col transition-shadow hover:shadow-lg',
                  PLAN_COLORS[plan.slug] || 'border-gray-200'
                )}
              >
                {badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                      {badge}
                    </span>
                  </div>
                )}

                {/* Ícone + nome */}
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                    {PLAN_ICONS[plan.slug]}
                  </div>
                </div>

                <h3 className="font-bold text-gray-900 text-sm leading-tight mb-1">
                  {plan.name}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4 flex-1">
                  {plan.description}
                </p>

                {/* Features */}
                <ul className="space-y-2 mb-5">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check size={13} className="text-primary-600 mt-0.5 shrink-0" />
                      <span className="text-xs text-gray-600">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* Limites */}
                <div className="text-xs text-gray-400 mb-4 space-y-0.5">
                  <p>{plan.maxUnits >= 999 ? 'Unidades ilimitadas' : `Até ${plan.maxUnits} unidade${plan.maxUnits > 1 ? 's' : ''}`}</p>
                  <p>{plan.maxUsers >= 999 ? 'Usuários ilimitados' : `Até ${plan.maxUsers} usuário${plan.maxUsers > 1 ? 's' : ''}`}</p>
                </div>

                {/* Botão */}
                {isCurrent ? (
                  <div className="w-full text-center py-2 text-sm font-semibold text-primary-700 bg-primary-50 rounded-xl">
                    Plano atual
                  </div>
                ) : (
                  <Button
                    variant={plan.slug === 'plus' ? 'primary' : 'secondary'}
                    size="sm"
                    className="w-full"
                    loading={changePlanMutation.isPending && changePlanMutation.variables === plan.slug}
                    onClick={() => changePlanMutation.mutate(plan.slug)}
                  >
                    Escolher plano
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Comparação de módulos */}
      {plans.length > 0 && (
        <div className="bg-gray-50 rounded-2xl p-6">
          <h2 className="font-bold text-gray-900 mb-4 text-center">O que cada plano inclui</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">Funcionalidade</th>
                  {plans.map(p => (
                    <th key={p.id} className="text-center py-2 px-3 text-gray-700 font-semibold text-xs whitespace-nowrap">
                      {p.name.replace('Energia360 ', '')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { slug: 'cadastro-360', label: 'Cadastro completo' },
                  { slug: 'contas-leitura', label: 'Upload de contas' },
                  { slug: 'consumo-economia', label: 'Dashboard de economia' },
                  { slug: 'solar-analytics', label: 'Analytics solar' },
                  { slug: 'alertas-inteligentes', label: 'Alertas automáticos' },
                  { slug: 'leitura-inteligente', label: 'Leitura automática (OCR)' },
                  { slug: 'relatorios-360', label: 'Relatórios avançados' },
                  { slug: 'central-dicas', label: 'Central de dicas' },
                  { slug: 'multiunidades', label: 'Multiunidades' },
                  { slug: 'painel-administrativo', label: 'Painel admin' },
                  { slug: 'portal-parceiro', label: 'Portal parceiro' },
                ].map(({ slug, label }) => (
                  <tr key={slug} className="hover:bg-white transition-colors">
                    <td className="py-2.5 px-3 text-gray-700 font-medium text-xs">{label}</td>
                    {plans.map(p => {
                      const hasModule = p.modules.some(pm => pm.module.slug === slug)
                      return (
                        <td key={p.id} className="py-2.5 px-3 text-center">
                          {hasModule
                            ? <Check size={14} className="text-primary-600 mx-auto" />
                            : <Lock size={12} className="text-gray-300 mx-auto" />
                          }
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rodapé */}
      <p className="text-center text-xs text-gray-400">
        Todos os planos incluem suporte por e-mail e atualizações da plataforma.
        Precisa de algo personalizado?{' '}
        <span className="text-primary-600 font-medium cursor-pointer hover:underline">
          Fale com nossa equipe
        </span>
      </p>
    </div>
  )
}
