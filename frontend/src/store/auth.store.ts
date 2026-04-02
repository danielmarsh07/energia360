import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
  updateUser: (user: Partial<User>) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        localStorage.setItem('energia360:token', token)
        set({ user, token, isAuthenticated: true })
      },

      updateUser: (data) =>
        set(state => ({
          user: state.user ? { ...state.user, ...data } : null,
        })),

      logout: () => {
        localStorage.removeItem('energia360:token')
        localStorage.removeItem('energia360:user')
        set({ user: null, token: null, isAuthenticated: false })
      },
    }),
    {
      name: 'energia360:user',
      partialize: state => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
)
