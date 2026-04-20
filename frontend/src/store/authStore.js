import { create } from 'zustand'

const storedUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;

export const useAuthStore = create((set) => ({
  user: storedUser,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  login: (userData, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    set({ user: userData, token, isAuthenticated: true })
  },
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, token: null, isAuthenticated: false })
  }
}))
