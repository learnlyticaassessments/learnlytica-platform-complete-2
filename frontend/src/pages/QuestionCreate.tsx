import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateQuestion } from '../hooks/useQuestions';
import { ArrowLeft } from 'lucide-react';
import type { CreateQuestionDTO } from '../../../backend/shared/types/question.types';

function buildDefaultStarterCode(category: CreateQuestionDTO['category'], framework: CreateQuestionDTO['testFramework']) {
  if (framework === 'junit') {
    return {
      files: [
        {
          path: 'src/Main.java',
          content:
            'public class Main {\n  // TODO: Implement solution\n  public static void main(String[] args) {\n    System.out.println("Hello");\n  }\n}\n',
          language: 'java'
        }
      ],
      dependencies: {},
      scripts: {}
    };
  }

  if (framework === 'pytest') {
    return {
      files: [
        {
          path: category === 'backend' ? 'app.py' : 'solution.py',
          content: '# TODO: Implement solution\n',
          language: 'python'
        }
      ],
      dependencies: {},
      scripts: {}
    };
  }

  return {
    files: [
      {
        path: category === 'frontend' ? 'src/index.js' : 'solution.js',
        content: '// TODO: Implement solution\n',
        language: 'javascript'
      }
    ],
    dependencies: {},
    scripts: framework === 'playwright'
      ? { test: 'playwright test' }
      : framework === 'cypress'
      ? { test: 'cypress run' }
      : framework === 'mocha'
      ? { test: 'mocha' }
      : { test: 'jest' }
  };
}

function buildDefaultTestConfig(
  framework: CreateQuestionDTO['testFramework'],
  points: number
): CreateQuestionDTO['testConfig'] {
  const safePoints = Number.isFinite(points) && points > 0 ? points : 100;
  const passing = Math.max(1, Math.ceil(safePoints * 0.6));

  if (framework === 'pytest') {
    return {
      framework,
      version: 'latest',
      environment: { python: '3.11' },
      setup: { commands: ['pip install pytest'], timeout: 120000 },
      execution: { command: 'pytest -q', timeout: 300000 },
      testCases: [
        {
          id: 'tc_001',
          name: 'Basic correctness',
          file: 'tests/test_solution.py',
          testName: 'test_basic_correctness',
          points: safePoints,
          visible: true,
          category: 'basic'
        }
      ],
      scoring: { total: safePoints, passing }
    };
  }

  if (framework === 'junit') {
    return {
      framework,
      version: '5',
      environment: { java: '17' },
      setup: { commands: ['echo "JUnit setup handled by executor"'], timeout: 120000 },
      execution: { command: 'mvn test', timeout: 300000 },
      testCases: [
        {
          id: 'tc_001',
          name: 'Basic correctness',
          file: 'src/test/java/MainTest.java',
          testName: 'basicCorrectness',
          points: safePoints,
          visible: true,
          category: 'basic'
        }
      ],
      scoring: { total: safePoints, passing }
    };
  }

  if (framework === 'playwright') {
    return {
      framework,
      version: 'latest',
      environment: { node: '20', runtime: 'browser' },
      setup: { commands: ['npm install'], timeout: 120000 },
      execution: { command: 'npx playwright test', timeout: 300000 },
      testCases: [
        {
          id: 'tc_001',
          name: 'Renders and basic interaction',
          file: 'tests/question.spec.ts',
          testName: 'basic flow works',
          points: safePoints,
          visible: true,
          category: 'basic'
        }
      ],
      scoring: { total: safePoints, passing }
    };
  }

  if (framework === 'mocha') {
    return {
      framework,
      version: 'latest',
      environment: { node: '20' },
      setup: { commands: ['npm install'], timeout: 120000 },
      execution: { command: 'npx mocha', timeout: 300000 },
      testCases: [
        {
          id: 'tc_001',
          name: 'Basic correctness',
          file: 'test/question.spec.js',
          testName: 'should pass basic case',
          points: safePoints,
          visible: true,
          category: 'basic'
        }
      ],
      scoring: { total: safePoints, passing }
    };
  }

  if (framework === 'cypress') {
    return {
      framework,
      version: 'latest',
      environment: { node: '20', runtime: 'browser' },
      setup: { commands: ['npm install'], timeout: 120000 },
      execution: { command: 'npx cypress run', timeout: 300000 },
      testCases: [
        {
          id: 'tc_001',
          name: 'Basic UI flow',
          file: 'cypress/e2e/question.cy.js',
          testName: 'basic flow',
          points: safePoints,
          visible: true,
          category: 'basic'
        }
      ],
      scoring: { total: safePoints, passing }
    };
  }

  return {
    framework: 'jest',
    version: 'latest',
    environment: { node: '20' },
    setup: { commands: ['npm install'], timeout: 120000 },
    execution: { command: 'npx jest --runInBand', timeout: 300000 },
    testCases: [
      {
        id: 'tc_001',
        name: 'Basic correctness',
        file: 'tests/question.test.js',
        testName: 'basic correctness',
        points: safePoints,
        visible: true,
        category: 'basic'
      }
    ],
    scoring: { total: safePoints, passing }
  };
}

export function QuestionCreate() {
  const navigate = useNavigate();
  const createMutation = useCreateQuestion();
  const [formData, setFormData] = useState<Partial<CreateQuestionDTO>>({
    category: 'frontend',
    difficulty: 'medium',
    testFramework: 'playwright',
    skills: [],
    tags: [],
    points: 100,
    timeEstimate: 45
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const points = typeof formData.points === 'number' ? formData.points : 100;
      const framework = (formData.testFramework || 'playwright') as CreateQuestionDTO['testFramework'];
      const category = (formData.category || 'frontend') as CreateQuestionDTO['category'];

      const payload: CreateQuestionDTO = {
        title: (formData.title || '').trim(),
        description: (formData.description || '').trim(),
        category,
        subcategory: formData.subcategory || [],
        difficulty: (formData.difficulty || 'medium') as CreateQuestionDTO['difficulty'],
        skills: formData.skills || [],
        tags: formData.tags || [],
        starterCode: formData.starterCode || buildDefaultStarterCode(category, framework),
        testFramework: framework,
        testConfig: formData.testConfig || buildDefaultTestConfig(framework, points),
        solution: formData.solution,
        timeEstimate: typeof formData.timeEstimate === 'number' ? formData.timeEstimate : 45,
        points
      };

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

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/questions')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold">Create Question</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  required
                  rows={6}
                  className="input-field"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Supports Markdown..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    required
                    className="input-field"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  >
                    <option value="frontend">Frontend</option>
                    <option value="backend">Backend</option>
                    <option value="fullstack">Full-Stack</option>
                    <option value="database">Database</option>
                    <option value="devops">DevOps</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                  <select
                    required
                    className="input-field"
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test Framework</label>
                  <select
                    required
                    className="input-field"
                    value={formData.testFramework}
                    onChange={(e) => setFormData({ ...formData, testFramework: e.target.value as any })}
                  >
                    <option value="playwright">Playwright</option>
                    <option value="jest">Jest</option>
                    <option value="pytest">Pytest</option>
                    <option value="junit">JUnit</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                  <input
                    type="number"
                    required
                    min="10"
                    className="input-field"
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Estimate (minutes)</label>
                  <input
                    type="number"
                    required
                    min="5"
                    className="input-field"
                    value={formData.timeEstimate}
                    onChange={(e) => setFormData({ ...formData, timeEstimate: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/questions')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn-primary disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
