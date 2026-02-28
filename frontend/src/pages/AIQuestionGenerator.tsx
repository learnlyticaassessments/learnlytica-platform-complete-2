import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, Check, AlertCircle, Cpu, Star, TrendingUp, Wand2 } from 'lucide-react';
import { aiService, AI_PROVIDER_OPTIONS, AI_QUESTION_TYPE_OPTIONS, GenerateQuestionRequest } from '../services/aiService';
import JSZip from 'jszip';

export function AIQuestionGenerator() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<GenerateQuestionRequest>({
    topic: '',
    language: 'javascript',
    difficulty: 'intermediate',
    problemStyle: 'scenario_driven',
    questionType: 'algorithm',
    questionCount: 1,
    questionTypeMode: 'single',
    mixedQuestionTypes: [],
    provider: 'claude',
    model: 'claude-sonnet-4-20250514',
    audienceType: 'fresher',
    targetMaturity: 'beginner',
    domain: '',
    rubric: {
      basicWeight: 40,
      edgeWeight: 25,
      negativeWeight: 20,
      performanceWeight: 15,
      hiddenTestPercent: 35,
      passingPercent: 60
    }
  });
  const [loading, setLoading] = useState(false);
  const [atomicLoading, setAtomicLoading] = useState(false);
  const [generatedQuestion, setGeneratedQuestion] = useState<any>(null);
  const [generationPipeline, setGenerationPipeline] = useState<any>(null);
  const [error, setError] = useState('');
  const [wizardEnabled, setWizardEnabled] = useState(true);
  const [wizardStep, setWizardStep] = useState(0);
  const [utilityLoading, setUtilityLoading] = useState<'tests' | 'improve' | 'review' | null>(null);
  const [utilityError, setUtilityError] = useState('');
  const [showAdvancedUtilities, setShowAdvancedUtilities] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [customQuestionTypeInput, setCustomQuestionTypeInput] = useState('');
  const [customQuestionTypes, setCustomQuestionTypes] = useState<string[]>([]);
  const [batchGenerationSummary, setBatchGenerationSummary] = useState('');

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
  const problemStyleOptions: Array<{ value: NonNullable<GenerateQuestionRequest['problemStyle']>; label: string; description: string }> = [
    { value: 'algorithmic', label: 'Algorithmic', description: 'Logic-first coding with clear input/output constraints.' },
    { value: 'scenario_driven', label: 'Scenario Driven', description: 'Business/context-led case study flow.' },
    { value: 'debugging', label: 'Debugging', description: 'Identify root cause and fix defects safely.' },
    { value: 'implementation', label: 'Implementation', description: 'Build feature from requirements/spec.' },
    { value: 'optimization', label: 'Optimization', description: 'Improve performance/resource efficiency.' },
    { value: 'design_tradeoff', label: 'Design Tradeoff', description: 'Choose architecture with explicit tradeoffs.' }
  ];

  const curriculumHaystack = `${formData.curriculumText || ''} ${formData.domain || ''} ${formData.topic || ''}`.toLowerCase();

  const languageOptions = useMemo(() => {
    const supported = [
      { value: 'javascript' as const, label: 'JavaScript', supported: true },
      { value: 'python' as const, label: 'Python', supported: true },
      { value: 'java' as const, label: 'Java', supported: true }
    ];
    const detected: Array<{ value: string; label: string; supported: boolean }> = [];
    const pushDetected = (value: string, label: string) => {
      if (!detected.some((d) => d.value === value)) {
        detected.push({ value, label, supported: false });
      }
    };

    if (/\bc\+\+|cpp|g\+\+/.test(curriculumHaystack)) pushDetected('cpp', 'C++');
    if (/\bc#|dotnet|asp\.net/.test(curriculumHaystack)) pushDetected('csharp', 'C#');
    if (/\bgo\b|golang/.test(curriculumHaystack)) pushDetected('go', 'Go');
    if (/\bphp\b|laravel/.test(curriculumHaystack)) pushDetected('php', 'PHP');
    if (/\bruby\b|rails/.test(curriculumHaystack)) pushDetected('ruby', 'Ruby');
    if (/\bkotlin\b/.test(curriculumHaystack)) pushDetected('kotlin', 'Kotlin');
    if (/\bswift\b/.test(curriculumHaystack)) pushDetected('swift', 'Swift');

    return [...supported, ...detected];
  }, [curriculumHaystack]);

  const unsupportedLanguagesDetected = useMemo(
    () => languageOptions.filter((l) => !l.supported).map((l) => l.label),
    [languageOptions]
  );

  const detectedQuestionTypeCandidates = useMemo(() => {
    const candidates: Array<{ value: string; label: string; description: string }> = [];
    const push = (value: string, label: string, description: string) => {
      if (!candidates.some((c) => c.value === value)) candidates.push({ value, label, description });
    };

    if (/devops|ci\/cd|deployment|container|docker|kubernetes/.test(curriculumHaystack)) {
      push('devops', 'DevOps Workflow', 'Build pipelines, deployment automation, and release workflows.');
    }
    if (/observability|logging|monitoring|metrics|tracing/.test(curriculumHaystack)) {
      push('observability', 'Observability', 'Instrumentation, dashboards, logs, and operational diagnostics.');
    }
    if (/messaging|kafka|rabbitmq|queue|event/.test(curriculumHaystack)) {
      push('event-driven', 'Event-Driven Systems', 'Asynchronous messaging, queues, and event contracts.');
    }
    if (/ml|machine learning|model|inference|feature/.test(curriculumHaystack)) {
      push('ml-engineering', 'ML Engineering', 'Model-serving, data preparation, and inference reliability.');
    }

    return candidates;
  }, [curriculumHaystack]);

  const questionTypeOptions = useMemo(() => {
    const fromCustom = customQuestionTypes.map((value) => ({
      value,
      label: value.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      description: 'Custom type inferred from curriculum or author input.'
    }));
    const merged = [...AI_QUESTION_TYPE_OPTIONS, ...detectedQuestionTypeCandidates, ...fromCustom];
    if (formData.questionType && !merged.some((o) => o.value === formData.questionType)) {
      merged.push({
        value: formData.questionType,
        label: formData.questionType.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        description: 'Custom type inferred from curriculum or author input.'
      });
    }
    return merged.filter((opt, idx) => merged.findIndex((m) => m.value === opt.value) === idx);
  }, [customQuestionTypes, detectedQuestionTypeCandidates, formData.questionType]);

  const curriculumSuggestions = useMemo(() => {
    const haystack = curriculumHaystack;
    let language: GenerateQuestionRequest['language'] = formData.language;
    let questionType: GenerateQuestionRequest['questionType'] = formData.questionType;
    let problemStyle: NonNullable<GenerateQuestionRequest['problemStyle']> = formData.problemStyle || 'implementation';

    if (/\bjava\b|spring|junit|maven|gradle/.test(haystack)) language = 'java';
    else if (/\bpython\b|pytest|pandas|numpy|fastapi|django/.test(haystack)) language = 'python';
    else if (/javascript|react|angular|node|jest|playwright|frontend/.test(haystack)) language = 'javascript';

    if (/security|owasp|xss|csrf|injection|auth/.test(haystack)) questionType = 'security';
    else if (/performance|latency|throughput|optimi[sz]e|scale/.test(haystack)) questionType = 'performance';
    else if (/debug|bug|defect|incident|root cause/.test(haystack)) questionType = 'debugging';
    else if (/test|qa|coverage|assert/.test(haystack)) questionType = 'testing';
    else if (/system design|architecture|distributed|microservice/.test(haystack)) questionType = 'system-design';
    else if (/sql|database|schema|query/.test(haystack)) questionType = 'database';
    else if (/component|ui|ux|react|angular/.test(haystack)) questionType = 'component';
    else if (/api|endpoint|rest|http/.test(haystack)) questionType = 'api';

    if (/scenario|case study|business flow|portal|workflow/.test(haystack)) problemStyle = 'scenario_driven';
    else if (/algorithm|dsa|array|string|tree|graph|complexity/.test(haystack)) problemStyle = 'algorithmic';
    else if (/debug|bug|incident|root cause|defect/.test(haystack)) problemStyle = 'debugging';
    else if (/performance|latency|throughput|optimi[sz]e|scale/.test(haystack)) problemStyle = 'optimization';
    else if (/design|architecture|tradeoff|microservice|distributed/.test(haystack)) problemStyle = 'design_tradeoff';
    else if (/build|implement|feature|develop/.test(haystack)) problemStyle = 'implementation';

    return { language, questionType, problemStyle };
  }, [curriculumHaystack, formData.language, formData.questionType, formData.problemStyle]);

  const addCustomQuestionType = () => {
    const normalized = customQuestionTypeInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (!normalized) return;
    setCustomQuestionTypes((prev) => (prev.includes(normalized) ? prev : [...prev, normalized]));
    setFormData((prev) => ({ ...prev, questionType: normalized }));
    setCustomQuestionTypeInput('');
  };

  const getRequestedQuestionCount = () => Math.max(1, Math.min(25, Number(formData.questionCount || 1)));

  const getPlannedQuestionTypes = () => {
    const mode = formData.questionTypeMode || 'single';
    if (mode === 'mixed' && Array.isArray(formData.mixedQuestionTypes) && formData.mixedQuestionTypes.length > 0) {
      return formData.mixedQuestionTypes;
    }
    return [formData.questionType];
  };

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
    setBatchGenerationSummary('');

    try {
      const requestedCount = getRequestedQuestionCount();
      const plannedTypes = getPlannedQuestionTypes();

      if (requestedCount === 1) {
        const response = await aiService.generateQuestion(formData);
        setGeneratedQuestion(response.data);
        setGenerationPipeline(response.pipeline || null);
      } else {
        const generatedItems: any[] = [];
        for (let i = 0; i < requestedCount; i += 1) {
          const selectedType = plannedTypes[i % plannedTypes.length] || formData.questionType;
          const requestForItem: GenerateQuestionRequest = {
            ...formData,
            questionType: selectedType,
            questionCount: 1,
            questionTypeMode: 'single'
          };
          const response = await aiService.generateQuestion(requestForItem);
          generatedItems.push(response.data);
        }

        if (!generatedItems.length) {
          throw new Error('No questions generated in batch mode');
        }

        setGeneratedQuestion(generatedItems[0]);
        setGenerationPipeline(null);
        setBatchGenerationSummary(
          `Generated ${generatedItems.length} question drafts using types: ${plannedTypes.join(', ')}. Showing the first draft below.`
        );
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate question');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuestion = async () => {
    if (getRequestedQuestionCount() > 1) {
      setError('Create is supported for a single question at a time. Set Question Count to 1, then create.');
      return;
    }
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

  const handleDownloadQuestionZip = async () => {
    if (!generatedQuestion) return;
    await downloadQuestionZipFromPayload(generatedQuestion);
  };

  const downloadQuestionZipFromPayload = async (payloadQuestion: any, filenamePrefix?: string) => {
    if (!payloadQuestion) return;
    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      const framework =
        payloadQuestion?.testFramework ||
        (formData.language === 'python' ? 'pytest' : formData.language === 'java' ? 'junit' : 'jest');
      const testExt = framework === 'pytest' ? 'py' : framework === 'junit' ? 'java' : 'js';

      const starterFiles = payloadQuestion?.starterCode?.files || [];
      const solutionFiles = payloadQuestion?.solution?.files || [];
      const testCases = payloadQuestion?.testConfig?.testCases || [];

      for (const file of starterFiles) {
        if (file?.path) zip.file(`starter/${file.path}`, String(file?.content || ''));
      }
      for (const file of solutionFiles) {
        if (file?.path) zip.file(`solution/${file.path}`, String(file?.content || ''));
      }

      const manifestTestCases = testCases.map((tc: any, idx: number) => {
        const id = String(tc?.id || `tc_${String(idx + 1).padStart(3, '0')}`);
        const testCodePath = `tests/${id}.${testExt}`;
        zip.file(testCodePath, String(tc?.testCode || ''));
        return {
          id,
          name: String(tc?.name || `Test ${idx + 1}`),
          file: String(tc?.file || (framework === 'junit' ? 'src/test/java/SolutionTest.java' : framework === 'pytest' ? 'tests/test_solution.py' : 'tests/solution.spec.js')),
          testName: String(tc?.testName || `test_${idx + 1}`),
          points: Number(tc?.points || 0),
          visible: tc?.visible ?? true,
          category: String(tc?.category || 'basic'),
          description: tc?.description ? String(tc.description) : '',
          testCodePath
        };
      });

      const manifest = {
        schemaVersion: 1,
        title: payloadQuestion?.title || 'AI Generated Question',
        description: payloadQuestion?.description || '',
        category: payloadQuestion?.category || 'backend',
        problemStyle: payloadQuestion?.problemStyle || formData.problemStyle || 'implementation',
        technicalFocus: payloadQuestion?.technicalFocus || formData.questionType || 'algorithm',
        difficulty: payloadQuestion?.difficulty || 'medium',
        testFramework: payloadQuestion?.testFramework || 'jest',
        points: Number(payloadQuestion?.points || 100),
        timeEstimate: Number(payloadQuestion?.timeEstimate || 30),
        skills: Array.isArray(payloadQuestion?.skills) ? payloadQuestion.skills : [],
        tags: Array.isArray(payloadQuestion?.tags) ? payloadQuestion.tags : [],
        starterCode: {
          files: starterFiles.map((f: any) => ({
            path: f.path,
            source: `starter/${f.path}`,
            language: f.language || 'javascript'
          }))
        },
        solution: {
          files: solutionFiles.map((f: any) => ({
            path: f.path,
            source: `solution/${f.path}`,
            language: f.language || 'javascript'
          }))
        },
        testCases: manifestTestCases
      };

      zip.file('learnlytica-question.json', JSON.stringify(manifest, null, 2));
      zip.file(
        'README.txt',
        [
          'Learnlytica AI Generated Question Package',
          '',
          'This ZIP is generated from AI output after validation/verification pipeline.',
          'You can import this package in Question Authoring for round-trip workflow.'
        ].join('\n')
      );

      const blob = await zip.generateAsync({ type: 'blob' });
      const safeTitle = String(filenamePrefix || payloadQuestion?.title || 'ai-question')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${safeTitle || 'ai-question'}-${payloadQuestion?.testFramework || 'jest'}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate ZIP package');
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleGenerateCreateAndDownload = async () => {
    if (!formData.topic.trim()) {
      setError('Please enter a topic');
      return;
    }
    if (getRequestedQuestionCount() > 1) {
      setError('Generate + Verify + Create + Download currently supports single question only. Set Question Count to 1.');
      return;
    }

    setAtomicLoading(true);
    setError('');
    try {
      const response = await aiService.generateAndCreate(formData);
      const createdQuestion = response?.data?.question;
      if (!createdQuestion) {
        throw new Error('Question was not returned by server');
      }

      setGeneratedQuestion(createdQuestion);
      setGenerationPipeline(response?.data?.pipeline || null);
      await downloadQuestionZipFromPayload(createdQuestion, `${createdQuestion.title || 'ai-question'}-verified-draft`);
      navigate(`/questions/${createdQuestion.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to generate, create, and download');
    } finally {
      setAtomicLoading(false);
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
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700">
                Suggested language: <span className="font-semibold">{curriculumSuggestions.language}</span>
              </span>
              <span className="px-2 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700">
                Suggested type: <span className="font-semibold">{curriculumSuggestions.questionType}</span>
              </span>
              <span className="px-2 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700">
                Suggested style: <span className="font-semibold">{curriculumSuggestions.problemStyle}</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    language: curriculumSuggestions.language,
                    questionType: curriculumSuggestions.questionType,
                    problemStyle: curriculumSuggestions.problemStyle
                  }))
                }
                className="px-2 py-1 rounded bg-indigo-50 border border-indigo-200 text-indigo-700"
              >
                Apply Curriculum Suggestions
              </button>
            </div>
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
                        onChange={(e) => setFormData({ ...formData, questionType: e.target.value })}
                        className="input-field"
                      >
                        {questionTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={customQuestionTypeInput}
                          onChange={(e) => setCustomQuestionTypeInput(e.target.value)}
                          placeholder="Add custom type from curriculum"
                          className="input-field"
                        />
                        <button type="button" onClick={addCustomQuestionType} className="btn-secondary whitespace-nowrap">
                          Add
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Problem Style</label>
                      <select
                        value={formData.problemStyle || 'implementation'}
                        onChange={(e) => setFormData({ ...formData, problemStyle: e.target.value as any })}
                        className="input-field"
                      >
                        {problemStyleOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs" style={{ color: 'var(--text-dim)' }}>
                        {problemStyleOptions.find((option) => option.value === (formData.problemStyle || 'implementation'))?.description}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Language</label>
                      <select
                        value={formData.language}
                        onChange={(e) => setFormData({ ...formData, language: e.target.value as any })}
                        className="input-field"
                      >
                        {languageOptions.map((option) => (
                          <option key={option.value} value={option.value} disabled={!option.supported}>
                            {option.label}{option.supported ? '' : ' (planned)'}
                          </option>
                        ))}
                      </select>
                      {unsupportedLanguagesDetected.length > 0 && (
                        <p className="mt-2 text-xs text-amber-700">
                          Curriculum also mentions {unsupportedLanguagesDetected.join(', ')}. These are detected but not yet runnable in current evaluator.
                        </p>
                      )}
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
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Type Mode</label>
                      <select
                        value={formData.questionTypeMode || 'single'}
                        onChange={(e) => setFormData({ ...formData, questionTypeMode: e.target.value as 'single' | 'mixed' })}
                        className="input-field"
                      >
                        <option value="single">Single Type</option>
                        <option value="mixed">Mixed Types</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Question Count</label>
                      <input
                        type="number"
                        min={1}
                        max={25}
                        value={getRequestedQuestionCount()}
                        onChange={(e) => setFormData({ ...formData, questionCount: Math.max(1, Math.min(25, Number(e.target.value || 1))) })}
                        className="input-field"
                      />
                    </div>
                  </div>
                )}
                {wizardStep === 2 && (formData.questionTypeMode || 'single') === 'mixed' && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-sm font-semibold text-slate-800 mb-2">Select mixed types</div>
                    <div className="flex flex-wrap gap-2">
                      {questionTypeOptions.map((option) => {
                        const selected = (formData.mixedQuestionTypes || []).includes(option.value);
                        return (
                          <button
                            key={`mixed-${option.value}`}
                            type="button"
                            onClick={() => {
                              const current = formData.mixedQuestionTypes || [];
                              const next = selected ? current.filter((t) => t !== option.value) : [...current, option.value];
                              setFormData({ ...formData, mixedQuestionTypes: next });
                            }}
                            className={`px-2 py-1 rounded border text-xs ${selected ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-slate-300 text-slate-700'}`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
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
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Hidden Tests %</label>
                      <input
                        type="number"
                        min={0}
                        max={90}
                        value={formData.rubric?.hiddenTestPercent ?? 35}
                        onChange={(e) => setFormData({
                          ...formData,
                          rubric: { ...(formData.rubric || {}), hiddenTestPercent: parseInt(e.target.value || '35', 10) }
                        })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Passing %</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={formData.rubric?.passingPercent ?? 60}
                        onChange={(e) => setFormData({
                          ...formData,
                          rubric: { ...(formData.rubric || {}), passingPercent: parseInt(e.target.value || '60', 10) }
                        })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Rubric Total Points</label>
                      <input
                        type="number"
                        min={10}
                        value={formData.rubric?.totalPoints ?? ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          rubric: { ...(formData.rubric || {}), totalPoints: parseInt(e.target.value || '0', 10) || undefined }
                        })}
                        className="input-field"
                        placeholder="Optional override"
                      />
                    </div>
                  </div>
                )}

                {wizardStep === 3 && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Basic Weight</label>
                      <input
                        type="number"
                        min={1}
                        value={formData.rubric?.basicWeight ?? 40}
                        onChange={(e) => setFormData({ ...formData, rubric: { ...(formData.rubric || {}), basicWeight: parseInt(e.target.value || '40', 10) } })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Edge Weight</label>
                      <input
                        type="number"
                        min={1}
                        value={formData.rubric?.edgeWeight ?? 25}
                        onChange={(e) => setFormData({ ...formData, rubric: { ...(formData.rubric || {}), edgeWeight: parseInt(e.target.value || '25', 10) } })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Negative Weight</label>
                      <input
                        type="number"
                        min={1}
                        value={formData.rubric?.negativeWeight ?? 20}
                        onChange={(e) => setFormData({ ...formData, rubric: { ...(formData.rubric || {}), negativeWeight: parseInt(e.target.value || '20', 10) } })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Performance Weight</label>
                      <input
                        type="number"
                        min={1}
                        value={formData.rubric?.performanceWeight ?? 15}
                        onChange={(e) => setFormData({ ...formData, rubric: { ...(formData.rubric || {}), performanceWeight: parseInt(e.target.value || '15', 10) } })}
                        className="input-field"
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
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value} disabled={!option.supported}>
                    {option.label}{option.supported ? '' : ' (planned)'}
                  </option>
                ))}
              </select>
              {unsupportedLanguagesDetected.length > 0 && (
                <p className="mt-2 text-xs text-amber-700">
                  Curriculum also mentions {unsupportedLanguagesDetected.join(', ')}. These are detected but not yet runnable in current evaluator.
                </p>
              )}
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
                onChange={(e) => setFormData({ ...formData, questionType: e.target.value })}
                className="input-field"
              >
                {questionTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={customQuestionTypeInput}
                  onChange={(e) => setCustomQuestionTypeInput(e.target.value)}
                  placeholder="Add custom type from curriculum"
                  className="input-field"
                />
                <button type="button" onClick={addCustomQuestionType} className="btn-secondary whitespace-nowrap">
                  Add
                </button>
              </div>
              <p className="mt-2 text-xs" style={{ color: 'var(--text-dim)' }}>
                {
                  questionTypeOptions.find((option) => option.value === formData.questionType)
                    ?.description
                }
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Problem Style</label>
              <select
                value={formData.problemStyle || 'implementation'}
                onChange={(e) => setFormData({ ...formData, problemStyle: e.target.value as any })}
                className="input-field"
              >
                {problemStyleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs" style={{ color: 'var(--text-dim)' }}>
                {problemStyleOptions.find((option) => option.value === (formData.problemStyle || 'implementation'))?.description}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Type Mode</label>
              <select
                value={formData.questionTypeMode || 'single'}
                onChange={(e) => setFormData({ ...formData, questionTypeMode: e.target.value as 'single' | 'mixed' })}
                className="input-field"
              >
                <option value="single">Single Type</option>
                <option value="mixed">Mixed Types</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Question Count</label>
              <input
                type="number"
                min={1}
                max={25}
                value={getRequestedQuestionCount()}
                onChange={(e) => setFormData({ ...formData, questionCount: Math.max(1, Math.min(25, Number(e.target.value || 1))) })}
                className="input-field"
              />
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

          {(formData.questionTypeMode || 'single') === 'mixed' && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-sm font-semibold text-slate-800 mb-2">Select mixed types</div>
              <div className="flex flex-wrap gap-2">
                {questionTypeOptions.map((option) => {
                  const selected = (formData.mixedQuestionTypes || []).includes(option.value);
                  return (
                    <button
                      key={`mixed-bottom-${option.value}`}
                      type="button"
                      onClick={() => {
                        const current = formData.mixedQuestionTypes || [];
                        const next = selected ? current.filter((t) => t !== option.value) : [...current, option.value];
                        setFormData({ ...formData, mixedQuestionTypes: next });
                      }}
                      className={`px-2 py-1 rounded border text-xs ${selected ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-slate-300 text-slate-700'}`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              onClick={handleGenerateCreateAndDownload}
              disabled={atomicLoading || loading || !formData.topic || getRequestedQuestionCount() > 1}
              className="btn-ai flex items-center justify-center gap-2 min-h-[46px]"
            >
              {atomicLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Running Full Flow...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Generate + Verify + Create + Download ZIP
                </>
              )}
            </button>

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
                disabled={loading || getRequestedQuestionCount() > 1}
                className="btn-secondary flex items-center justify-center gap-2 min-h-[46px]"
              >
                <Check className="w-5 h-5" />
                Create Question in Database
              </button>
            )}
            {generatedQuestion && (
              <button
                onClick={handleDownloadQuestionZip}
                disabled={downloadingZip}
                className="btn-secondary flex items-center justify-center gap-2 min-h-[46px]"
              >
                {downloadingZip ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {downloadingZip ? 'Preparing ZIP...' : 'Download Question ZIP'}
              </button>
            )}
          </div>
          {getRequestedQuestionCount() > 1 && (
            <p className="text-xs text-amber-700">
              Batch mode generates preview drafts only. To create/verify a question in DB, set Question Count to 1.
            </p>
          )}

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
          {batchGenerationSummary && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              {batchGenerationSummary}
            </div>
          )}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between gap-4 mb-2">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">AI Utilities (Optional Advanced)</h2>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowAdvancedUtilities((v) => !v)}
          >
            {showAdvancedUtilities ? 'Hide Advanced Tools' : 'Show Advanced Tools'}
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Optional advanced tools for power users. Core production flow remains wizard → generate/verify → create → ZIP.
        </p>

        {!showAdvancedUtilities && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            Advanced tools are collapsed by default to keep authoring focused and production-safe.
          </div>
        )}

        {showAdvancedUtilities && (
          <>

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
          </>
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
              disabled={loading || getRequestedQuestionCount() > 1}
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
