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
          handleFinish();
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
    if (isSubmitting) return;
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

  // ── Finish exam ────────────────────────────────────────────────────────────
  const handleFinish = async () => {
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

  const q = questions[currentIdx];
  const pad = (n) => String(n).padStart(2, '0');

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="animate-spin h-12 w-12 border-4 border-violet-500 border-t-transparent rounded-full" />
    </div>
  );

  if (finished) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="bg-gray-900/80 backdrop-blur border border-gray-800 rounded-2xl p-10 max-w-lg w-full text-center">
        {warningCount >= 3 ? (
          <>
            <div className="text-6xl mb-4">🚫</div>
            <h1 className="text-3xl font-bold text-red-500 mb-2">Disqualified</h1>
            <p className="text-gray-400 mb-6">
              You have been disqualified from this exam due to multiple proctoring violations (Tab Switching).
            </p>
          </>
        ) : (
          <>
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-3xl font-bold text-white mb-2">Exam Completed!</h1>
            <p className="text-gray-400 mb-6">Your answers have been submitted and scored successfully.</p>
          </>
        )}
        <div className="bg-gray-800/60 rounded-xl p-6 mb-6">
          <p className="text-sm text-gray-400">Final Score</p>
          <p className={`text-5xl font-bold ${warningCount >= 3 ? 'text-red-500' : 'bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent'}`}>
            {warningCount >= 3 ? '0' : (result?.total_score ?? '—')}
          </p>
        </div>
        <button
          onClick={() => navigate('/jobs')}
          className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition"
        >
          Back to Job Board
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white relative">
      {/* Proctoring Warning Modal */}
      {violationWarning && warningCount < 3 && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 text-center">
          <div className="bg-gray-900 border border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.2)] rounded-3xl p-10 max-w-md">
            <div className="text-6xl mb-4 animate-bounce">⚠️</div>
            <h2 className="text-2xl font-bold text-red-400 mb-4">Proctoring Violation</h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              We detected that you switched tabs or left the exam area. This is strictly prohibited.
            </p>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-8">
              <span className="text-sm text-red-300 font-medium">Warnings: {warningCount} / 3</span>
              <p className="text-xs text-red-400/70 mt-1">Next violation will result in immediate disqualification.</p>
            </div>
            <button
              onClick={() => setViolationWarning(false)}
              className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-600/30 transition-all active:scale-95"
            >
              I Understand & Proceed
            </button>
          </div>
        </div>
      )}
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-gray-900/90 backdrop-blur border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{session?.job_title || 'Exam'}</h2>
          <p className="text-sm text-gray-400">
            Question {currentIdx + 1} of {questions.length}
          </p>
        </div>

        {/* Timer */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xl font-bold ${
          timer.total <= 60 ? 'bg-red-900/40 text-red-400 animate-pulse' :
          timer.total <= 300 ? 'bg-amber-900/40 text-amber-400' :
          'bg-gray-800/60 text-white'
        }`}>
          ⏱️ {pad(timer.minutes)}:{pad(timer.seconds)}
        </div>

        <button
          onClick={handleFinish}
          className="px-5 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-medium transition"
        >
          Finish Exam
        </button>
      </div>

      {/* Warning banner */}
      {warning && (
        <div className="bg-amber-600/20 border border-amber-500/40 text-amber-300 text-center py-2 text-sm animate-pulse">
          ⚠️ {warning}
        </div>
      )}

      {/* Question area */}
      <div className="max-w-6xl mx-auto p-6 mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Question Text */}
        <div className="bg-gray-900/60 backdrop-blur border border-gray-800 rounded-2xl p-8 flex flex-col">
          {q && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                  q.question_type === 'MCQ' ? 'bg-blue-600/30 text-blue-300' : 'bg-emerald-600/30 text-emerald-300'
                }`}>
                  {q.question_type}
                </span>
                <span className="text-sm text-gray-400">{q.points} pts</span>
              </div>

              <p className="text-xl font-medium mb-6 leading-relaxed">{q.question_text}</p>

              {/* MCQ Options */}
              {q.question_type === 'MCQ' && q.options && (
                <div className="space-y-3">
                  {q.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => submitAnswer(q.id, idx)}
                      className={`w-full text-left p-4 rounded-xl border transition ${
                        answers[q.id] === idx
                          ? 'border-violet-500 bg-violet-600/20 text-white'
                          : 'border-gray-700 bg-gray-800/40 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      <span className="font-medium text-gray-400 mr-3">
                        {String.fromCharCode(65 + idx)}.
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
                  <span className="text-sm font-mono text-gray-400">Editor ({q.language || 'Python'})</span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRunTests}
                      disabled={isRunningTests}
                      className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-medium transition disabled:opacity-50"
                    >
                      {isRunningTests ? 'Running...' : '▶ Run Tests'}
                    </button>
                    <button
                      onClick={() => submitAnswer(q.id, answers[q.id] || q.starter_code || '')}
                      disabled={isSubmitting}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-medium transition disabled:opacity-50"
                    >
                      {isSubmitting ? 'Saving...' : '✔ Submit Code'}
                    </button>
                  </div>
                </div>
                <textarea
                  className="flex-1 w-full bg-gray-950 p-4 font-mono text-sm text-green-300 focus:outline-none resize-none"
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
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Test Console</h3>
                
                {!testResults && !isRunningTests && (
                  <p className="text-sm text-gray-600 italic">Run your code to see results here.</p>
                )}

                {isRunningTests && (
                  <div className="flex items-center gap-3 text-violet-400">
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    <span className="text-sm font-medium">Executing test cases on Judge0...</span>
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
                    </div>

                    <div className="max-h-40 overflow-y-auto space-y-2 font-mono text-xs">
                      {testResults.test_results?.map((res, i) => (
                        <div key={i} className={`p-2 rounded border ${res.passed ? 'bg-emerald-900/10 border-emerald-900/50 text-emerald-300' : 'bg-red-900/10 border-red-900/50 text-red-300'}`}>
                          <div className="flex justify-between mb-1">
                            <span>Case {i + 1}: {res.input}</span>
                            <span>{res.status || (res.passed ? 'Passed' : 'Failed')}</span>
                          </div>
                          {res.stdout && <p className="opacity-70">Out: {res.stdout}</p>}
                          {res.compile_output && <pre className="mt-1 text-red-400 whitespace-pre-wrap">{atob(res.compile_output)}</pre>}
                          {res.stderr && <pre className="mt-1 text-orange-400 whitespace-pre-wrap">{res.stderr}</pre>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {q?.question_type === 'MCQ' && (
            <div className="bg-gray-900/40 border border-dashed border-gray-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center">
              <p className="text-5xl mb-4">📝</p>
              <h3 className="text-lg font-medium text-gray-300">Multiple Choice Question</h3>
              <p className="text-sm text-gray-500 max-w-xs mt-2">Select the best answer from the options on the left to proceed.</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur border-t border-gray-800 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <button
            onClick={() => {
              setCurrentIdx(i => Math.max(0, i - 1));
              setTestResults(null);
            }}
            disabled={currentIdx === 0}
            className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl font-medium transition disabled:opacity-30"
          >
            ← Previous
          </button>

          {/* Question dots */}
          <div className="flex items-center gap-2">
            {questions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentIdx(idx);
                  setTestResults(null);
                }}
                className={`w-10 h-10 rounded-xl text-sm font-bold transition ${
                  idx === currentIdx
                    ? 'bg-violet-600 text-white translate-y-[-2px] shadow-lg shadow-violet-500/20'
                    : answers[questions[idx]?.id] !== undefined
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setCurrentIdx(i => Math.min(questions.length - 1, i + 1));
              setTestResults(null);
            }}
            disabled={currentIdx === questions.length - 1}
            className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl font-medium transition disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
