import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, Play, Plus, Trash2 } from 'lucide-react';
import Editor from '@monaco-editor/react';
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

function getMonacoTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'vs-dark' : 'vs';
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
    base.execution.command = framework === 'supertest' ? 'npx jest --runInBand' : 'npx jest --runInBand';
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

export function QuestionCreate() {
  const navigate = useNavigate();
  const createMutation = useCreateQuestion();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const question = await createMutation.mutateAsync(payload);
      navigate(`/questions/${question.id}`);
    } catch (error: any) {
      const backendError = error?.response?.data;
      const detailMsg = Array.isArray(backendError?.details)
        ? backendError.details.map((d: any) => `${d.field}: ${d.message}`).join('\n')
        : backendError?.error;
      alert(`Failed to create question${detailMsg ? `\n${detailMsg}` : ''}`);
    }
  };

  const runDraftTests = async () => {
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
                    <div className="rounded-lg overflow-hidden border border-[var(--border)]">
                      <Editor
                        height="260px"
                        language={activeStarterFile.language}
                        theme={getMonacoTheme()}
                        value={activeStarterFile.content}
                        onChange={(value) => updateStarterFile(activeStarterFileIndex, { content: value ?? '' })}
                        options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on', scrollBeyondLastLine: false }}
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
                      <div className="rounded-lg overflow-hidden border border-[var(--border)]">
                        <Editor
                          height="150px"
                          language={testFramework === 'pytest' ? 'python' : testFramework === 'junit' ? 'java' : 'javascript'}
                          theme={getMonacoTheme()}
                          value={tc.testCode || ''}
                          onChange={(value) => updateTestCase(idx, { testCode: value ?? '' })}
                          options={{ minimap: { enabled: false }, fontSize: 12, wordWrap: 'on', scrollBeyondLastLine: false }}
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
                      <div className="rounded-lg overflow-hidden border border-[var(--border)]">
                        <Editor
                          height="260px"
                          language={activeSolutionFile.language}
                          theme={getMonacoTheme()}
                          value={activeSolutionFile.content}
                          onChange={(value) => updateSolutionFile(activeSolutionFileIndex, { content: value ?? '' })}
                          options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on', scrollBeyondLastLine: false }}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <button type="button" className="btn-secondary" onClick={runDraftTests} disabled={draftRunLoading || !solutionEnabled}>
                  <Play className="w-4 h-4" />
                  {draftRunLoading ? 'Running Draft Tests...' : 'Run Draft Tests (with Solution)'}
                </button>
                {!solutionEnabled && (
                  <span className="text-xs text-amber-700 self-center">Enable Solution to validate tests before saving.</span>
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
                      <pre className="mt-2 rounded-lg bg-gray-900 text-gray-100 p-3 text-xs overflow-x-auto"><code>{draftRunResult.output}</code></pre>
                    </details>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-4">
              <button type="button" onClick={() => navigate('/questions')} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                {createMutation.isPending ? 'Creating...' : 'Create Question'}
              </button>
            </div>
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
