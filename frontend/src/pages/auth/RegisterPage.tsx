import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Sun, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { authApi, getApiError } from '@/services/api'
import { useAuthStore } from '@/store/auth.store'

const schema = z.object({
  fullName: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'As senhas não conferem',
  path: ['confirmPassword'],
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authApi.register({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
      })
      setAuth(res.user, res.token)
      toast.success('Conta criada com sucesso! Bem-vindo ao Energia360 🌱')
      navigate('/dashboard')
    } catch (err) {
      toast.error(getApiError(err))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-solar-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
            <Sun className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-xl">
            Energia<span className="text-primary-600">360</span>
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Criar sua conta</h1>
            <p className="text-gray-500 mt-1">Comece a monitorar sua energia solar gratuitamente</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Nome completo"
              placeholder="João Carlos Silva"
              leftIcon={<User size={16} />}
              error={errors.fullName?.message}
              {...register('fullName')}
            />

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
              placeholder="Mínimo 8 caracteres"
              leftIcon={<Lock size={16} />}
              rightIcon={
                <button type="button" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              error={errors.password?.message}
              {...register('password')}
            />

            <Input
              label="Confirmar senha"
              type="password"
              placeholder="Repita a senha"
              leftIcon={<Lock size={16} />}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button type="submit" size="lg" loading={isSubmitting} className="w-full mt-2">
              Criar minha conta
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Já tem conta?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">
              Fazer login
            </Link>
          </p>

          <p className="text-center text-xs text-gray-400 mt-4 leading-relaxed">
            Ao criar uma conta, você concorda com nossos{' '}
            <span className="text-primary-600 cursor-pointer">Termos de Uso</span>{' '}
            e{' '}
            <span className="text-primary-600 cursor-pointer">Política de Privacidade</span>.
          </p>
        </div>
      </div>
    </div>
  )
}
