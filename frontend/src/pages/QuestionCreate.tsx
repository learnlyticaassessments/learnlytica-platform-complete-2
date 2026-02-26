import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Eye, Play, Plus, Trash2, Upload } from 'lucide-react';
import Editor from '@monaco-editor/react';
import JSZip from 'jszip';
import { useCreateQuestion } from '../hooks/useQuestions';
import { questionService } from '../services/questionService';
import type { CreateQuestionDTO, TestFramework, QuestionCategory, QuestionDifficulty } from '../../../backend/shared/types/question.types';

type DraftTestCase = {
  id: string;
  name: string;
  file: string;
  testName: string;
  points: number;
  visible: boolean;
  category?: string;
  description?: string;
  testCode?: string;
};

type DraftRunResult = {
  success: boolean;
  testsRun: number;
  testsPassed: number;
  totalPoints: number;
  pointsEarned: number;
  results: Array<{ name: string; passed: boolean; points: number; error?: string }>;
  output?: string;
  executionTime?: number;
};

type DraftCodeFile = {
  path: string;
  content: string;
  language: 'javascript' | 'python' | 'java';
};

type QuestionPackageManifest = {
  schemaVersion?: number;
  title?: string;
  description?: string;
  category?: QuestionCategory;
  difficulty?: QuestionDifficulty;
  testFramework?: TestFramework;
  points?: number;
  timeEstimate?: number;
  skills?: string[];
  tags?: string[];
  starterCode?: {
    files?: Array<{ path: string; source?: string; content?: string; language?: string }>;
  };
  solution?: {
    files?: Array<{ path: string; source?: string; content?: string; language?: string }>;
  };
  testCases?: Array<Partial<DraftTestCase> & { testCodePath?: string }>;
};

const QUESTION_PACKAGE_SCHEMA_VERSION = 1;
const DRAFT_RUN_SUPPORTED_FRAMEWORKS = new Set<TestFramework>(['jest', 'pytest', 'playwright', 'junit']);

function getMonacoTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'vs-dark' : 'vs-light';
}

function buildDefaultStarterCode(category: QuestionCategory, framework: TestFramework) {
  if (framework === 'junit') {
    return {
      files: [{ path: 'src/Main.java', content: 'public class Main {\n  // TODO: Implement solution\n}\n', language: 'java' }],
      dependencies: {},
      scripts: {}
    };
  }
  if (framework === 'pytest') {
    return {
      files: [{ path: category === 'backend' ? 'app.py' : 'solution.py', content: '# TODO: Implement solution\n', language: 'python' }],
      dependencies: {},
      scripts: {}
    };
  }
  return {
    files: [{ path: category === 'frontend' ? 'src/index.js' : 'solution.js', content: '// TODO: Implement solution\n', language: 'javascript' }],
    dependencies: {},
    scripts: framework === 'playwright' ? { test: 'playwright test' } : { test: framework === 'mocha' ? 'mocha' : framework === 'cypress' ? 'cypress run' : 'jest' }
  };
}

function buildDefaultTestCase(framework: TestFramework, points: number): DraftTestCase {
  const safePoints = Math.max(1, Number(points) || 100);
  const map: Record<string, Partial<DraftTestCase>> = {
    playwright: { name: 'Renders and basic interaction', file: 'tests/question.spec.ts', testName: 'basic flow works' },
    jest: { name: 'Basic correctness', file: 'tests/question.test.js', testName: 'basic correctness' },
    pytest: { name: 'Basic correctness', file: 'tests/test_solution.py', testName: 'test_basic_correctness' },
    junit: { name: 'Basic correctness', file: 'src/test/java/MainTest.java', testName: 'basicCorrectness' },
    mocha: { name: 'Basic correctness', file: 'test/question.spec.js', testName: 'should pass basic case' },
    cypress: { name: 'Basic UI flow', file: 'cypress/e2e/question.cy.js', testName: 'basic flow' }
  };
  const preset = map[framework] || map.jest;
  return {
    id: 'tc_001',
    name: preset.name || 'Basic correctness',
    file: preset.file || 'tests/question.test.js',
    testName: preset.testName || 'basic correctness',
    points: safePoints,
      visible: true,
      category: 'basic',
      description: '',
      testCode:
        framework === 'pytest'
          ? "assert True"
          : framework === 'junit'
          ? "assertTrue(true);"
          : framework === 'playwright'
          ? "await page.goto('http://localhost:3000');\nawait expect(page).toHaveTitle(/./);"
          : "expect(true).toBe(true);"
    };
}

function buildTestConfig(framework: TestFramework, points: number, testCases: DraftTestCase[]): CreateQuestionDTO['testConfig'] {
  const total = testCases.reduce((sum, tc) => sum + (Number(tc.points) || 0), 0) || Math.max(10, points || 100);
  const passing = Math.max(1, Math.ceil(total * 0.6));
  const base: any = {
    framework,
    version: framework === 'junit' ? '5' : 'latest',
    environment: {},
    setup: { commands: ['echo "setup"'], timeout: 120000 },
    execution: { command: 'echo "run tests"', timeout: 300000 },
      testCases: testCases.map((tc) => ({
      id: tc.id,
      name: tc.name,
      description: tc.description || undefined,
      file: tc.file,
        testName: tc.testName,
        testCode: tc.testCode || undefined,
        points: Number(tc.points) || 0,
      visible: !!tc.visible,
      category: tc.category || undefined
    })),
    scoring: { total, passing }
  };

  if (framework === 'pytest') {
    base.environment = { python: '3.11' };
    base.setup.commands = ['pip install pytest'];
    base.execution.command = 'pytest -q';
  } else if (framework === 'junit') {
    base.environment = { java: '17' };
    base.setup.commands = ['echo "JUnit setup handled by executor"'];
    base.execution.command = 'mvn test';
  } else if (framework === 'playwright') {
    base.environment = { node: '20', runtime: 'browser' };
    base.setup.commands = ['npm install'];
    base.execution.command = 'npx playwright test';
  } else if (framework === 'cypress') {
    base.environment = { node: '20', runtime: 'browser' };
    base.setup.commands = ['npm install'];
    base.execution.command = 'npx cypress run';
  } else if (framework === 'mocha') {
    base.environment = { node: '20' };
    base.setup.commands = ['npm install'];
    base.execution.command = 'npx mocha';
  } else {
    base.environment = { node: '20' };
    base.setup.commands = ['npm install'];
    base.execution.command = 'npx jest --runInBand';
  }

  return base;
}

function parseCsvList(input: string) {
  return input.split(',').map((v) => v.trim()).filter(Boolean);
}

function inferLanguage(framework: TestFramework): DraftCodeFile['language'] {
  if (framework === 'pytest') return 'python';
  if (framework === 'junit') return 'java';
  return 'javascript';
}

