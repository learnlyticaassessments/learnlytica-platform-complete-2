/**
 * Docker Executor Service (Updated with Playwright support)
 * Manages Docker containers for code execution
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

export class DockerExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DockerExecutionError';
  }
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
}

export async function executeInDocker(
  image: string,
  code: string,
  testCode: string,
  framework: string,
  timeout: number = 30000
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'code-exec-'));

  try {
    // Write files based on framework
    if (framework === 'playwright') {
      await setupPlaywrightExecution(workDir, code, testCode);
    } else if (framework === 'jest') {
      await setupJestExecution(workDir, code, testCode);
    } else if (framework === 'pytest') {
      await setupPytestExecution(workDir, code, testCode);
    } else if (framework === 'supertest') {
      await setupSupertestExecution(workDir, code, testCode);
    } else if (framework === 'pytest-requests') {
      await setupPytestRequestsExecution(workDir, code, testCode);
    }

    // Containers run as non-root (coderunner). mkdtemp creates a private dir,
    // so make the mounted workspace writable/readable by the container user.
    await fs.chmod(workDir, 0o777);

    // Build Docker command
    const dockerCmd = buildDockerCommand(image, framework, workDir);

    const { stdout, stderr } = await execAsync(dockerCmd, { 
      timeout,
      maxBuffer: 1024 * 1024 // 1MB
    });

    const executionTime = Date.now() - startTime;

    return {
      stdout,
      stderr,
      exitCode: 0,
      executionTime
    };

  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    
    if (error.killed) {
      throw new DockerExecutionError('Execution timeout');
    }

    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.code || 1,
      executionTime
    };
  } finally {
    // Cleanup
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function setupPlaywrightExecution(workDir: string, code: string, testCode: string) {
  const normalizedCode = normalizePlaywrightImplementationModule(code);

  // Write the implementation
  await fs.writeFile(path.join(workDir, 'implementation.js'), normalizedCode);
  
  // Write the test file
  await fs.writeFile(path.join(workDir, 'test.spec.js'), testCode);
  
  // Create playwright config
  const playwrightConfig = `
    module.exports = {
      testDir: '.',
      timeout: 30000,
      use: {
        headless: true,
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
      },
      reporter: [['json', { outputFile: 'results.json' }]]
    };
  `;
  await fs.writeFile(path.join(workDir, 'playwright.config.cjs'), playwrightConfig);
  
  // Create package.json
  const packageJson = {
    "name": "learnlytica-playwright-draft-runner",
    "version": "1.0.0",
    "private": true
  };
  await fs.writeFile(path.join(workDir, 'package.json'), JSON.stringify(packageJson));
}

function normalizePlaywrightImplementationModule(code: string): string {
  if (!code) return code;

  // Normalize to CommonJS so imported packages from older samples and newer
  // ESM-style samples both execute in the same draft runner environment.
  let next = String(code);

  // Convert `export function foo(...)` to `function foo(...)`
  next = next.replace(/\bexport\s+function\s+([A-Za-z_]\w*)\s*\(/g, 'function $1(');

  // If there is no CommonJS export, append one based on discovered top-level functions.
  if (!/\bmodule\.exports\b/.test(next)) {
    const exportedNames = Array.from(next.matchAll(/\bfunction\s+([A-Za-z_]\w*)\s*\(/g)).map((m) => m[1]);
    if (exportedNames.length > 0) {
      next = `${next.trim()}\n\nmodule.exports = { ${Array.from(new Set(exportedNames)).join(', ')} };\n`;
    }
  }

  return next;
}

async function setupJestExecution(workDir: string, code: string, testCode: string) {
  await fs.writeFile(path.join(workDir, 'solution.js'), code);
  await fs.writeFile(path.join(workDir, 'question.test.js'), testCode);

  const packageJson = {
    name: 'learnlytica-jest-draft-runner',
    version: '1.0.0',
    private: true
  };
  await fs.writeFile(path.join(workDir, 'package.json'), JSON.stringify(packageJson));

}

async function setupPytestExecution(workDir: string, code: string, testCode: string) {
  await fs.writeFile(path.join(workDir, 'solution.py'), code);
  await fs.writeFile(path.join(workDir, 'test_solution.py'), testCode);
}

async function setupSupertestExecution(workDir: string, code: string, testCode: string) {
  await fs.writeFile(path.join(workDir, 'app.js'), code);
  await fs.writeFile(path.join(workDir, 'question.test.js'), testCode);
  const packageJson = {
    name: 'learnlytica-supertest-draft-runner',
    version: '1.0.0',
    private: true
  };
  await fs.writeFile(path.join(workDir, 'package.json'), JSON.stringify(packageJson));
}

async function setupPytestRequestsExecution(workDir: string, code: string, testCode: string) {
  await fs.writeFile(path.join(workDir, 'app.py'), code);
  await fs.writeFile(path.join(workDir, 'test_api.py'), testCode);
}

function buildDockerCommand(image: string, framework: string, workDir: string): string {
  const baseCmd = [
    'docker run',
    '--rm',
    '--network none',
    '--cpus="1"',
    '--memory="512m"',
    `--volume "${workDir}:/workspace"`,
    '--workdir /workspace',
    image
  ];

  let execCmd = '';
  
  if (framework === 'playwright') {
    // The Playwright executor image is prebuilt with Playwright dependencies.
    // Do not run npm install here because containers run with --network none.
    execCmd = 'sh -c "mkdir -p node_modules && ln -sfn /usr/lib/node_modules/playwright ./node_modules/playwright && playwright test --config playwright.config.cjs; CODE=$?; [ -f results.json ] && cat results.json; exit $CODE"';
  } else if (framework === 'jest') {
    execCmd = 'sh -c "jest --config \'{\\"rootDir\\":\\"/workspace\\",\\"testEnvironment\\":\\"node\\"}\' --runInBand --json --outputFile=/workspace/results.json /workspace/question.test.js; CODE=$?; [ -f /workspace/results.json ] && cat /workspace/results.json; exit $CODE"';
  } else if (framework === 'pytest') {
    execCmd = 'sh -c "pytest --json-report --json-report-file=results.json; CODE=$?; [ -f results.json ] && cat results.json; exit $CODE"';
  } else if (framework === 'supertest') {
    execCmd = 'sh -c "jest --config \'{\\"rootDir\\":\\"/workspace\\",\\"testEnvironment\\":\\"node\\"}\' --runInBand --json --outputFile=/workspace/results.json /workspace/question.test.js; CODE=$?; [ -f /workspace/results.json ] && cat /workspace/results.json; exit $CODE"';
  } else if (framework === 'pytest-requests') {
    execCmd = 'sh -c "pytest --json-report --json-report-file=results.json /workspace/test_api.py; CODE=$?; [ -f results.json ] && cat results.json; exit $CODE"';
  }

  return [...baseCmd, execCmd].join(' ');
}
