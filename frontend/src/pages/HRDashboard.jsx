import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

import api from '../lib/api';

export default function HRDashboard() {
  const { token } = useAuthStore();
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.hrDashboard()
      .then(d => { setJobs(d.jobs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const loadRankings = async (jobId) => {
    setSelectedJob(jobId);
    try {
      const data = await api.jobRankings(jobId);
      setRankings(data.rankings || []);
    } catch (e) {
      console.error(e);
    }
  };

  const updateStatus = async (appId, status) => {
    try {
      await api.updateAppStatus(appId, status);
      if (selectedJob) loadRankings(selectedJob);
    } catch (e) {
      console.error(e);
    }
  };

  const statusColor = (s) => ({
    APPLIED: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    ATS_PROCESSING: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    EXAM_PENDING: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    EXAM_DONE: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    SHORTLISTED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    REJECTED: 'bg-red-500/20 text-red-300 border-red-500/30',
  }[s] || 'bg-gray-500/20 text-gray-300');

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="animate-spin h-12 w-12 border-4 border-violet-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              HR Dashboard
            </h1>
            <p className="text-sm text-gray-400">{jobs.length} active listings</p>
          </div>
          <Link to="/jobs/create" className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-medium transition">
            + Post New Job
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-12 gap-6">
        {/* Job cards (sidebar) */}
        <div className="col-span-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Your Jobs</h2>
          {jobs.map(job => (
            <button
              key={job.job_id}
              onClick={() => loadRankings(job.job_id)}
              className={`w-full text-left p-4 rounded-xl border transition ${
                selectedJob === job.job_id
                  ? 'border-violet-500 bg-violet-600/10'
                  : 'border-gray-800 bg-gray-900/60 hover:border-gray-600'
              }`}
            >
              <h3 className="font-medium text-white truncate">{job.title}</h3>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                <span>👥 {job.total_applicants} applicants</span>
                <span>📊 {job.scored_applicants} scored</span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs">
                {job.top_score && <span className="text-emerald-400">🏆 Top: {job.top_score}</span>}
                {job.avg_score && <span className="text-gray-400">Avg: {job.avg_score}</span>}
              </div>
            </button>
          ))}
        </div>

        {/* Rankings table */}
        <div className="col-span-8">
          {selectedJob ? (
            <div className="bg-gray-900/60 backdrop-blur border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800">
                <h2 className="text-lg font-semibold">Candidate Rankings</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-800">
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">Candidate</th>
                      <th className="px-4 py-3 text-center">ATS</th>
                      <th className="px-4 py-3 text-center">Exam</th>
                      <th className="px-4 py-3 text-center">Final</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((r, i) => (
                      <tr key={r.application_id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition">
                        <td className="px-4 py-3">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                            i === 0 ? 'bg-amber-500/20 text-amber-300' :
                            i === 1 ? 'bg-gray-400/20 text-gray-300' :
                            i === 2 ? 'bg-orange-500/20 text-orange-300' :
                            'bg-gray-800 text-gray-500'
                          }`}>{r.rank}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-white text-sm">{r.candidate_name}</p>
                          <p className="text-xs text-gray-500">{r.candidate_email}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-mono">{r.ats_score?.toFixed(1) ?? '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-mono">{r.exam_score?.toFixed(1) ?? '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-bold font-mono text-violet-300">{r.final_score?.toFixed(1) ?? '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-lg text-xs border ${statusColor(r.status)}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => updateStatus(r.application_id, 'SHORTLISTED')}
                              className="px-2.5 py-1 text-xs bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded-lg hover:bg-emerald-600/40 transition"
                            >✓</button>
                            <button
                              onClick={() => updateStatus(r.application_id, 'REJECTED')}
                              className="px-2.5 py-1 text-xs bg-red-600/20 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-600/40 transition"
                            >✗</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {rankings.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No applicants yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-96 border border-dashed border-gray-800 rounded-2xl">
              <div className="text-center">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-gray-400">Select a job to view rankings</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
