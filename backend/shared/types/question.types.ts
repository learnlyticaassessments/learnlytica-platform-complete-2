/**
 * Question Management System - TypeScript Types
 * Shared between frontend and backend
 * @module types/question.types
 */

// ============================================================================
// CORE QUESTION TYPES
// ============================================================================

export interface Question {
  id: string;
  organizationId: string;
  
  // Basic Information
  title: string;
  slug: string;
  description: string; // Markdown supported
  
  // Classification
  category: QuestionCategory;
  subcategory: string[];
  difficulty: QuestionDifficulty;
  skills: string[];
  tags: string[];
  
  // Code Templates
  starterCode: StarterCode;
  
  // Test Configuration
  testFramework: TestFramework;
  testConfig: TestConfig;
  
  // Solution (Hidden from students)
  solution?: Solution;
  
  // Metadata
  timeEstimate: number; // minutes
  points: number;
  
  // Workflow
  createdBy: string; // User ID
  reviewedBy?: string; // User ID
  status: QuestionStatus;
  
  // Versioning
  version: number;
  parentQuestionId?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  archivedAt?: Date;
}

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type QuestionCategory = 
  | 'frontend' 
  | 'backend' 
  | 'fullstack' 
  | 'database' 
  | 'devops';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export type QuestionStatus = 'draft' | 'review' | 'published' | 'archived';

export type TestFramework = 
  | 'playwright' 
  | 'jest' 
  | 'pytest' 
  | 'junit' 
  | 'mocha' 
  | 'cypress';

export const QUESTION_CATEGORIES: QuestionCategory[] = [
  'frontend',
  'backend',
  'fullstack',
  'database',
  'devops'
];

export const QUESTION_DIFFICULTIES: QuestionDifficulty[] = [
  'easy',
  'medium',
  'hard'
];

export const DIFFICULTY_POINTS: Record<QuestionDifficulty, number> = {
  easy: 100,
  medium: 200,
  hard: 300
};

export const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  frontend: 'Frontend Development',
  backend: 'Backend Development',
  fullstack: 'Full-Stack Development',
  database: 'Database & SQL',
  devops: 'DevOps & Cloud'
};

// ============================================================================
// STARTER CODE TYPES
// ============================================================================

export interface StarterCode {
  files: CodeFile[];
  dependencies: Record<string, string>; // package.json dependencies
  scripts?: Record<string, string>; // npm scripts
  devDependencies?: Record<string, string>;
}

export interface CodeFile {
  path: string; // e.g., "src/App.jsx"
  content: string; // File contents
  language?: string; // For syntax highlighting
  readOnly?: boolean; // If true, student can't edit
}

// ============================================================================
// TEST CONFIGURATION TYPES
// ============================================================================

export interface TestConfig {
  framework: TestFramework;
  version: string;
  
  environment: TestEnvironment;
  setup: TestSetup;
  execution: TestExecution;
  testCases: TestCase[];
  scoring: TestScoring;
}

export interface TestEnvironment {
  node?: string;
  python?: string;
  java?: string;
  runtime?: string; // browser for playwright
}

export interface TestSetup {
  commands: string[]; // e.g., ["npm install", "npm run build"]
  startServer?: string; // Command to start dev server
  waitForServer?: string; // URL to wait for (http://localhost:5173)
  timeout?: number; // Setup timeout in ms
}

export interface TestExecution {
  command: string; // Command to run tests
  timeout: number; // Execution timeout in ms
  retries?: number; // Number of retries on failure
  parallelism?: boolean; // Run tests in parallel
}

export interface TestCase {
  id: string; // Unique identifier (e.g., "tc_001")
  name: string; // Human-readable name
  description?: string; // Optional description
  file: string; // Test file path
  testName: string; // Exact test name in the file
  testCode?: string; // Executable test body/assertions (author-only)
  points: number; // Points for this test case
  visible: boolean; // Visible to students?
  category?: string; // e.g., "basic", "advanced"
  timeout?: number; // Test-specific timeout
}

export interface TestScoring {
  total: number; // Total points possible
  passing: number; // Minimum points to pass
  categories?: Record<string, number>; // Points by category
}

// ============================================================================
// SOLUTION TYPES
// ============================================================================

