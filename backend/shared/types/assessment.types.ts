/**
 * Assessment and Lab Template Types
 * @module types/assessment.types
 */

// ============================================================================
// LAB TEMPLATE TYPES
// ============================================================================

export interface LabTemplate {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  category: 'frontend' | 'backend' | 'fullstack' | 'database' | 'devops';
  
  // Docker
  dockerImage: string;
  dockerTag: string;
  dockerfileContent?: string;
  
  // VS Code
  vscodeExtensions: string[];
  vscodeSettings: Record<string, any>;
  
  // Resources
  resourceLimits: {
    cpu: string;
    memory: string;
    storage: string;
  };
  
  // Environment
  environmentVariables: Record<string, string>;
  npmPackages: string[];
  pipPackages: string[];
  exposedPorts: number[];
  
  // Metadata
  isActive: boolean;
  usageCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLabTemplateDTO {
  name: string;
  description?: string;
  category: 'frontend' | 'backend' | 'fullstack' | 'database' | 'devops';
  dockerImage: string;
  dockerTag?: string;
  vscodeExtensions?: string[];
  vscodeSettings?: Record<string, any>;
  resourceLimits: {
    cpu: string;
    memory: string;
    storage: string;
  };
  environmentVariables?: Record<string, string>;
  npmPackages?: string[];
  pipPackages?: string[];
  exposedPorts?: number[];
}

// ============================================================================
// ASSESSMENT TYPES
// ============================================================================

export interface Assessment {
  id: string;
  organizationId: string;
  
  // Basic Info
  title: string;
  description?: string;
  instructions?: string;
  
  // Configuration
  labTemplateId: string;
  labTemplate?: LabTemplate; // Populated
  
  timeLimitMinutes?: number;
  passingScore: number;
  maxAttempts: number;
  
  // Scheduling
  startDate?: Date;
  endDate?: Date;
  
  // Settings
  shuffleQuestions: boolean;
  showResultsImmediately: boolean;
  allowReviewAfterSubmission: boolean;
  requireWebcam: boolean;
  
  // Status
  status: 'draft' | 'published' | 'archived';
  
  // Metadata
  totalPoints: number;
  estimatedDurationMinutes?: number;
  createdBy: string;
  publishedBy?: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  questions?: AssessmentQuestion[];
  questionCount?: number;
}

export interface AssessmentQuestion {
  id: string;
  assessmentId: string;
  questionId: string;
  orderIndex: number;
  pointsOverride?: number;
  timeEstimateOverride?: number;
  createdAt: Date;
  
  // Populated from questions table
  question?: any; // Question type from Module 1
}

export interface StudentAssessment {
  id: string;
  assessmentId: string;
  studentId: string;
  
  // Timing
  assignedAt: Date;
  assignedBy: string;
  dueDate?: Date;
  startedAt?: Date;
  submittedAt?: Date;
  
  // Status
  status: 'assigned' | 'in_progress' | 'submitted' | 'graded' | 'expired';
  attemptNumber: number;
  
  // Results
  score?: number;
  pointsEarned: number;
  totalPoints?: number;
  timeSpentMinutes: number;
  passed?: boolean;
  
  // VS Code Session
  vscodeSessionId?: string;
  labPodName?: string;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Populated
  assessment?: Assessment;
  student?: any; // User type
}

// ============================================================================
// DTOs
// ============================================================================

export interface CreateAssessmentDTO {
  title: string;
  description?: string;
  instructions?: string;
  labTemplateId: string;
  timeLimitMinutes?: number;
  passingScore?: number;
  maxAttempts?: number;
  startDate?: string;
  endDate?: string;
  shuffleQuestions?: boolean;
  showResultsImmediately?: boolean;
  allowReviewAfterSubmission?: boolean;
  requireWebcam?: boolean;
  estimatedDurationMinutes?: number;
  questions?: {
    questionId: string;
    orderIndex: number;
    pointsOverride?: number;
  }[];
}

export interface UpdateAssessmentDTO {
  title?: string;
  description?: string;
  instructions?: string;
  labTemplateId?: string;
  timeLimitMinutes?: number;
  passingScore?: number;
  maxAttempts?: number;
  startDate?: string;
  endDate?: string;
  shuffleQuestions?: boolean;
  showResultsImmediately?: boolean;
  allowReviewAfterSubmission?: boolean;
  requireWebcam?: boolean;
  status?: 'draft' | 'published' | 'archived';
}

export interface AssignStudentsDTO {
  studentIds: string[];
  dueDate?: string;
}

export interface AssessmentFilters {
  status?: 'draft' | 'published' | 'archived';
  labTemplateId?: string;
  createdBy?: string;
  search?: string;
  startDateFrom?: string;
  startDateTo?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// STATISTICS
// ============================================================================

export interface AssessmentStatistics {
  assessmentId: string;
  totalAssigned: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  averageScore: number;
  passRate: number;
  averageTimeSpent: number;
}
