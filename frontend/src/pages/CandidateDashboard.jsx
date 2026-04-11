import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

import api from '../lib/api';

export default function CandidateDashboard() {
  const { token, user } = useAuthStore();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.candidateDashboard()
      .then(d => { setApplications(d.applications || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const statusConfig = {
    APPLIED: { label: 'Applied', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: '📩' },
    ATS_PROCESSING: { label: 'ATS Processing', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: '⏳' },
    EXAM_PENDING: { label: 'Exam Pending', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: '📝' },
    EXAM_DONE: { label: 'Exam Done', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30', icon: '✅' },
    SHORTLISTED: { label: 'Shortlisted!', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: '🎉' },
    REJECTED: { label: 'Not Selected', color: 'bg-red-500/20 text-red-300 border-red-500/30', icon: '❌' },
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="animate-spin h-12 w-12 border-4 border-violet-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              My Applications
            </h1>
            <p className="text-sm text-gray-400">Welcome back, {user?.full_name || 'Candidate'}</p>
          </div>
          <Link to="/jobs" className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-medium transition">
            Browse Jobs
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="max-w-5xl mx-auto px-6 pt-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', value: applications.length, color: 'from-blue-500 to-cyan-500' },
            { label: 'In Progress', value: applications.filter(a => ['APPLIED','ATS_PROCESSING','EXAM_PENDING'].includes(a.status)).length, color: 'from-amber-500 to-orange-500' },
            { label: 'Shortlisted', value: applications.filter(a => a.status === 'SHORTLISTED').length, color: 'from-emerald-500 to-green-500' },
            { label: 'Best Score', value: Math.max(...applications.map(a => a.final_score || 0), 0).toFixed(1), color: 'from-violet-500 to-purple-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Application cards */}
        <div className="space-y-3">
          {applications.map(app => {
            const cfg = statusConfig[app.status] || statusConfig.APPLIED;
            return (
              <div key={app.application_id} className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{app.job_title}</h3>
                      <span className={`px-2.5 py-1 rounded-lg text-xs border ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Applied: {new Date(app.applied_at).toLocaleDateString()}</p>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Score cards */}
                    <div className="text-center">
                      <p className="text-xs text-gray-500">ATS</p>
                      <p className="text-lg font-mono font-semibold text-blue-300">{app.ats_score?.toFixed(1) ?? '—'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Exam</p>
                      <p className="text-lg font-mono font-semibold text-purple-300">{app.exam_score?.toFixed(1) ?? '—'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Final</p>
                      <p className="text-lg font-mono font-bold text-violet-300">{app.final_score?.toFixed(1) ?? '—'}</p>
                    </div>
                    {app.rank && (
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Rank</p>
                        <p className="text-lg font-bold text-amber-300">#{app.rank}</p>
                      </div>
                    )}

                    {/* Take exam button */}
                    {app.status === 'EXAM_PENDING' && (
                      <Link
                        to={`/exam/${app.job_id}`}
                        className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-medium transition"
                      >
                        Take Exam →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {applications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-gray-800 rounded-2xl">
              <p className="text-5xl mb-4">🔍</p>
              <p className="text-gray-400 mb-4">You haven't applied to any jobs yet</p>
              <Link to="/jobs" className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-medium transition">
                Browse Jobs
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
