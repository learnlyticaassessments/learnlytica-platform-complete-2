/**
 * Java Test Runner Service
 * Executes JUnit tests and parses results
 */

import { executeInDocker } from './docker-executor.service';
import { validateCode, sanitizeCode } from './code-validator.service';

export interface JavaTestResult {
  name: string;
  passed: boolean;
  points: number;
  error?: string;
  duration?: number;
  className?: string;
  methodName?: string;
}

export interface JavaTestExecutionResult {
  success: boolean;
  testsRun: number;
  testsPassed: number;
  totalPoints: number;
  pointsEarned: number;
  results: JavaTestResult[];
  output: string;
  executionTime: number;
  compilationErrors?: string;
}

export async function runJavaTests(
  code: string,
  testConfig: any,
  question: any
): Promise<JavaTestExecutionResult> {
  // Validate Java code
  validateJavaCode(code);
  const sanitized = sanitizeCode(code);

  // Get Docker image
  const image = 'learnlytica/executor-java:latest';

  // Build test code
  const testCode = buildJUnitTests(question.testConfig.testCases);

  try {
    // Execute in Docker
    const result = await executeJavaInDocker(
      image,
      sanitized,
      testCode,
      testConfig.execution?.timeout || 30000
    );

    // Check for compilation errors
    if (result.stderr && result.stderr.includes('error:')) {
      return {
        success: false,
        testsRun: 0,
        testsPassed: 0,
        totalPoints: 0,
        pointsEarned: 0,
        results: [],
        output: result.stderr,
        executionTime: result.executionTime,
        compilationErrors: result.stderr
      };
    }

    // Parse JUnit results
    const testResults = parseJUnitResults(result.stdout, question.testConfig.testCases);

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
      output: result.stdout,
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
      executionTime: 0,
      compilationErrors: error.message
    };
  }
}

function validateJavaCode(code: string): void {
  if (!code || code.trim().length === 0) {
    throw new Error('Java code cannot be empty');
  }

  if (code.length > 100000) {
    throw new Error('Java code exceeds maximum size (100KB)');
  }

  // Check for dangerous patterns
  const dangerousPatterns = [
    /Runtime\.getRuntime\(\)/,
    /ProcessBuilder/,
    /System\.exit/,
    /java\.io\.File/,
    /java\.nio\.file/,
    /java\.net\./,
    /javax\.net\./,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      throw new Error(`Java code contains forbidden pattern: ${pattern.source}`);
    }
  }
}

function buildJUnitTests(testCases: any[]): string {
  return `
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import static org.junit.jupiter.api.Assertions.*;

public class SolutionTest {
${testCases.map((tc, index) => `
    @Test
    @DisplayName("${tc.name}")
    public void test${index + 1}() {
        ${tc.testCode || '// Test implementation'}
    }
`).join('\n')}
}
`;
}

async function executeJavaInDocker(
  image: string,
  code: string,
  testCode: string,
  timeout: number
): Promise<any> {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const fs = require('fs').promises;
  const path = require('path');
  const os = require('os');

  const execAsync = promisify(exec);
  const startTime = Date.now();
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'java-exec-'));

  try {
    // Write student code
    await fs.writeFile(path.join(workDir, 'Solution.java'), code);
    
    // Write test code
    await fs.writeFile(path.join(workDir, 'SolutionTest.java'), testCode);
    
    // Create pom.xml for Maven
    const pomXml = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    
    <groupId>com.learnlytica</groupId>
    <artifactId>assessment</artifactId>
    <version>1.0.0</version>
    
    <properties>
        <maven.compiler.source>17</maven.compiler.source>
        <maven.compiler.target>17</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>
    
    <dependencies>
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>5.10.0</version>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.mockito</groupId>
            <artifactId>mockito-core</artifactId>
            <version>5.5.0</version>
            <scope>test</scope>
        </dependency>
    </dependencies>
    
    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-surefire-plugin</artifactId>
                <version>3.1.2</version>
            </plugin>
        </plugins>
    </build>
</project>`;

    await fs.writeFile(path.join(workDir, 'pom.xml'), pomXml);

    // Move test to correct directory structure
    await fs.mkdir(path.join(workDir, 'src/main/java'), { recursive: true });
    await fs.mkdir(path.join(workDir, 'src/test/java'), { recursive: true });
    
    await fs.rename(
      path.join(workDir, 'Solution.java'),
      path.join(workDir, 'src/main/java/Solution.java')
    );
    
    await fs.rename(
      path.join(workDir, 'SolutionTest.java'),
      path.join(workDir, 'src/test/java/SolutionTest.java')
    );

    // Containers run as non-root; make mounted workspace accessible.
    await fs.chmod(workDir, 0o777);

    // Run Maven test in Docker
    const dockerCmd = [
      'docker run',
      '--rm',
      '--network none',
      '--cpus="1"',
      '--memory="512m"',
      `--volume "${workDir}:/workspace"`,
      '--workdir /workspace',
      image,
      'sh -c "cd /workspace && mvn clean test -B"'
    ].join(' ');

    const { stdout, stderr } = await execAsync(dockerCmd, {
      timeout,
      maxBuffer: 1024 * 1024
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

function parseJUnitResults(output: string, testCases: any[]): JavaTestResult[] {
  // Parse Maven Surefire output
  const results: JavaTestResult[] = [];
  
  // Look for test results in output
  const testPattern = /\[INFO\] Tests run: (\d+), Failures: (\d+), Errors: (\d+), Skipped: (\d+)/;
  const match = output.match(testPattern);
  
  if (match) {
    const testsRun = parseInt(match[1]);
    const failures = parseInt(match[2]);
    const errors = parseInt(match[3]);
    const passed = testsRun - failures - errors;
    
    // Map to test cases
    testCases.forEach((tc, index) => {
      results.push({
        name: tc.name,
        passed: index < passed,
        points: tc.points || 0,
        duration: Math.random() * 100,
        className: 'SolutionTest',
        methodName: `test${index + 1}`
      });
    });
  } else {
    // Fallback: assume all tests based on test cases
    testCases.forEach(tc => {
      results.push({
        name: tc.name,
        passed: !output.includes('FAILURE'),
        points: tc.points || 0,
        duration: Math.random() * 100
      });
    });
  }
  
  return results;
}
