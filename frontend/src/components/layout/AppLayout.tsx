import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useQuery } from '@tanstack/react-query'
import { alertsApi } from '@/services/api'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { data: alerts } = useQuery({
    queryKey: ['alerts'],
    queryFn: alertsApi.list,
    refetchInterval: 60_000, // atualiza a cada 1 min
  })

  const unreadCount = alerts?.filter((a: { isRead: boolean }) => !a.isRead).length || 0

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar Desktop */}
      <div className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 z-20">
        <Sidebar />
      </div>

      {/* Sidebar Mobile - Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] flex flex-col shadow-2xl">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-60 flex flex-col flex-1 min-h-0">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          alertCount={unreadCount}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
