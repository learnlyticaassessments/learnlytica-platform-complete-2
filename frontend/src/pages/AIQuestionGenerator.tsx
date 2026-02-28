import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, Check, AlertCircle, Cpu, Star, TrendingUp, Wand2 } from 'lucide-react';
import { aiService, AI_PROVIDER_OPTIONS, AI_QUESTION_TYPE_OPTIONS, GenerateQuestionRequest } from '../services/aiService';

export function AIQuestionGenerator() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<GenerateQuestionRequest>({
    topic: '',
    language: 'javascript',
    difficulty: 'intermediate',
    questionType: 'algorithm',
    provider: 'claude',
    model: 'claude-sonnet-4-20250514',
    audienceType: 'fresher',
    targetMaturity: 'beginner',
    domain: ''
  });
  const [loading, setLoading] = useState(false);
  const [generatedQuestion, setGeneratedQuestion] = useState<any>(null);
  const [generationPipeline, setGenerationPipeline] = useState<any>(null);
  const [error, setError] = useState('');
  const [wizardEnabled, setWizardEnabled] = useState(true);
  const [wizardStep, setWizardStep] = useState(0);
  const [utilityLoading, setUtilityLoading] = useState<'tests' | 'improve' | 'review' | null>(null);
  const [utilityError, setUtilityError] = useState('');

  const [testGenCode, setTestGenCode] = useState('function solve(input) {\n  return input;\n}');
  const [testGenDescription, setTestGenDescription] = useState('');
  const [generatedTests, setGeneratedTests] = useState<any[] | null>(null);

  const [improveQuestionInput, setImproveQuestionInput] = useState('');
  const [improvementOutput, setImprovementOutput] = useState<any | null>(null);

  const [reviewCodeInput, setReviewCodeInput] = useState('function solve(input) {\n  return input;\n}');
  const [reviewQuestionInput, setReviewQuestionInput] = useState('{\n  "title": "Sample Question"\n}');
  const [reviewTestResultsInput, setReviewTestResultsInput] = useState('{\n  "testsPassed": 2,\n  "testsRun": 5,\n  "pointsEarned": 40,\n  "totalPoints": 100\n}');
  const [reviewOutput, setReviewOutput] = useState<any | null>(null);

  const statCards = [
    { label: 'Time Saved', value: '93%', icon: Cpu },
    { label: 'Quality', value: 'Perfect', icon: Star },
    { label: 'Cost', value: '$0.03', icon: TrendingUp }
  ];
  const wizardSteps = [
    'Audience Profile',
    'Domain & Curriculum',
    'Question Intent',
    'Execution Settings'
  ];

  useEffect(() => {
    if (!generatedQuestion) return;
    setImproveQuestionInput(JSON.stringify(generatedQuestion, null, 2));
    setReviewQuestionInput(JSON.stringify({ title: generatedQuestion.title || 'Generated Question' }, null, 2));
  }, [generatedQuestion]);

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
      setGenerationPipeline(response.pipeline || null);
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
      const tests = response?.data?.pipeline
        ? `${response.data.pipeline.testsPassed}/${response.data.pipeline.testsRun}`
        : '-';
      alert(`Question created successfully. Verification tests: ${tests}`);
      navigate(`/questions/${response.data.question.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create question');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTests = async () => {
    setUtilityLoading('tests');
    setUtilityError('');
    try {
      const response = await aiService.generateTests(
        testGenCode,
        formData.language,
        testGenDescription,
        formData.provider,
        formData.model
      );
      setGeneratedTests(response?.data || response || []);
    } catch (err: any) {
      setUtilityError(err.response?.data?.error || 'Failed to generate tests');
    } finally {
      setUtilityLoading(null);
    }
  };

  const handleImproveQuestion = async () => {
    setUtilityLoading('improve');
    setUtilityError('');
    try {
      const parsed = JSON.parse(improveQuestionInput);
      const response = await aiService.improveQuestion(parsed, formData.provider, formData.model);
      setImprovementOutput(response?.data || response || null);
    } catch (err: any) {
      setUtilityError(err?.message || err.response?.data?.error || 'Failed to improve question');
    } finally {
      setUtilityLoading(null);
    }
  };

  const handleReviewCode = async () => {
    setUtilityLoading('review');
    setUtilityError('');
    try {
      const parsedQuestion = JSON.parse(reviewQuestionInput);
      const parsedResults = JSON.parse(reviewTestResultsInput);
      const response = await aiService.reviewCode(
        reviewCodeInput,
        parsedResults,
        parsedQuestion,
        formData.provider,
        formData.model
      );
      setReviewOutput(response?.data || response || null);
    } catch (err: any) {
      setUtilityError(err?.message || err.response?.data?.error || 'Failed to review code');
    } finally {
      setUtilityLoading(null);
    }
  };

  const handleCurriculumUpload = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      setFormData((prev) => ({ ...prev, curriculumText: text.slice(0, 12000) }));
    } catch {
      setError('Failed to read curriculum file');
    }
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10 max-w-6xl mx-auto">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-6 sm:p-8 lg:p-10 text-white shadow-[0_30px_60px_rgba(99,102,241,0.28)]">
        <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-white/20 blur-3xl animate-pulse" />
        <div className="absolute top-8 right-6 h-32 w-32 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute bottom-4 left-1/3 h-24 w-24 rounded-full bg-fuchsia-200/20 blur-2xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide">
            <Sparkles className="h-3.5 w-3.5" />
            Powered by Claude / GPT
          </div>
          <div className="mt-4 flex items-start gap-3">
            <div className="h-12 w-12 shrink-0 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
              <Wand2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">AI Question Generator</h1>
              <p className="mt-3 max-w-3xl text-sm sm:text-base text-white/90 leading-relaxed">
                Generate perfect coding questions in 2 minutes. AI creates comprehensive test cases,
                starter code, hints, and examples automatically.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {statCards.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl border border-white/20 bg-white/12 backdrop-blur-md p-4 shadow-inner">
                <div className="flex items-center gap-2 text-white/90 text-sm font-medium">
                  <Icon className="w-4 h-4" />
                  {label}
                </div>
                <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">What question would you like to create?</h2>
            <p className="mt-1 text-sm text-slate-500">Be specific and let the AI generate tests, hints, and starter code.</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-purple-50 text-purple-700 px-3 py-1 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            AI-assisted authoring
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">
              Topic / Description *
            </label>
            <textarea
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              placeholder="E.g., Create a question about implementing binary search on a sorted array"
              className="w-full min-h-[120px] px-4 py-3 border border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition"
            />
            <p className="text-sm text-slate-500 mt-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              Be specific. The AI will generate comprehensive test coverage and starter code.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Guided AI Brief Wizard</div>
                <div className="text-xs text-slate-500">Step-by-step setup for better audience/domain-specific question quality.</div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={wizardEnabled}
                  onChange={(e) => setWizardEnabled(e.target.checked)}
                />
                Enable wizard
              </label>
            </div>

            {wizardEnabled && (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Step {wizardStep + 1} of {wizardSteps.length}</span>
                    <span>{wizardSteps[wizardStep]}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${((wizardStep + 1) / wizardSteps.length) * 100}%` }} />
                  </div>
                </div>

                {wizardStep === 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Audience</label>
                      <select
                        value={formData.audienceType || 'fresher'}
                        onChange={(e) => setFormData({ ...formData, audienceType: e.target.value as any })}
                        className="input-field"
                      >
                        <option value="fresher">Fresher</option>
                        <option value="experienced">Experienced</option>
                        <option value="mixed">Mixed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Experience Band</label>
                      <input
                        type="text"
                        value={formData.audienceExperience || ''}
                        onChange={(e) => setFormData({ ...formData, audienceExperience: e.target.value })}
                        placeholder="0-1 years / 3-5 years"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Target Maturity</label>
                      <select
                        value={formData.targetMaturity || 'beginner'}
                        onChange={(e) => setFormData({ ...formData, targetMaturity: e.target.value as any })}
                        className="input-field"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                        <option value="expert">Expert</option>
                      </select>
                    </div>
                  </div>
                )}

                {wizardStep === 1 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Domain</label>
                      <input
                        type="text"
                        value={formData.domain || ''}
                        onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                        placeholder="BFSI / Retail / Healthcare / Logistics"
                        className="input-field"
                      />
                      <label className="block text-sm font-semibold text-slate-700 mt-3 mb-2">Audience Notes</label>
                      <textarea
                        value={formData.audienceNotes || ''}
                        onChange={(e) => setFormData({ ...formData, audienceNotes: e.target.value })}
                        className="w-full min-h-[110px] px-4 py-3 border border-slate-300 rounded-xl bg-white text-slate-900"
                        placeholder="Expected rigor, project realism, role-specific expectations..."
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-semibold text-slate-700">Curriculum Context</label>
                        <label className="text-xs px-2 py-1 rounded bg-slate-100 border border-slate-200 cursor-pointer">
                          Upload
                          <input
                            type="file"
                            className="hidden"
                            accept=".txt,.md,.json,.csv"
                            onChange={(e) => handleCurriculumUpload(e.target.files?.[0] || null)}
                          />
                        </label>
                      </div>
                      <textarea
                        value={formData.curriculumText || ''}
                        onChange={(e) => setFormData({ ...formData, curriculumText: e.target.value })}
                        className="w-full min-h-[190px] px-4 py-3 border border-slate-300 rounded-xl bg-white text-slate-900"
                        placeholder="Paste curriculum modules, outcomes, and level expectations..."
                      />
                    </div>
                  </div>
                )}

                {wizardStep === 2 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Question Type</label>
                      <select
                        value={formData.questionType}
                        onChange={(e) => setFormData({ ...formData, questionType: e.target.value as any })}
                        className="input-field"
                      >
                        {AI_QUESTION_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Language</label>
                      <select
                        value={formData.language}
                        onChange={(e) => setFormData({ ...formData, language: e.target.value as any })}
                        className="input-field"
                      >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Difficulty</label>
                      <select
                        value={formData.difficulty}
                        onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                        className="input-field"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                  </div>
                )}

                {wizardStep === 3 && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Provider</label>
                      <select
                        value={formData.provider}
                        onChange={(e) => {
                          const nextProvider = e.target.value as GenerateQuestionRequest['provider'];
                          const opt = AI_PROVIDER_OPTIONS.find((o) => o.value === nextProvider);
                          setFormData({ ...formData, provider: nextProvider, model: opt?.defaultModel || formData.model });
                        }}
                        className="input-field"
                      >
                        {AI_PROVIDER_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Model</label>
                      <input
                        type="text"
                        value={formData.model || ''}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        className="input-field"
                        placeholder="Model id"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Points</label>
                      <input
                        type="number"
                        value={formData.points || ''}
                        onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || undefined })}
                        className="input-field"
                        placeholder="Auto"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Time Limit (min)</label>
                      <input
                        type="number"
                        value={formData.timeLimit || ''}
                        onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) || undefined })}
                        className="input-field"
                        placeholder="Auto"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setWizardStep((s) => Math.max(0, s - 1))}
                    disabled={wizardStep === 0}
                    className="btn-secondary disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardStep((s) => Math.min(wizardSteps.length - 1, s + 1))}
                    disabled={wizardStep === wizardSteps.length - 1}
                    className="btn-secondary disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          <details className="rounded-xl border border-slate-200 p-4" open={!wizardEnabled}>
            <summary className="cursor-pointer text-sm font-semibold text-slate-800">Audience + Domain + Curriculum Brief</summary>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Domain</label>
                <input
                  type="text"
                  value={formData.domain || ''}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  placeholder="e.g., BFSI, Retail, Healthcare"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Audience</label>
                <select
                  value={formData.audienceType || 'fresher'}
                  onChange={(e) => setFormData({ ...formData, audienceType: e.target.value as any })}
                  className="input-field"
                >
                  <option value="fresher">Fresher</option>
                  <option value="experienced">Experienced</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Experience Band</label>
                <input
                  type="text"
                  value={formData.audienceExperience || ''}
                  onChange={(e) => setFormData({ ...formData, audienceExperience: e.target.value })}
                  placeholder="e.g., 0-1 years, 3-5 years"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Target Maturity</label>
                <select
                  value={formData.targetMaturity || 'beginner'}
                  onChange={(e) => setFormData({ ...formData, targetMaturity: e.target.value as any })}
                  className="input-field"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Audience/Delivery Notes</label>
                <textarea
                  value={formData.audienceNotes || ''}
                  onChange={(e) => setFormData({ ...formData, audienceNotes: e.target.value })}
                  placeholder="Any constraints, focus areas, preferred style, expected rigor..."
                  className="w-full min-h-[110px] px-4 py-3 border border-slate-300 rounded-xl bg-white text-slate-900"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-slate-700">Curriculum Context</label>
                  <label className="text-xs px-2 py-1 rounded bg-slate-100 border border-slate-200 cursor-pointer">
                    Upload Curriculum
                    <input
                      type="file"
                      className="hidden"
                      accept=".txt,.md,.json,.csv"
                      onChange={(e) => handleCurriculumUpload(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
                <textarea
                  value={formData.curriculumText || ''}
                  onChange={(e) => setFormData({ ...formData, curriculumText: e.target.value })}
                  placeholder="Paste curriculum outline/modules/outcomes here..."
                  className="w-full min-h-[110px] px-4 py-3 border border-slate-300 rounded-xl bg-white text-slate-900"
                />
              </div>
            </div>
          </details>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Provider</label>
              <select
                value={formData.provider}
                onChange={(e) => {
                  const nextProvider = e.target.value as GenerateQuestionRequest['provider'];
                  const opt = AI_PROVIDER_OPTIONS.find((o) => o.value === nextProvider);
                  setFormData({
                    ...formData,
                    provider: nextProvider,
                    model: opt?.defaultModel || formData.model
                  });
                }}
                className="input-field"
              >
                {AI_PROVIDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Model</label>
              <input
                type="text"
                value={formData.model || ''}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="Model id"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Language</label>
              <select
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value as any })}
                className="input-field"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Difficulty</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                className="input-field"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Type</label>
              <select
                value={formData.questionType}
                onChange={(e) => setFormData({ ...formData, questionType: e.target.value as any })}
                className="input-field"
              >
                {AI_QUESTION_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs" style={{ color: 'var(--text-dim)' }}>
                {
                  AI_QUESTION_TYPE_OPTIONS.find((option) => option.value === formData.questionType)
                    ?.description
                }
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Points</label>
              <input
                type="number"
                value={formData.points || ''}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || undefined })}
                placeholder="Auto"
                className="input-field"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              onClick={handleGenerate}
              disabled={loading || !formData.topic}
              className="btn-ai flex items-center justify-center gap-2 min-h-[46px]"
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
                className="btn-secondary flex items-center justify-center gap-2 min-h-[46px]"
              >
                <Check className="w-5 h-5" />
                Create Question in Database
              </button>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {generationPipeline && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              Validation: <span className="font-semibold">{generationPipeline.validated ? 'Passed' : 'Failed'}</span>
              {' • '}
              Verification: <span className="font-semibold">{generationPipeline.verified ? 'Passed' : 'Failed'}</span>
              {' • '}
              Tests: <span className="font-semibold">{generationPipeline.testsPassed ?? 0}/{generationPipeline.testsRun ?? 0}</span>
            </div>
          )}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 mb-2">AI Utilities</h2>
        <p className="text-sm text-slate-500 mb-6">Use the same provider/model for test generation, question improvements, and code reviews.</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <h3 className="font-semibold text-slate-900">Generate Tests</h3>
            <textarea
              value={testGenCode}
              onChange={(e) => setTestGenCode(e.target.value)}
              className="w-full min-h-[140px] px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
              placeholder="Paste solution code..."
            />
            <textarea
              value={testGenDescription}
              onChange={(e) => setTestGenDescription(e.target.value)}
              className="w-full min-h-[80px] px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
              placeholder="Optional problem description..."
            />
            <button
              onClick={handleGenerateTests}
              disabled={utilityLoading !== null}
              className="btn-secondary w-full"
            >
              {utilityLoading === 'tests' ? 'Generating...' : 'Generate Tests'}
            </button>
            {generatedTests && (
              <pre className="text-xs bg-slate-900 text-slate-100 rounded-lg p-3 overflow-auto max-h-56">{JSON.stringify(generatedTests, null, 2)}</pre>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <h3 className="font-semibold text-slate-900">Improve Question</h3>
            <textarea
              value={improveQuestionInput}
              onChange={(e) => setImproveQuestionInput(e.target.value)}
              className="w-full min-h-[230px] px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
              placeholder="Paste question JSON..."
            />
            <button
              onClick={handleImproveQuestion}
              disabled={utilityLoading !== null}
              className="btn-secondary w-full"
            >
              {utilityLoading === 'improve' ? 'Improving...' : 'Improve Question'}
            </button>
            {improvementOutput && (
              <pre className="text-xs bg-slate-900 text-slate-100 rounded-lg p-3 overflow-auto max-h-56">{JSON.stringify(improvementOutput, null, 2)}</pre>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <h3 className="font-semibold text-slate-900">Review Code</h3>
            <textarea
              value={reviewCodeInput}
              onChange={(e) => setReviewCodeInput(e.target.value)}
              className="w-full min-h-[100px] px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
              placeholder="Paste student code..."
            />
            <textarea
              value={reviewQuestionInput}
              onChange={(e) => setReviewQuestionInput(e.target.value)}
              className="w-full min-h-[60px] px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
              placeholder="Question JSON"
            />
            <textarea
              value={reviewTestResultsInput}
              onChange={(e) => setReviewTestResultsInput(e.target.value)}
              className="w-full min-h-[60px] px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
              placeholder="Test results JSON"
            />
            <button
              onClick={handleReviewCode}
              disabled={utilityLoading !== null}
              className="btn-secondary w-full"
            >
              {utilityLoading === 'review' ? 'Reviewing...' : 'Review Code'}
            </button>
            {reviewOutput && (
              <pre className="text-xs bg-slate-900 text-slate-100 rounded-lg p-3 overflow-auto max-h-56">{JSON.stringify(reviewOutput, null, 2)}</pre>
            )}
          </div>
        </div>

        {utilityError && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{utilityError}</span>
          </div>
        )}
      </section>

      {generatedQuestion && (
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_12px_40px_rgba(15,23,42,0.08)] animate-[fadein_.3s_ease-out]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
            <div>
              <div className="text-sm font-semibold text-slate-500 mb-2">Generated Question (Preview)</div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{generatedQuestion.title}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                generatedQuestion.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                generatedQuestion.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {generatedQuestion.difficulty}
              </span>
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700">
                {generatedQuestion.points} points
              </span>
            </div>
          </div>

          <div className="mb-7">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-slate-900">Description</h3>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {generatedQuestion.description}
              </pre>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <h3 className="text-lg font-semibold text-slate-900">
                Test Cases ({generatedQuestion.testConfig?.testCases?.length || 0})
              </h3>
              <span className="text-xs sm:text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 font-medium">
                AI-generated comprehensive coverage
              </span>
            </div>
            <div className="space-y-2">
              {generatedQuestion.testConfig?.testCases?.map((tc: any, index: number) => (
                <div key={index} className="flex items-center justify-between gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100/70 transition">
                  <div className="flex items-center gap-3">
                    <span className="h-7 w-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="font-medium text-slate-800">{tc.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-emerald-700">{tc.points} pts</span>
                </div>
              ))}
            </div>
          </div>

          {generatedQuestion.starterCode && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Starter Code</h3>
              <div className="rounded-xl border border-slate-700 bg-slate-800 shadow-inner overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-700 text-xs text-slate-300 font-medium">starter-code</div>
                <pre className="text-sm overflow-x-auto p-4 text-slate-100 font-mono leading-6">
                  {generatedQuestion.starterCode.files?.[0]?.content}
                </pre>
              </div>
            </div>
          )}

          {generatedQuestion.hints && generatedQuestion.hints.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Hints</h3>
              <ul className="space-y-2">
                {generatedQuestion.hints.map((hint: string, index: number) => (
                  <li key={index} className="flex gap-3 rounded-lg border border-purple-100 bg-purple-50/70 p-3">
                    <span className="text-purple-700 font-bold shrink-0">{index + 1}.</span>
                    <span className="text-slate-700">{hint}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {generatedQuestion.tags && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {generatedQuestion.tags.map((tag: string, index: number) => (
                  <span key={index} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleCreateQuestion}
              disabled={loading}
              className="btn-ai flex items-center justify-center gap-2"
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
        </section>
      )}
    </div>
  );
}