function inferLanguageFromPath(path: string, fallback: DraftCodeFile['language']): DraftCodeFile['language'] {
  const p = path.toLowerCase();
  if (p.endsWith('.py')) return 'python';
  if (p.endsWith('.java')) return 'java';
  if (p.endsWith('.ts') || p.endsWith('.tsx') || p.endsWith('.js') || p.endsWith('.jsx')) return 'javascript';
  return fallback;
}

function fileName(path: string) {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

export function QuestionCreate() {
  const navigate = useNavigate();
  const createMutation = useCreateQuestion();
  const packageInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<QuestionCategory>('frontend');
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>('medium');
  const [testFramework, setTestFramework] = useState<TestFramework>('playwright');
  const [points, setPoints] = useState(100);
  const [timeEstimate, setTimeEstimate] = useState(45);
  const [skillsInput, setSkillsInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [starterFiles, setStarterFiles] = useState<DraftCodeFile[]>([
    { path: 'src/index.js', content: '// TODO: Implement solution\n', language: 'javascript' }
  ]);
  const [activeStarterFileIndex, setActiveStarterFileIndex] = useState(0);
  const [solutionEnabled, setSolutionEnabled] = useState(true);
  const [solutionFiles, setSolutionFiles] = useState<DraftCodeFile[]>([
    { path: 'src/index.js', content: '// Implement the expected solution here\n', language: 'javascript' }
  ]);
  const [activeSolutionFileIndex, setActiveSolutionFileIndex] = useState(0);
  const [testCases, setTestCases] = useState<DraftTestCase[]>([buildDefaultTestCase('playwright', 100)]);
  const [draftRunLoading, setDraftRunLoading] = useState(false);
  const [draftRunResult, setDraftRunResult] = useState<DraftRunResult | null>(null);
  const [draftRunError, setDraftRunError] = useState<string | null>(null);
  const [rawOutputCopied, setRawOutputCopied] = useState(false);
  const [packageImportError, setPackageImportError] = useState<string | null>(null);
  const [packageImportInfo, setPackageImportInfo] = useState<string | null>(null);
  const [importingPackage, setImportingPackage] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [serverPackageValidation, setServerPackageValidation] = useState<any | null>(null);
  const [templateFrameworkChoice, setTemplateFrameworkChoice] = useState<TestFramework>('jest');
  const [completeSampleFrameworkChoice, setCompleteSampleFrameworkChoice] = useState<TestFramework>('jest');

  const syncFrameworkDefaults = (nextFramework: TestFramework, nextCategory = category, nextPoints = points) => {
    const starter = buildDefaultStarterCode(nextCategory, nextFramework);
    const language = inferLanguage(nextFramework);
    const nextStarterFiles: DraftCodeFile[] = (starter.files || []).map((f: any) => ({
      path: f.path,
      content: f.content,
      language
    }));
    setStarterFiles(nextStarterFiles.length ? nextStarterFiles : [{ path: 'solution.js', content: '// TODO: Implement solution\n', language }]);
    setSolutionFiles([
      {
        path: (nextStarterFiles[0]?.path || 'solution.js'),
        content: language === 'python' ? '# Reference solution\n' : language === 'java' ? 'public class Main {\n  // Reference solution\n}\n' : '// Reference solution\n',
        language
      }
    ]);
    setActiveStarterFileIndex(0);
    setActiveSolutionFileIndex(0);
    setTestCases([buildDefaultTestCase(nextFramework, nextPoints)]);
    setDraftRunResult(null);
    setDraftRunError(null);
  };

  const payload = useMemo<CreateQuestionDTO>(() => {
    const skills = parseCsvList(skillsInput);
    const tags = parseCsvList(tagsInput);
    const language = inferLanguage(testFramework);
    const normalizedStarterFiles = (starterFiles.length ? starterFiles : [{ path: 'solution.js', content: '', language }])
      .map((f, index) => ({
        path: (f.path || '').trim() || `file${index + 1}${language === 'python' ? '.py' : language === 'java' ? '.java' : '.js'}`,
        content: f.content ?? '',
        language: f.language || language
      }));
    const safeStarter = {
      ...buildDefaultStarterCode(category, testFramework),
      files: normalizedStarterFiles
    };
    const normalizedTestCases = testCases.map((tc, index) => ({
      ...tc,
      id: tc.id?.trim() || `tc_${String(index + 1).padStart(3, '0')}`,
      name: tc.name?.trim() || `Test Case ${index + 1}`,
      file: tc.file?.trim() || 'tests/question.test.js',
      testName: tc.testName?.trim() || `test_case_${index + 1}`,
      points: Number.isFinite(tc.points) ? Math.max(0, Math.floor(tc.points)) : 0,
      visible: !!tc.visible
    }));

    const totalPointsFromCases = normalizedTestCases.reduce((sum, tc) => sum + tc.points, 0);
    const effectivePoints = Math.max(10, Number(points) || totalPointsFromCases || 100);
    const effectiveCases = normalizedTestCases.length ? normalizedTestCases : [buildDefaultTestCase(testFramework, effectivePoints)];

    return {
      title: title.trim(),
      description: description.trim(),
      category,
      subcategory: [],
      difficulty,
      skills,
      tags,
      starterCode: safeStarter,
      testFramework,
      testConfig: buildTestConfig(testFramework, effectivePoints, effectiveCases),
      solution: solutionEnabled
        ? {
            files: (solutionFiles.length ? solutionFiles : [{ path: safeStarter.files[0].path, content: '', language: safeStarter.files[0].language as any }]).map((f, idx) => ({
              path: (f.path || '').trim() || safeStarter.files[idx]?.path || safeStarter.files[0].path,
              content: f.content ?? '',
              language: (f.language as any) || (safeStarter.files[idx]?.language as any) || (safeStarter.files[0].language as any)
            }))
          }
        : undefined,
      timeEstimate: Math.max(5, Number(timeEstimate) || 45),
      points: effectivePoints
    };
  }, [
    title,
    description,
    category,
    difficulty,
    testFramework,
    skillsInput,
    tagsInput,
    starterFiles,
    activeStarterFileIndex,
    solutionEnabled,
    solutionFiles,
    activeSolutionFileIndex,
    timeEstimate,
    points,
    testCases
  ]);
  const draftRunSupported = DRAFT_RUN_SUPPORTED_FRAMEWORKS.has(testFramework);
  const hasVerifiedDraftRun = !!(
    draftRunResult?.success &&
    draftRunResult.testsRun > 0 &&
    draftRunResult.testsPassed === draftRunResult.testsRun
  );
  const hasDraftRunAttempt = !!draftRunResult;
  const hasPartialDraftPass = !!(
    draftRunResult &&
    draftRunResult.testsRun > 0 &&
    draftRunResult.testsPassed > 0 &&
    draftRunResult.testsPassed < draftRunResult.testsRun
  );
  const createBlockedReason = !solutionEnabled
    ? 'Enable a solution and run draft tests before creating the question.'
    : !draftRunSupported
    ? `Draft execution is not supported for ${testFramework}. Select a supported framework (Jest, Pytest, Playwright, JUnit).`
    : !hasVerifiedDraftRun
    ? 'Run Draft Tests (with Solution) and ensure all tests pass before creating the question.'
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const question = await createMutation.mutateAsync(payload);
      const params = new URLSearchParams();
      params.set('created', '1');
      if (draftRunResult?.success && draftRunResult.testsRun > 0 && draftRunResult.testsRun === draftRunResult.testsPassed) {
        params.set('draftVerified', '1');
      }
      navigate(`/questions/${question.id}?${params.toString()}`);
    } catch (error: any) {
      const backendError = error?.response?.data;
      const detailMsg = Array.isArray(backendError?.details)
        ? backendError.details.map((d: any) => `${d.field}: ${d.message}`).join('\n')
        : backendError?.error;
      alert(`Failed to create question${detailMsg ? `\n${detailMsg}` : ''}`);
    }
  };

  const runDraftTests = async () => {
    if (!draftRunSupported) {
      setDraftRunError(`Draft test execution is not supported for "${testFramework}" yet. Supported frameworks: Jest, Pytest, Playwright, JUnit. You can still author and save the question package.`);
      setDraftRunResult(null);
      return;
    }
    setDraftRunLoading(true);
    setDraftRunError(null);
    setDraftRunResult(null);
    try {
      const result = await questionService.runDraftTests({
        question: payload,
        useSolution: true
      });
      setDraftRunResult(result);
    } catch (error: any) {
      const backendError = error?.response?.data;
      const detailMsg = Array.isArray(backendError?.details)
        ? backendError.details.map((d: any) => `${d.field}: ${d.message}`).join('\n')
        : backendError?.error || error?.message;
      setDraftRunError(detailMsg || 'Failed to run draft tests');
    } finally {
      setDraftRunLoading(false);
    }
  };

  const copyRawOutputToClipboard = async () => {
    if (!draftRunResult?.output) return;
    try {
      await navigator.clipboard.writeText(draftRunResult.output);
      setRawOutputCopied(true);
      window.setTimeout(() => setRawOutputCopied(false), 1500);
    } catch {
      setDraftRunError('Unable to copy raw output to clipboard. Please copy manually.');
    }
  };

  const updateTestCase = (idx: number, patch: Partial<DraftTestCase>) => {
    setTestCases((prev) => prev.map((tc, i) => i === idx ? { ...tc, ...patch } : tc));
    setDraftRunResult(null);
  };

  const addTestCase = () => {
    setTestCases((prev) => [
      ...prev,
      {
        id: `tc_${String(prev.length + 1).padStart(3, '0')}`,
        name: `Test Case ${prev.length + 1}`,
        file: prev[0]?.file || 'tests/question.test.js',
        testName: `test_case_${prev.length + 1}`,
        points: 10,
        visible: prev.some((tc) => tc.visible) ? false : true,
        category: 'basic',
        description: '',
        testCode:
          testFramework === 'pytest'
            ? 'assert True'
            : testFramework === 'junit'
            ? 'assertTrue(true);'
            : testFramework === 'playwright'
            ? "await page.goto('http://localhost:3000');\nawait expect(page).toHaveTitle(/./);"
            : 'expect(true).toBe(true);'
      }
    ]);
    setDraftRunResult(null);
  };

  const removeTestCase = (idx: number) => {
    setTestCases((prev) => prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx));
    setDraftRunResult(null);
  };

  const handleDownloadTemplatePackage = async (frameworkChoice?: TestFramework) => {
    setDownloadingTemplate(true);
    setPackageImportError(null);
    setPackageImportInfo(null);

    try {
      const zip = new JSZip();
      const targetFramework = frameworkChoice || templateFrameworkChoice || testFramework;
      const targetCategory: QuestionCategory =
        frameworkChoice
          ? (targetFramework === 'playwright' || targetFramework === 'cypress'
              ? 'frontend'
              : targetFramework === 'pytest' || targetFramework === 'junit'
              ? 'backend'
              : category)
          : category;
      const defaultStarter = buildDefaultStarterCode(targetCategory, targetFramework);
      const defaultTestCase = buildDefaultTestCase(targetFramework, Math.max(10, points || 100));
      const language = inferLanguage(targetFramework);

      const starterFilesForTemplate = ((!frameworkChoice && starterFiles.length) ? starterFiles : (defaultStarter.files as any[]).map((f) => ({
        path: f.path,
        content: f.content,
        language
      }))) as DraftCodeFile[];

      const solutionFilesForTemplate = ((!frameworkChoice && solutionFiles.length) ? solutionFiles : [
        {
          path: starterFilesForTemplate[0]?.path || defaultStarter.files[0]?.path || 'solution.js',
          content:
            language === 'python'
              ? '# Reference solution\n'
              : language === 'java'
              ? 'public class Main {\n  // Reference solution\n}\n'
              : '// Reference solution\n',
          language
        }
      ]) as DraftCodeFile[];

      const testCasesForTemplate = ((!frameworkChoice && testCases.length) ? testCases : [defaultTestCase]).map((tc, index) => {
        const testCodePath = `tests/${tc.id || `tc_${String(index + 1).padStart(3, '0')}`}.${language === 'python' ? 'py' : language === 'java' ? 'java' : 'js'}`;
        return { tc, testCodePath };
      });

      for (const f of starterFilesForTemplate) {
        zip.file(`starter/${f.path}`, f.content ?? '');
      }
      for (const f of solutionFilesForTemplate) {
        zip.file(`solution/${f.path}`, f.content ?? '');
      }
      for (const { tc, testCodePath } of testCasesForTemplate) {
        zip.file(testCodePath, tc.testCode || (language === 'python' ? 'assert True\n' : language === 'java' ? 'assertTrue(true);' : 'expect(true).toBe(true);'));
      }

      const manifest: QuestionPackageManifest = {
        schemaVersion: QUESTION_PACKAGE_SCHEMA_VERSION,
        title: title.trim() || 'Sample Question Title',
        description:
          description.trim() ||
          'Describe the problem statement, constraints, expected behavior, and any input/output examples.',
        category: targetCategory,
        difficulty,
        testFramework: targetFramework,
        points: Math.max(10, Number(points) || 100),
        timeEstimate: Math.max(5, Number(timeEstimate) || 45),
        skills: parseCsvList(skillsInput),
        tags: parseCsvList(tagsInput),
        starterCode: {
          files: starterFilesForTemplate.map((f) => ({
            path: f.path,
            source: `starter/${f.path}`,
            language: f.language
          }))
        },
        solution: solutionEnabled
          ? {
              files: solutionFilesForTemplate.map((f) => ({
                path: f.path,
                source: `solution/${f.path}`,
                language: f.language
              }))
            }
          : { files: [] },
        testCases: testCasesForTemplate.map(({ tc, testCodePath }, index) => ({
          id: tc.id || `tc_${String(index + 1).padStart(3, '0')}`,
          name: tc.name || `Test Case ${index + 1}`,
          file: tc.file || defaultTestCase.file,
          testName: tc.testName || `test_case_${index + 1}`,
          points: Number(tc.points) || 0,
          visible: tc.visible ?? true,
          category: tc.category || 'basic',
          description: tc.description || '',
          testCodePath
        }))
      };

      zip.file('learnlytica-question.json', JSON.stringify(manifest, null, 2));
      zip.file('README.txt', [
        'Learnlytica Question Package Template',
        '',
        '1. Edit learnlytica-question.json metadata',
        '2. Update starter/ files (learner-visible)',
        '3. Update solution/ files (author-only)',
        '4. Update tests/*.js|py|java assertions referenced by testCodePath',
        '5. Upload ZIP in Question Authoring and run "Draft Tests (with Solution)"'
      ].join('\n'));

      const blob = await zip.generateAsync({ type: 'blob' });
      const safeTitle = (title.trim() || 'question-template').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const filename = `${safeTitle || 'question-template'}-${targetFramework}.zip`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setPackageImportInfo(`Downloaded template package: ${filename}`);
    } catch (err: any) {
      setPackageImportError(err?.message || 'Failed to generate template package ZIP');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleDownloadCompleteSamplePackage = async (frameworkChoice?: TestFramework) => {
    setDownloadingTemplate(true);
    setPackageImportError(null);
    setPackageImportInfo(null);
    try {
      const zip = new JSZip();
      const sampleFramework = frameworkChoice || completeSampleFrameworkChoice || 'jest';
      const isJs = sampleFramework === 'jest' || sampleFramework === 'playwright';
      const isPy = sampleFramework === 'pytest';
      const isJava = sampleFramework === 'junit';

      const starterPath = isPy ? 'solution.py' : isJava ? 'src/main/java/Solution.java' : 'solution.js';
      const testFile = isPy
        ? 'tests/test_solution.py'
        : isJava
        ? 'src/test/java/SolutionTest.java'
        : sampleFramework === 'playwright'
        ? 'tests/question.spec.js'
        : 'tests/sum.test.js';

      const starterCode = isPy
        ? "def sum_numbers(a, b):\n    # TODO: return the sum of two numbers\n    return 0\n"
        : isJava
        ? "public class Solution {\n    public static int sumNumbers(int a, int b) {\n        // TODO: return the sum of two numbers\n        return 0;\n    }\n}\n"
        : sampleFramework === 'playwright'
        ? "export function sum(a, b) {\n  // TODO: return the sum of two numbers\n  return 0;\n}\n"
        : "function sum(a, b) {\n  // TODO: return the sum of two numbers\n  return 0;\n}\n\nmodule.exports = { sum };\n";
      const solutionCode = isPy
        ? "def sum_numbers(a, b):\n    return a + b\n"
        : isJava
        ? "public class Solution {\n    public static int sumNumbers(int a, int b) {\n        return a + b;\n    }\n}\n"
        : sampleFramework === 'playwright'
        ? "export function sum(a, b) {\n  return a + b;\n}\n"
        : "function sum(a, b) {\n  return a + b;\n}\n\nmodule.exports = { sum };\n";

      const tc1 = isPy
        ? "from solution import sum_numbers\nassert sum_numbers(1, 2) == 3\n"
        : isJava
        ? "assertEquals(3, Solution.sumNumbers(1, 2));"
        : sampleFramework === 'playwright'
        ? "expect(solution.sum(1, 2)).toBe(3);"
        : "const { sum } = require('./solution');\nexpect(sum(1, 2)).toBe(3);";
      const tc2 = isPy
        ? "from solution import sum_numbers\nassert sum_numbers(-5, 2) == -3\n"
        : isJava
        ? "assertEquals(-3, Solution.sumNumbers(-5, 2));"
        : sampleFramework === 'playwright'
        ? "expect(solution.sum(-5, 2)).toBe(-3);"
        : "const { sum } = require('./solution');\nexpect(sum(-5, 2)).toBe(-3);";
      const tc3 = isPy
        ? "from solution import sum_numbers\nassert sum_numbers(0, 0) == 0\n"
        : isJava
        ? "assertEquals(0, Solution.sumNumbers(0, 0));"
        : sampleFramework === 'playwright'
        ? "expect(solution.sum(0, 0)).toBe(0);"
        : "const { sum } = require('./solution');\nexpect(sum(0, 0)).toBe(0);";

      zip.file(`starter/${starterPath}`, starterCode);
      zip.file(`solution/${starterPath}`, solutionCode);
      zip.file(`tests/tc_001.${isPy ? 'py' : isJava ? 'java' : 'js'}`, tc1);
      zip.file(`tests/tc_002.${isPy ? 'py' : isJava ? 'java' : 'js'}`, tc2);
      zip.file(`tests/tc_003.${isPy ? 'py' : isJava ? 'java' : 'js'}`, tc3);

      const manifest: QuestionPackageManifest = {
        schemaVersion: QUESTION_PACKAGE_SCHEMA_VERSION,
        title: sampleFramework === 'playwright' ? 'Implement sum() utility and verify basic flow' : 'Implement sum(a, b)',
        description: sampleFramework === 'playwright'
          ? 'Implement a simple `sum(a, b)` utility and validate the provided test assertions. This is a Playwright-compatible sample package for authoring flow validation.'
          : 'Implement a function that returns the sum of two numbers. Handle positive, negative, and zero values.',
        category: sampleFramework === 'playwright' ? 'frontend' : 'backend',
        difficulty: 'easy',
        testFramework: sampleFramework,
        points: 100,
        timeEstimate: 15,
        skills: isPy ? ['python', 'functions', 'unit-testing'] : isJava ? ['java', 'methods', 'unit-testing'] : ['javascript', 'functions', 'unit-testing'],
        tags: ['warmup', 'math', sampleFramework],
        starterCode: {
          files: [{ path: starterPath, source: `starter/${starterPath}`, language: isPy ? 'python' : isJava ? 'java' : 'javascript' }]
        },
        solution: {
          files: [{ path: starterPath, source: `solution/${starterPath}`, language: isPy ? 'python' : isJava ? 'java' : 'javascript' }]
        },
        testCases: [
          { id: 'tc_001', name: 'Adds positive integers', file: testFile, testName: isPy ? 'test_adds_positive_integers' : isJava ? 'addsPositiveIntegers' : 'adds positive integers', points: 40, visible: true, category: 'basic', testCodePath: `tests/tc_001.${isPy ? 'py' : isJava ? 'java' : 'js'}` },
          { id: 'tc_002', name: 'Adds negative and positive', file: testFile, testName: isPy ? 'test_adds_negative_and_positive' : isJava ? 'addsNegativeAndPositive' : 'adds negative and positive', points: 30, visible: true, category: 'edge', testCodePath: `tests/tc_002.${isPy ? 'py' : isJava ? 'java' : 'js'}` },
          { id: 'tc_003', name: 'Adds zeros', file: testFile, testName: isPy ? 'test_adds_zeros' : isJava ? 'addsZeros' : 'adds zeros', points: 30, visible: false, category: 'edge', testCodePath: `tests/tc_003.${isPy ? 'py' : isJava ? 'java' : 'js'}` }
        ]
      };

      zip.file('learnlytica-question.json', JSON.stringify(manifest, null, 2));
      zip.file('README.txt', 'Complete sample package: import this ZIP, run Draft Tests with Solution, then create the question.\n');

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `sample-${sampleFramework}-sum-question.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setPackageImportInfo(`Downloaded complete sample package: sample-${sampleFramework}-sum-question.zip`);
    } catch (err: any) {
      setPackageImportError(err?.message || 'Failed to generate complete sample package');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handlePackageDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setPackageImportError('Please drop a .zip file.');
      return;
    }
    await importQuestionPackageFile(file);
  };

  const applyImportedQuestionToAuthoring = (question: CreateQuestionDTO, validation?: any, importedLabel?: string) => {
    const nextFramework = question.testFramework;
    const nextCategory = question.category;
    setTitle(question.title || '');
    setDescription(question.description || '');
    setCategory(nextCategory);
    setDifficulty(question.difficulty as QuestionDifficulty);
    setTestFramework(nextFramework);
    setPoints(Number(question.points || 100));
    setTimeEstimate(Number(question.timeEstimate || 45));
    setSkillsInput(Array.isArray(question.skills) ? question.skills.join(', ') : '');
    setTagsInput(Array.isArray(question.tags) ? question.tags.join(', ') : '');
    setStarterFiles(
      (question.starterCode?.files || []).map((f: any) => ({
        path: f.path,
        content: f.content,
        language: (f.language as any) || inferLanguage(nextFramework)
      }))
    );
    setActiveStarterFileIndex(0);
    const nextSolutionFiles = (question.solution?.files || []).map((f: any) => ({
      path: f.path,
      content: f.content,
      language: (f.language as any) || inferLanguage(nextFramework)
    }));
    setSolutionEnabled(nextSolutionFiles.length > 0);
    setSolutionFiles(nextSolutionFiles.length ? nextSolutionFiles : [{
      path: question.starterCode?.files?.[0]?.path || 'solution.js',
      content: '',
      language: inferLanguage(nextFramework)
    }]);
    setActiveSolutionFileIndex(0);
    setTestCases(
      (question.testConfig?.testCases || []).map((tc: any, index: number) => ({
        id: tc.id || `tc_${String(index + 1).padStart(3, '0')}`,
        name: tc.name || `Test Case ${index + 1}`,
        file: tc.file || '',
        testName: tc.testName || '',
        points: Number(tc.points || 0),
        visible: !!tc.visible,
        category: tc.category || 'basic',
        description: tc.description || '',
        testCode: tc.testCode || ''
      }))
    );
    setServerPackageValidation(validation || null);
    if (importedLabel) setPackageImportInfo(importedLabel);
  };

  const importQuestionPackageFile = async (file: File) => {
    setImportingPackage(true);
    setPackageImportError(null);
    setPackageImportInfo(null);
    setServerPackageValidation(null);
    setDraftRunResult(null);
    setDraftRunError(null);

    try {
      const { question, validation } = await questionService.importQuestionPackageZip(file);
      applyImportedQuestionToAuthoring(
        question,
        validation,
        `Imported package (server parsed): ${file.name} • ${question.starterCode?.files?.length || 0} starter file(s), ${question.solution?.files?.length || 0} solution file(s), ${question.testConfig?.testCases?.length || 0} test case(s)`
      );
    } catch (err: any) {
      const backendError = err?.response?.data;
      const detailMsg = Array.isArray(backendError?.details)
        ? backendError.details.map((d: any) => `${d.field}: ${d.message}`).join('\n')
        : backendError?.error || backendError?.message || err?.message;
      setPackageImportError(detailMsg || 'Failed to import question package ZIP');
    } finally {
      setImportingPackage(false);
    }
  };

  const handleImportQuestionPackage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await importQuestionPackageFile(file);
    if (event.target) event.target.value = '';
  };

  const updateStarterFile = (idx: number, patch: Partial<DraftCodeFile>) => {
    setStarterFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
    setDraftRunResult(null);
  };

  const addStarterFile = () => {
    const language = inferLanguage(testFramework);
    setStarterFiles((prev) => [
      ...prev,
      {
        path: `src/file${prev.length + 1}${language === 'python' ? '.py' : language === 'java' ? '.java' : '.js'}`,
        content: '',
        language
      }
    ]);
    setActiveStarterFileIndex(starterFiles.length);
    setDraftRunResult(null);
  };

  const removeStarterFile = (idx: number) => {
    setStarterFiles((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
    setActiveStarterFileIndex((prev) => Math.max(0, Math.min(prev, Math.max(starterFiles.length - 2, 0))));
    setDraftRunResult(null);
  };

  const updateSolutionFile = (idx: number, patch: Partial<DraftCodeFile>) => {
    setSolutionFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
    setDraftRunResult(null);
  };

  const addSolutionFile = () => {
    const language = inferLanguage(testFramework);
    setSolutionFiles((prev) => [
      ...prev,
      {
        path: `src/solution${prev.length + 1}${language === 'python' ? '.py' : language === 'java' ? '.java' : '.js'}`,
        content: '',
        language
      }
    ]);
    setActiveSolutionFileIndex(solutionFiles.length);
    setDraftRunResult(null);
  };

  const removeSolutionFile = (idx: number) => {
    setSolutionFiles((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
    setActiveSolutionFileIndex((prev) => Math.max(0, Math.min(prev, Math.max(solutionFiles.length - 2, 0))));
    setDraftRunResult(null);
  };

  const activeStarterFile = starterFiles[activeStarterFileIndex] || starterFiles[0];
  const activeSolutionFile = solutionFiles[activeSolutionFileIndex] || solutionFiles[0];

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/questions')} className="btn-secondary !p-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold">Question Authoring</h1>
            <p className="text-sm text-gray-600 mt-1">
              Author full question artifacts (skills, tags, starter code, test cases, solution) and verify draft tests before publishing.
            </p>
          </div>
        </div>

        <div
          className={`card space-y-4 ${dragActive ? 'ring-2 ring-[var(--accent)]' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragActive(false);
          }}
          onDrop={handlePackageDrop}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl font-semibold">Import Question Package (ZIP)</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]">
                  Server Parsed
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]">
                  schemaVersion {QUESTION_PACKAGE_SCHEMA_VERSION}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1 max-w-3xl">
                Upload a structured ZIP package to populate all authoring artifacts (metadata, skills/tags, starter code, test cases, solution), then review and run draft tests.
              </p>
            </div>
          </div>

          <input
            ref={packageInputRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={handleImportQuestionPackage}
          />

          <div className={`rounded-xl border border-dashed p-5 md:p-6 ${dragActive ? 'border-[var(--accent)] bg-[var(--surface-3)]' : 'border-[var(--border)] bg-[var(--surface-2)]'}`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold">Import</div>
                <div className="text-xs text-gray-600 mt-1">
                  Drag and drop a question ZIP here, or upload it manually to populate authoring fields.
                </div>
                <div className="mt-2 text-xs text-[var(--text-muted)]">
                  Supported draft runners after import: Jest, Pytest, Playwright, JUnit
                </div>
              </div>
              <button
                type="button"
                className="btn-primary whitespace-nowrap"
                onClick={() => packageInputRef.current?.click()}
                disabled={importingPackage}
              >
                <Upload className="w-4 h-4" />
                {importingPackage ? 'Importing ZIP...' : 'Upload ZIP'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 space-y-3">
              <div>
                <div className="text-sm font-semibold">Template ZIP</div>
                <div className="text-xs text-gray-600 mt-1">
                  Download a clean package skeleton for the selected framework.
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  className="input-field sm:max-w-[220px]"
                  value={templateFrameworkChoice}
                  onChange={(e) => setTemplateFrameworkChoice(e.target.value as TestFramework)}
                >
                  <option value="jest">Jest</option>
                  <option value="pytest">Pytest</option>
                  <option value="playwright">Playwright</option>
                  <option value="junit">JUnit</option>
                </select>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleDownloadTemplatePackage(templateFrameworkChoice)}
                  disabled={downloadingTemplate}
                >
                  <Plus className="w-4 h-4" />
                  {downloadingTemplate ? 'Generating...' : 'Download Template ZIP'}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 space-y-3">
              <div>
                <div className="text-sm font-semibold">Complete Sample</div>
                <div className="text-xs text-gray-600 mt-1">
                  Download a ready package with starter code, solution, and test cases for quick validation.
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  className="input-field sm:max-w-[220px]"
                  value={completeSampleFrameworkChoice}
                  onChange={(e) => setCompleteSampleFrameworkChoice(e.target.value as TestFramework)}
                >
                  <option value="jest">Jest Sample</option>
                  <option value="pytest">Pytest Sample</option>
                  <option value="playwright">Playwright Sample</option>
                  <option value="junit">JUnit Sample</option>
                </select>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleDownloadCompleteSamplePackage(completeSampleFrameworkChoice)}
                  disabled={downloadingTemplate}
                >
                  <Play className="w-4 h-4" />
                  {downloadingTemplate ? 'Generating...' : 'Download Complete Sample'}
                </button>
              </div>
            </div>
          </div>

          <details className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm">
            <summary className="cursor-pointer font-semibold">Recommended ZIP Structure (all categories/frameworks)</summary>
            <pre className="mt-3 text-xs overflow-x-auto whitespace-pre-wrap"><code>{`my-question.zip
├─ learnlytica-question.json
├─ starter/
│  └─ ... learner-visible starter files
├─ solution/
│  └─ ... author-only reference solution files
└─ tests/
   └─ ... optional assertion snippets (referenced via testCodePath)`}</code></pre>
            <div className="mt-3 text-xs text-gray-600">
              Manifest supports inline or external test assertions. External assertions use <code>testCodePath</code> (for example <code>tests/tc_001.js</code>).
              Use <code>schemaVersion: {QUESTION_PACKAGE_SCHEMA_VERSION}</code> in the manifest.
            </div>
          </details>

          {packageImportInfo && <div className="ll-toast ok">{packageImportInfo}</div>}
          {packageImportError && <div className="ll-toast err whitespace-pre-wrap">{packageImportError}</div>}
          {serverPackageValidation?.summary && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm">
              <div className="font-semibold mb-2">Server Package Validation</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Metric label="Framework" value={String(serverPackageValidation.summary.framework)} />
                <Metric label="Category" value={String(serverPackageValidation.summary.category)} />
                <Metric label="Starter Files" value={String(serverPackageValidation.summary.starterFiles)} />
                <Metric label="Solution Files" value={String(serverPackageValidation.summary.solutionFiles)} />
                <Metric label="Test Cases" value={String(serverPackageValidation.summary.testCases)} />
                <Metric label="Passing" value={`${serverPackageValidation.summary.passingPoints}/${serverPackageValidation.summary.totalPoints}`} />
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-3 space-y-6">
            <div className="card space-y-4">
              <h2 className="text-xl font-semibold">Basic Information</h2>
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input className="input-field" required value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea className="input-field min-h-[140px]" required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the problem statement, constraints, and expectations..." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    className="input-field"
                    value={category}
                    onChange={(e) => {
                      const next = e.target.value as QuestionCategory;
                      setCategory(next);
                      syncFrameworkDefaults(testFramework, next, points);
                    }}
                  >
                    <option value="frontend">Frontend</option>
                    <option value="backend">Backend</option>
                    <option value="fullstack">Full-Stack</option>
                    <option value="database">Database</option>
                    <option value="devops">DevOps</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Difficulty</label>
                  <select className="input-field" value={difficulty} onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty)}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Test Framework</label>
                  <select
                    className="input-field"
                    value={testFramework}
                    onChange={(e) => {
                      const next = e.target.value as TestFramework;
                      setTestFramework(next);
                      syncFrameworkDefaults(next, category, points);
                    }}
                  >
                    <option value="playwright">Playwright</option>
                    <option value="jest">Jest</option>
                    <option value="pytest">Pytest</option>
                    <option value="junit">JUnit</option>
                    <option value="mocha">Mocha</option>
                    <option value="cypress">Cypress</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Points</label>
                  <input type="number" min={10} className="input-field" value={points} onChange={(e) => setPoints(parseInt(e.target.value || '100', 10))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Time Estimate (minutes)</label>
                  <input type="number" min={5} className="input-field" value={timeEstimate} onChange={(e) => setTimeEstimate(parseInt(e.target.value || '45', 10))} />
                </div>
              </div>
            </div>

            <div className="card space-y-4">
              <h2 className="text-xl font-semibold">Skills & Tags</h2>
              <div>
                <label className="block text-sm font-medium mb-1">Skills (comma separated)</label>
                <input className="input-field" value={skillsInput} onChange={(e) => setSkillsInput(e.target.value)} placeholder="react, hooks, state-management" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
                <input className="input-field" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="ui, forms, validation" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <div className="font-semibold mb-2">Skills Preview</div>
                  <div className="flex flex-wrap gap-2">
                    {parseCsvList(skillsInput).length ? parseCsvList(skillsInput).map((skill) => (
                      <span key={skill} className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">{skill}</span>
                    )) : <span className="text-gray-500">No skills added</span>}
                  </div>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <div className="font-semibold mb-2">Tags Preview</div>
                  <div className="flex flex-wrap gap-2">
                    {parseCsvList(tagsInput).length ? parseCsvList(tagsInput).map((tag) => (
                      <span key={tag} className="px-2 py-1 rounded-full bg-gray-200 text-gray-700">{tag}</span>
                    )) : <span className="text-gray-500">No tags added</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Starter Code</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Used for learner workspace initial file(s)</span>
                  <button type="button" className="btn-secondary" onClick={addStarterFile}>
                    <Plus className="w-4 h-4" /> File
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {starterFiles.map((file, idx) => (
                  <button
                    key={`${file.path}-${idx}`}
                    type="button"
                    className={`px-3 py-2 rounded-lg border text-xs ${idx === activeStarterFileIndex ? 'border-[var(--accent)] bg-[var(--surface-3)]' : 'border-[var(--border)] bg-[var(--surface-2)]'}`}
                    onClick={() => setActiveStarterFileIndex(idx)}
                  >
                    {file.path || `File ${idx + 1}`}
                  </button>
                ))}
              </div>
              {activeStarterFile && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">File Path</label>
                      <input
                        className="input-field"
                        value={activeStarterFile.path}
                        onChange={(e) => updateStarterFile(activeStarterFileIndex, { path: e.target.value })}
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => removeStarterFile(activeStarterFileIndex)}
                        disabled={starterFiles.length <= 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">File Content</label>
                    <div className="rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--surface)]">
                      <Editor
                        height="260px"
                        language={activeStarterFile.language}
                        theme={getMonacoTheme()}
                        value={activeStarterFile.content}
                        onChange={(value) => updateStarterFile(activeStarterFileIndex, { content: value ?? '' })}
                        options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: 'on', scrollBeyondLastLine: false, automaticLayout: true, fontFamily: 'JetBrains Mono, monospace' }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Test Cases</h2>
                <button type="button" className="btn-secondary" onClick={addTestCase}>
                  <Plus className="w-4 h-4" /> Add Test Case
                </button>
              </div>
              <div className="space-y-4">
                {testCases.map((tc, idx) => (
                  <div key={`${tc.id}-${idx}`} className="rounded-xl border border-[var(--border)] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">Test Case {idx + 1}</div>
                      <button type="button" className="btn-secondary" onClick={() => removeTestCase(idx)} disabled={testCases.length <= 1}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input className="input-field" placeholder="ID (e.g. tc_001)" value={tc.id} onChange={(e) => updateTestCase(idx, { id: e.target.value })} />
                      <input className="input-field" placeholder="Name" value={tc.name} onChange={(e) => updateTestCase(idx, { name: e.target.value })} />
                      <input className="input-field" placeholder="Test file path" value={tc.file} onChange={(e) => updateTestCase(idx, { file: e.target.value })} />
                      <input className="input-field" placeholder="Test name" value={tc.testName} onChange={(e) => updateTestCase(idx, { testName: e.target.value })} />
                      <input type="number" className="input-field" min={0} placeholder="Points" value={tc.points} onChange={(e) => updateTestCase(idx, { points: parseInt(e.target.value || '0', 10) })} />
                      <input className="input-field" placeholder="Category (basic, edge, performance)" value={tc.category || ''} onChange={(e) => updateTestCase(idx, { category: e.target.value })} />
                    </div>
                    <textarea className="input-field min-h-[70px]" placeholder="Optional test case description" value={tc.description || ''} onChange={(e) => updateTestCase(idx, { description: e.target.value })} />
                    <div>
                      <label className="block text-xs font-medium mb-1">Test Code (author-only assertions)</label>
                      <div className="rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--surface)]">
                        <Editor
                          height="150px"
                          language={testFramework === 'pytest' ? 'python' : testFramework === 'junit' ? 'java' : 'javascript'}
                          theme={getMonacoTheme()}
                          value={tc.testCode || ''}
                          onChange={(value) => updateTestCase(idx, { testCode: value ?? '' })}
                          options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on', scrollBeyondLastLine: false, automaticLayout: true, fontFamily: 'JetBrains Mono, monospace' }}
                        />
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={tc.visible} onChange={(e) => updateTestCase(idx, { visible: e.target.checked })} />
                      Visible to learner
                    </label>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm">
                <div>Total test-case points: <span className="font-semibold">{payload.testConfig.scoring.total}</span></div>
                <div>Passing threshold (auto): <span className="font-semibold">{payload.testConfig.scoring.passing}</span></div>
              </div>
            </div>

            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Solution (Author Only)</h2>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={solutionEnabled} onChange={(e) => setSolutionEnabled(e.target.checked)} />
                  Include solution
                </label>
              </div>
              <p className="text-xs text-gray-600">
                The solution is used for author validation and grading reference. It is hidden from learners/customer-facing preview after assignment.
              </p>
              {solutionEnabled && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      {solutionFiles.map((file, idx) => (
                        <button
                          key={`${file.path}-${idx}`}
                          type="button"
                          className={`px-3 py-2 rounded-lg border text-xs ${idx === activeSolutionFileIndex ? 'border-[var(--accent)] bg-[var(--surface-3)]' : 'border-[var(--border)] bg-[var(--surface-2)]'}`}
                          onClick={() => setActiveSolutionFileIndex(idx)}
                        >
                          {file.path || `Solution ${idx + 1}`}
                        </button>
                      ))}
                    </div>
                    <button type="button" className="btn-secondary" onClick={addSolutionFile}>
                      <Plus className="w-4 h-4" /> File
                    </button>
                  </div>
                  {activeSolutionFile && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Solution File Path</label>
                          <input
                            className="input-field"
                            value={activeSolutionFile.path}
                            onChange={(e) => updateSolutionFile(activeSolutionFileIndex, { path: e.target.value })}
                            placeholder="Write a reference solution to verify tests pass..."
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => removeSolutionFile(activeSolutionFileIndex)}
                            disabled={solutionFiles.length <= 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--surface)]">
                        <Editor
                          height="260px"
                          language={activeSolutionFile.language}
                          theme={getMonacoTheme()}
                          value={activeSolutionFile.content}
                          onChange={(value) => updateSolutionFile(activeSolutionFileIndex, { content: value ?? '' })}
                          options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: 'on', scrollBeyondLastLine: false, automaticLayout: true, fontFamily: 'JetBrains Mono, monospace' }}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <button type="button" className="btn-secondary" onClick={runDraftTests} disabled={draftRunLoading || !solutionEnabled || !draftRunSupported}>
                  <Play className="w-4 h-4" />
                  {draftRunLoading ? 'Running Draft Tests...' : 'Run Draft Tests (with Solution)'}
                </button>
                {!solutionEnabled && (
                  <span className="text-xs text-amber-700 self-center">Enable Solution to validate tests before saving.</span>
                )}
                {solutionEnabled && !draftRunSupported && (
                  <span className="text-xs text-amber-700 self-center">
                    Draft execution is template-only for {testFramework}. Supported draft runners: Jest, Pytest, Playwright, JUnit.
                  </span>
                )}
              </div>
              {draftRunError && <div className="ll-toast err whitespace-pre-wrap">{draftRunError}</div>}
              {draftRunResult && (
                <div className="rounded-xl border border-[var(--border)] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">Draft Test Result</div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${draftRunResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {draftRunResult.success ? 'PASSING' : 'FAILING'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <Metric label="Tests Run" value={String(draftRunResult.testsRun)} />
                    <Metric label="Passed" value={String(draftRunResult.testsPassed)} />
                    <Metric label="Points" value={`${draftRunResult.pointsEarned}/${draftRunResult.totalPoints}`} />
                    <Metric label="Exec Time" value={`${Math.round((draftRunResult.executionTime || 0))} ms`} />
                  </div>
                  {!hasVerifiedDraftRun && (
                    <div className="text-xs rounded-lg border border-amber-300/60 bg-amber-50 text-amber-800 px-3 py-2">
                      Create Question stays disabled until a real draft run executes and all tests pass.
                    </div>
                  )}
                  <div className="space-y-2">
                    {draftRunResult.results?.map((r, i) => (
                      <div key={`${r.name}-${i}`} className="rounded-lg border border-[var(--border)] p-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium">{r.name}</div>
                          <div className={r.passed ? 'text-green-600' : 'text-red-600'}>
                            {r.passed ? 'Passed' : 'Failed'} • {r.points} pts
                          </div>
                        </div>
                        {r.error && <div className="mt-1 text-xs text-red-600 whitespace-pre-wrap">{r.error}</div>}
                      </div>
                    ))}
                  </div>
                  {draftRunResult.output && (
                    <details>
                      <summary className="cursor-pointer text-sm font-medium">Raw Output</summary>
                      <div className="mt-2 flex items-center justify-end">
                        <button type="button" className="btn-secondary !py-1.5 !px-2.5 text-xs" onClick={copyRawOutputToClipboard}>
                          {rawOutputCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {rawOutputCopied ? 'Copied' : 'Copy Raw Output'}
                        </button>
                      </div>
                      <pre className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--surface-3)] text-[var(--text)] p-3 text-xs leading-5 overflow-x-auto whitespace-pre-wrap font-mono"><code>{draftRunResult.output}</code></pre>
                    </details>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                {hasVerifiedDraftRun ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/70 bg-emerald-50 text-emerald-800 px-3 py-1.5 text-xs font-semibold">
                    <Check className="w-3.5 h-3.5" />
                    Verified Draft Run • {String(testFramework).toUpperCase()} • {draftRunResult?.testsPassed}/{draftRunResult?.testsRun}
                  </div>
                ) : hasPartialDraftPass ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-amber-50 text-amber-800 px-3 py-1.5 text-xs font-semibold">
                    <Play className="w-3.5 h-3.5" />
                    Draft Run Partial • {String(testFramework).toUpperCase()} • {draftRunResult?.testsPassed}/{draftRunResult?.testsRun} passed
                  </div>
                ) : hasDraftRunAttempt ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-rose-300/70 bg-rose-50 text-rose-800 px-3 py-1.5 text-xs font-semibold">
                    <Play className="w-3.5 h-3.5" />
                    Draft Run Failed • {String(testFramework).toUpperCase()} • {draftRunResult?.testsPassed}/{draftRunResult?.testsRun}
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] px-3 py-1.5 text-xs">
                    <Play className="w-3.5 h-3.5" />
                    Run draft tests and pass all cases to enable creation
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-4">
              <button type="button" onClick={() => navigate('/questions')} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={createMutation.isPending || !!createBlockedReason} className="btn-primary" title={createBlockedReason || undefined}>
                {createMutation.isPending ? 'Creating...' : 'Create Question'}
              </button>
              </div>
            </div>
            {createBlockedReason && (
              <div className="text-xs text-[var(--text-muted)] text-right">
                {createBlockedReason}
              </div>
            )}
          </div>

          <div className="xl:col-span-2">
            <div className="sticky top-24 space-y-4">
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <Eye className="w-4 h-4 text-[var(--accent)]" />
                  <h2 className="text-lg font-semibold">Author Preview (Saved Card + Detail Artifacts)</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <Metric label="Points" value={String(payload.points || 0)} />
                  <Metric label="Time" value={`${payload.timeEstimate} min`} />
                  <Metric label="Framework" value={payload.testFramework} />
                  <Metric label="Test Cases" value={String(payload.testConfig.testCases.length)} />
                </div>
                <div className="mb-4">
                  <div className="text-sm font-semibold mb-1">{payload.title || 'Untitled Question'}</div>
                  <div className="text-xs text-gray-600 whitespace-pre-wrap">{payload.description || 'No description yet'}</div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <div className="text-sm font-semibold mb-2">Skills</div>
                    <div className="flex flex-wrap gap-2">
                      {payload.skills.length ? payload.skills.map((s) => (
                        <span key={s} className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs">{s}</span>
                      )) : <span className="text-xs text-gray-500">No skills</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold mb-2">Tags</div>
                    <div className="flex flex-wrap gap-2">
                      {payload.tags.length ? payload.tags.map((t) => (
                        <span key={t} className="px-2 py-1 rounded-full bg-gray-200 text-gray-700 text-xs">{t}</span>
                      )) : <span className="text-xs text-gray-500">No tags</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold mb-2">Test Cases ({payload.testConfig.testCases.length})</div>
                    <div className="space-y-2">
                      {payload.testConfig.testCases.map((tc, i) => (
                        <div key={tc.id} className="rounded-lg border border-[var(--border)] p-3">
                          <div className="flex justify-between gap-2 text-sm">
                            <div><span className="font-semibold">{i + 1}. {tc.name}</span>{tc.visible ? '' : ' (hidden)'}</div>
                            <div>{tc.points} pts</div>
                          </div>
                          <div className="text-xs text-gray-600 mt-1">{tc.file} • {tc.testName}</div>
                          {tc.description && <div className="text-xs text-gray-600 mt-1">{tc.description}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold mb-2">Starter Code ({payload.starterCode.files.length} file{payload.starterCode.files.length === 1 ? '' : 's'})</div>
                    <div className="space-y-2">
                      {payload.starterCode.files.map((f, idx) => (
                        <div key={`${f.path}-${idx}`} className="rounded-lg bg-gray-900 p-3">
                          <div className="text-xs text-gray-400 mb-2">{f.path}</div>
                          <pre className="text-xs text-gray-100 overflow-x-auto whitespace-pre-wrap"><code>{f.content}</code></pre>
                        </div>
                      ))}
                    </div>
                  </div>
                  {payload.solution && (
                    <div>
                      <div className="text-sm font-semibold mb-2">Solution (Author Only Preview)</div>
                      <div className="space-y-2">
                        <div className="rounded-lg bg-gray-900 p-3 border border-yellow-500/30">
                          <div className="text-xs text-yellow-300 mb-2">Hidden from learners after assignment</div>
                          <div className="text-xs text-gray-300">Author-only reference + validation artifact</div>
                        </div>
                        {payload.solution.files.map((f, idx) => (
                          <div key={`${f.path}-${idx}`} className="rounded-lg bg-gray-900 p-3 border border-yellow-500/20">
                            <div className="text-xs text-gray-400 mb-2">{f.path}</div>
                            <pre className="text-xs text-gray-100 overflow-x-auto whitespace-pre-wrap"><code>{f.content}</code></pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-semibold break-words">{value}</div>
    </div>
  );
}
