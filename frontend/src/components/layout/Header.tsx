import { Bell, Menu } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { getInitials } from '@/utils/format'

interface HeaderProps {
  onMenuClick?: () => void
  title?: string
  alertCount?: number
}

export function Header({ onMenuClick, title, alertCount = 0 }: HeaderProps) {
  const { user } = useAuthStore()

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center px-4 lg:px-6 gap-4">
      {/* Mobile menu button */}
      <button
        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500"
        onClick={onMenuClick}
      >
        <Menu size={20} />
      </button>

      {/* Page title (mobile) */}
      {title && (
        <h1 className="lg:hidden font-semibold text-gray-900 text-base truncate flex-1">{title}</h1>
      )}

      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Alertas */}
        <Link
          to="/alertas"
          className="relative p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Bell size={20} />
          {alertCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </Link>

        {/* Avatar */}
        <Link
          to="/perfil"
          className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm hover:bg-primary-200 transition-colors"
        >
          {user?.fullName ? getInitials(user.fullName) : '?'}
        </Link>
      </div>
    </header>
  )
}
