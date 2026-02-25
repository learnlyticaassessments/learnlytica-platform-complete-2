/**
 * Code Validator Service
 * Security validation for user-submitted code
 */

export class CodeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CodeValidationError';
  }
}

const DANGEROUS_PATTERNS = {
  javascript: [
    /require\s*\(\s*['"]child_process['"]\s*\)/,
    /require\s*\(\s*['"]fs['"]\s*\)/,
    /eval\s*\(/,
    /Function\s*\(/,
    /process\.exit/,
    /process\.env/,
  ],
  python: [
    /import\s+os/,
    /import\s+subprocess/,
    /import\s+sys/,
    /eval\s*\(/,
    /exec\s*\(/,
    /__import__/,
  ]
};

export function validateCode(code: string, language: string): void {
  if (!code || code.trim().length === 0) {
    throw new CodeValidationError('Code cannot be empty');
  }

  if (code.length > 100000) {
    throw new CodeValidationError('Code exceeds maximum size (100KB)');
  }

  const patterns = DANGEROUS_PATTERNS[language as keyof typeof DANGEROUS_PATTERNS];
  if (patterns) {
    for (const pattern of patterns) {
      if (pattern.test(code)) {
        throw new CodeValidationError(`Code contains forbidden pattern: ${pattern.source}`);
      }
    }
  }
}

export function sanitizeCode(code: string): string {
  return code
    .replace(/\r\n/g, '\n')
    .trim();
}

// Java validation patterns
const JAVA_DANGEROUS_PATTERNS = [
  /Runtime\.getRuntime\(\)/,
  /ProcessBuilder/,
  /System\.exit/,
  /java\.io\.File/,
  /java\.nio\.file/,
  /java\.net\./,
  /javax\.net\./,
];

export function validateJavaCode(code: string): void {
  if (!code || code.trim().length === 0) {
    throw new CodeValidationError('Java code cannot be empty');
  }

  if (code.length > 100000) {
    throw new CodeValidationError('Java code exceeds maximum size (100KB)');
  }

  for (const pattern of JAVA_DANGEROUS_PATTERNS) {
    if (pattern.test(code)) {
      throw new CodeValidationError(`Java code contains forbidden pattern: ${pattern.source}`);
    }
  }
}
