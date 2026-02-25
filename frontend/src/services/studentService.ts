import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3666';

const client = axios.create({
  baseURL: `${API_URL}/api/v1/student`,
  headers: { 'Content-Type': 'application/json' }
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  }
);

function attemptSessionStorageKey(assessmentId: string) {
  return `learnlytica:attempt-session:${assessmentId}`;
}

function getOrCreateAttemptSessionKey(assessmentId: string) {
  const key = attemptSessionStorageKey(assessmentId);
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(key, created);
  return created;
}

function headersForAttempt(assessmentId: string) {
  return {
    'X-Attempt-Session-Key': getOrCreateAttemptSessionKey(assessmentId)
  };
}

export const studentService = {
  getMyAssessments: async () => {
    const response = await client.get('/assessments');
    return response.data;
  },

  getAssessment: async (id: string) => {
    const response = await client.get(`/assessments/${id}`, {
      headers: headersForAttempt(id)
    });
    return response.data;
  },

  startAssessment: async (id: string) => {
    const response = await client.post(`/assessments/${id}/start`, undefined, {
      headers: headersForAttempt(id)
    });
    return response.data;
  },

  saveDraft: async (id: string, draftState: any, focusEvents: any[] = []) => {
    const response = await client.put(
      `/assessments/${id}/draft`,
      { draftState, focusEvents },
      { headers: headersForAttempt(id) }
    );
    return response.data;
  },

  submitAssessment: async (id: string, code: any, timeSpentMinutes: number) => {
    const response = await client.post(
      `/assessments/${id}/submit`,
      { code, timeSpentMinutes },
      { headers: headersForAttempt(id) }
    );
    return response.data;
  },

  runTests: async (id: string, questionId: string, code: string) => {
    const response = await client.post(
      `/assessments/${id}/run-tests`,
      { questionId, code },
      { headers: headersForAttempt(id) }
    );
    return response.data;
  },

  getReview: async (id: string) => {
    const response = await client.get(`/assessments/${id}/review`, {
      headers: headersForAttempt(id)
    });
    return response.data;
  },

  clearAttemptSession: (id: string) => {
    localStorage.removeItem(attemptSessionStorageKey(id));
  }
};
