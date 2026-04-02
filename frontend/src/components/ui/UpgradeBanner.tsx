import { Link } from 'react-router-dom'
import { Lock, ArrowRight } from 'lucide-react'

interface UpgradeBannerProps {
  feature?: string
  message?: string
}

export function UpgradeBanner({ feature, message }: UpgradeBannerProps) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-primary-200 bg-primary-50 p-8 flex flex-col items-center text-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center">
        <Lock size={26} className="text-primary-600" />
      </div>
      <div>
        <h3 className="font-bold text-gray-900 text-lg mb-1">
          {feature ? `${feature} não disponível no seu plano` : 'Recurso não disponível'}
        </h3>
        <p className="text-gray-500 text-sm max-w-md">
          {message || 'Esse recurso está disponível em planos superiores. Faça upgrade para desbloquear essa e outras funcionalidades.'}
        </p>
      </div>
      <Link
        to="/planos"
        className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
      >
        Ver planos disponíveis
        <ArrowRight size={16} />
      </Link>
    </div>
  )
}
