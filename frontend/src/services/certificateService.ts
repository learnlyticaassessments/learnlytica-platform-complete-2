import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3666';

const client = axios.create({
  baseURL: `${API_URL}/api/v1/certificates`,
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

export const certificateService = {
  list: async (params?: any) => {
    const response = await client.get('/', { params });
    return response.data;
  },
  issue: async (payload: { assignmentId: string; templateName?: string; title?: string; recipientName?: string }) => {
    const response = await client.post('/issue', payload);
    return response.data;
  },
  getById: async (id: string) => {
    const response = await client.get(`/${id}`);
    return response.data;
  },
  revoke: async (id: string, reason?: string) => {
    const response = await client.post(`/${id}/revoke`, { reason });
    return response.data;
  }
};
