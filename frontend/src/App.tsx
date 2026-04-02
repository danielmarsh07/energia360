import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'

import { AppLayout } from '@/components/layout/AppLayout'
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
import AdminPage from '@/pages/AdminPage'

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

              {/* Rota de admin */}
              <Route element={<ProtectedRoute adminOnly />}>
                <Route path="/admin" element={<AdminPage />} />
              </Route>
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
