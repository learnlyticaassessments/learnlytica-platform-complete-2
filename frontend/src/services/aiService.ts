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

export interface GenerateQuestionRequest {
  topic: string;
  language: 'javascript' | 'python' | 'java';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  questionType: 'algorithm' | 'api' | 'component' | 'database' | 'fullstack';
  points?: number;
  timeLimit?: number;
  provider?: 'claude' | 'gpt';
  model?: string;
  curriculumText?: string;
  audienceType?: 'fresher' | 'experienced' | 'mixed';
  audienceExperience?: string;
  targetMaturity?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  domain?: string;
  audienceNotes?: string;
  rubric?: {
    basicWeight?: number;
    edgeWeight?: number;
    negativeWeight?: number;
    performanceWeight?: number;
    hiddenTestPercent?: number;
    passingPercent?: number;
    totalPoints?: number;
  };
}

export const AI_PROVIDER_OPTIONS: Array<{
  value: NonNullable<GenerateQuestionRequest['provider']>;
  label: string;
  defaultModel: string;
}> = [
  { value: 'claude', label: 'Claude', defaultModel: 'claude-sonnet-4-20250514' },
  { value: 'gpt', label: 'GPT', defaultModel: 'gpt-4o-mini' }
];

export const AI_QUESTION_TYPE_OPTIONS: Array<{
  value: GenerateQuestionRequest['questionType'];
  label: string;
  description: string;
}> = [
  { value: 'algorithm', label: 'Algorithms & Data Structures', description: 'Logic, arrays, strings, trees, graphs, complexity.' },
  { value: 'api', label: 'Backend API', description: 'Endpoints, validation, business logic, error handling.' },
  { value: 'component', label: 'Frontend UI Component', description: 'Reusable UI behavior, state, rendering, interactions.' },
  { value: 'database', label: 'Database & SQL', description: 'Schema design, queries, constraints, indexing.' },
  { value: 'fullstack', label: 'Full-Stack Workflow', description: 'Frontend + backend integration and data flow.' }
];

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
  generateTests: async (code: string, language: string, description?: string, provider?: GenerateQuestionRequest['provider'], model?: string) => {
    const response = await client.post('/generate-tests', {
      code,
      language,
      description,
      provider,
      model
    });
    return response.data;
  },

  // Improve existing question
  improveQuestion: async (question: any, provider?: GenerateQuestionRequest['provider'], model?: string) => {
    const response = await client.post('/improve-question', { question, provider, model });
    return response.data;
  },

  // Review student code
  reviewCode: async (code: string, testResults: any, question: any, provider?: GenerateQuestionRequest['provider'], model?: string) => {
    const response = await client.post('/review-code', {
      code,
      testResults,
      question,
      provider,
      model
    });
    return response.data;
  }
};
