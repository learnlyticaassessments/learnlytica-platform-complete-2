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

export const analyticsService = {
  getDashboard: async () => {
    const response = await client.get('/dashboard');
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

  exportCsv: async (assessmentId: string) => {
    const response = await client.get(`/assessments/${assessmentId}/export-csv`, {
      responseType: 'blob'
    });
    return response.data;
  }
};
