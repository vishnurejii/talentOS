import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import JobBoard from './pages/JobBoard'
import JobDetail from './pages/JobDetail'
import CreateJob from './pages/CreateJob'
import ExamRoom from './pages/ExamRoom'
import HRDashboard from './pages/HRDashboard'
import CandidateDashboard from './pages/CandidateDashboard'
import Navbar from './components/Navbar'
import { useAuthStore } from './store/authStore'
import api from './lib/api'

// Role-aware dashboard redirect
const DashboardRouter = () => {
  const user = useAuthStore(state => state.user)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  
  // If we're authenticated but user data isn't loaded yet, show a loader
  if (isAuthenticated && !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (user?.role === 'HR') return <HRDashboard />
  if (user?.role === 'CANDIDATE') return <CandidateDashboard />
  
  // Final fallback (should rarely happen with persisted sessions)
  return <Navigate to="/jobs" />;
}

function App() {
  const { user, isAuthenticated, login } = useAuthStore()

  // Profile recovery effect: if we have a token but no user object, fetch it!
  useEffect(() => {
    let timeoutId;
    if (isAuthenticated && !user) {
      // Safety timeout: don't hang the app for more than 4 seconds
      timeoutId = setTimeout(() => {
        console.warn("Recovery taking too long, starting fresh...");
        useAuthStore.getState().logout();
      }, 4000);

      api.profile()
        .then(userData => {
          clearTimeout(timeoutId);
          login(userData, localStorage.getItem('token'))
        })
        .catch(err => {
          clearTimeout(timeoutId);
          console.error("Profile recovery failed:", err)
          useAuthStore.getState().logout()
        })
    }
    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, user, login])

  return (
    <BrowserRouter>
      {isAuthenticated && <Navbar />}
      <div className={isAuthenticated ? "pt-0" : ""}>
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
      </div>
    </BrowserRouter>
  )
}

export default App

