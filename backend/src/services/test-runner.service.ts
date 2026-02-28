/**
 * Test Runner Service (Complete with all frameworks)
 * Integrates with Jest, Pytest, Playwright, JUnit, .NET, Supertest, and Pytest-Requests
 */

import { executeInDocker } from './docker-executor.service';
import { validateCode, sanitizeCode } from './code-validator.service';
import { runApiTests } from './api-test-runner.service';
import { runJavaTests } from './java-test-runner.service';

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
  diagnostics?: {
    framework: string;
    parser: string;
    parseWarning?: string;
    failureType?:
      | 'timeout'
      | 'runtime_error'
      | 'parse_error'
      | 'assertion_failure'
      | 'unsupported_framework'
      | 'compilation_error';
  };
}

export async function runTests(
  code: string,
  testConfig: any,
  question: any
): Promise<TestExecutionResult> {
  const framework = testConfig.framework;

  // Route to API testing if framework is API-specific
  if (framework === 'supertest' || framework === 'pytest-requests') {
    return runApiTests(code, testConfig, question);
  }
  // Route to Java testing if framework is JUnit
  if (framework === 'junit') {
    return runJavaTests(code, testConfig, question);
  }
  const supportedDraftFrameworks = new Set(['jest', 'pytest', 'playwright', 'dotnet']);
  if (!supportedDraftFrameworks.has(framework)) {
    return {
      success: false,
      testsRun: 0,
      testsPassed: 0,
      totalPoints: 0,
      pointsEarned: 0,
      results: [],
      output: `Test execution is not supported for framework "${framework}" in the current runner. Supported: jest, pytest, playwright, dotnet, junit, supertest, pytest-requests.`,
      executionTime: 0,
      diagnostics: {
        framework,
        parser: 'none',
        failureType: 'unsupported_framework'
      }
    };
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

    const parseWarning = testResults.length === 0 ? 'No test results parsed from runner output' : undefined;
    return {
      success: result.exitCode === 0 && testsRun > 0 && testsPassed === testsRun,
      testsRun,
      testsPassed,
      totalPoints,
      pointsEarned,
      results: testResults,
      output: combinedOutput,
      executionTime: result.executionTime,
      diagnostics: {
        framework,
        parser: `${framework}_json`,
        parseWarning,
        failureType: parseWarning ? 'parse_error' : (testsPassed < testsRun ? 'assertion_failure' : undefined)
      }
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
      executionTime: 0,
      diagnostics: {
        framework,
        parser: 'none',
        failureType: String(error?.message || '').toLowerCase().includes('timeout') ? 'timeout' : 'runtime_error'
      }
    };
  }
}

function getLanguage(framework: string): string {
  const languageMap: Record<string, string> = {
    'jest': 'javascript',
    'pytest': 'python',
    'playwright': 'javascript',
    'dotnet': 'csharp',
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
    'dotnet': 'learnlytica/executor-dotnet:latest',
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
    const normalizePlaywrightTestSnippet = (src: string) =>
      String(src || '')
        // Older sample snippets imported ./solution in Playwright mode.
        .replace(/const\s+\{\s*[^}]+\}\s*=\s*require\(['"]\.\/solution['"]\);\s*/g, '')
        .replace(/require\(['"]\.\/solution['"]\)/g, "require('./implementation.js')")
        // If legacy snippets referenced `sum(...)` directly after destructuring,
        // rewrite to use the injected `solution` object.
        .replace(/\bsum\s*\(/g, 'solution.sum(');

    return `
      const { test, expect } = require('playwright/test');
      const solutionModule = require('./implementation.js');
      
      ${testCases.map(tc => `
        test('${tc.name}', async ({ page }) => {
          const solution = solutionModule;
          ${normalizePlaywrightTestSnippet(tc.testCode || '// Playwright test implementation')}
        });
      `).join('\n')}
    `;
  } else if (framework === 'dotnet') {
    const sanitizeMethodName = (input: string, idx: number) => {
      const core = String(input || `test_${idx + 1}`).replace(/[^a-zA-Z0-9_]/g, '_');
      return /^[0-9]/.test(core) ? `Test_${core}` : (core || `Test_${idx + 1}`);
    };
    return `
      using Xunit;

      public class SolutionTests
      {
      ${testCases.map((tc, idx) => `
        [Fact(DisplayName = ${JSON.stringify(String(tc.name || `Test ${idx + 1}`))})]
        public void ${sanitizeMethodName(tc.id || tc.name, idx)}()
        {
          ${tc.testCode || 'Assert.True(true);'}
        }
      `).join('\n')}
      }
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
  if (framework === 'dotnet') {
    return parseDotnetResults(output, testCases);
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

function parseDotnetResults(output: string, testCases: any[]): TestResult[] {
  const text = String(output || '');
  const passedSet = new Set<string>();
  const failedSet = new Set<string>();
  const durationByName = new Map<string, number>();

  const passRegex = /^\s*Passed\s+(.+?)\s+\[(\d+)\s*ms\]/gm;
  const failRegex = /^\s*Failed\s+(.+?)\s+\[(\d+)\s*ms\]/gm;

  let match: RegExpExecArray | null;
  while ((match = passRegex.exec(text)) !== null) {
    const name = String(match[1] || '').trim();
    passedSet.add(name);
    durationByName.set(name, Number(match[2] || 0));
  }
  while ((match = failRegex.exec(text)) !== null) {
    const name = String(match[1] || '').trim();
    failedSet.add(name);
    durationByName.set(name, Number(match[2] || 0));
  }

  const discoveredNames = Array.from(new Set([...passedSet, ...failedSet]));
  if (!discoveredNames.length) {
    const aggregate = text.match(/Failed:\s*(\d+),\s*Passed:\s*(\d+),\s*Skipped:\s*(\d+),\s*Total:\s*(\d+)/i);
    if (aggregate && Array.isArray(testCases) && testCases.length) {
      const passed = Number(aggregate[2] || 0);
      return testCases.map((tc: any, idx: number) => ({
        name: tc?.name || `Test ${idx + 1}`,
        passed: idx < passed,
        points: Number(tc?.points || 0),
        error: idx < passed ? undefined : 'dotnet test failed',
      }));
    }
    return [];
  }

  const byName = new Map<string, any>();
  for (const tc of testCases || []) {
    byName.set(String(tc?.name || '').trim(), tc);
  }

  return discoveredNames.map((name, idx) => {
    const tc = byName.get(name) || testCases?.[idx] || {};
    const passed = passedSet.has(name) && !failedSet.has(name);
    return {
      name,
      passed,
      points: Number(tc?.points || 0),
      error: passed ? undefined : 'dotnet test assertion failed',
      duration: durationByName.get(name)
    };
  });
}

function extractJsonObject(output: string): any | null {
  const text = String(output || '');
  const matches = text.match(/\{[\s\S]*\}/g);
  if (!matches?.length) return null;
  for (let i = matches.length - 1; i >= 0; i -= 1) {
    try {
      return JSON.parse(matches[i]);
    } catch {
      // try earlier JSON block
    }
  }
  return null;
}

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
