import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, Check, AlertCircle } from 'lucide-react';
import { aiService, GenerateQuestionRequest } from '../services/aiService';

export function AIQuestionGenerator() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<GenerateQuestionRequest>({
    topic: '',
    language: 'javascript',
    difficulty: 'intermediate',
    questionType: 'algorithm'
  });
  const [loading, setLoading] = useState(false);
  const [generatedQuestion, setGeneratedQuestion] = useState<any>(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!formData.topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await aiService.generateQuestion(formData);
      setGeneratedQuestion(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate question');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuestion = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await aiService.generateAndCreate(formData);
      alert('Question created successfully!');
      navigate(`/questions/${response.data.question.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold">AI Question Generator</h1>
        </div>
        <p className="text-gray-600">
          Generate complete programming questions with AI in 2 minutes ⚡
        </p>
      </div>

      {/* Form */}
      <div className="card mb-6">
        <h2 className="text-xl font-semibold mb-4">What question would you like to create?</h2>
        
        <div className="space-y-4">
          {/* Topic */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Topic / Description *
            </label>
            <textarea
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              placeholder="E.g., Create a question about implementing binary search on a sorted array"
              className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">
              Be specific! The AI will generate a complete question with test cases based on your description.
            </p>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Language */}
            <div>
              <label className="block text-sm font-medium mb-2">Language</label>
              <select
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value as any })}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-medium mb-2">Difficulty</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Question Type */}
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                value={formData.questionType}
                onChange={(e) => setFormData({ ...formData, questionType: e.target.value as any })}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="algorithm">Algorithm</option>
                <option value="api">API Development</option>
                <option value="component">UI Component</option>
                <option value="database">Database</option>
                <option value="fullstack">Full-Stack</option>
              </select>
            </div>

            {/* Points (optional) */}
            <div>
              <label className="block text-sm font-medium mb-2">Points (optional)</label>
              <input
                type="number"
                value={formData.points || ''}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || undefined })}
                placeholder="Auto"
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex gap-4">
            <button
              onClick={handleGenerate}
              disabled={loading || !formData.topic}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Question with AI
                </>
              )}
            </button>

            {generatedQuestion && (
              <button
                onClick={handleCreateQuestion}
                className="btn-secondary flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                Create Question in Database
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Preview Generated Question */}
      {generatedQuestion && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">{generatedQuestion.title}</h2>
            <div className="flex gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                generatedQuestion.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                generatedQuestion.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {generatedQuestion.difficulty}
              </span>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                {generatedQuestion.points} points
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="prose max-w-none mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm">
                {generatedQuestion.description}
              </pre>
            </div>
          </div>

          {/* Test Cases */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">
              Generated Test Cases ({generatedQuestion.testConfig?.testCases?.length || 0})
            </h3>
            <div className="space-y-2">
              {generatedQuestion.testConfig?.testCases?.map((tc: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="font-medium">{tc.name}</span>
                  </div>
                  <span className="text-sm text-gray-600">{tc.points} points</span>
                </div>
              ))}
            </div>
          </div>

          {/* Starter Code */}
          {generatedQuestion.starterCode && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Starter Code</h3>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
                <pre className="text-sm overflow-x-auto">
                  {generatedQuestion.starterCode.files?.[0]?.content}
                </pre>
              </div>
            </div>
          )}

          {/* Hints */}
          {generatedQuestion.hints && generatedQuestion.hints.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Hints</h3>
              <ul className="space-y-2">
                {generatedQuestion.hints.map((hint: string, index: number) => (
                  <li key={index} className="flex gap-2">
                    <span className="text-purple-600 font-bold">{index + 1}.</span>
                    <span>{hint}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tags */}
          {generatedQuestion.tags && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {generatedQuestion.tags.map((tag: string, index: number) => (
                  <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-4">
            <button
              onClick={handleCreateQuestion}
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Create This Question
                </>
              )}
            </button>
            <button
              onClick={() => setGeneratedQuestion(null)}
              className="btn-secondary"
            >
              Discard & Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