export interface Solution {
  files: CodeFile[];
  explanation?: string; // Markdown explanation
  approach?: string; // Algorithm/approach description
  complexity?: {
    time: string;
    space: string;
  };
  notes?: string[];
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateQuestionDTO {
  title: string;
  description: string;
  category: QuestionCategory;
  subcategory?: string[];
  difficulty: QuestionDifficulty;
  skills?: string[];
  tags?: string[];
  starterCode: StarterCode;
  testFramework: TestFramework;
  testConfig: TestConfig;
  solution?: Solution;
  timeEstimate: number;
  points?: number;
}

export interface UpdateQuestionDTO {
  title?: string;
  description?: string;
  category?: QuestionCategory;
  subcategory?: string[];
  difficulty?: QuestionDifficulty;
  skills?: string[];
  tags?: string[];
  starterCode?: StarterCode;
  testFramework?: TestFramework;
  testConfig?: TestConfig;
  solution?: Solution;
  timeEstimate?: number;
  points?: number;
  status?: QuestionStatus;
}

export interface QuestionFilters {
  // Filtering
  category?: QuestionCategory;
  difficulty?: QuestionDifficulty;
  status?: QuestionStatus;
  testFramework?: TestFramework;
  skills?: string[];
  tags?: string[];
  createdBy?: string;
  
  // Search
  search?: string; // Full-text search
  
  // Pagination
  page?: number;
  limit?: number;
  
  // Sorting
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'difficulty' | 'points';
  sortOrder?: 'asc' | 'desc';
}

export interface QuestionListResponse {
  questions: Question[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface QuestionPreview {
  id: string;
  title: string;
  description: string;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  skills: string[];
  tags: string[];
  starterCode: StarterCode;
  timeEstimate: number;
  points: number;
  visibleTestCases: TestCasePreview[];
  totalTestCases: number;
}

export interface TestCasePreview {
  id: string;
  name: string;
  description?: string;
  points: number;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface QuestionValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface QuestionValidationResult {
  valid: boolean;
  errors: QuestionValidationError[];
}

// ============================================================================
// WORKFLOW TYPES
// ============================================================================

export interface QuestionReviewRequest {
  questionId: string;
  message?: string;
}

export interface QuestionReviewResponse {
  questionId: string;
  reviewedBy: string;
  action: 'approve' | 'reject';
  feedback?: string;
  timestamp: Date;
}

export interface QuestionVersion {
  version: number;
  questionId: string;
  changes: string;
  createdBy: string;
  createdAt: Date;
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export interface BulkImportRequest {
  questions: CreateQuestionDTO[];
  dryRun?: boolean; // Validate without saving
}

export interface BulkImportResponse {
  success: number;
  failed: number;
  errors: Array<{
    index: number;
    question: CreateQuestionDTO;
    errors: QuestionValidationError[];
  }>;
  imported: Question[];
}

export interface BulkExportOptions {
  filters?: QuestionFilters;
  includeSolutions?: boolean;
  format?: 'json' | 'csv';
}

// ============================================================================
// STATISTICS & ANALYTICS
// ============================================================================

export interface QuestionStatistics {
  totalQuestions: number;
  byCategory: Record<QuestionCategory, number>;
  byDifficulty: Record<QuestionDifficulty, number>;
  byStatus: Record<QuestionStatus, number>;
  averagePoints: number;
  averageTimeEstimate: number;
}

export interface QuestionUsageStats {
  questionId: string;
  timesUsed: number;
  averageScore: number;
  averageTimeSpent: number;
  passRate: number;
  lastUsed?: Date;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isValidCategory(value: any): value is QuestionCategory {
  return QUESTION_CATEGORIES.includes(value);
}

export function isValidDifficulty(value: any): value is QuestionDifficulty {
  return QUESTION_DIFFICULTIES.includes(value);
}

export function isValidTestFramework(value: any): value is TestFramework {
  const frameworks: TestFramework[] = [
    'playwright',
    'jest',
    'pytest',
    'junit',
    'mocha',
    'cypress'
  ];
  return frameworks.includes(value);
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type QuestionSortField = keyof Pick<
  Question,
  'createdAt' | 'updatedAt' | 'title' | 'difficulty' | 'points'
>;

export type QuestionWithoutSolution = Omit<Question, 'solution'>;

export type QuestionSummary = Pick<
  Question,
  'id' | 'title' | 'category' | 'difficulty' | 'points' | 'status'
>;
