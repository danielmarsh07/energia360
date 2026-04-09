import { useState } from 'react'
import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Users, Brain, Settings, LogOut, Sun,
  Menu, X, ShieldCheck,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAuthStore } from '@/store/auth.store'
import { getInitials } from '@/utils/format'

const adminNav = [
  { to: '/admin', icon: LayoutDashboard, label: 'Visão Geral', end: true },
  { to: '/admin/clientes', icon: Users, label: 'Clientes & Unidades' },
  { to: '/admin/ia', icon: Brain, label: 'IA & Tokens' },
]

function AdminSidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  return (
    <aside className="flex flex-col h-full bg-gray-900 text-white">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-700">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
            <Sun className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-base leading-none">Energia</span>
              <span className="font-bold text-primary-400 text-base leading-none">360</span>
              <span className="text-xs bg-primary-600 text-white px-1.5 py-0.5 rounded-md font-semibold leading-none">ADMIN</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Painel de controle</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {adminNav.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            )}
          >
            <Icon size={18} className="shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Separador + link plataforma */}
      <div className="px-3 pb-2">
        <button
          onClick={() => { navigate('/dashboard'); onClose?.() }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors w-full"
        >
          <Settings size={18} className="shrink-0" />
          Ver como cliente
        </button>
      </div>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-gray-700">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-800 mb-1">
          <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center text-white font-semibold text-xs shrink-0">
            {user?.fullName ? getInitials(user.fullName) : <ShieldCheck size={14} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.fullName || 'Admin'}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => { logout(); navigate('/login') }}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors w-full"
        >
          <LogOut size={18} className="shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  )
}

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar Desktop */}
      <div className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 z-20">
        <AdminSidebar />
      </div>

      {/* Sidebar Mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 flex flex-col shadow-2xl">
            <AdminSidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="lg:pl-60 flex flex-col flex-1 min-h-0">
        {/* Topbar mobile */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-gray-900 text-white">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <span className="font-bold text-sm">Painel Admin</span>
          <button onClick={() => setSidebarOpen(false)}>
            {sidebarOpen ? <X size={22} /> : <span />}
          </button>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
