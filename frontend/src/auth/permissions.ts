import type { AuthUser } from '../services/authService';

export type AppRole = AuthUser['role'];

export type AppAction =
  | 'labTemplates.view'
  | 'batches.view'
  | 'batches.manage'
  | 'learners.view'
  | 'learners.manage'
  | 'projectEvaluations.view'
  | 'projectEvaluations.manage'
  | 'questions.view'
  | 'questions.create'
  | 'questions.edit'
  | 'questions.publish'
  | 'questions.delete'
  | 'assessments.view'
  | 'assessments.create'
  | 'assessments.edit'
  | 'assessments.delete'
  | 'analytics.view'
  | 'certificates.view'
  | 'certificates.manage'
  | 'library.view'
  | 'ai.generate'
  | 'student.assessments.view'
  | 'student.assessments.take'
  | 'student.projects.view'
  | 'student.projects.submit'
  | 'labTemplates.manage';

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Platform Admin',
  client: 'Organization Admin',
  student: 'Learner'
};

const PERMISSIONS: Record<AppRole, Set<AppAction>> = {
  admin: new Set<AppAction>([
    'labTemplates.view',
    'batches.view',
    'batches.manage',
    'learners.view',
    'learners.manage',
    'projectEvaluations.view',
    'projectEvaluations.manage',
    'questions.view',
    'questions.create',
    'questions.edit',
    'questions.publish',
    'questions.delete',
    'assessments.view',
    'assessments.create',
    'assessments.edit',
    'assessments.delete',
    'analytics.view',
    'certificates.view',
    'certificates.manage',
    'library.view',
    'ai.generate',
    'labTemplates.manage'
  ]),
  client: new Set<AppAction>([
    'labTemplates.view',
    'batches.view',
    'batches.manage',
    'learners.view',
    'learners.manage',
    'projectEvaluations.view',
    'projectEvaluations.manage',
    'questions.view',
    'questions.create',
    'questions.edit',
    'assessments.view',
    'assessments.create',
    'assessments.edit',
    'assessments.delete',
    'analytics.view',
    'certificates.view',
    'certificates.manage',
    'library.view',
    'ai.generate'
  ]),
  student: new Set<AppAction>([
    'student.assessments.view',
    'student.assessments.take',
    'student.projects.view',
    'student.projects.submit'
  ])
};

export function getRoleLabel(role?: AppRole | null): string {
  return role ? ROLE_LABELS[role] : '';
}

export function can(role: AppRole | undefined | null, action: AppAction): boolean {
  if (!role) return false;
  return PERMISSIONS[role].has(action);
}
