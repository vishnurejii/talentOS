import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

import api from '../lib/api';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4001';

export default function ExamRoom() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const wsRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timer, setTimer] = useState({ minutes: 0, seconds: 0, total: 0 });
  const [warning, setWarning] = useState('');
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [violationWarning, setViolationWarning] = useState(false);
  const [warningCount, setWarningCount] = useState(0);

  // Ref to always have the latest handleFinish (avoids stale closure in WebSocket)
  const handleFinishRef = useRef(null);

  // ── Proctoring: Tab Switching Detection ───────────────────────────────────
  useEffect(() => {
    if (finished || !session) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        try {
          const resp = await api.recordViolation(session.session_id, 'TAB_SWITCH');
          setWarningCount(resp.warning_count);
          setViolationWarning(true);
          
          if (resp.status === 'COMPLETED') {
            setFinished(true); // Disqualified
          }
        } catch (err) {
          console.error('Proctoring error:', err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [session, finished]);

  // ── Start Exam ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function startExam() {
      try {
        const data = await api.startExam(jobId);
        setSession(data);
        setQuestions(data.questions || []);
        setTimer({ minutes: data.duration_mins, seconds: 0, total: data.duration_mins * 60 });
        setWarningCount(data.warning_count || 0);
        connectWebSocket(data);
      } catch (err) {
        console.error(err);
        if (err.message && err.message.toLowerCase().includes('already completed')) {
          // Exam was already submitted — show the finished screen
          setFinished(true);
        } else {
          setWarning(err.message || 'Failed to load exam. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    }
    startExam();
    return () => { wsRef.current?.close(); };
  }, [jobId, token]);

  // ── WebSocket ──────────────────────────────────────────────────────────────
  const connectWebSocket = useCallback((sessionData) => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ event: 'auth', token }));
      ws.send(JSON.stringify({
        event: 'start_timer',
        session_id: sessionData.session_id,
        ends_at: sessionData.ends_at,
        duration_mins: sessionData.duration_mins,
      }));
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      switch (msg.event) {
        case 'timer_tick':
          setTimer({ minutes: msg.minutes, seconds: msg.seconds, total: msg.remaining });
          break;
        case 'timer_warning':
          setWarning(msg.message);
          setTimeout(() => setWarning(''), 5000);
          break;
        case 'timer_expired':
          // Use ref to get the latest handleFinish (avoids stale closure)
          handleFinishRef.current?.();
          break;
      }
    };
  }, [token]);

  // ── Test & Submission ──────────────────────────────────────────────────────
  const handleRunTests = async () => {
    const q = questions[currentIdx];
    if (!q || q.question_type !== 'CODING') return;

    setIsRunningTests(true);
    setTestResults(null);
    try {
      const resp = await api.runTest(q.id, answers[q.id] || q.starter_code || '');
      setTestResults(resp);
    } catch (err) {
      console.error(err);
      setTestResults({ error: err.message });
    } finally {
      setIsRunningTests(false);
    }
  };

  const submitAnswer = async (questionId, answer) => {
    if (isSubmitting || !session) return;
    setIsSubmitting(true);
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    try {
      await api.submitAnswer(session.session_id, questionId, answer);
    } catch (err) {
      console.error('Submit failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Auto-save navigation ──────────────────────────────────────────────────
  const handleNavigation = (newIdx) => {
    // Auto-save current answer if it exists
    const currentQ = questions[currentIdx];
    if (currentQ && answers[currentQ.id] !== undefined) {
      submitAnswer(currentQ.id, answers[currentQ.id]);
    }
    setCurrentIdx(newIdx);
    setTestResults(null);
  };

  // ── Finish exam ────────────────────────────────────────────────────────────
  const handleFinish = async () => {
    if (!session) {
      console.error('No active session to finish.');
      return;
    }
    if (!window.confirm("Are you sure you want to finish the exam? Any unsaved progress will be finalized.")) return;
    
    // Final save attempt for current question
    const currentQ = questions[currentIdx];
    if (currentQ && answers[currentQ.id] !== undefined) {
      await api.submitAnswer(session.session_id, currentQ.id, answers[currentQ.id]);
    }

    try {
      wsRef.current?.send(JSON.stringify({
        event: 'stop_timer',
        session_id: session.session_id,
      }));
      const data = await api.finishExam(session.session_id);
      setResult(data);
      setFinished(true);
    } catch (err) {
      console.error(err);
    }
  };

  // Always keep ref pointing at the latest version (for WebSocket stale-closure fix)
  handleFinishRef.current = handleFinish;

  const q = questions[currentIdx];
  const pad = (n) => String(n).padStart(2, '0');

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );

  if (!loading && !session) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900">
      <div className="bg-white border border-slate-200 rounded-2xl p-10 max-w-lg w-full text-center shadow-lg">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-red-500 mb-3">Exam Unavailable</h1>
        <p className="text-slate-600 mb-2">{warning || 'Unable to load the exam session.'}</p>
        <p className="text-slate-500 text-sm mb-6">Please return to the dashboard and try again. If the issue persists, contact HR.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );

  if (finished) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900">
      <div className="bg-white border border-slate-200 rounded-2xl p-10 max-w-lg w-full text-center shadow-lg">
        {warningCount >= 3 ? (
          <>
            <div className="text-6xl mb-4">🚫</div>
            <h1 className="text-3xl font-bold text-red-500 mb-2">Disqualified</h1>
            <p className="text-slate-600 mb-6">
              You have been disqualified from this exam due to multiple proctoring violations (Tab Switching).
            </p>
          </>
        ) : (
          <>
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Exam Completed!</h1>
            <p className="text-slate-600 mb-6">Your answers have been submitted and scored successfully.</p>
          </>
        )}
        <div className="bg-slate-100 rounded-xl p-6 mb-6">
          <p className="text-sm text-slate-500">Final Score</p>
          <p className={`text-5xl font-bold ${warningCount >= 3 ? 'text-red-500' : 'text-blue-600'}`}>
            {warningCount >= 3 ? '0' : (result?.total_score ?? '—')}
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition shadow-lg shadow-blue-600/20"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 relative">
      {/* Proctoring Warning Modal */}
      {violationWarning && warningCount < 3 && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 text-center">
          <div className="bg-white border border-red-200 shadow-xl rounded-3xl p-10 max-w-md">
            <div className="text-6xl mb-4 animate-bounce">⚠️</div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">Proctoring Violation</h2>
            <p className="text-slate-600 mb-6 leading-relaxed">
              We detected that you switched tabs or left the exam area. This is strictly prohibited.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
              <span className="text-sm text-red-700 font-medium">Warnings: {warningCount} / 3</span>
              <p className="text-xs text-red-500 mt-1">Next violation will result in immediate disqualification.</p>
            </div>
            <button
              onClick={() => setViolationWarning(false)}
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold shadow-lg shadow-red-600/20 transition-all active:scale-95"
            >
              I Understand & Proceed
            </button>
          </div>
        </div>
      )}
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">{session?.job_title || 'Exam'}</h2>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
            Question {currentIdx + 1} of {questions.length}
          </p>
        </div>

        {/* Timer */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xl font-bold ${
          timer.total <= 60 ? 'bg-red-50 text-red-600 animate-pulse' :
          timer.total <= 300 ? 'bg-amber-50 text-amber-600' :
          'bg-slate-100 text-slate-900'
        }`}>
          ⏱️ {pad(timer.minutes)}:{pad(timer.seconds)}
        </div>

        <button
          onClick={handleFinish}
          className="px-5 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-bold transition shadow-lg shadow-red-600/20"
        >
          Finish Exam
        </button>
      </div>

      {/* Warning banner */}
      {warning && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-center py-2 text-sm animate-pulse">
          ⚠️ {warning}
        </div>
      )}

      {/* Question area */}
      <div className="max-w-6xl mx-auto p-6 mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Question Text */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8 flex flex-col">
          {q && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                  q.question_type === 'MCQ' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {q.question_type}
                </span>
                <span className="text-xs text-slate-500 font-bold">+{q.points} PTS</span>
              </div>

              <p className="text-xl font-medium mb-6 leading-relaxed">{q.question_text}</p>

              {/* MCQ Options */}
              {q.question_type === 'MCQ' && q.options && (
                <div className="space-y-3">
                  {q.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        const newAnswers = { ...answers, [q.id]: idx };
                        setAnswers(newAnswers);
                        submitAnswer(q.id, idx); // Immediate save for MCQs
                      }}
                      className={`w-full text-left p-4 rounded-xl border transition ${
                        answers[q.id] === idx
                          ? 'border-blue-500 bg-blue-50 text-slate-900 shadow-sm shadow-blue-500/10'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg mr-4 transition-all ${
                        answers[q.id] === idx ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Column: Code Editor & Console */}
        <div className="flex flex-col gap-6">
          {q?.question_type === 'CODING' && (
            <>
              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden flex flex-col h-[500px]">
                <div className="bg-gray-800/50 px-4 py-2 flex items-center justify-between border-b border-gray-700">
                  <div className="flex gap-1.5 ml-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRunTests}
                      disabled={isRunningTests}
                      className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-bold transition disabled:opacity-50"
                    >
                      {isRunningTests ? 'Running...' : '▶ Run Tests'}
                    </button>
                    <button
                      onClick={() => submitAnswer(q.id, answers[q.id] || q.starter_code || '')}
                      disabled={isSubmitting}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold transition disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                    >
                      {isSubmitting ? 'Saving...' : '✔ Submit Code'}
                    </button>
                  </div>
                </div>
                <textarea
                  className="flex-1 w-full bg-gray-950 p-6 font-mono text-sm text-emerald-300 focus:outline-none resize-none custom-scrollbar"
                  placeholder={q.starter_code || '// Write your solution here...'}
                  value={answers[q.id] || q.starter_code || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAnswers(prev => ({ ...prev, [q.id]: val }));
                  }}
                />
              </div>

              {/* Console / Results Row */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex-1 min-h-[150px]">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Test Console Output</h3>
                
                {!testResults && !isRunningTests && (
                  <div className="flex flex-col items-center justify-center py-6 text-gray-600 italic">
                    <p className="text-sm">Run your code to see validation results.</p>
                  </div>
                )}

                {isRunningTests && (
                  <div className="flex items-center gap-3 text-violet-400">
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    <span className="text-sm font-medium">Executing test cases on cloud sandbox...</span>
                  </div>
                )}

                {testResults && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        testResults.passed === testResults.total ? 'bg-emerald-600/20 text-emerald-400' : 'bg-red-600/20 text-red-400'
                      }`}>
                         {testResults.passed} / {testResults.total} Test Cases Passed
                      </span>
                      {testResults.test_results?.some(r => r.compile_output) && (
                        <span className="text-[10px] bg-red-600/30 text-red-200 px-2 py-0.5 rounded border border-red-500/30 font-bold uppercase">Compile Error</span>
                      )}
                    </div>

                    <div className="max-h-[220px] overflow-y-auto space-y-3 font-mono text-xs pr-2 custom-scrollbar">
                      {(testResults.test_results || []).map((res, i) => (
                        <div key={i} className={`p-3 rounded-xl border transition-all ${res.passed ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300' : 'bg-red-950/30 border-red-800/50 text-red-300'}`}>
                          <div className="flex justify-between mb-2">
                            <span className="font-bold">Case {i + 1}: {res.input || 'Default'}</span>
                            <span className={`uppercase text-[9px] font-black px-1.5 py-0.5 rounded ${res.passed ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                              {res.status || (res.passed ? 'Passed' : 'Failed')}
                            </span>
                          </div>
                          
                          {res.stdout && <div className="mt-2 text-gray-400 bg-black/40 p-2 rounded-lg border border-gray-800">
                             <span className="text-[10px] opacity-50 block mb-1">STDOUT:</span>
                             {res.stdout}
                          </div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {q?.question_type === 'MCQ' && (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 flex flex-col items-center justify-center text-center shadow-sm">
              <p className="text-5xl mb-4">📝</p>
              <h3 className="text-lg font-medium text-slate-900">Multiple Choice Question</h3>
              <p className="text-sm text-slate-500 max-w-xs mt-2">Pick an option on the left side. Your progress is saved automatically upon clicking.</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-slate-200 p-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <button
            onClick={() => handleNavigation(Math.max(0, currentIdx - 1))}
            disabled={currentIdx === 0}
            className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 rounded-xl font-bold transition disabled:opacity-30 shadow-sm"
          >
            ← Previous
          </button>

          {/* Question dots */}
          <div className="flex items-center gap-2">
            {questions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => handleNavigation(idx)}
                className={`w-10 h-10 rounded-xl text-sm font-bold transition ${
                  idx === currentIdx
                    ? 'bg-blue-600 text-white translate-y-[-2px] shadow-lg shadow-blue-500/20'
                    : answers[questions[idx]?.id] !== undefined
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                    : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleNavigation(Math.min(questions.length - 1, currentIdx + 1))}
            disabled={currentIdx === questions.length - 1}
            className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 rounded-xl font-bold transition disabled:opacity-30 shadow-sm"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
