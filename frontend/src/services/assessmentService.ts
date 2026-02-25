/**
 * Assessment API Service
 * HTTP client for assessment endpoints
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3666';

const client = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
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

export const assessmentService = {
  // List assessments
  list: async (params?: any) => {
    const response = await client.get('/assessments', { params });
    return response.data;
  },

  // Get single assessment
  getById: async (id: string, include?: string[]) => {
    const params = include ? { include: include.join(',') } : {};
    const response = await client.get(`/assessments/${id}`, { params });
    return response.data;
  },

  // Create assessment
  create: async (data: any) => {
    const response = await client.post('/assessments', data);
    return response.data;
  },

  // Update assessment
  update: async (id: string, data: any) => {
    const response = await client.put(`/assessments/${id}`, data);
    return response.data;
  },

  // Delete assessment
  delete: async (id: string) => {
    const response = await client.delete(`/assessments/${id}`);
    return response.data;
  },

  // Add questions
  addQuestions: async (id: string, questions: any[]) => {
    const response = await client.post(`/assessments/${id}/questions`, { questions });
    return response.data;
  },

  // Remove question
  removeQuestion: async (id: string, questionId: string) => {
    const response = await client.delete(`/assessments/${id}/questions/${questionId}`);
    return response.data;
  },

  // Assign to students
  assign: async (id: string, data: any) => {
    const response = await client.post(`/assessments/${id}/assign`, data);
    return response.data;
  },

  // Get statistics
  getStats: async (id: string) => {
    const response = await client.get(`/assessments/${id}/stats`);
    return response.data;
  },

  // Clone assessment
  clone: async (id: string, title: string) => {
    const response = await client.post(`/assessments/${id}/clone`, { title });
    return response.data;
  },
};

export const labTemplateService = {
  // List lab templates
  list: async (params?: any) => {
    const response = await client.get('/lab-templates', { params });
    return response.data;
  },

  // Get single template
  getById: async (id: string) => {
    const response = await client.get(`/lab-templates/${id}`);
    return response.data;
  },

  // Create template (Admin only)
  create: async (data: any) => {
    const response = await client.post('/lab-templates', data);
    return response.data;
  },

  // Update template (Admin only)
  update: async (id: string, data: any) => {
    const response = await client.put(`/lab-templates/${id}`, data);
    return response.data;
  },

  // Delete template (Admin only)
  delete: async (id: string) => {
    const response = await client.delete(`/lab-templates/${id}`);
    return response.data;
  },
};
