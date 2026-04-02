import axios, { AxiosError } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Injeta o token JWT em todas as requisições autenticadas
api.interceptors.request.use(config => {
  const token = localStorage.getItem('energia360:token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redireciona para login apenas se o token expirou (não nas rotas de auth)
api.interceptors.response.use(
  response => response,
  (error: AxiosError) => {
    const isAuthRoute = error.config?.url?.includes('/auth/')
    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem('energia360:token')
      localStorage.removeItem('energia360:user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Helpers para erros legíveis
export function getApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { error?: string; message?: string } | undefined
    return data?.error || data?.message || 'Ocorreu um erro inesperado.'
  }
  if (error instanceof Error) return error.message
  return 'Ocorreu um erro inesperado.'
}

// =============================================
// AUTH
// =============================================
export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data).then(r => r.data),

  register: (data: { email: string; password: string; fullName: string }) =>
    api.post('/auth/register', data).then(r => r.data),

  me: () => api.get('/auth/me').then(r => r.data),
}

// =============================================
// PROFILE
// =============================================
export const profileApi = {
  get: () => api.get('/profile').then(r => r.data),
  update: (data: Record<string, unknown>) => api.put('/profile', data).then(r => r.data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/profile/change-password', data).then(r => r.data),
  addContact: (data: Record<string, unknown>) =>
    api.post('/profile/contacts', data).then(r => r.data),
  deleteContact: (id: string) => api.delete(`/profile/contacts/${id}`),
}

// =============================================
// ADDRESSES
// =============================================
export const addressesApi = {
  list: () => api.get('/addresses').then(r => r.data),
  get: (id: string) => api.get(`/addresses/${id}`).then(r => r.data),
  create: (data: Record<string, unknown>) => api.post('/addresses', data).then(r => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/addresses/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/addresses/${id}`),
}

// =============================================
// ENERGY POINTS
// =============================================
export const energyPointsApi = {
  list: (unitId: string) => api.get(`/units/${unitId}/points`).then(r => r.data),
  create: (unitId: string, data: Record<string, unknown>) =>
    api.post(`/units/${unitId}/points`, data).then(r => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/points/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/points/${id}`),
}

// =============================================
// BILLS
// =============================================
export const billsApi = {
  listByUnit: (unitId: string, year?: number) =>
    api.get(`/bills/unit/${unitId}`, { params: { year } }).then(r => r.data),
  get: (id: string) => api.get(`/bills/${id}`).then(r => r.data),
  create: (unitId: string, data: { referenceMonth: number; referenceYear: number }) =>
    api.post(`/bills/unit/${unitId}`, data).then(r => r.data),
  upload: (billId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/bills/${billId}/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
  extract: (billId: string) => api.post(`/bills/${billId}/extract`).then(r => r.data),
  validate: (billId: string, data: Record<string, unknown>) =>
    api.post(`/bills/${billId}/validate`, data).then(r => r.data),
  getHistory: (unitId: string) =>
    api.get(`/bills/unit/${unitId}/history`).then(r => r.data),
}

// =============================================
// ALERTS
// =============================================
export const alertsApi = {
  list: () => api.get('/alerts').then(r => r.data),
  markRead: (id: string) => api.patch(`/alerts/${id}/read`),
  markAllRead: () => api.patch('/alerts/read-all'),
}

// =============================================
// TUTORIALS
// =============================================
export const tutorialsApi = {
  list: (category?: string) =>
    api.get('/tutorials', { params: { category } }).then(r => r.data),
  get: (slug: string) => api.get(`/tutorials/${slug}`).then(r => r.data),
}

// =============================================
// DASHBOARD
// =============================================
export const dashboardApi = {
  get: () => api.get('/dashboard').then(r => r.data),
  reports: (params?: { unitId?: string; year?: number }) =>
    api.get('/dashboard/reports', { params }).then(r => r.data),
}

// =============================================
// ADMIN
// =============================================
// =============================================
// PLANS & SUBSCRIPTIONS
// =============================================
export const plansApi = {
  list: () => api.get('/plans').then(r => r.data),
  getSubscription: () => api.get('/plans/subscription').then(r => r.data),
  changePlan: (planSlug: string) => api.patch('/plans/subscription', { planSlug }).then(r => r.data),
}

export const adminApi = {
  stats: () => api.get('/admin/stats').then(r => r.data),
  users: (page?: number) => api.get('/admin/users', { params: { page } }).then(r => r.data),
  toggleUser: (id: string) => api.patch(`/admin/users/${id}/toggle`).then(r => r.data),
  bills: (page?: number, status?: string) =>
    api.get('/admin/bills', { params: { page, status } }).then(r => r.data),
  reprocessBill: (id: string) => api.post(`/admin/bills/${id}/reprocess`).then(r => r.data),
}
