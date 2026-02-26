import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3666';

const client = axios.create({
  baseURL: `${API_URL}/api/v1/project-evaluations`,
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

export const projectEvaluationsService = {
  listTemplates: async () => {
    const res = await client.get('/templates');
    return res.data as { success: boolean; data: any[] };
  },
  createTemplate: async (payload: any) => {
    const res = await client.post('/templates', payload);
    return res.data as { success: boolean; data: any };
  },
  listAssessments: async () => {
    const res = await client.get('/assessments');
    return res.data as { success: boolean; data: any[] };
  },
  createAssessment: async (payload: any) => {
    const res = await client.post('/assessments', payload);
    return res.data as { success: boolean; data: any };
  },
  publishAssessment: async (id: string) => {
    const res = await client.patch(`/assessments/${id}/publish`);
    return res.data as { success: boolean; data: any };
  },
  assignAssessment: async (id: string, payload: any) => {
    const res = await client.post(`/assessments/${id}/assignments`, payload);
    return res.data as { success: boolean; data: any };
  },
  deleteAssessment: async (id: string) => {
    const res = await client.delete(`/assessments/${id}`);
    return res.data as { success: boolean; data: any };
  },
  getAssessment: async (id: string) => {
    const res = await client.get(`/assessments/${id}`);
    return res.data as { success: boolean; data: any };
  },
  createSubmission: async (assessmentId: string, payload: any) => {
    const res = await client.post(`/assessments/${assessmentId}/submissions`, payload);
    return res.data as { success: boolean; data: any };
  },
  uploadSubmissionZip: async (submissionId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await client.post(`/submissions/${submissionId}/upload-zip`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data as { success: boolean; data: any };
  },
  getSubmission: async (submissionId: string) => {
    const res = await client.get(`/submissions/${submissionId}`);
    return res.data as { success: boolean; data: any };
  },
  queueRun: async (submissionId: string, payload?: any) => {
    const res = await client.post(`/submissions/${submissionId}/runs`, payload || {});
    return res.data as { success: boolean; data: any };
  },
  listLearnerAssignments: async () => {
    const res = await client.get('/learner/assignments');
    return res.data as { success: boolean; data: any[] };
  },
  getLearnerAssignmentDetail: async (submissionId: string) => {
    const res = await client.get(`/learner/assignments/${submissionId}`);
    return res.data as { success: boolean; data: any };
  },
  learnerUploadSubmissionZip: async (submissionId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await client.post(`/learner/assignments/${submissionId}/upload-zip`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data as { success: boolean; data: any };
  },
  learnerSubmitAndEvaluate: async (submissionId: string) => {
    const res = await client.post(`/learner/assignments/${submissionId}/submit`);
    return res.data as { success: boolean; data: any };
  }
};
