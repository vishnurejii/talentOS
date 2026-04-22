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
    APPLIED: 'bg-blue-50 text-blue-700 border-blue-200',
    ATS_PROCESSING: 'bg-amber-50 text-amber-700 border-amber-200 font-bold animate-pulse',
    EXAM_PENDING: 'bg-purple-50 text-purple-700 border-purple-200',
    EXAM_DONE: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    SHORTLISTED: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
    REJECTED: 'bg-red-50 text-red-700 border-red-200',
  }[s] || 'bg-gray-50 text-gray-700 border-gray-200');

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );

  const stats = [
    { label: 'Active Jobs', value: jobs.length, icon: Briefcase, color: 'text-indigo-400' },
    { label: 'Total Applicants', value: jobs.reduce((acc, j) => acc + (j.total_applicants || 0), 0), icon: Users, color: 'text-blue-400' },
    { label: 'System Integrity', value: '100%', icon: ShieldAlert, color: 'text-emerald-400' },
    { label: 'Avg Qualified', value: '68%', icon: BarChart3, color: 'text-violet-400' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 lg:p-10">
      
      {/* Submission Review Modal */}
      {isReviewOpen && reviewSession && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-10">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsReviewOpen(false)} />
           <div className="relative bg-white border border-slate-200 w-full max-w-6xl h-full rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                 <div>
                    <h2 className="text-2xl font-black text-slate-900">Submission Review</h2>
                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Exam Session ID: {reviewSession.id.slice(-8).toUpperCase()}</p>
                 </div>
                 <button onClick={() => setIsReviewOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><XCircle size={24} className="text-slate-500" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 grid grid-cols-12 gap-10">
                 {/* Left: Violations & Meta */}
                 <div className="col-span-12 lg:col-span-4 space-y-6">
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                       <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <ShieldAlert size={14} className="text-red-500" /> Proctoring Log
                       </h3>
                       {reviewSession.proctoring_violations?.length === 0 ? (
                          <p className="text-sm text-emerald-600 italic font-medium">No integrity violations detected during this session.</p>
                       ) : (
                          <div className="space-y-3">
                             {reviewSession.proctoring_violations.map((v, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                                   <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5" />
                                   <div>
                                      <p className="text-xs font-bold text-red-600">{v.type}</p>
                                      <p className="text-[10px] text-slate-500">{new Date(v.timestamp).toLocaleTimeString()}</p>
                                   </div>
                                </div>
                             ))}
                          </div>
                       )}
                    </div>

                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                       <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <BarChart3 size={14} className="text-blue-600" /> Score Breakdown
                       </h3>
                       <div className="space-y-4">
                          <div className="flex justify-between items-center text-sm">
                             <span className="text-slate-500">Total Score</span>
                             <span className="font-mono font-bold text-slate-900 text-lg">{reviewSession.total_score || 0} pts</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                             <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '100%' }} />
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Right: Actual Submissions */}
                 <div className="col-span-12 lg:col-span-8 space-y-8">
                    {reviewSession.questions.map((q, idx) => {
                       const answerObj = reviewSession.answers.find(a => a.question_id === q.id) || {};
                       return (
                          <div key={idx} className="bg-slate-50 border border-slate-200 rounded-3xl p-8 shadow-sm">
                             <div className="flex items-center justify-between mb-4">
                                <span className="px-3 py-1 bg-white border border-slate-200 text-slate-500 text-[9px] font-black uppercase rounded-lg tracking-widest">{q.question_type}</span>
                                <span className={`text-[10px] font-bold ${answerObj.score > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                   Points Earned: {answerObj.score || 0} / {q.points}
                                </span>
                             </div>
                             <p className="text-slate-900 font-bold mb-6 text-lg tracking-tight leading-relaxed">{q.question_text}</p>
                             
                             {q.question_type === 'CODING' ? (
                                <div className="space-y-4">
                                   <div className="bg-gray-950 rounded-2xl border border-gray-800 overflow-hidden ring-1 ring-gray-900">
                                      <div className="px-4 py-2 bg-gray-900 border-b border-gray-800 flex items-center justify-between">
                                         <span className="text-[10px] font-bold text-slate-400">{q.language.toUpperCase()} Submission</span>
                                         <Code size={14} className="text-blue-400" />
                                      </div>
                                      <pre className="p-6 text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre leading-relaxed">
                                         {answerObj.answer || "// No code submitted"}
                                      </pre>
                                   </div>
                                   {answerObj.test_results && (
                                     <div className="grid grid-cols-2 gap-3">
                                        {answerObj.test_results.test_results?.slice(0, 4).map((tr, tri) => (
                                          <div key={tri} className={`p-3 rounded-xl border text-[10px] ${tr.passed ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                             <div className="flex items-center gap-2 mb-1">
                                                {tr.passed ? <CheckCircle2 size={12} className="text-emerald-600" /> : <XCircle size={12} className="text-red-600" />}
                                                <span className="font-bold uppercase tracking-widest text-slate-700">Case {tri+1}</span>
                                             </div>
                                             <p className="text-slate-500 truncate">Result: <span className={tr.passed ? 'text-emerald-600' : 'text-red-600'}>{tr.status || 'Executed'}</span></p>
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
                                            isSelected ? 'ring-2 ring-blue-500/50 border-blue-500 shadow-xl shadow-blue-500/5 bg-slate-50' : 'border-slate-200 bg-white'
                                         }`}>
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${
                                               isCorrect ? 'bg-emerald-500 text-white' : (isSelected ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500')
                                            }`}>
                                               {String.fromCharCode(65 + oidx)}
                                            </div>
                                            <span className={`text-sm font-bold ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>{opt}</span>
                                            {isSelected && !isCorrect && <XCircle size={16} className="ml-auto text-red-500" />}
                                            {isCorrect && <CheckCircle2 size={16} className="ml-auto text-emerald-600" />}
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
          <div key={i} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg bg-blue-50/50 ${s.color}`}>
                <s.icon size={18} />
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{s.label}</span>
            </div>
            <p className="text-2xl font-bold font-mono tracking-tight text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent">
            Admin Console
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage jobs, candidates, and platform integrity</p>
        </div>
        <Link 
          to="/jobs/create" 
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95"
        >
          Post New Position
        </Link>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left: Job Sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
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
                    ? 'border-blue-600/50 bg-blue-50 shadow-lg shadow-blue-500/5'
                    : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                }`}
              >
                {selectedJob === job.job_id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
                )}
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-slate-900 group-hover:text-slate-700 transition-colors">{job.title}</h3>
                  <ChevronRight size={16} className={`transition-transform duration-300 ${selectedJob === job.job_id ? 'rotate-90 text-blue-600' : 'text-slate-400'}`} />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase">
                    {job.total_applicants} applied
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${job.scored_applicants > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {job.scored_applicants} evaluated
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Main Content Area */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <div className="flex items-center gap-4 bg-white p-1.5 rounded-2xl border border-slate-200 self-start mb-2 shadow-sm">
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
                    ? 'bg-slate-100 text-slate-900 shadow-sm border border-slate-200' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl min-h-[600px] shadow-sm overflow-hidden flex flex-col">
            
            {/* TAB: RANKINGS */}
            {activeTab === 'rankings' && (
              <>
                <div className="px-8 py-6 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-3">
                    <Users className="text-blue-600" /> Hiring Pipeline
                  </h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input 
                      type="text" 
                      placeholder="Search candidates..." 
                      className="bg-slate-50 border border-slate-200 rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="overflow-x-auto flex-1">
                  <table className="w-full">
                    <thead>
                      <tr className="text-[10px] text-slate-600 uppercase tracking-widest border-b border-slate-200 bg-slate-50">
                        <th className="px-6 py-4 text-left">Candidate Info</th>
                        <th className="px-4 py-4 text-center">Scores (ATS / Exam)</th>
                        <th className="px-4 py-4 text-center">Total Grade</th>
                        <th className="px-4 py-4 text-center">Risk</th>
                        <th className="px-4 py-4 text-center">Status</th>
                        <th className="px-4 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {rankings.filter(r => r.candidate_name.toLowerCase().includes(searchQuery.toLowerCase())).map((r, i) => (
                        <tr key={r.application_id} className="group hover:bg-slate-50 transition-all">
                          <td className="px-6 py-5 cursor-pointer" onClick={() => openReviewModal(r)}>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-xs font-bold ring-2 ring-slate-200 text-white">
                                {r.candidate_name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{r.candidate_name}</p>
                                <p className="text-[10px] text-slate-500">{r.candidate_email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-5 text-center">
                            <div className="flex items-center justify-center gap-2">
                               <span className="text-xs font-mono font-bold text-blue-600">{r.ats_score?.toFixed(1) || '0.0'}</span>
                               <span className="text-slate-300">|</span>
                               <span className="text-xs font-mono font-bold text-indigo-600">{r.exam_score?.toFixed(1) || '0.0'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-5 text-center">
                            <span className="text-lg font-black font-mono bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                              {r.final_score?.toFixed(1) || '0.0'}
                            </span>
                          </td>
                          <td className="px-4 py-5 text-center">
                            {r.total_warnings > 0 ? (
                               <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded-full text-[10px] font-bold">
                                  <ShieldAlert size={10} /> {r.total_warnings} Violations
                               </div>
                            ) : (
                               <span className="text-[10px] font-bold text-emerald-600/70">CLEAN</span>
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
                                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm active:scale-90"
                                >
                                  <BarChart3 size={14} />
                                </button>
                                <button
                                  onClick={() => updateStatus(r.application_id, 'SHORTLISTED')}
                                  title="Shortlist"
                                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 hover:text-emerald-700 transition-all shadow-sm active:scale-90"
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
                    <HelpCircle className="text-blue-600" /> Assessment Questions
                  </h2>
                </div>

                {!selectedJob ? (
                  <div className="py-24 text-center text-slate-500">
                    <HelpCircle size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Select a job role from the sidebar to inspect its generated questions</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {questions.map((q, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-3">
                            <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[9px] font-bold rounded">{q.question_type}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Question {idx + 1}</h4>
                        <p className="text-slate-900 font-medium mb-6 leading-relaxed">{q.question_text}</p>
                        
                        {q.question_type === 'CODING' && q.test_cases && (
                           <div className="space-y-4">
                              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                                 <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Starter Code Preview</p>
                                 <code className="text-emerald-400 text-xs font-mono block whitespace-pre overflow-x-auto">{q.starter_code}</code>
                              </div>
                              <div className="grid grid-cols-2 gap-3 mt-4">
                                {q.test_cases.slice(0, 4).map((tc, tcIdx) => (
                                  <div key={tcIdx} className="p-3 bg-white rounded-lg border border-slate-200 text-[10px] shadow-sm">
                                     <span className="text-slate-700 font-bold block mb-1">Test Case {tcIdx + 1}</span>
                                     <p className="text-slate-500 mb-1 truncate">In: <span className="text-blue-600">{tc.input}</span></p>
                                     <p className="text-slate-500 truncate">Out: <span className="text-emerald-600">{tc.expected_output}</span></p>
                                  </div>
                                ))}
                              </div>
                           </div>
                        )}

                        {q.question_type === 'MCQ' && q.options && (
                          <div className="grid grid-cols-2 gap-4">
                             {q.options.map((opt, oIdx) => (
                               <div key={oIdx} className={`p-4 rounded-xl border text-sm flex items-center gap-3 ${oIdx === q.correct_option_index ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                                  <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold ${oIdx === q.correct_option_index ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{String.fromCharCode(65+oIdx)}</span>
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
                    <ShieldAlert className="text-red-500" /> Proctoring Integrity Logs
                  </h2>
                </div>

                <div className="space-y-4">
                  {proctoringLogs.length === 0 ? (
                    <div className="py-24 text-center text-slate-500">
                      <ShieldAlert size={48} className="mx-auto mb-4 opacity-20" />
                      <p>No proctoring violations recorded in the last 30 days.</p>
                    </div>
                  ) : (
                    proctoringLogs.map((log, i) => (
                      <div key={i} className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl hover:border-red-300 transition-all border-l-4 border-l-red-500 shadow-sm">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 font-bold shadow-sm">
                              {log.warning_count}
                           </div>
                           <div>
                              <p className="font-bold text-slate-900">{log.candidate_name || 'Anonymous Candidate'}</p>
                              <p className="text-xs text-slate-500">{log.job_title} • Dispatched ID: {log.session_id.slice(-6).toUpperCase()}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <span className="inline-block px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded-full text-[10px] font-bold uppercase mb-1">
                              {log.status === 'COMPLETED' ? 'Session Flagged' : 'Auto-Disqualified'}
                           </span>
                           <p className="text-[10px] text-slate-500 font-mono">{new Date().toLocaleString()}</p>
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
