import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import JobBoard from './pages/JobBoard'
import JobDetail from './pages/JobDetail'
import CreateJob from './pages/CreateJob'
import ExamRoom from './pages/ExamRoom'
import HRDashboard from './pages/HRDashboard'
import CandidateDashboard from './pages/CandidateDashboard'
import { useAuthStore } from './store/authStore'

// Role-aware dashboard redirect
const DashboardRouter = () => {
  const user = useAuthStore(state => state.user)
  const logout = useAuthStore(state => state.logout)
  
  if (user?.role === 'HR') return <HRDashboard />
  if (user?.role === 'CANDIDATE') return <CandidateDashboard />
  
  // Fallback for ADMIN or unknown roles
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
        <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Dashboard</h1>
        <p className="text-slate-400 mb-8">Welcome, <span className="text-white font-medium">{user?.full_name}</span> <span className="px-2 py-1 bg-slate-800 rounded text-xs ml-2 border border-slate-700">{user?.role}</span></p>
        <div className="flex gap-4">
          <Link to="/jobs" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors font-medium text-white">
            Go to Job Board
          </Link>
          <button onClick={logout} className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 rounded-lg transition-colors font-medium">
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />
        
        {/* Protected Routes */}
        <Route path="/jobs" element={isAuthenticated ? <JobBoard /> : <Navigate to="/login" />} />
        <Route path="/jobs/create" element={isAuthenticated ? <CreateJob /> : <Navigate to="/login" />} />
        <Route path="/jobs/:id" element={isAuthenticated ? <JobDetail /> : <Navigate to="/login" />} />
        <Route path="/exam/:jobId" element={isAuthenticated ? <ExamRoom /> : <Navigate to="/login" />} />
        <Route path="/dashboard" element={isAuthenticated ? <DashboardRouter /> : <Navigate to="/login" />} />
        <Route path="/hr/dashboard" element={isAuthenticated ? <HRDashboard /> : <Navigate to="/login" />} />
        <Route path="/candidate/dashboard" element={isAuthenticated ? <CandidateDashboard /> : <Navigate to="/login" />} />
        
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

