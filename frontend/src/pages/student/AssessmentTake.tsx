import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileCode2,
  Flag,
  ListChecks,
  Play,
  Send,
  Sparkles,
  Target
} from 'lucide-react';
import { studentService } from '../../services/studentService';

type TabKey = 'problem' | 'tests' | 'hints' | 'results';
type DraftState = {
  codeByQuestion: Record<string, string>;
  flagsByQuestion: Record<string, boolean>;
  completedByQuestion: Record<string, boolean>;
  currentQuestionIndex: number;
  updatedAt: number;
};

function formatDuration(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getLanguageFromQuestion(question: any): 'javascript' | 'python' | 'java' {
  const framework = question?.testFramework;
  if (framework === 'pytest') return 'python';
  if (framework === 'junit') return 'java';
  return 'javascript';
}

export function AssessmentTake() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [codeByQuestion, setCodeByQuestion] = useState<Record<string, string>>({});
  const [flagsByQuestion, setFlagsByQuestion] = useState<Record<string, boolean>>({});
  const [completedByQuestion, setCompletedByQuestion] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<TabKey>('problem');
  const [testResultsByQuestion, setTestResultsByQuestion] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [runningTests, setRunningTests] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [restoredDraftAt, setRestoredDraftAt] = useState<number | null>(null);
  const [showSubmitReview, setShowSubmitReview] = useState(false);
  const [timeExpiredSubmitted, setTimeExpiredSubmitted] = useState(false);
  const [timeExpiryNotice, setTimeExpiryNotice] = useState('');
  const [attentionEvents, setAttentionEvents] = useState<Array<{ type: 'blur' | 'focus' | 'hidden' | 'visible'; at: number }>>([]);
  const [serverSaveState, setServerSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [startedAtMs, setStartedAtMs] = useState<number>(Date.now());
  const [nowMs, setNowMs] = useState<number>(Date.now());

  const draftStorageKey = `learnlytica:assessment-draft:${id}`;

  useEffect(() => {
    if (!id) return;
    void loadAssessment();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [id]);

  const loadAssessment = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const response = await studentService.getAssessment(id);
      const payload = response.data;
      setData(payload);

      if (payload.studentAssessment?.started_at || payload.studentAssessment?.startedAt) {
        setStartedAtMs(new Date(payload.studentAssessment.started_at || payload.studentAssessment.startedAt).getTime());
      } else {
        setStartedAtMs(Date.now());
      }

      const initialCodes: Record<string, string> = {};
      for (const aq of payload.assessment?.questions || []) {
        const q = aq.question;
        if (!q?.id) continue;
        initialCodes[q.id] =
          q.starterCode?.files?.[0]?.content ||
          '// Start coding here';
      }
      let nextCodes = initialCodes;
      let nextFlags: Record<string, boolean> = {};
      let nextCompleted: Record<string, boolean> = {};
      let nextIndex = 0;
      const serverDraft = payload.draftState || null;
      if (serverDraft && typeof serverDraft === 'object') {
        nextCodes = { ...nextCodes, ...(serverDraft.codeByQuestion || {}) };
        nextFlags = { ...(serverDraft.flagsByQuestion || {}) };
        nextCompleted = { ...(serverDraft.completedByQuestion || {}) };
        if (typeof serverDraft.currentQuestionIndex === 'number') {
          nextIndex = Math.min(
            Math.max(serverDraft.currentQuestionIndex, 0),
            Math.max((payload.assessment?.questions?.length || 1) - 1, 0)
          );
        }
      }

      try {
        const rawDraft = localStorage.getItem(draftStorageKey);
        if (rawDraft) {
          const draft = JSON.parse(rawDraft) as DraftState;
          nextCodes = { ...initialCodes, ...(draft.codeByQuestion || {}) };
          nextFlags = draft.flagsByQuestion || {};
          nextCompleted = draft.completedByQuestion || {};
          if (typeof draft.currentQuestionIndex === 'number') {
            nextIndex = Math.min(
              Math.max(draft.currentQuestionIndex, 0),
              Math.max((payload.assessment?.questions?.length || 1) - 1, 0)
            );
          }
          setRestoredDraftAt(draft.updatedAt || Date.now());
        }
      } catch {
        // Ignore malformed local draft
      }

      setCodeByQuestion(nextCodes);
      setFlagsByQuestion(nextFlags);
      setCompletedByQuestion(nextCompleted);
      setCurrentQuestionIndex(nextIndex);

      if (payload.studentAssessment?.status === 'assigned') {
        setStarting(true);
        await studentService.startAssessment(id);
        setStartedAtMs(Date.now());
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load assessment');
    } finally {
      setStarting(false);
      setLoading(false);
    }
  };

  const assessment = data?.assessment;
  const studentAssessment = data?.studentAssessment;
  const questions = assessment?.questions || [];
  const currentQuestionWrapper = questions[currentQuestionIndex];
  const question = currentQuestionWrapper?.question;
  const questionId = question?.id;
  const currentCode = questionId ? codeByQuestion[questionId] ?? '' : '';
  const currentResult = questionId ? testResultsByQuestion[questionId] : null;
  const isCurrentFlagged = questionId ? !!flagsByQuestion[questionId] : false;
  const isCurrentCompleted = questionId ? !!completedByQuestion[questionId] : false;

  const timeLimitSeconds = (assessment?.timeLimitMinutes || 0) * 60;
  const elapsedSeconds = Math.floor((nowMs - startedAtMs) / 1000);
  const remainingSeconds = Math.max(0, timeLimitSeconds - elapsedSeconds);

  const progress = useMemo(() => {
    if (!questions.length) return 0;
    return Math.round(((currentQuestionIndex + 1) / questions.length) * 100);
  }, [currentQuestionIndex, questions.length]);

  const testedQuestionCount = Object.keys(testResultsByQuestion).length;
  const draftedQuestionCount = Object.entries(codeByQuestion).filter(([, value]) => value?.trim()).length;
  const flaggedQuestionCount = Object.values(flagsByQuestion).filter(Boolean).length;
  const completedQuestionCount = Object.values(completedByQuestion).filter(Boolean).length;
  const attentionWarningCount = attentionEvents.filter((e) => e.type === 'blur' || e.type === 'hidden').length;

  const questionSummaries = useMemo(
    () =>
      questions.map((aq: any, index: number) => {
        const q = aq.question;
        const qid = q?.id;
        const result = qid ? testResultsByQuestion[qid] : null;
        return {
          index,
          question: q,
          questionId: qid,
          flagged: qid ? !!flagsByQuestion[qid] : false,
          completed: qid ? !!completedByQuestion[qid] : false,
          drafted: qid ? !!codeByQuestion[qid]?.trim() : false,
          tested: !!result,
          passedAll: !!result && result.testsRun > 0 && result.testsPassed === result.testsRun
        };
      }),
    [questions, testResultsByQuestion, flagsByQuestion, completedByQuestion, codeByQuestion]
  );

  const flaggedQuestions = questionSummaries.filter((q) => q.flagged);
  const untestedQuestions = questionSummaries.filter((q) => !q.tested);
  const incompleteQuestions = questionSummaries.filter((q) => !q.completed);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTypingContext =
        tag === 'input' ||
        tag === 'textarea' ||
        target?.getAttribute('role') === 'textbox' ||
        !!target?.closest('.monaco-editor');

      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (!runningTests && !submitting) void runTests();
        return;
      }

      if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault();
        goToQuestion(currentQuestionIndex + 1);
        return;
      }

      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault();
        goToQuestion(currentQuestionIndex - 1);
        return;
      }

      if (event.key.toLowerCase() === 'f' && !event.ctrlKey && !event.metaKey && !isTypingContext) {
        event.preventDefault();
        toggleFlag();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentQuestionIndex, runningTests, submitting, questionId]);

  useEffect(() => {
    if (!id || loading || !assessment) return;
    setSaveState('saving');
    const timer = window.setTimeout(() => {
      const draft: DraftState = {
        codeByQuestion,
        flagsByQuestion,
        completedByQuestion,
        currentQuestionIndex,
        updatedAt: Date.now()
      };
      localStorage.setItem(draftStorageKey, JSON.stringify(draft));
      setSaveState('saved');
    }, 350);
    return () => window.clearTimeout(timer);
  }, [id, loading, assessment, codeByQuestion, flagsByQuestion, completedByQuestion, currentQuestionIndex, draftStorageKey]);

  useEffect(() => {
    if (!id || loading || !assessment || submitting) return;
    setServerSaveState('saving');
    const timer = window.setTimeout(() => {
      void studentService
        .saveDraft(
          id,
          {
            codeByQuestion,
            flagsByQuestion,
            completedByQuestion,
            currentQuestionIndex,
            updatedAt: Date.now()
          },
          attentionEvents
        )
        .then(() => setServerSaveState('saved'))
        .catch(() => setServerSaveState('error'));
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [
    id,
    loading,
    assessment,
    submitting,
    codeByQuestion,
    flagsByQuestion,
    completedByQuestion,
    currentQuestionIndex,
    attentionEvents
  ]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (submitting) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [submitting]);

  useEffect(() => {
    const onVisibilityChange = () => {
      setAttentionEvents((prev) => [
        ...prev.slice(-19),
        { type: document.hidden ? 'hidden' : 'visible', at: Date.now() }
      ]);
    };
    const onBlur = () => {
      setAttentionEvents((prev) => [...prev.slice(-19), { type: 'blur', at: Date.now() }]);
    };
    const onFocus = () => {
      setAttentionEvents((prev) => [...prev.slice(-19), { type: 'focus', at: Date.now() }]);
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const updateCode = (value: string) => {
    if (!questionId) return;
    setCodeByQuestion((prev) => ({ ...prev, [questionId]: value }));
  };

  const goToQuestion = (index: number) => {
    if (index < 0 || index >= questions.length) return;
    setCurrentQuestionIndex(index);
    setActiveTab('problem');
  };

  const toggleFlag = () => {
    if (!questionId) return;
    setFlagsByQuestion((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const toggleComplete = () => {
    if (!questionId) return;
    setCompletedByQuestion((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const runTests = async () => {
    if (!id || !questionId) return;
    setRunningTests(true);
    setError('');
    try {
      const response = await studentService.runTests(id, questionId, currentCode);
      setTestResultsByQuestion((prev) => ({ ...prev, [questionId]: response.data }));
      setActiveTab('results');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to run tests');
    } finally {
      setRunningTests(false);
    }
  };

  const requestSubmitAssessment = () => {
    setShowSubmitReview(true);
  };

  const submitAssessment = async () => {
    if (!id) return;
    setSubmitting(true);
    setError('');
    try {
      const timeSpentMinutes = Math.max(1, Math.floor(elapsedSeconds / 60));
      await studentService.submitAssessment(id, codeByQuestion, timeSpentMinutes);
      localStorage.removeItem(draftStorageKey);
      studentService.clearAttemptSession(id);
      setShowSubmitReview(false);
      navigate(`/student/review/${id}`);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!assessment || !timeLimitSeconds || loading || submitting || timeExpiredSubmitted) return;
    if (remainingSeconds > 0) return;

    setTimeExpiredSubmitted(true);
    setTimeExpiryNotice('Time limit reached. Assessment is being submitted automatically.');
    setShowSubmitReview(false);
    void submitAssessment();
  }, [assessment, timeLimitSeconds, remainingSeconds, loading, submitting, timeExpiredSubmitted]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data || !assessment) {
    return <div className="p-6 text-red-400">Assessment not found</div>;
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-[1600px] mx-auto space-y-4">
        <section className="card p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wide" style={{ color: 'var(--text-dim)' }}>
                <Sparkles className="w-3.5 h-3.5" />
                Assessment Workspace
              </div>
              <h1 className="text-xl sm:text-2xl font-bold mt-1 truncate">{assessment.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded-full border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  {studentAssessment?.status || 'in_progress'}
                </span>
                <span className="px-2 py-1 rounded-full border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  {questions.length} question{questions.length === 1 ? '' : 's'}
                </span>
                <span className="px-2 py-1 rounded-full border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  {assessment.totalPoints || 0} pts
                </span>
              <span className="px-2 py-1 rounded-full border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                Pass {assessment.passingScore || 0}%
              </span>
              <span className="px-2 py-1 rounded-full border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                Drafted {draftedQuestionCount}/{questions.length}
              </span>
              <span className="px-2 py-1 rounded-full border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                Complete {completedQuestionCount}/{questions.length}
              </span>
              {flaggedQuestionCount > 0 && (
                <span className="px-2 py-1 rounded-full border" style={{ borderColor: 'rgba(245,158,11,.35)', color: '#fcd34d' }}>
                  {flaggedQuestionCount} flagged
                </span>
              )}
              {attentionWarningCount > 0 && (
                <span className="px-2 py-1 rounded-full border" style={{ borderColor: 'rgba(239,68,68,.35)', color: '#fecaca' }}>
                  {attentionWarningCount} focus warnings
                </span>
              )}
            </div>
          </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="rounded-xl border px-3 py-2 min-w-[180px]" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-dim)' }}>
                  <Clock3 className="w-4 h-4" />
                  Time Remaining
                </div>
                <div className={`mt-1 text-lg font-bold ${remainingSeconds < 300 ? 'text-red-400' : ''}`}>
                  {timeLimitSeconds ? formatDuration(remainingSeconds) : 'No limit'}
                </div>
              </div>
              <button
                onClick={requestSubmitAssessment}
                disabled={submitting || starting}
                className="btn-primary min-h-[44px]"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Submitting...' : 'Submit Assessment'}
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: 'var(--text-dim)' }}>
            <div>
              Autosave: {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved locally' : 'Idle'}
              {restoredDraftAt ? ` · Restored ${new Date(restoredDraftAt).toLocaleTimeString()}` : ''}
              {' · '}
              Server sync: {serverSaveState === 'saving' ? 'Saving…' : serverSaveState === 'saved' ? 'Saved' : serverSaveState === 'error' ? 'Retrying on next change' : 'Idle'}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span>Leaving/reloading will keep a local draft until submission.</span>
              <span className="px-2 py-1 rounded-full border" style={{ borderColor: 'var(--border)' }}>Cmd/Ctrl+Enter: Run tests</span>
              <span className="px-2 py-1 rounded-full border" style={{ borderColor: 'var(--border)' }}>Alt+←/→: Navigate</span>
              <span className="px-2 py-1 rounded-full border" style={{ borderColor: 'var(--border)' }}>F: Flag</span>
            </div>
          </div>

          {attentionEvents.length > 0 && (
            <div className="mt-3 rounded-xl border p-3 text-xs" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <div className="font-semibold mb-2" style={{ color: 'var(--text-2)' }}>
                Focus / Visibility Activity (soft warning log)
              </div>
              <div className="flex flex-wrap gap-2">
                {attentionEvents.slice(-8).reverse().map((event, idx) => (
                  <span
                    key={`${event.type}-${event.at}-${idx}`}
                    className="px-2 py-1 rounded-full border"
                    style={{
                      borderColor: event.type === 'blur' || event.type === 'hidden' ? 'rgba(239,68,68,.35)' : 'var(--border)',
                      color: event.type === 'blur' || event.type === 'hidden' ? '#fecaca' : 'var(--text-dim)'
                    }}
                  >
                    {event.type} · {new Date(event.at).toLocaleTimeString()}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4">
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, var(--accent), var(--accent-2))'
                }}
              />
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs" style={{ color: 'var(--text-dim)' }}>
              <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
              <span>{testedQuestionCount} question{testedQuestionCount === 1 ? '' : 's'} tested</span>
            </div>
          </div>
        </section>

        {timeExpiryNotice && (
          <div className="card" style={{ background: 'color-mix(in srgb, var(--amber) 10%, var(--surface))' }}>
            <div className="text-sm" style={{ color: '#fde68a' }}>{timeExpiryNotice}</div>
          </div>
        )}

        {error && (
          <div className="card border-red-900/50" style={{ background: 'color-mix(in srgb, var(--red) 10%, var(--surface))' }}>
            <div className="flex items-start gap-2 text-sm" style={{ color: '#fecaca' }}>
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-4">
          <aside className="card p-4">
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-2)' }}>
              Question Navigator
            </h2>
            <div className="space-y-2">
              {questions.map((aq: any, index: number) => {
                const q = aq.question;
                const qResult = q?.id ? testResultsByQuestion[q.id] : null;
                const hasTests = !!qResult;
                const passedAll = !!qResult && qResult.testsRun > 0 && qResult.testsPassed === qResult.testsRun;
                const flagged = q?.id ? !!flagsByQuestion[q.id] : false;
                const hasDraft = q?.id ? !!codeByQuestion[q.id]?.trim() : false;
                const completed = q?.id ? !!completedByQuestion[q.id] : false;
                return (
                  <button
                    key={aq.questionId || q?.id || index}
                    onClick={() => goToQuestion(index)}
                    className={`w-full text-left rounded-xl border p-3 transition ${
                      index === currentQuestionIndex ? 'ring-2' : ''
                    }`}
                    style={{
                      borderColor: index === currentQuestionIndex ? 'var(--border-focus)' : 'var(--border)',
                      background: index === currentQuestionIndex ? 'var(--surface-3)' : 'var(--surface)'
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold" style={{ color: 'var(--text-dim)' }}>
                          Question {index + 1}
                        </div>
                        <div className="text-sm font-semibold truncate">{q?.title || 'Untitled Question'}</div>
                      </div>
                      {hasTests ? (
                        passedAll ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" /> : <Target className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                      ) : flagged ? (
                        <Flag className="w-4 h-4 text-amber-300 shrink-0" />
                      ) : hasDraft ? (
                        <FileCode2 className="w-4 h-4 text-indigo-300 shrink-0" />
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                      <span className="px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-dim)' }}>
                        {q?.difficulty || 'n/a'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-dim)' }}>
                        {q?.points || 0} pts
                      </span>
                      {flagged && (
                        <span className="px-2 py-0.5 rounded-full" style={{ background: 'var(--amber-bg)', color: '#fcd34d' }}>
                          flagged
                        </span>
                      )}
                      {completed && (
                        <span className="px-2 py-0.5 rounded-full" style={{ background: 'var(--green-bg)', color: '#86efac' }}>
                          complete
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_420px] gap-4 min-h-[70vh]">
            <div className="card p-0 overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                <div className="min-w-0">
                  <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
                    {question?.category || 'coding'} · {question?.testFramework || getLanguageFromQuestion(question)}
                  </div>
                  <h2 className="font-semibold truncate">{question?.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleComplete}
                    disabled={!questionId}
                    className="btn-secondary !px-3 !py-2 disabled:opacity-50"
                    title={isCurrentCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                    style={isCurrentCompleted ? { borderColor: 'rgba(34,197,94,.35)', background: 'var(--green-bg)', color: '#86efac' } : undefined}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={toggleFlag}
                    disabled={!questionId}
                    className="btn-secondary !px-3 !py-2 disabled:opacity-50"
                    title={isCurrentFlagged ? 'Unflag question' : 'Flag for review'}
                    style={isCurrentFlagged ? { borderColor: 'rgba(245,158,11,.4)', background: 'var(--amber-bg)', color: '#fcd34d' } : undefined}
                  >
                    <Flag className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => goToQuestion(currentQuestionIndex - 1)}
                    disabled={currentQuestionIndex === 0}
                    className="btn-secondary !px-3 !py-2 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => goToQuestion(currentQuestionIndex + 1)}
                    disabled={currentQuestionIndex >= questions.length - 1}
                    className="btn-secondary !px-3 !py-2 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-[420px]">
                <Editor
                  height="100%"
                  language={getLanguageFromQuestion(question)}
                  value={currentCode}
                  onChange={(value) => updateCode(value || '')}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    tabSize: 2,
                    automaticLayout: true
                  }}
                />
              </div>

              <div className="px-4 py-3 border-t flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between" style={{ borderColor: 'var(--border)' }}>
                <div className="text-xs flex flex-wrap items-center gap-2" style={{ color: 'var(--text-dim)' }}>
                  <span>Code for this question is kept until you submit.</span>
                  {isCurrentFlagged && <span style={{ color: '#fcd34d' }}>Flagged for review</span>}
                  {isCurrentCompleted && <span style={{ color: '#86efac' }}>Marked complete</span>}
                </div>
                <button
                  onClick={runTests}
                  disabled={runningTests || !questionId}
                  className="btn-ai min-h-[42px]"
                >
                  <Play className="w-4 h-4" />
                  {runningTests ? 'Running Tests...' : 'Run Tests'}
                </button>
              </div>
            </div>

            <div className="card p-0 overflow-hidden flex flex-col">
              <div className="px-3 py-3 border-b flex flex-wrap gap-2" style={{ borderColor: 'var(--border)' }}>
                {([
                  ['problem', 'Problem', FileCode2],
                  ['tests', 'Test Cases', ListChecks],
                  ['hints', 'Hints', Sparkles],
                  ['results', 'Results', Target]
                ] as Array<[TabKey, string, any]>).map(([key, label, Icon]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition"
                    style={{
                      background: activeTab === key ? 'var(--surface-3)' : 'transparent',
                      color: activeTab === key ? 'var(--text)' : 'var(--text-muted)',
                      border: `1px solid ${activeTab === key ? 'var(--border-focus)' : 'transparent'}`
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-4 overflow-y-auto flex-1 space-y-4">
                {activeTab === 'problem' && (
                  <>
                    <div>
                      <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-2)' }}>Description</h3>
                      <div className="rounded-xl border p-3 text-sm whitespace-pre-wrap leading-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                        {question?.description || 'No description provided.'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                        <div style={{ color: 'var(--text-dim)' }}>Points</div>
                        <div className="mt-1 font-semibold">{question?.points || 0}</div>
                      </div>
                      <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                        <div style={{ color: 'var(--text-dim)' }}>Time Estimate</div>
                        <div className="mt-1 font-semibold">{question?.timeEstimate || 'N/A'} min</div>
                      </div>
                    </div>

                    {question?.starterCode?.files?.length ? (
                      <div>
                        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-2)' }}>Starter Files</h3>
                        <div className="space-y-2">
                          {question.starterCode.files.map((file: any, i: number) => (
                            <div key={i} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                              <div className="text-xs font-semibold mb-2" style={{ color: 'var(--accent-2)' }}>{file.name}</div>
                              <pre className="text-xs whitespace-pre-wrap leading-5" style={{ color: 'var(--text-muted)' }}>
                                {file.content}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                )}

                {activeTab === 'tests' && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-2)' }}>
                      Visible Test Cases ({question?.testConfig?.testCases?.length || 0})
                    </h3>
                    {(question?.testConfig?.testCases || []).map((tc: any, i: number) => (
                      <div key={tc.id || i} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium text-sm">{tc.name || `Test ${i + 1}`}</div>
                          <div className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-3)', color: 'var(--text-dim)' }}>
                            {tc.points || 0} pts
                          </div>
                        </div>
                        {tc.description ? (
                          <div className="mt-2 text-xs" style={{ color: 'var(--text-dim)' }}>{tc.description}</div>
                        ) : null}
                      </div>
                    ))}
                    {!question?.testConfig?.testCases?.length && (
                      <div className="text-sm" style={{ color: 'var(--text-dim)' }}>No visible test cases available.</div>
                    )}
                  </div>
                )}

                {activeTab === 'hints' && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-2)' }}>
                      Hints ({question?.hints?.length || 0})
                    </h3>
                    {(question?.hints || []).map((hint: string, i: number) => (
                      <div key={i} className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                        <div className="text-xs font-semibold mb-1" style={{ color: 'var(--accent-2)' }}>Hint {i + 1}</div>
                        <div style={{ color: 'var(--text-muted)' }}>{hint}</div>
                      </div>
                    ))}
                    {!question?.hints?.length && (
                      <div className="text-sm" style={{ color: 'var(--text-dim)' }}>No hints available for this question.</div>
                    )}
                  </div>
                )}

                {activeTab === 'results' && (
                  <div className="space-y-3">
                    {currentResult ? (
                      <>
                        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                          <div className="flex items-center justify-between">
                            <div className="font-semibold">Latest Test Run</div>
                            <div className={`text-sm font-semibold ${currentResult.testsPassed === currentResult.testsRun ? 'text-green-400' : 'text-amber-400'}`}>
                              {currentResult.testsPassed}/{currentResult.testsRun} passed
                            </div>
                          </div>
                          <div className="mt-2 text-xs" style={{ color: 'var(--text-dim)' }}>
                            Points: {currentResult.pointsEarned || 0}/{currentResult.totalPoints || 0}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {(currentResult.results || []).map((r: any, i: number) => (
                            <div
                              key={i}
                              className="rounded-xl border p-3"
                              style={{
                                borderColor: r.passed ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)',
                                background: r.passed ? 'var(--green-bg)' : 'color-mix(in srgb, var(--red) 8%, var(--surface))'
                              }}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className={`font-medium text-sm ${r.passed ? 'text-green-300' : 'text-red-300'}`}>
                                    {r.passed ? '✓' : '✗'} {r.name || `Test ${i + 1}`}
                                  </div>
                                  {r.error && (
                                    <div className="mt-1 text-xs whitespace-pre-wrap" style={{ color: 'var(--text-dim)' }}>
                                      {r.error}
                                    </div>
                                  )}
                                </div>
                                <div className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                                  {r.points || 0} pts
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {currentResult.output && (
                          <div className="mt-4">
                            <div className="text-sm font-semibold mb-2" style={{ color: 'var(--text-2)' }}>
                              Test Output / Console
                            </div>
                            <div
                              className="rounded-xl border p-3 max-h-64 overflow-auto"
                              style={{ borderColor: 'var(--border)', background: '#0b1220' }}
                            >
                              <pre className="text-xs whitespace-pre-wrap leading-5" style={{ color: '#c7ddf7' }}>
                                {String(currentResult.output)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="rounded-xl border p-4 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                        Run tests to see feedback, pass/fail status, and points earned per case.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {showSubmitReview && (
        <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl border shadow-2xl" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h3 className="text-lg font-semibold">Submit Assessment</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>
                  Review readiness before final submission. Submission cannot be undone.
                </p>
              </div>
              <button className="btn-secondary !px-3 !py-2" onClick={() => setShowSubmitReview(false)} disabled={submitting}>
                Close
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                  <div className="text-xs" style={{ color: 'var(--text-dim)' }}>Questions</div>
                  <div className="mt-1 font-semibold">{questions.length}</div>
                </div>
                <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                  <div className="text-xs" style={{ color: 'var(--text-dim)' }}>Marked Complete</div>
                  <div className="mt-1 font-semibold">{completedQuestionCount}/{questions.length}</div>
                </div>
                <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                  <div className="text-xs" style={{ color: 'var(--text-dim)' }}>Tested</div>
                  <div className="mt-1 font-semibold">{testedQuestionCount}/{questions.length}</div>
                </div>
                <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                  <div className="text-xs" style={{ color: 'var(--text-dim)' }}>Flagged</div>
                  <div className="mt-1 font-semibold">{flaggedQuestionCount}</div>
                </div>
              </div>

              {incompleteQuestions.length > 0 && (
                <div className="rounded-xl border p-4" style={{ borderColor: 'rgba(245,158,11,.3)', background: 'var(--amber-bg)' }}>
                  <div className="font-semibold text-sm" style={{ color: '#fcd34d' }}>
                    {incompleteQuestions.length} question(s) not marked complete
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {incompleteQuestions.map((q) => (
                      <button
                        key={q.questionId || q.index}
                        className="px-2 py-1 rounded-lg text-xs border"
                        style={{ borderColor: 'rgba(245,158,11,.35)', color: '#fde68a' }}
                        onClick={() => {
                          setShowSubmitReview(false);
                          goToQuestion(q.index);
                        }}
                      >
                        Q{q.index + 1}: {q.question?.title || 'Untitled'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {untestedQuestions.length > 0 && (
                <div className="rounded-xl border p-4" style={{ borderColor: 'rgba(239,68,68,.3)', background: 'color-mix(in srgb, var(--red) 8%, var(--surface))' }}>
                  <div className="font-semibold text-sm text-red-300">
                    {untestedQuestions.length} question(s) have not been test-run in this session
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {untestedQuestions.map((q) => (
                      <button
                        key={q.questionId || q.index}
                        className="px-2 py-1 rounded-lg text-xs border"
                        style={{ borderColor: 'rgba(239,68,68,.35)', color: '#fecaca' }}
                        onClick={() => {
                          setShowSubmitReview(false);
                          goToQuestion(q.index);
                        }}
                      >
                        Q{q.index + 1}: {q.question?.title || 'Untitled'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {flaggedQuestions.length > 0 && (
                <div className="rounded-xl border p-4" style={{ borderColor: 'rgba(245,158,11,.3)', background: 'var(--surface)' }}>
                  <div className="font-semibold text-sm" style={{ color: '#fcd34d' }}>
                    {flaggedQuestions.length} question(s) flagged for review
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {flaggedQuestions.map((q) => (
                      <button
                        key={q.questionId || q.index}
                        className="px-2 py-1 rounded-lg text-xs border"
                        style={{ borderColor: 'rgba(245,158,11,.35)', color: '#fde68a' }}
                        onClick={() => {
                          setShowSubmitReview(false);
                          goToQuestion(q.index);
                        }}
                      >
                        Q{q.index + 1}: {q.question?.title || 'Untitled'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {incompleteQuestions.length === 0 && untestedQuestions.length === 0 && flaggedQuestions.length === 0 && (
                <div className="rounded-xl border p-4" style={{ borderColor: 'rgba(34,197,94,.3)', background: 'var(--green-bg)' }}>
                  <div className="font-semibold text-sm text-green-300">Ready to submit</div>
                  <div className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                    All questions are marked complete, tested, and none are flagged for review.
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t flex flex-col sm:flex-row gap-3 sm:justify-end" style={{ borderColor: 'var(--border)' }}>
              <button className="btn-secondary" onClick={() => setShowSubmitReview(false)} disabled={submitting}>
                Continue Working
              </button>
              <button className="btn-primary" onClick={submitAssessment} disabled={submitting}>
                <Send className="w-4 h-4" />
                {submitting ? 'Submitting...' : 'Submit Anyway'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
