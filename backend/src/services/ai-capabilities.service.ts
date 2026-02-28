export type CapabilityState = 'ready' | 'partial' | 'planned';

export type AICapabilityLanguage = {
  value: string;
  label: string;
  state: CapabilityState;
  notes?: string;
};

export type AICapabilityType = {
  value: string;
  label: string;
  state: CapabilityState;
  notes?: string;
};

export type AICapabilityProblemStyle = {
  value: string;
  label: string;
  state: CapabilityState;
  notes?: string;
};

export type AICapabilityMatrix = {
  generationModes: Array<{ value: 'production' | 'design'; label: string; description: string }>;
  languages: AICapabilityLanguage[];
  technicalFocuses: AICapabilityType[];
  problemStyles: AICapabilityProblemStyle[];
  evaluator: {
    supportsBatchCreate: boolean;
    supportsAtomicCreate: boolean;
  };
};

const CAPABILITY_MATRIX: AICapabilityMatrix = {
  generationModes: [
    {
      value: 'production',
      label: 'Production Mode',
      description: 'Strict path: only evaluator-ready combinations can be generated/created.'
    },
    {
      value: 'design',
      label: 'Design Mode',
      description: 'Exploration path: allows partial/planned combinations for draft authoring.'
    }
  ],
  languages: [
    { value: 'javascript', label: 'JavaScript', state: 'ready' },
    { value: 'python', label: 'Python', state: 'ready' },
    { value: 'java', label: 'Java', state: 'ready' },
    { value: 'cpp', label: 'C++', state: 'planned' },
    { value: 'csharp', label: 'C#', state: 'planned' },
    { value: 'dotnet', label: '.NET', state: 'planned' },
    { value: 'rust', label: 'Rust', state: 'planned' },
    { value: 'go', label: 'Go', state: 'planned' },
    { value: 'php', label: 'PHP', state: 'planned' },
    { value: 'ruby', label: 'Ruby', state: 'planned' },
    { value: 'kotlin', label: 'Kotlin', state: 'planned' },
    { value: 'swift', label: 'Swift', state: 'planned' },
    { value: 'typescript', label: 'TypeScript', state: 'planned' }
  ],
  technicalFocuses: [
    { value: 'algorithm', label: 'Algorithms & Data Structures', state: 'ready' },
    { value: 'api', label: 'Backend API', state: 'ready' },
    { value: 'component', label: 'Frontend UI Component', state: 'ready' },
    { value: 'fullstack', label: 'Full-Stack Workflow', state: 'ready' },
    { value: 'debugging', label: 'Debugging & Root Cause', state: 'ready' },
    { value: 'testing', label: 'Testing Strategy', state: 'ready' },
    { value: 'performance', label: 'Performance Optimization', state: 'ready' },
    { value: 'security', label: 'Security Hardening', state: 'ready' },
    { value: 'data-processing', label: 'Data Processing', state: 'ready' },
    { value: 'database', label: 'Database & SQL', state: 'partial', notes: 'Some SQL-focused cases need manual rubric review.' },
    { value: 'system-design', label: 'System Design', state: 'partial', notes: 'Auto-tests are limited; architecture grading needs manual review.' },
    { value: 'devops', label: 'DevOps Workflow', state: 'planned' },
    { value: 'observability', label: 'Observability', state: 'planned' },
    { value: 'event-driven', label: 'Event-Driven Systems', state: 'planned' },
    { value: 'ml-engineering', label: 'ML Engineering', state: 'planned' }
  ],
  problemStyles: [
    { value: 'algorithmic', label: 'Algorithmic', state: 'ready' },
    { value: 'scenario_driven', label: 'Scenario Driven', state: 'ready' },
    { value: 'debugging', label: 'Debugging', state: 'ready' },
    { value: 'implementation', label: 'Implementation', state: 'ready' },
    { value: 'optimization', label: 'Optimization', state: 'ready' },
    { value: 'design_tradeoff', label: 'Design Tradeoff', state: 'partial', notes: 'Automated checks cover code artifacts; design rationale needs review.' }
  ],
  evaluator: {
    supportsBatchCreate: false,
    supportsAtomicCreate: true
  }
};

function findState(items: Array<{ value: string; state: CapabilityState }>, value: string): CapabilityState {
  return items.find((x) => x.value === value)?.state || 'planned';
}

export function getAICapabilityMatrix(): AICapabilityMatrix {
  return CAPABILITY_MATRIX;
}

export function evaluateAICapability(
  language: string,
  technicalFocus: string,
  problemStyle: string
): {
  state: CapabilityState;
  confidencePercent: number;
  checks: Array<{ key: string; label: string; state: CapabilityState }>;
  message: string;
} {
  const langState = findState(CAPABILITY_MATRIX.languages, language);
  const focusState = findState(CAPABILITY_MATRIX.technicalFocuses, technicalFocus);
  const styleState = findState(CAPABILITY_MATRIX.problemStyles, problemStyle);
  const checks = [
    { key: 'language', label: `Language (${language})`, state: langState },
    { key: 'focus', label: `Technical Focus (${technicalFocus})`, state: focusState },
    { key: 'style', label: `Problem Style (${problemStyle})`, state: styleState }
  ];

  const states = checks.map((c) => c.state);
  const state: CapabilityState = states.includes('planned')
    ? 'planned'
    : states.includes('partial')
      ? 'partial'
      : 'ready';

  const confidencePercent = state === 'ready' ? 95 : state === 'partial' ? 70 : 40;
  const message =
    state === 'ready'
      ? 'Evaluator-ready combination.'
      : state === 'partial'
        ? 'Partially auto-evaluable. Manual review is recommended.'
        : 'Planned capability. Draft authoring only.';

  return {
    state,
    confidencePercent,
    checks,
    message
  };
}
