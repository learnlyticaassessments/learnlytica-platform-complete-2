/**
 * Question API Service
 * HTTP client for question management endpoints
 * @module services/questionService
 */

import axios, { AxiosInstance } from 'axios';
import type {
  Question,
  QuestionListResponse,
  QuestionPreview,
  CreateQuestionDTO,
  UpdateQuestionDTO,
  QuestionFilters
} from '../../../backend/shared/types/question.types';

// ============================================================================
// AXIOS INSTANCE
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3666';

const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear stale token, but don't hard-redirect to a route that may not exist.
      localStorage.removeItem('auth_token');
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// API METHODS
// ============================================================================

export const questionService = {
  /**
   * Create a new question
   */
  async create(data: CreateQuestionDTO): Promise<Question> {
    const response = await apiClient.post<{ success: boolean; data: Question }>(
      '/questions',
      data
    );
    return response.data.data;
  },

  /**
   * Get question by ID
   */
  async getById(id: string): Promise<Question> {
    const response = await apiClient.get<{ success: boolean; data: Question }>(
      `/questions/${id}`
    );
    return response.data.data;
  },

  /**
   * Get question preview (student view)
   */
  async getPreview(id: string): Promise<QuestionPreview> {
    const response = await apiClient.get<{ success: boolean; data: QuestionPreview }>(
      `/questions/${id}/preview`
    );
    return response.data.data;
  },

  /**
   * List questions with filters
   */
  async list(filters?: QuestionFilters): Promise<QuestionListResponse> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.category) params.append('category', filters.category);
      if (filters.difficulty) params.append('difficulty', filters.difficulty);
      if (filters.status) params.append('status', filters.status);
      if (filters.testFramework) params.append('testFramework', filters.testFramework);
      if (filters.search) params.append('search', filters.search);
      if (filters.createdBy) params.append('createdBy', filters.createdBy);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      if (filters.skills) {
        filters.skills.forEach(skill => params.append('skills', skill));
      }
      if (filters.tags) {
        filters.tags.forEach(tag => params.append('tags', tag));
      }
    }

    const response = await apiClient.get<{
      success: boolean;
      data: Question[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasMore: boolean;
      };
    }>(`/questions?${params.toString()}`);

    return {
      questions: response.data.data,
      total: response.data.pagination.total,
      page: response.data.pagination.page,
      limit: response.data.pagination.limit,
      totalPages: response.data.pagination.totalPages,
      hasMore: response.data.pagination.hasMore
    };
  },

  /**
   * Update question
   */
  async update(id: string, data: UpdateQuestionDTO): Promise<Question> {
    const response = await apiClient.put<{ success: boolean; data: Question }>(
      `/questions/${id}`,
      data
    );
    return response.data.data;
  },

  /**
   * Update question status
   */
  async updateStatus(id: string, status: string): Promise<Question> {
    const response = await apiClient.patch<{ success: boolean; data: Question }>(
      `/questions/${id}/status`,
      { status }
    );
    return response.data.data;
  },

  /**
   * Delete question
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/questions/${id}`);
  },

  /**
   * Clone question
   */
  async clone(id: string, newTitle: string): Promise<Question> {
    const response = await apiClient.post<{ success: boolean; data: Question }>(
      `/questions/${id}/clone`,
      { title: newTitle }
    );
    return response.data.data;
  },

  /**
   * Bulk import questions
   */
  async bulkImport(
    questions: CreateQuestionDTO[],
    dryRun: boolean = false
  ): Promise<{
    success: number;
    failed: number;
    errors: any[];
    imported: Question[];
  }> {
    const response = await apiClient.post<{
      success: boolean;
      data: {
        success: number;
        failed: number;
        errors: any[];
        imported: Question[];
      };
    }>('/questions/bulk-import', { questions, dryRun });
    return response.data.data;
  }
};

export default questionService;

// Add Java to supported frameworks
export const SUPPORTED_FRAMEWORKS = [
  { value: 'jest', label: 'Jest (JavaScript)', language: 'javascript' },
  { value: 'pytest', label: 'Pytest (Python)', language: 'python' },
  { value: 'playwright', label: 'Playwright (E2E)', language: 'javascript' },
  { value: 'supertest', label: 'Supertest (Node.js API)', language: 'javascript' },
  { value: 'pytest-requests', label: 'Pytest-Requests (Python API)', language: 'python' },
  { value: 'junit', label: 'JUnit 5 (Java)', language: 'java' }
];

export const LANGUAGE_EXTENSIONS = {
  javascript: '.js',
  python: '.py',
  java: '.java'
};
