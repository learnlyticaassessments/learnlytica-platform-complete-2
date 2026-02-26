/**
 * Test Runner Service (Complete with all frameworks)
 * Integrates with Jest, Pytest, Playwright, Supertest, and Pytest-Requests
 */

import { executeInDocker } from './docker-executor.service';
import { validateCode, sanitizeCode } from './code-validator.service';
import { runApiTests } from './api-test-runner.service';

export interface TestResult {
  name: string;
  passed: boolean;
  points: number;
  error?: string;
  duration?: number;
  statusCode?: number;
  responseTime?: number;
}

export interface TestExecutionResult {
  success: boolean;
  testsRun: number;
  testsPassed: number;
  totalPoints: number;
  pointsEarned: number;
  results: TestResult[];
  output: string;
  executionTime: number;
  screenshots?: string[];
  apiMetrics?: {
    averageResponseTime: number;
    totalRequests: number;
    successfulRequests: number;
  };
}

export async function runTests(
  code: string,
  testConfig: any,
  question: any
): Promise<TestExecutionResult> {
  const framework = testConfig.framework;
  const supportedDraftFrameworks = new Set(['jest', 'pytest', 'playwright']);
  if (!supportedDraftFrameworks.has(framework)) {
    return {
      success: false,
      testsRun: 0,
      testsPassed: 0,
      totalPoints: 0,
      pointsEarned: 0,
      results: [],
      output: `Draft test execution is not supported for framework "${framework}" in the current runner. Supported: jest, pytest, playwright, junit.`,
      executionTime: 0
    };
  }

  // Route to API testing if framework is API-specific
  if (framework === 'supertest' || framework === 'pytest-requests') {
    return runApiTests(code, testConfig, question);
  }

  const language = getLanguage(framework);

  // Validate code
  validateCode(code, language);
  const sanitized = sanitizeCode(code);

  // Get Docker image
  const image = getDockerImage(framework);

  // Build test code
  const testCode = buildTestCode(framework, question.testConfig.testCases, sanitized);

  try {
    // Execute in Docker
    const result = await executeInDocker(
      image,
      sanitized,
      testCode,
      framework,
      testConfig.execution?.timeout || 30000
    );

    // Parse results based on framework
    const combinedOutput = [result.stdout, result.stderr].filter(Boolean).join('\n');
    const testResults = parseTestResults(combinedOutput, framework, question.testConfig.testCases);

    const testsRun = testResults.length;
    const testsPassed = testResults.filter(t => t.passed).length;
    const totalPoints = testResults.reduce((sum, t) => sum + t.points, 0);
    const pointsEarned = testResults.filter(t => t.passed).reduce((sum, t) => sum + t.points, 0);

    return {
      success: result.exitCode === 0,
      testsRun,
      testsPassed,
      totalPoints,
      pointsEarned,
      results: testResults,
      output: combinedOutput,
      executionTime: result.executionTime
    };

  } catch (error: any) {
    return {
      success: false,
      testsRun: 0,
      testsPassed: 0,
      totalPoints: 0,
      pointsEarned: 0,
      results: [],
      output: error.message,
      executionTime: 0
    };
  }
}

function getLanguage(framework: string): string {
  const languageMap: Record<string, string> = {
    'jest': 'javascript',
    'pytest': 'python',
    'playwright': 'javascript',
    'supertest': 'javascript',
    'pytest-requests': 'python',
    'mocha': 'javascript'
  };
  return languageMap[framework] || 'javascript';
}

function getDockerImage(framework: string): string {
  const images: Record<string, string> = {
    'jest': 'learnlytica/executor-node:latest',
    'pytest': 'learnlytica/executor-python:latest',
    'playwright': 'learnlytica/executor-playwright:latest',
    'supertest': 'learnlytica/executor-node:latest',
    'pytest-requests': 'learnlytica/executor-python:latest',
  };
  return images[framework] || 'learnlytica/executor-node:latest';
}

function buildTestCode(framework: string, testCases: any[], code: string): string {
  if (framework === 'jest') {
    return testCases.map(tc => `
      test('${tc.name}', () => {
        ${tc.testCode || '// Test implementation'}
      });
    `).join('\n');
  } else if (framework === 'pytest') {
    const indentPy = (src: string) =>
      String(src || 'pass')
        .split('\n')
        .map((line) => `    ${line}`)
        .join('\n');
    return testCases.map(tc => `
def test_${tc.id}():
${indentPy(tc.testCode || 'pass')}
    `).join('\n');
  } else if (framework === 'playwright') {
    return `
      import { test, expect } from '@playwright/test';
      import * as solutionModule from './implementation.js';
      
      ${testCases.map(tc => `
        test('${tc.name}', async ({ page }) => {
          const solution = solutionModule;
          ${tc.testCode || '// Playwright test implementation'}
        });
      `).join('\n')}
    `;
  }
  return '';
}

function parseTestResults(output: string, framework: string, testCases: any[]): TestResult[] {
  if (framework === 'playwright') {
    return parsePlaywrightResults(output, testCases);
  }
  
  if (framework === 'jest') {
    return parseJestResults(output, testCases);
  }
  
  if (framework === 'pytest') {
    return parsePytestResults(output, testCases);
  }
  
  return [];
}

function parsePlaywrightResults(output: string, testCases: any[]): TestResult[] {
  try {
    const results = extractJsonObject(output);
    if (results) {
      return results.suites?.[0]?.specs?.map((spec: any, index: number) => ({
        name: spec.title,
        passed: spec.ok,
        points: testCases[index]?.points || 0,
        error: spec.ok ? undefined : spec.tests?.[0]?.results?.[0]?.error?.message,
        duration: spec.tests?.[0]?.results?.[0]?.duration
      })) || [];
    }
  } catch (error) {
    console.error('Failed to parse Playwright results:', error);
  }
  
  return [];
}

function parseJestResults(output: string, testCases: any[]): TestResult[] {
  try {
    const results = extractJsonObject(output);
    if (results) {
      return results.testResults?.[0]?.assertionResults?.map((test: any, index: number) => ({
        name: test.title,
        passed: test.status === 'passed',
        points: testCases[index]?.points || 0,
        error: test.failureMessages?.[0],
        duration: test.duration
      })) || [];
    }
  } catch (error) {
    console.error('Failed to parse Jest results:', error);
  }
  
  return [];
}

function parsePytestResults(output: string, testCases: any[]): TestResult[] {
  try {
    const results = extractJsonObject(output);
    if (results) {
      return results.tests?.map((test: any, index: number) => ({
        name: test.nodeid,
        passed: test.outcome === 'passed',
        points: testCases[index]?.points || 0,
        error: test.outcome !== 'passed' ? test.call?.longrepr : undefined,
        duration: test.duration
      })) || [];
    }
  } catch (error) {
    console.error('Failed to parse Pytest results:', error);
  }
  
  return [];
}

function extractJsonObject(output: string): any | null {
  const start = output.indexOf('{');
  const end = output.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  const candidate = output.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

// Import Java test runner
import { runJavaTests } from './java-test-runner.service';

// Update runTests function to handle Java
export async function runTestsWithJava(
  code: string,
  testConfig: any,
  question: any
): Promise<TestExecutionResult> {
  const framework = testConfig.framework;

  // Route to Java testing if framework is JUnit
  if (framework === 'junit') {
    return runJavaTests(code, testConfig, question);
  }

  // ... existing code for other frameworks
  return runTests(code, testConfig, question);
}
