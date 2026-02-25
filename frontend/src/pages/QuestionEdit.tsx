import { useParams, useNavigate } from 'react-router-dom';
import { useQuestion, useUpdateQuestion } from '../hooks/useQuestions';
import { ArrowLeft } from 'lucide-react';

export function QuestionEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: question, isLoading } = useQuestion(id!);
  const updateMutation = useUpdateQuestion();

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }

  if (!question) {
    return <div className="p-6"><div className="bg-red-50 p-6 rounded-lg">Question not found</div></div>;
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(`/questions/${id}`)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold">Edit Question</h1>
        </div>
        <div className="card">
          <p className="text-gray-600">Edit functionality coming soon...</p>
          <button
            onClick={() => navigate(`/questions/${id}`)}
            className="btn-primary mt-4"
          >
            Back to Question
          </button>
        </div>
      </div>
    </div>
  );
}
