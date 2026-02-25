import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3666';

const client = axios.create({
  baseURL: `${API_URL}/api/v1`,
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

export const learnersService = {
  list: async (params?: { batchFilter?: 'unbatched' }) => {
    const response = await client.get('/learners', { params });
    return response.data as { success: boolean; data: any[] };
  },

  create: async (payload: { email: string; fullName: string; password: string }) => {
    const response = await client.post('/learners', payload);
    return response.data as { success: boolean; data: any };
  },

  importCsvRows: async (payload: { rows: Array<{ email: string; fullName: string; password?: string }>; defaultPassword?: string }) => {
    const response = await client.post('/learners/import', payload);
    return response.data as {
      success: boolean;
      data: {
        created: any[];
        skipped: Array<{ index: number; email?: string; reason: string }>;
        summary: { requested: number; created: number; skipped: number };
      };
    };
  },

  update: async (id: string, payload: { fullName?: string; isActive?: boolean; password?: string }) => {
    const response = await client.patch(`/learners/${id}`, payload);
    return response.data as { success: boolean; data: any };
  }
};
