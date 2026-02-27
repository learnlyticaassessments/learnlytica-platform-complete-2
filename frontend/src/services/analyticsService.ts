import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3666';

const client = axios.create({
  baseURL: `${API_URL}/api/v1/analytics`,
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

export const analyticsService = {
  getDashboard: async () => {
    const response = await client.get('/dashboard');
    return response.data;
  },

  getProjectAnalytics: async () => {
    const response = await client.get('/projects');
    return response.data;
  },

  getProjectTrends: async (days = 14) => {
    const response = await client.get('/projects/trends', { params: { days } });
    return response.data;
  },

  getProjectBatchAnalytics: async () => {
    const response = await client.get('/projects/by-batch');
    return response.data;
  },

  getProjectAnalyticsDebug: async () => {
    const response = await client.get('/projects/debug');
    return response.data;
  },

  getAssessmentAnalytics: async (id: string) => {
    const response = await client.get(`/assessments/${id}`);
    return response.data;
  },

  getStudentReport: async (studentId: string) => {
    const response = await client.get(`/students/${studentId}`);
    return response.data;
  },

  getStudentSkillMatrix: async (studentId: string) => {
    const response = await client.get(`/students/${studentId}/skill-matrix`);
    return response.data;
  },

  exportCsv: async (assessmentId: string) => {
    const response = await client.get(`/assessments/${assessmentId}/export-csv`, {
      responseType: 'blob'
    });
    return response.data;
  },

  exportOrganizationAttemptsCsv: async () => {
    const response = await client.get('/exports/org-attempts-csv', { responseType: 'blob' });
    return response.data;
  },

  exportSkillMatrixCsv: async () => {
    const response = await client.get('/exports/skill-matrix-csv', { responseType: 'blob' });
    return response.data;
  },

  exportProjectSummaryCsv: async () => {
    const response = await client.get('/exports/project-summary-csv', { responseType: 'blob' });
    return response.data;
  }
};
