import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Loader2 } from 'lucide-react'
import api from '../lib/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const login = useAuthStore(state => state.login)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      const data = await api.login(email, password)
      login(data.user, data.access)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden text-slate-100">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-indigo-600/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-blue-600/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
      
      <div className="w-full max-w-md p-8 relative z-10">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl transition-all duration-300 hover:shadow-indigo-500/10">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-br from-indigo-400 to-blue-300 bg-clip-text text-transparent mb-2">TalentOS</h1>
            <p className="text-slate-400 text-sm">Welcome back to the future of hiring</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300 ml-1">Email</label>
              <input 
                type="email" 
                required
                className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-500"
                placeholder="jane@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-medium text-slate-300">Password</label>
                <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Forgot password?</a>
              </div>
              <input 
                type="password" 
                required
                className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-500"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white font-medium rounded-xl py-3 mt-4 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-500/25 flex items-center justify-center disabled:opacity-70 disabled:hover:scale-100"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log in'}
            </button>
            {error && (
              <p className="text-red-400 text-sm text-center mt-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </form>
          
          <div className="mt-8 text-center text-sm text-slate-400">
            Don't have an account? <Link to="/register" className="text-indigo-400 font-medium hover:text-indigo-300 transition-colors">Apply or Join Now</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
