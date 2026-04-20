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
    <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/5 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center group-hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20">
            <Layout className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Talent<span className="text-indigo-400">OS</span>
          </span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-6">
          <Link 
            to="/dashboard" 
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${
              isActive('/dashboard') ? 'text-indigo-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
          <Link 
            to="/jobs" 
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${
              isActive('/jobs') ? 'text-indigo-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Jobs
          </Link>
        </div>

        {/* Profile & Logout */}
        <div className="flex items-center gap-4 pl-4 border-l border-white/5">
          <div className="hidden sm:flex flex-col items-end mr-2">
            <span className="text-xs font-semibold text-white">{user?.full_name}</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">{user?.role}</span>
          </div>
          
          <button 
            onClick={() => { logout(); navigate('/login'); }}
            className="p-2 rounded-lg bg-slate-800 hover:bg-red-500/10 hover:text-red-400 text-slate-400 transition-all border border-white/5"
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
