import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3666';

const client = axios.create({
  baseURL: `${API_URL}/api/v1/ai`,
  headers: { 'Content-Type': 'application/json' }
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface GenerateQuestionRequest {
  topic: string;
  language: 'javascript' | 'python' | 'java';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  questionType: 'algorithm' | 'api' | 'component' | 'database' | 'fullstack';
  points?: number;
  timeLimit?: number;
}

export const aiService = {
  // Generate question (preview only)
  generateQuestion: async (request: GenerateQuestionRequest) => {
    const response = await client.post('/generate-question', request);
    return response.data;
  },

  // Generate and create question in database
  generateAndCreate: async (request: GenerateQuestionRequest) => {
    const response = await client.post('/generate-and-create', request);
    return response.data;
  },

  // Generate test cases for code
  generateTests: async (code: string, language: string, description?: string) => {
    const response = await client.post('/generate-tests', {
      code,
      language,
      description
    });
    return response.data;
  },

  // Improve existing question
  improveQuestion: async (question: any) => {
    const response = await client.post('/improve-question', { question });
    return response.data;
  },

  // Review student code
  reviewCode: async (code: string, testResults: any, question: any) => {
    const response = await client.post('/review-code', {
      code,
      testResults,
      question
    });
    return response.data;
  }
};
