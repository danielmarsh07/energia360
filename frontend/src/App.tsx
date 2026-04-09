import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'

import { AppLayout } from '@/components/layout/AppLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'

// Páginas públicas
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'

// Páginas privadas
import DashboardPage from '@/pages/DashboardPage'
import AddressesPage from '@/pages/AddressesPage'
import EnergyPointsPage from '@/pages/EnergyPointsPage'
import BillsPage from '@/pages/BillsPage'
import BillDetailPage from '@/pages/BillDetailPage'
import ReportsPage from '@/pages/ReportsPage'
import AlertsPage from '@/pages/AlertsPage'
import TutorialsPage from '@/pages/TutorialsPage'
import ProfilePage from '@/pages/ProfilePage'
import PlansPage from '@/pages/PlansPage'

// Páginas admin
import AdminOverviewPage from '@/pages/admin/AdminOverviewPage'
import AdminClientsPage from '@/pages/admin/AdminClientsPage'
import AdminAiPage from '@/pages/admin/AdminAiPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Rotas públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Rotas protegidas - área logada */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/unidades" element={<AddressesPage />} />
              <Route path="/pontos-de-energia" element={<EnergyPointsPage />} />
              <Route path="/contas" element={<BillsPage />} />
              <Route path="/contas/:id" element={<BillDetailPage />} />
              <Route path="/relatorios" element={<ReportsPage />} />
              <Route path="/alertas" element={<AlertsPage />} />
              <Route path="/dicas" element={<TutorialsPage />} />
              <Route path="/dicas/:slug" element={<TutorialsPage />} />
              <Route path="/perfil" element={<ProfilePage />} />
              <Route path="/planos" element={<PlansPage />} />
            </Route>
          </Route>

          {/* Rotas admin — layout separado */}
          <Route element={<ProtectedRoute adminOnly />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminOverviewPage />} />
              <Route path="/admin/clientes" element={<AdminClientsPage />} />
              <Route path="/admin/ia" element={<AdminAiPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            fontSize: '14px',
            fontFamily: 'Inter, sans-serif',
          },
          success: {
            iconTheme: { primary: '#22c55e', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
      />

      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
