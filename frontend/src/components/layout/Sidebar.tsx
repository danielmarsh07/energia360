import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, MapPin, Zap, FileText, BarChart3, BookOpen,
  Bell, User, LogOut, Sun, Settings,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAuthStore } from '@/store/auth.store'
import { getInitials } from '@/utils/format'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/unidades', icon: MapPin, label: 'Unidades' },
  { to: '/pontos-de-energia', icon: Zap, label: 'Pontos de Energia' },
  { to: '/contas', icon: FileText, label: 'Contas' },
  { to: '/relatorios', icon: BarChart3, label: 'Relatórios' },
  { to: '/dicas', icon: BookOpen, label: 'Dicas e Tutoriais' },
  { to: '/alertas', icon: Bell, label: 'Alertas' },
]

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="flex flex-col h-full bg-white border-r border-gray-100">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
            <Sun className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-gray-900 text-base leading-none">Energia</span>
            <span className="font-bold text-primary-600 text-base leading-none">360</span>
            <p className="text-xs text-gray-400 mt-0.5">Energia Solar</p>
          </div>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-0.5">
          {navItems.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                onClick={onClose}
                className={({ isActive }) => clsx('sidebar-item', isActive && 'active')}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" size={18} />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Admin */}
        {user?.role === 'ADMIN' && (
          <>
            <div className="mt-4 mb-2 px-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Administração</p>
            </div>
            <ul className="space-y-0.5">
              <li>
                <NavLink
                  to="/admin"
                  onClick={onClose}
                  className={({ isActive }) => clsx('sidebar-item', isActive && 'active')}
                >
                  <Settings size={18} className="shrink-0" />
                  <span>Painel Admin</span>
                </NavLink>
              </li>
            </ul>
          </>
        )}
      </nav>

      {/* Footer - Perfil */}
      <div className="px-3 py-3 border-t border-gray-100">
        <NavLink
          to="/perfil"
          onClick={onClose}
          className={({ isActive }) => clsx('sidebar-item w-full', isActive && 'active')}
        >
          <div className="w-8 h-8 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-xs shrink-0">
            {user?.fullName ? getInitials(user.fullName) : <User size={14} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.fullName || 'Meu Perfil'}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </NavLink>

        <button
          onClick={handleLogout}
          className="sidebar-item w-full mt-0.5 text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut size={18} className="shrink-0" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}
