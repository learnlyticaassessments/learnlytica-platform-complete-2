import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateAssessment } from '../../hooks/useAssessments';
import { useLabTemplates } from '../../hooks/useAssessments';
import { useQuestions } from '../../hooks/useQuestions';
import { ArrowLeft } from 'lucide-react';

export function AssessmentCreate() {
  const navigate = useNavigate();
  const createMutation = useCreateAssessment();
  const { data: labTemplatesData } = useLabTemplates({ isActive: true });
  const { data: questionsData } = useQuestions({ status: 'published' });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    labTemplateId: '',
    timeLimitMinutes: 120,
    passingScore: 70,
    maxAttempts: 3,
    selectedQuestions: [] as string[]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const questions = formData.selectedQuestions.map((qId, index) => ({
        questionId: qId,
        orderIndex: index + 1
      }));

      await createMutation.mutateAsync({
        ...formData,
        questions
      });
      navigate('/assessments');
    } catch (error) {
      alert('Failed to create assessment');
    }
  };

  const labTemplates = labTemplatesData?.data || [];
  const questions = questionsData?.questions || [];

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/assessments')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold">Create Assessment</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  rows={4}
                  className="input-field"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Lab Environment</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Select Lab Template</label>
              <select
                required
                className="input-field"
                value={formData.labTemplateId}
                onChange={(e) => setFormData({ ...formData, labTemplateId: e.target.value })}
              >
                <option value="">Choose a template...</option>
                {labTemplates.map((template: any) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.category})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Questions</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {questions.map((question: any) => (
                <label key={question.id} className="flex items-center p-3 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    className="mr-3"
                    checked={formData.selectedQuestions.includes(question.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, selectedQuestions: [...formData.selectedQuestions, question.id] });
                      } else {
                        setFormData({ ...formData, selectedQuestions: formData.selectedQuestions.filter(id => id !== question.id) });
                      }
                    }}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{question.title}</div>
                    <div className="text-sm text-gray-600">{question.points} pts · {question.category}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Settings</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Time Limit (minutes)</label>
                <input
                  type="number"
                  min="5"
                  className="input-field"
                  value={formData.timeLimitMinutes}
                  onChange={(e) => setFormData({ ...formData, timeLimitMinutes: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Passing Score (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="input-field"
                  value={formData.passingScore}
                  onChange={(e) => setFormData({ ...formData, passingScore: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Attempts</label>
                <input
                  type="number"
                  min="1"
                  className="input-field"
                  value={formData.maxAttempts}
                  onChange={(e) => setFormData({ ...formData, maxAttempts: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button type="button" onClick={() => navigate('/assessments')} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Creating...' : 'Create Assessment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
