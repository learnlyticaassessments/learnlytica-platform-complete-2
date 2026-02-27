import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3666';

const client = axios.create({
  baseURL: `${API_URL}/api/v1/library`,
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

export const libraryService = {
  listTemplates: async () => {
    const res = await client.get('/templates');
    return res.data as { success: boolean; data: any[] };
  },
  listSamples: async () => {
    const res = await client.get('/samples');
    return res.data as { success: boolean; data: any[] };
  },
  listGuidelines: async () => {
    const res = await client.get('/guidelines');
    return res.data as { success: boolean; data: Record<string, string> };
  },
  getStats: async () => {
    const res = await client.get('/stats');
    return res.data as { success: boolean; data: any };
  },
  importQuestion: async (libraryPath: string) => {
    const res = await client.post('/import', { libraryPath });
    return res.data as { success: boolean; data: any; message?: string };
  }
};

