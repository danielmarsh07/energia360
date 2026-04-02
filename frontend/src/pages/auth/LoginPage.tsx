import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Sun, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { authApi, getApiError } from '@/services/api'
import { useAuthStore } from '@/store/auth.store'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authApi.login(data)
      setAuth(res.user, res.token)
      toast.success(`Bem-vindo de volta, ${res.user.fullName?.split(' ')[0]}! 🌱`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(getApiError(err))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-solar-50 flex">
      {/* Left panel - decorativo */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-primary-800 p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Sun className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-xl">Energia360</span>
          </div>
        </div>

        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Controle total da sua energia solar
          </h2>
          <p className="text-primary-200 text-lg leading-relaxed">
            Acompanhe geração, consumo e economia de forma simples, visual e inteligente.
          </p>

          <div className="grid grid-cols-2 gap-4 mt-10">
            {[
              { label: 'Unidades monitoradas', value: '1.200+' },
              { label: 'Economia acumulada', value: 'R$ 2,8M' },
              { label: 'Contas analisadas', value: '15.000+' },
              { label: 'Alertas gerados', value: '3.400+' },
            ].map(stat => (
              <div key={stat.label} className="bg-white/10 rounded-2xl p-4">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-primary-200 text-sm mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-primary-300 text-sm">
          © 2025 Energia360 · Todos os direitos reservados
        </p>
      </div>

      {/* Right panel - formulário */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
              <Sun className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-xl">
              Energia<span className="text-primary-600">360</span>
            </span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Bem-vindo de volta</h1>
            <p className="text-gray-500 mt-1">Entre na sua conta para continuar</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              leftIcon={<Mail size={16} />}
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="Sua senha"
              leftIcon={<Lock size={16} />}
              rightIcon={
                <button type="button" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="flex justify-end">
              <Link to="/esqueci-senha" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Esqueci minha senha
              </Link>
            </div>

            <Button type="submit" size="lg" loading={isSubmitting} className="w-full mt-2">
              Entrar na plataforma
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Não tem conta?{' '}
            <Link to="/cadastro" className="text-primary-600 font-medium hover:text-primary-700">
              Criar conta grátis
            </Link>
          </p>

          {/* Demo credentials */}
          <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Conta de demonstração</p>
            <p className="text-xs text-gray-600">📧 joao.silva@email.com</p>
            <p className="text-xs text-gray-600">🔑 energia123</p>
          </div>
        </div>
      </div>
    </div>
  )
}
