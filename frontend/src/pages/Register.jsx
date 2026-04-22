import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Loader2 } from 'lucide-react'
import api from '../lib/api'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('CANDIDATE')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const login = useAuthStore(state => state.login)
  const navigate = useNavigate()

  const handleRegister = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      const data = await api.register(email, password, fullName, role)
      login(data.user, data.access)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center relative overflow-hidden text-slate-900 py-12">
      <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-blue-400/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-cyan-400/20 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-md p-8 relative z-10">
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl p-8 shadow-2xl transition-all duration-300 hover:shadow-blue-500/10">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-br from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-2">Join TalentOS</h1>
            <p className="text-slate-500 text-sm">Create an account to start your journey</p>
          </div>
          
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 ml-1">Full Name</label>
              <input 
                type="text" 
                required
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400"
                placeholder="Jane Doe"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 ml-1">Email</label>
              <input 
                type="email" 
                required
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400"
                placeholder="jane@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 ml-1">Password</label>
              <input 
                type="password" 
                required
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-1 pt-2">
              <label className="text-sm font-medium text-slate-700 ml-1 block mb-2">I am an...</label>
              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => setRole('HR')}
                  className={`flex-1 py-3 border rounded-xl text-sm font-medium transition-all ${
                    role === 'HR' 
                      ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-inner' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <span className="block text-lg mb-1">🏢</span>
                  HR Manager
                </button>
                <button 
                  type="button"
                  onClick={() => setRole('CANDIDATE')}
                  className={`flex-1 py-3 border rounded-xl text-sm font-medium transition-all ${
                    role === 'CANDIDATE' 
                      ? 'bg-cyan-50 border-cyan-600 text-cyan-700 shadow-inner' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                 <span className="block text-lg mb-1">👩‍💻</span>
                  Applicant
                </button>
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium rounded-xl py-3 mt-6 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/25 flex items-center justify-center disabled:opacity-70 disabled:hover:scale-100"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
            </button>
            {error && (
              <p className="text-red-600 text-sm text-center mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </form>
          
          <div className="mt-8 text-center text-sm text-slate-500">
            Already have an account? <Link to="/login" className="text-blue-600 font-medium hover:text-blue-500 transition-colors">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
