import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useGetQuizQuery, useSubmitQuizAttemptMutation, useGetMyAttemptsQuery } from '../features/quiz/api';
import { useAuth } from '../features/auth';

export default function Quiz() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuth();

  const { data: quiz, isLoading, error } = useGetQuizQuery(quizId ?? '', { skip: !quizId });
  const [submitAttempt] = useSubmitQuizAttemptMutation();
  const { data: attempts } = useGetMyAttemptsQuery(quizId ?? '', { skip: !quizId });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ scorePct: number; passed: boolean; results: Array<{ questionId: string; correct: boolean; correctOptionIds: string[]; explanation?: string }> } | null>(null);

  useEffect(() => {
    if (!accessToken) {
      navigate('/login', { state: { from: `/quiz/${quizId}` } });
      return;
    }
  }, [accessToken, quizId, navigate]);

  const handleAnswerChange = (questionId: string, optionId: string, isMulti: boolean) => {
    setAnswers((prev) => {
      const current = prev[questionId] ?? [];
      if (isMulti) {
        return current.includes(optionId)
          ? { ...prev, [questionId]: current.filter((id) => id !== optionId) }
          : { ...prev, [questionId]: [...current, optionId] };
      }
      return { ...prev, [questionId]: [optionId] };
    });
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    setSubmitting(true);
    try {
      const formattedAnswers = quiz.questions.map((q) => ({
        questionId: q.id,
        selectedOptionIds: answers[q.id] ?? [],
      }));
      const res = await submitAttempt({ quizId: quiz.id, answers: formattedAnswers }).unwrap();
      setResult(res.graded);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert('Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = () => {
    setSubmitted(false);
    setResult(null);
    setAnswers({});
    setCurrentQuestionIndex(0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <p className="text-red-600">Quiz not found</p>
      </div>
    );
  }

  if (submitted && result) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{quiz.title}</h1>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="text-center mb-6">
            <div className={`text-4xl font-bold ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
              {result.scorePct}%
            </div>
            <p className="mt-2 text-gray-600">
              {result.passed ? 'Congratulations! You passed!' : 'Keep studying and try again.'}
            </p>
          </div>
          <div className="space-y-4">
            {quiz.questions.map((question) => {
              const questionResult = result.results.find((r) => r.questionId === question.id);
              const isCorrect = questionResult?.correct ?? false;
              const userAnswerIds = answers[question.id] ?? [];
              return (
                <div key={question.id} className={`p-4 rounded-lg ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className="font-medium text-gray-900 mb-2">{question.text}</p>
                  <div className="space-y-2">
                    {question.options.map((option) => {
                      const isUserAnswer = userAnswerIds.includes(option.id);
                      const isCorrectAnswer = questionResult?.correctOptionIds.includes(option.id);
                      return (
                        <div key={option.id} className={`p-2 rounded ${isUserAnswer ? (isCorrectAnswer ? 'bg-green-100' : 'bg-red-100') : isCorrectAnswer ? 'bg-green-50' : 'bg-gray-50'}`}>
                          <span className="flex items-center">
                            {isCorrectAnswer && <span className="text-green-600 mr-2">✓</span>}
                            {isUserAnswer && !isCorrectAnswer && <span className="text-red-600 mr-2">✗</span>}
                            <span>{option.text}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {questionResult?.explanation && (
                    <p className="mt-2 text-sm text-gray-600"><strong>Explanation:</strong> {questionResult.explanation}</p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex justify-center">
            <button onClick={handleRetake} className="px-6 py-2 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700">
              Retake Quiz
            </button>
          </div>
        </div>
        {(attempts ?? []).length > 1 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Previous Attempts</h2>
            <ul className="space-y-2">
              {(attempts ?? []).slice(1).map((attempt) => (
                <li key={attempt.id} className="flex justify-between text-sm">
                  <span>{new Date(attempt.submittedAt).toLocaleDateString()}</span>
                  <span className={attempt.passed ? 'text-green-600' : 'text-red-600'}>
                    {attempt.scorePct}% - {attempt.passed ? 'Passed' : 'Failed'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  const question = quiz.questions[currentQuestionIndex];
  const progress = question ? ((currentQuestionIndex + 1) / quiz.questions.length) * 100 : 0;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{quiz.title}</h1>
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>
      {question ? (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-lg text-gray-900 mb-6">{question.text}</p>
        <div className="space-y-3 mb-8">
          {question.options.map((option) => {
            const isSelected = answers[question.id]?.includes(option.id);
            const isMulti = question.type === 'multi';
            return (
              <label key={option.id} className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type={isMulti ? 'checkbox' : 'radio'}
                  name={`answer-${question.id}`}
                  checked={isSelected}
                  onChange={() => handleAnswerChange(question.id, option.id, isMulti)}
                  className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                />
                <span className="ml-3 text-gray-700">{option.text}</span>
              </label>
            );
          })}
        </div>
        <div className="flex justify-between">
          <button
            onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
            className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium disabled:opacity-50"
          >
            Previous
          </button>
          {currentQuestionIndex < quiz.questions.length - 1 ? (
            <button
              onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
              className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 font-medium"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 font-medium disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          )}
        </div>
      </div>
    ) : (
      <div className="text-center py-12 text-gray-500">No questions available</div>
    )}
    </div>
  );
}