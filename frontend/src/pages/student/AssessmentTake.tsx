import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentService } from '../../services/studentService';
import { Play, Send, Clock } from 'lucide-react';
import Editor from '@monaco-editor/react';

export function AssessmentTake() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [code, setCode] = useState('// Write your code here');
  const [testResults, setTestResults] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [startTime] = useState(Date.now());
  const [running, setRunning] = useState(false);

  useEffect(() => {
    loadAssessment();
  }, [id]);

  const loadAssessment = async () => {
    try {
      const response = await studentService.getAssessment(id!);
      setData(response.data);
      
      // Start if not started
      if (response.data.studentAssessment.status === 'assigned') {
        await studentService.startAssessment(id!);
      }
      
      // Load starter code
      const firstQuestion = response.data.assessment.questions?.[0];
      if (firstQuestion?.question?.starterCode) {
        setCode(firstQuestion.question.starterCode.files[0]?.content || '');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const runTests = async () => {
    setRunning(true);
    try {
      const response = await studentService.runTests(id!, code, 'jest');
      setTestResults(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setRunning(false);
    }
  };

  const submit = async () => {
    if (!confirm('Submit assessment? This cannot be undone.')) return;
    
    const timeSpent = Math.floor((Date.now() - startTime) / 60000);
    try {
      await studentService.submitAssessment(id!, { code }, timeSpent);
      navigate('/student/assessments');
    } catch (error) {
      alert('Failed to submit');
    }
  };

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (!data) return <div className="p-6">Assessment not found</div>;

  const assessment = data.assessment;
  const question = assessment.questions?.[currentQuestion]?.question;

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">{assessment.title}</h1>
          <p className="text-sm text-gray-600">Question {currentQuestion + 1} of {assessment.questions?.length || 0}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-700">
            <Clock className="w-5 h-5" />
            <span className="font-mono">{assessment.timeLimitMinutes}:00</span>
          </div>
          <button onClick={submit} className="btn-primary flex items-center gap-2">
            <Send className="w-4 h-4" />
            Submit
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/3 border-r p-6 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4">{question?.title}</h2>
          <div className="prose prose-sm max-w-none">
            <p>{question?.description}</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex-1">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              value={code}
              onChange={(value) => setCode(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
              }}
            />
          </div>

          <div className="border-t p-4">
            <button
              onClick={runTests}
              disabled={running}
              className="btn-secondary flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              {running ? 'Running...' : 'Run Tests'}
            </button>

            {testResults && (
              <div className="mt-4 space-y-2">
                <div className="font-medium">
                  Tests: {testResults.testsPassed}/{testResults.testsRun} passed
                </div>
                {testResults.results?.map((r: any, i: number) => (
                  <div key={i} className={`text-sm ${r.passed ? 'text-green-600' : 'text-red-600'}`}>
                    {r.passed ? '✓' : '✗'} {r.name} ({r.points} pts)
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
