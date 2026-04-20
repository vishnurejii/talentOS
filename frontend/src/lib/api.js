/**
 * TalentOS API utility
 * Central place for all API calls against the Django backend.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8002/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || data?.detail || `Request failed: ${res.status}`);
  }

  return data;
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const api = {
  login: (email, password) =>
    request('/accounts/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email, password, full_name, role) =>
    request('/accounts/register/', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name, role }),
    }),

  profile: () => request('/accounts/profile/'),

  // ── Jobs ──────────────────────────────────────────────────────────────────
  getJobs: () => request('/jobs/'),
  getJob: (id) => request(`/jobs/${id}/`),
  createJob: (data) =>
    request('/jobs/', { method: 'POST', body: JSON.stringify(data) }),

  applyToJob: (jobId, cvFile) => {
    const formData = new FormData();
    formData.append('job_id', jobId);
    formData.append('cv_file', cvFile);
    return fetch(`${API_BASE}/jobs/apply/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Application failed');
      return data;
    });
  },

  // ── Exams ─────────────────────────────────────────────────────────────────
  startExam: (jobId) =>
    request('/exams/start/', { method: 'POST', body: JSON.stringify({ job_id: jobId }) }),
  submitAnswer: (sessionId, questionId, answer) =>
    request('/exams/submit/', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, question_id: questionId, answer }),
    }),
  runTest: (questionId, code) =>
    request('/exams/run-test/', {
      method: 'POST',
      body: JSON.stringify({ question_id: questionId, code }),
    }),
  recordViolation: (sessionId, type) =>
    request('/exams/violation/', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, type }),
    }),
  finishExam: (sessionId) =>
    request('/exams/finish/', { method: 'POST', body: JSON.stringify({ session_id: sessionId }) }),

  // ── Rankings / Dashboard / Admin ──────────────────────────────────────────
  hrDashboard: () => request('/hr/dashboard/'),
  jobRankings: (jobId) => request(`/hr/jobs/${jobId}/rankings/`),
  updateAppStatus: (appId, newStatus) =>
    request(`/hr/applications/${appId}/status/`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    }),
  getProctoringLogs: () => request('/exams/admin/violations/'),
  getJobQuestions: (jobId) => request(`/jobs/${jobId}/questions/`),
  getExamSession: (sessionId) => request(`/exams/admin/sessions/${sessionId}/`),
  candidateDashboard: () => request('/candidate/dashboard/'),
};

export default api;
