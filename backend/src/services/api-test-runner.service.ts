/**
 * API Test Runner Service
 * Comprehensive API testing with Supertest (Node) and Pytest-Requests (Python)
 */

import { executeInDocker } from './docker-executor.service';
import { validateCode, sanitizeCode } from './code-validator.service';

export interface ApiTestResult {
  name: string;
  passed: boolean;
  points: number;
  error?: string;
  duration?: number;
  statusCode?: number;
  responseTime?: number;
}

export interface ApiTestExecutionResult {
  success: boolean;
  testsRun: number;
  testsPassed: number;
  totalPoints: number;
  pointsEarned: number;
  results: ApiTestResult[];
  output: string;
  executionTime: number;
  apiMetrics?: {
    averageResponseTime: number;
    totalRequests: number;
    successfulRequests: number;
  };
  diagnostics?: {
    framework: string;
    parser: string;
    parseWarning?: string;
    failureType?: 'timeout' | 'runtime_error' | 'parse_error' | 'assertion_failure';
  };
}

export async function runApiTests(
  code: string,
  testConfig: any,
  question: any
): Promise<ApiTestExecutionResult> {
  const framework = testConfig.framework;
  const language = framework === 'supertest' ? 'javascript' : 'python';

  // Validate code
  validateCode(code, language);
  const sanitized = sanitizeCode(code);

  // Get Docker image
  const image = framework === 'supertest' 
    ? 'learnlytica/executor-node:latest' 
    : 'learnlytica/executor-python:latest';

  // Build test code
  const testCode = buildApiTestCode(framework, question.testConfig.testCases, sanitized);

  try {
    // Execute in Docker
    const result = await executeInDocker(
      image,
      sanitized,
      testCode,
      framework,
      testConfig.execution?.timeout || 30000
    );

    // Parse results
    const combinedOutput = [result.stdout, result.stderr].filter(Boolean).join('\n');
    const testResults = parseApiTestResults(combinedOutput, framework, question.testConfig.testCases);

    const testsRun = testResults.length;
    const testsPassed = testResults.filter(t => t.passed).length;
    const totalPoints = testResults.reduce((sum, t) => sum + t.points, 0);
    const pointsEarned = testResults.filter(t => t.passed).reduce((sum, t) => sum + t.points, 0);

    // Calculate API metrics
    const apiMetrics = calculateApiMetrics(testResults);

    const parseWarning = testResults.length === 0 ? 'No API test results parsed from runner output' : undefined;
    return {
      success: result.exitCode === 0 && testsRun > 0 && testsPassed === testsRun,
      testsRun,
      testsPassed,
      totalPoints,
      pointsEarned,
      results: testResults,
      output: combinedOutput,
      executionTime: result.executionTime,
      apiMetrics,
      diagnostics: {
        framework,
        parser: framework === 'supertest' ? 'jest_json' : 'pytest_json',
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

function buildApiTestCode(framework: string, testCases: any[], code: string): string {
  void code;
  if (framework === 'supertest') {
    return buildSupertestCode(testCases, code);
  } else if (framework === 'pytest-requests') {
    return buildPytestRequestsCode(testCases, code);
  }
  return '';
}

function buildSupertestCode(testCases: any[], code: string): string {
  void code;
  return `
const request = require('supertest');
const app = require('./app'); // Student's Express app

${testCases.map(tc => `
describe('${tc.name}', () => {
  test('${tc.description || tc.name}', async () => {
    const startTime = Date.now();
    ${tc.testCode || `
    const response = await request(app)
      .${tc.method?.toLowerCase() || 'get'}('${tc.endpoint || '/'}')
      ${tc.body ? `.send(${JSON.stringify(tc.body)})` : ''}
      ${tc.headers ? `.set(${JSON.stringify(tc.headers)})` : ''};
    
    expect(response.status).toBe(${tc.expectedStatus || 200});
    ${tc.expectedBody ? `expect(response.body).toMatchObject(${JSON.stringify(tc.expectedBody)});` : ''}
    `}
    const duration = Date.now() - startTime;
    expect(duration).toBeGreaterThanOrEqual(0);
  });
});
`).join('\n')}
`;
}

function buildPytestRequestsCode(testCases: any[], code: string): string {
  void code;
  return `
import pytest
from app import app  # Student's Flask/FastAPI app
from fastapi.testclient import TestClient

client = TestClient(app)

${testCases.map(tc => `
def test_${tc.id}():
    """${tc.description || tc.name}"""
    ${tc.testCode || `
    response = client.${tc.method?.toLowerCase() || 'get'}(
        "${tc.endpoint || '/'}",
        ${tc.body ? `json=${JSON.stringify(tc.body)},` : ''}
        ${tc.headers ? `headers=${JSON.stringify(tc.headers)},` : ''}
    )
    
    assert response.status_code == ${tc.expectedStatus || 200}
    ${tc.expectedBody ? `assert response.json() == ${JSON.stringify(tc.expectedBody)}` : ''}
    `}
`).join('\n')}
`;
}

function parseApiTestResults(output: string, framework: string, testCases: any[]): ApiTestResult[] {
  try {
    if (framework === 'supertest') {
      return parseSupertestResults(output, testCases);
    }
    if (framework === 'pytest-requests') {
      return parsePytestRequestsResults(output, testCases);
    }
    return [];
  } catch (error) {
    console.error('Failed to parse API test results:', error);
    return [];
  }
}

function parseSupertestResults(output: string, testCases: any[]): ApiTestResult[] {
  const payload = extractJsonObject(output);
  const assertions = payload?.testResults?.[0]?.assertionResults || [];
  if (!assertions.length && Array.isArray(testCases) && testCases.length) {
    return testCases.map((tc: any, index: number) => ({
      name: tc?.name || `API test ${index + 1}`,
      passed: false,
      points: Number(tc?.points || 0),
      error: 'Result parsing failed: missing Jest assertion results'
    }));
  }

  return assertions.map((assertion: any, index: number) => ({
    name: assertion?.title || testCases[index]?.name || `API test ${index + 1}`,
    passed: String(assertion?.status || '').toLowerCase() === 'passed',
    points: Number(testCases[index]?.points || 0),
    error: Array.isArray(assertion?.failureMessages) && assertion.failureMessages.length
      ? String(assertion.failureMessages[0])
      : undefined,
    duration: Number(assertion?.duration || 0) || undefined,
    responseTime: Number(assertion?.duration || 0) || undefined
  }));
}

function parsePytestRequestsResults(output: string, testCases: any[]): ApiTestResult[] {
  const payload = extractJsonObject(output);
  const tests = Array.isArray(payload?.tests) ? payload.tests : [];
  if (!tests.length && Array.isArray(testCases) && testCases.length) {
    return testCases.map((tc: any, index: number) => ({
      name: tc?.name || `API test ${index + 1}`,
      passed: false,
      points: Number(tc?.points || 0),
      error: 'Result parsing failed: missing pytest test records'
    }));
  }

  return tests.map((test: any, index: number) => {
    const outcome = String(test?.outcome || '').toLowerCase();
    const duration = Number(test?.call?.duration || test?.duration || 0) || undefined;
    return {
      name: String(test?.nodeid || testCases[index]?.name || `API test ${index + 1}`),
      passed: outcome === 'passed',
      points: Number(testCases[index]?.points || 0),
      error: outcome === 'passed' ? undefined : String(test?.call?.longrepr || test?.longrepr || 'Test failed'),
      duration,
      responseTime: duration
    };
  });
}

function calculateApiMetrics(results: ApiTestResult[]): any {
  const responseTimes = results
    .map(r => r.responseTime || 0)
    .filter(rt => rt > 0);

  return {
    averageResponseTime: responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0,
    totalRequests: results.length,
    successfulRequests: results.filter(r => r.passed).length
  };
}

function extractJsonObject(output: string): any | null {
  const text = String(output || '');
  const matches = text.match(/\{[\s\S]*\}/g);
  if (!matches?.length) return null;
  for (let i = matches.length - 1; i >= 0; i -= 1) {
    try {
      return JSON.parse(matches[i]);
    } catch {
      // try earlier segment
    }
  }
  return null;
}
