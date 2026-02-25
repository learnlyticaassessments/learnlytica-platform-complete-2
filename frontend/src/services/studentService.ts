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

export const studentService = {
  getMyAssessments: async () => {
    const response = await client.get('/assessments');
    return response.data;
  },

  getAssessment: async (id: string) => {
    const response = await client.get(`/assessments/${id}`);
    return response.data;
  },

  startAssessment: async (id: string) => {
    const response = await client.post(`/assessments/${id}/start`);
    return response.data;
  },

  submitAssessment: async (id: string, code: any, timeSpentMinutes: number) => {
    const response = await client.post(`/assessments/${id}/submit`, { code, timeSpentMinutes });
    return response.data;
  },

  runTests: async (id: string, code: string, testFramework: string) => {
    const response = await client.post(`/assessments/${id}/run-tests`, { code, testFramework });
    return response.data;
  }
};
