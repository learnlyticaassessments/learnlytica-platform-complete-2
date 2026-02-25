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

export type BatchType = 'cohort' | 'bootcamp' | 'campus' | 'team' | 'hiring' | 'custom';
export type BatchStatus = 'active' | 'archived';
export type BatchReentryPolicy = 'resume_allowed' | 'single_session';

export const batchesService = {
  list: async (params?: any) => {
    const response = await client.get('/batches', { params });
    return response.data as { success: boolean; data: any[]; pagination?: any };
  },

  create: async (payload: {
    name: string;
    code?: string;
    type?: BatchType;
    startDate?: string | null;
    endDate?: string | null;
  }) => {
    const response = await client.post('/batches', payload);
    return response.data as { success: boolean; data: any };
  },

  update: async (id: string, payload: any) => {
    const response = await client.patch(`/batches/${id}`, payload);
    return response.data as { success: boolean; data: any };
  },

  getById: async (id: string) => {
    const response = await client.get(`/batches/${id}`);
    return response.data as { success: boolean; data: any };
  },

  listMembers: async (id: string, params?: any) => {
    const response = await client.get(`/batches/${id}/members`, { params });
    return response.data as { success: boolean; data: any[]; pagination?: any };
  },

  addMembers: async (id: string, learnerIds: string[]) => {
    const response = await client.post(`/batches/${id}/members`, { learnerIds });
    return response.data as { success: boolean; data: any };
  },

  removeMember: async (id: string, learnerId: string) => {
    const response = await client.delete(`/batches/${id}/members/${learnerId}`);
    return response.data as { success: boolean; message: string };
  },

  assignAssessment: async (id: string, payload: {
    assessmentId: string;
    dueDate?: string;
    reentryPolicy?: BatchReentryPolicy;
  }) => {
    const response = await client.post(`/batches/${id}/assignments`, payload);
    return response.data as { success: boolean; data: any };
  },

  listResults: async (id: string, params?: any) => {
    const response = await client.get(`/batches/${id}/results`, { params });
    return response.data as { success: boolean; data: any[]; summary?: any; pagination?: any };
  }
};
