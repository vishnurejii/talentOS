import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  Users, 
  ShieldAlert, 
  HelpCircle, 
  BarChart3, 
  Search, 
  Briefcase, 
  CheckCircle2, 
  XCircle, 
  MoreVertical,
  ChevronRight,
  Code
} from 'lucide-react';

import api from '../lib/api';

export default function HRDashboard() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [proctoringLogs, setProctoringLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('rankings'); // screenings, questions, proctoring
  const [reviewSession, setReviewSession] = useState(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    // We set loading to true initially, and false only after jobs are attempted
    try {
      // 1. Fetch Jobs (Critical)
      const d = await api.hrDashboard();
      setJobs(d.jobs || []);
    } catch (err) {
      console.error("Failed to load jobs:", err);
    } finally {
      setLoading(false);
    }

    // 2. Fetch Logs (Non-critical, parallel)
    try {
      const logs = await api.getProctoringLogs();
      setProctoringLogs(logs || []);
    } catch (err) {
      console.error("Failed to load logs:", err);
    }
  };

  const openReviewModal = async (app) => {
    try {
      // Find the session ID from the app rankings or derived
      if (app.exam_session_id) {
         const session = await api.getExamSession(app.exam_session_id);
         setReviewSession(session);
         setIsReviewOpen(true);
      } else {
         alert("Assessment session not found for this candidate.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load submission details.");
    }
  };

  const loadJobDetails = async (jobId) => {
    setSelectedJob(jobId);
    try {
      const r_data = await api.jobRankings(jobId);
      setRankings(r_data.rankings || []);
      const q_data = await api.getJobQuestions(jobId);
      setQuestions(q_data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const updateStatus = async (appId, status) => {
    try {
      await api.updateAppStatus(appId, status);
      if (selectedJob) loadJobDetails(selectedJob);
    } catch (e) {
      console.error(e);
    }
  };

  const statusColor = (s) => ({
    APPLIED: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    ATS_PROCESSING: 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold animate-pulse',
    EXAM_PENDING: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    EXAM_DONE: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    SHORTLISTED: 'bg-emerald-500/20 text-emerald-100 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
    REJECTED: 'bg-red-500/10 text-red-400 border-red-500/20',
  }[s] || 'bg-gray-500/20 text-gray-300');

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  );

  const stats = [
    { label: 'Active Jobs', value: jobs.length, icon: Briefcase, color: 'text-indigo-400' },
    { label: 'Total Applicants', value: jobs.reduce((acc, j) => acc + (j.total_applicants || 0), 0), icon: Users, color: 'text-blue-400' },
    { label: 'System Integrity', value: '100%', icon: ShieldAlert, color: 'text-emerald-400' },
    { label: 'Avg Qualified', value: '68%', icon: BarChart3, color: 'text-violet-400' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-10">
      
      {/* Submission Review Modal */}
      {isReviewOpen && reviewSession && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-10">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsReviewOpen(false)} />
           <div className="relative bg-slate-900 border border-white/10 w-full max-w-6xl h-full rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-slate-950/40">
                 <div>
                    <h2 className="text-2xl font-black text-white">Submission Review</h2>
                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Exam Session ID: {reviewSession.id.slice(-8).toUpperCase()}</p>
                 </div>
                 <button onClick={() => setIsReviewOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><XCircle size={24} className="text-slate-500" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 grid grid-cols-12 gap-10">
                 {/* Left: Violations & Meta */}
                 <div className="col-span-12 lg:col-span-4 space-y-6">
                    <div className="bg-slate-950/50 border border-white/5 rounded-3xl p-6">
                       <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <ShieldAlert size={14} className="text-red-500" /> Proctoring Log
                       </h3>
                       {reviewSession.proctoring_violations?.length === 0 ? (
                          <p className="text-sm text-emerald-500/70 italic font-medium">No integrity violations detected during this session.</p>
                       ) : (
                          <div className="space-y-3">
                             {reviewSession.proctoring_violations.map((v, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                                   <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5" />
                                   <div>
                                      <p className="text-xs font-bold text-red-400">{v.type}</p>
                                      <p className="text-[10px] text-slate-500">{new Date(v.timestamp).toLocaleTimeString()}</p>
                                   </div>
                                </div>
                             ))}
                          </div>
                       )}
                    </div>

                    <div className="bg-slate-950/50 border border-white/5 rounded-3xl p-6">
                       <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <BarChart3 size={14} className="text-indigo-400" /> Score Breakdown
                       </h3>
                       <div className="space-y-4">
                          <div className="flex justify-between items-center text-sm">
                             <span className="text-slate-400">Total Score</span>
                             <span className="font-mono font-bold text-white text-lg">{reviewSession.total_score || 0} pts</span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-1.5">
                             <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: '100%' }} />
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Right: Actual Submissions */}
                 <div className="col-span-12 lg:col-span-8 space-y-8">
                    {reviewSession.questions.map((q, idx) => {
                       const answerObj = reviewSession.answers.find(a => a.question_id === q.id) || {};
                       return (
                          <div key={idx} className="bg-slate-950/20 border border-white/5 rounded-3xl p-8">
                             <div className="flex items-center justify-between mb-4">
                                <span className="px-3 py-1 bg-slate-800 text-slate-500 text-[9px] font-black uppercase rounded-lg tracking-widest">{q.question_type}</span>
                                <span className={`text-[10px] font-bold ${answerObj.score > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                   Points Earned: {answerObj.score || 0} / {q.points}
                                </span>
                             </div>
                             <p className="text-slate-100 font-bold mb-6 text-lg tracking-tight leading-relaxed">{q.question_text}</p>
                             
                             {q.question_type === 'CODING' ? (
                                <div className="space-y-4">
                                   <div className="bg-slate-900 rounded-2xl border border-white/10 overflow-hidden ring-1 ring-white/5">
                                      <div className="px-4 py-2 bg-slate-800/50 border-b border-white/5 flex items-center justify-between">
                                         <span className="text-[10px] font-bold text-slate-500">{q.language.toUpperCase()} Submission</span>
                                         <Code size={14} className="text-indigo-400" />
                                      </div>
                                      <pre className="p-6 text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre leading-relaxed">
                                         {answerObj.answer || "// No code submitted"}
                                      </pre>
                                   </div>
                                   {answerObj.test_results && (
                                     <div className="grid grid-cols-2 gap-3">
                                        {answerObj.test_results.test_results?.slice(0, 4).map((tr, tri) => (
                                          <div key={tri} className={`p-3 rounded-xl border text-[10px] ${tr.passed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                                             <div className="flex items-center gap-2 mb-1">
                                                {tr.passed ? <CheckCircle2 size={12} className="text-emerald-500" /> : <XCircle size={12} className="text-red-500" />}
                                                <span className="font-bold uppercase tracking-widest">Case {tri+1}</span>
                                             </div>
                                             <p className="text-slate-500 truncate">Result: <span className={tr.passed ? 'text-emerald-400/80' : 'text-red-400/80'}>{tr.status || 'Executed'}</span></p>
                                          </div>
                                        ))}
                                     </div>
                                   )}
                                </div>
                             ) : (
                                <div className="grid grid-cols-2 gap-4">
                                   {q.options.map((opt, oidx) => {
                                      const isCorrect = oidx === q.correct_option_index;
                                      const isSelected = String(oidx) === String(answerObj.answer);
                                      return (
                                         <div key={oidx} className={`p-5 rounded-2xl border flex items-center gap-3 transition-all ${
                                            isSelected ? 'ring-2 ring-indigo-500/50 border-indigo-500 shadow-xl shadow-indigo-500/5' : 'border-white/5 bg-slate-900/50'
                                         }`}>
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${
                                               isCorrect ? 'bg-emerald-500 text-white' : (isSelected ? 'bg-red-400 text-white' : 'bg-slate-800 text-slate-500')
                                            }`}>
                                               {String.fromCharCode(65 + oidx)}
                                            </div>
                                            <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-400'}`}>{opt}</span>
                                            {isSelected && !isCorrect && <XCircle size={16} className="ml-auto text-red-400" />}
                                            {isCorrect && <CheckCircle2 size={16} className="ml-auto text-emerald-400" />}
                                         </div>
                                      );
                                   })}
                                </div>
                             )}
                          </div>
                       );
                    })}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Top Banner / Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map((s, i) => (
          <div key={i} className="bg-slate-900 border border-white/5 p-4 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg bg-slate-800/50 ${s.color}`}>
                <s.icon size={18} />
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{s.label}</span>
            </div>
            <p className="text-2xl font-bold font-mono tracking-tight">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white via-white to-slate-500 bg-clip-text text-transparent">
            Admin Console
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage jobs, candidates, and platform integrity</p>
        </div>
        <Link 
          to="/jobs/create" 
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
        >
          Post New Position
        </Link>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left: Job Sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Briefcase size={14} /> Open Roles
            </h2>
          </div>
          
          <div className="space-y-3">
            {jobs.map(job => (
              <button
                key={job.job_id}
                onClick={() => loadJobDetails(job.job_id)}
                className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
                  selectedJob === job.job_id
                    ? 'border-indigo-500/50 bg-indigo-600/10 shadow-lg shadow-indigo-500/5'
                    : 'border-white/5 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                {selectedJob === job.job_id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                )}
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-slate-100 group-hover:text-white transition-colors">{job.title}</h3>
                  <ChevronRight size={16} className={`transition-transform duration-300 ${selectedJob === job.job_id ? 'rotate-90 text-indigo-400' : 'text-slate-600'}`} />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-bold rounded uppercase">
                    {job.total_applicants} applied
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${job.scored_applicants > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                    {job.scored_applicants} evaluated
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Main Content Area */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <div className="flex items-center gap-4 bg-slate-900/40 p-1.5 rounded-2xl border border-white/5 self-start mb-2">
            {[
              { id: 'rankings', label: 'Candidate Rankings', icon: Users },
              { id: 'questions', label: 'Question Bank', icon: HelpCircle },
              { id: 'proctoring', label: 'Proctoring Log', icon: ShieldAlert },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-slate-800 text-white shadow-xl border border-white/10' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-slate-900/80 backdrop-blur border border-white/5 rounded-3xl min-h-[600px] shadow-2xl overflow-hidden flex flex-col">
            
            {/* TAB: RANKINGS */}
            {activeTab === 'rankings' && (
              <>
                <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-3">
                    <Users className="text-indigo-400" /> Hiring Pipeline
                  </h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input 
                      type="text" 
                      placeholder="Search candidates..." 
                      className="bg-slate-950/50 border border-white/5 rounded-full pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="overflow-x-auto flex-1">
                  <table className="w-full">
                    <thead>
                      <tr className="text-[10px] text-slate-500 uppercase tracking-widest border-b border-white/5 bg-slate-950/20">
                        <th className="px-6 py-4 text-left">Candidate Info</th>
                        <th className="px-4 py-4 text-center">Scores (ATS / Exam)</th>
                        <th className="px-4 py-4 text-center">Total Grade</th>
                        <th className="px-4 py-4 text-center">Risk</th>
                        <th className="px-4 py-4 text-center">Status</th>
                        <th className="px-4 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {rankings.filter(r => r.candidate_name.toLowerCase().includes(searchQuery.toLowerCase())).map((r, i) => (
                        <tr key={r.application_id} className="group hover:bg-white/5 transition-all">
                          <td className="px-6 py-5 cursor-pointer" onClick={() => openReviewModal(r)}>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold ring-2 ring-white/5">
                                {r.candidate_name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-100 group-hover:text-indigo-400 transition-colors">{r.candidate_name}</p>
                                <p className="text-[10px] text-slate-500">{r.candidate_email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-5 text-center">
                            <div className="flex items-center justify-center gap-2">
                               <span className="text-xs font-mono font-bold text-indigo-400">{r.ats_score?.toFixed(1) || '0.0'}</span>
                               <span className="text-slate-700">|</span>
                               <span className="text-xs font-mono font-bold text-violet-400">{r.exam_score?.toFixed(1) || '0.0'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-5 text-center">
                            <span className="text-lg font-black font-mono bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                              {r.final_score?.toFixed(1) || '0.0'}
                            </span>
                          </td>
                          <td className="px-4 py-5 text-center">
                            {r.total_warnings > 0 ? (
                               <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full text-[10px] font-bold">
                                  <ShieldAlert size={10} /> {r.total_warnings} Violations
                               </div>
                            ) : (
                               <span className="text-[10px] font-bold text-emerald-500/50">CLEAN</span>
                            )}
                          </td>
                          <td className="px-4 py-5 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border shadow-sm ${statusColor(r.status)}`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right">
                             <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => openReviewModal(r)}
                                  title="View Details"
                                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-800 text-slate-400 border border-white/5 hover:bg-slate-700 hover:text-white transition-all shadow-md active:scale-90"
                                >
                                  <BarChart3 size={14} />
                                </button>
                                <button
                                  onClick={() => updateStatus(r.application_id, 'SHORTLISTED')}
                                  title="Shortlist"
                                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all shadow-md active:scale-90"
                                >
                                  <CheckCircle2 size={16} />
                                </button>
                             </div>
                          </td>
                        </tr>
                      ))}
                      {!selectedJob && (
                        <tr><td colSpan={6} className="py-24 text-center text-slate-500 font-medium italic">Select a job position to view the hiring pipeline</td></tr>
                      )}
                      {selectedJob && rankings.length === 0 && (
                        <tr><td colSpan={6} className="py-24 text-center text-slate-500 font-medium italic">No candidates have completed the assessment for this role yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* TAB: QUESTIONS (ADMIN VIEW) */}
            {activeTab === 'questions' && (
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-bold flex items-center gap-3">
                    <HelpCircle className="text-violet-400" /> Assessment Questions
                  </h2>
                </div>

                {!selectedJob ? (
                  <div className="py-24 text-center text-slate-600">
                    <HelpCircle size={48} className="mx-auto mb-4 opacity-10" />
                    <p>Select a job role from the sidebar to inspect its generated questions</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {questions.map((q, idx) => (
                      <div key={idx} className="bg-slate-950/40 border border-white/5 rounded-2xl p-6 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-3">
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-500 text-[9px] font-bold rounded">{q.question_type}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Question {idx + 1}</h4>
                        <p className="text-slate-100 font-medium mb-6 leading-relaxed">{q.question_text}</p>
                        
                        {q.question_type === 'CODING' && q.test_cases && (
                           <div className="space-y-4">
                              <div className="p-4 bg-slate-900 rounded-xl border border-white/5">
                                 <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Starter Code Preview</p>
                                 <code className="text-emerald-400 text-xs font-mono block whitespace-pre overflow-x-auto">{q.starter_code}</code>
                              </div>
                              <div className="grid grid-cols-2 gap-3 mt-4">
                                {q.test_cases.slice(0, 4).map((tc, tcIdx) => (
                                  <div key={tcIdx} className="p-3 bg-slate-950 rounded-lg border border-white/5 text-[10px]">
                                     <span className="text-slate-500 font-bold block mb-1">Test Case {tcIdx + 1}</span>
                                     <p className="text-slate-400 mb-1 truncate">In: <span className="text-indigo-400">{tc.input}</span></p>
                                     <p className="text-slate-400 truncate">Out: <span className="text-emerald-400">{tc.expected_output}</span></p>
                                  </div>
                                ))}
                              </div>
                           </div>
                        )}

                        {q.question_type === 'MCQ' && q.options && (
                          <div className="grid grid-cols-2 gap-4">
                             {q.options.map((opt, oIdx) => (
                               <div key={oIdx} className={`p-4 rounded-xl border text-sm flex items-center gap-3 ${oIdx === q.correct_option_index ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-900 border-white/5 text-slate-400'}`}>
                                  <span className="w-5 h-5 flex items-center justify-center rounded bg-black/40 text-[10px] font-bold">{String.fromCharCode(65+oIdx)}</span>
                                  {opt}
                                  {oIdx === q.correct_option_index && <CheckCircle2 size={12} className="ml-auto" />}
                               </div>
                             ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: PROCTORING (ADMIN LOGS) */}
            {activeTab === 'proctoring' && (
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                   <h2 className="text-xl font-bold flex items-center gap-3">
                    <ShieldAlert className="text-red-400" /> Proctoring Integrity Logs
                  </h2>
                </div>

                <div className="space-y-4">
                  {proctoringLogs.length === 0 ? (
                    <div className="py-24 text-center text-slate-600">
                      <ShieldAlert size={48} className="mx-auto mb-4 opacity-10" />
                      <p>No proctoring violations recorded in the last 30 days.</p>
                    </div>
                  ) : (
                    proctoringLogs.map((log, i) => (
                      <div key={i} className="flex items-center justify-between p-5 bg-slate-950/40 border border-white/5 rounded-2xl hover:border-red-500/30 transition-all border-l-4 border-l-red-500">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 font-bold shadow-lg">
                              {log.warning_count}
                           </div>
                           <div>
                              <p className="font-bold text-slate-100">{log.candidate_name || 'Anonymous Candidate'}</p>
                              <p className="text-xs text-slate-500">{log.job_title} • Dispatched ID: {log.session_id.slice(-6).toUpperCase()}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <span className="inline-block px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-[10px] font-bold uppercase mb-1">
                              {log.status === 'COMPLETED' ? 'Session Flagged' : 'Auto-Disqualified'}
                           </span>
                           <p className="text-[10px] text-slate-600 font-mono">{new Date().toLocaleString()}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
