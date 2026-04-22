import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Home, Briefcase, User, LogOut, Layout } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show navbar in Exam Room
  if (location.pathname.startsWith('/exam/')) return null;

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center group-hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
            <Layout className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Talent<span className="text-blue-600">OS</span>
          </span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-6">
          <Link 
            to="/dashboard" 
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${
              isActive('/dashboard') ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
          <Link 
            to="/jobs" 
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${
              isActive('/jobs') ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Jobs
          </Link>
        </div>

        {/* Profile & Logout */}
        <div className="flex items-center gap-4 pl-4 border-l border-slate-200">
          <div className="hidden sm:flex flex-col items-end mr-2">
            <span className="text-xs font-semibold text-slate-900">{user?.full_name}</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">{user?.role}</span>
          </div>
          
          <button 
            onClick={() => { logout(); navigate('/login'); }}
            className="p-2 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 transition-all border border-slate-200"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
