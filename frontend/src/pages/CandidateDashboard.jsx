import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  Search, 
  BarChart, 
  Trophy, 
  ArrowRight,
  RefreshCw,
  XCircle,
  AlertCircle
} from 'lucide-react';

import api from '../lib/api';

export default function CandidateDashboard() {
  const { user } = useAuthStore();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setIsRefreshing(true);
    try {
      const d = await api.candidateDashboard();
      setApplications(d.applications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const statusConfig = {
    APPLIED: { label: 'Application Received', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: FileText },
    ATS_PROCESSING: { label: 'AI Resume Scanning', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Search, animate: true },
    EXAM_PENDING: { label: 'Assessment Ready', color: 'bg-purple-50 text-purple-700 border-purple-200 font-bold', icon: Clock },
    EXAM_DONE: { label: 'Assessment Completed', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: CheckCircle2 },
    SHORTLISTED: { label: 'Shortlisted!', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-black', icon: Trophy },
    REJECTED: { label: 'Not Selected', color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );

  const stats = [
    { label: 'Total Apps', value: applications.length },
    { label: 'Shortlisted', value: applications.filter(a => a.status === 'SHORTLISTED').length },
    { label: 'Pending Exams', value: applications.filter(a => a.status === 'EXAM_PENDING').length },
    { label: 'Top Final Score', value: Math.max(...applications.map(a => a.final_score || 0), 0).toFixed(1) },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 lg:p-10">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              Career Journey
            </h1>
            <p className="text-slate-500 mt-2 font-medium">Tracking your progress at <span className="text-blue-600">TalentOS</span></p>
          </div>
          <div className="flex items-center gap-3">
             <button 
               onClick={fetchApplications}
               disabled={isRefreshing}
               className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
             >
               <RefreshCw size={20} className={isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-500'} />
             </button>
             <Link to="/jobs" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95">
               Explore Jobs
             </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {stats.map((s, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
              <p className="text-2xl font-black text-slate-900">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Feed */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Live Timeline</h2>
          {applications.map(app => {
            const cfg = statusConfig[app.status] || statusConfig.APPLIED;
            const Icon = cfg.icon;
            
            return (
              <div key={app.application_id} className="group relative bg-white border border-slate-200 rounded-3xl p-8 hover:bg-slate-50 transition-all duration-500 overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 blur-[80px] -mr-16 -mt-16 group-hover:bg-blue-100 transition-all" />
                
                <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{app.job_title}</h3>
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${cfg.color} ${cfg.animate ? 'animate-pulse' : ''}`}>
                        <Icon size={12} />
                        {cfg.label}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-6 text-slate-500 text-xs font-semibold">
                       <span className="flex items-center gap-1.5"><Clock size={14} /> Applied {new Date(app.applied_at).toLocaleDateString()}</span>
                       <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px]">App ID: {app.application_id.slice(-6).toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-10">
                    {/* Progress score indicators */}
                    <div className="flex items-center gap-8 border-x border-slate-200 px-8">
                      <div className="text-center group-hover:scale-110 transition-transform">
                        <p className="text-[9px] font-black text-slate-500 uppercase mb-1">ATS Grade</p>
                        <p className={`text-xl font-mono font-black ${app.ats_score ? 'text-blue-600' : 'text-slate-300'}`}>
                          {app.ats_score?.toFixed(1) || '—'}
                        </p>
                      </div>
                      <div className="text-center group-hover:scale-110 transition-transform">
                        <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Exam score</p>
                        <p className={`text-xl font-mono font-black ${app.exam_score ? 'text-indigo-600' : 'text-slate-300'}`}>
                          {app.exam_score?.toFixed(1) || '—'}
                        </p>
                      </div>
                      <div className="text-center group-hover:scale-110 transition-transform">
                        <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Final weighting</p>
                        <p className={`text-2xl font-mono font-black ${app.final_score ? 'bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent' : 'text-slate-300'}`}>
                          {app.final_score?.toFixed(1) || '—'}
                        </p>
                      </div>
                    </div>

                    {/* CTAs */}
                    <div className="min-w-[140px] flex justify-end">
                      {app.status === 'EXAM_PENDING' && (
                        <Link 
                          to={`/exam/${app.job_id}`}
                          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                        >
                          TAKE EXAM <ArrowRight size={14} />
                        </Link>
                      )}

                      {app.status === 'EXAM_DONE' && (
                        <Link
                          to={`/exam/${app.job_id}`}
                          className="flex items-center gap-2 px-6 py-3 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-2xl font-black text-xs hover:bg-cyan-100 transition-all"
                        >
                          ✓ VIEW RESULT
                        </Link>
                      )}
                      
                      {app.status === 'SHORTLISTED' && (
                        <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-widest animate-bounce">
                          You're Shortlisted! 🚀
                        </div>
                      )}

                      {app.status === 'APPLIED' && (
                        <div className="text-slate-600 text-[10px] font-bold uppercase italic">
                          Awaiting Review
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {applications.length === 0 && (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] py-32 flex flex-col items-center justify-center text-center shadow-sm">
               <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                  <BarChart className="text-blue-600" size={32} />
               </div>
               <h3 className="text-2xl font-bold mb-2 text-slate-900">No applications found</h3>
               <p className="text-slate-500 max-w-sm mb-8">Start your next big career move by exploring our open positions on the job board.</p>
               <Link to="/jobs" className="px-10 py-4 bg-blue-600 text-white rounded-3xl font-black transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 active:scale-95">
                 SEARCH JOBS
               </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
