import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateQuestion } from '../hooks/useQuestions';
import { ArrowLeft } from 'lucide-react';
import type { CreateQuestionDTO } from '../../../backend/shared/types/question.types';

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
      const question = await createMutation.mutateAsync(formData as CreateQuestionDTO);
      navigate(`/questions/${question.id}`);
    } catch (error) {
      alert('Failed to create question');
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
