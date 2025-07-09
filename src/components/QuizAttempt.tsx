import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, CheckCircle } from 'lucide-react';

interface QuizQuestion {
  questionText: string;
  options: { text: string }[];
  correctAnswer: number;
}

interface Quiz {
  _id: string;
  title: string;
  questions: QuizQuestion[];
  status: 'Draft' | 'Published' | 'Archived';
}

export default function QuizAttempt() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true); // New loading state
  const [error, setError] = useState<string | null>(null); // New error state
  const [isSubmitting, setIsSubmitting] = useState(false); // New submitting state

  useEffect(() => {
    const checkAndFetchQuiz = async () => {
      if (!quizId || !user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);

      try {
        // First, check if the student has already submitted this quiz
        if (user.role === 'Student') {
          try {
            const existingResultRes = await axios.get(`https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/quizzes/result/${quizId}`);
            // If a result exists, redirect to the attempt view
            if (existingResultRes.data && existingResultRes.data.id) {
              navigate(`/quiz/${quizId}/attempt/${existingResultRes.data.id}`);
              return;
            }
          } catch (err: any) {
            // If no result found (404) or other error, proceed to fetch quiz
            console.log('No existing quiz result found or error fetching, proceeding to quiz attempt.', err);
            if (axios.isAxiosError(err) && err.response?.status !== 404) {
              setError('Failed to check for existing quiz result.');
            }
          }
        }

        // If no existing result (or user is teacher), fetch the quiz
        const res = await axios.get(`https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/quizzes/quiz/${quizId}`);
        setQuiz(res.data);
        setSelectedAnswers(new Array(res.data.questions.length).fill(-1)); // Initialize with -1 (no answer selected)
      } catch (err: any) {
        console.error('Error fetching quiz:', err);
        setError(err.response?.data?.message || 'Failed to load quiz. Please try again.');
        // navigate('/dashboard'); // Redirect if quiz not found or accessible - removed for error display
      } finally {
        setIsLoading(false);
      }
    };
    checkAndFetchQuiz();
  }, [quizId, navigate, user]);

  const handleAnswerChange = (questionIndex: number, optionIndex: number) => {
    const newSelectedAnswers = [...selectedAnswers];
    newSelectedAnswers[questionIndex] = optionIndex;
    setSelectedAnswers(newSelectedAnswers);
  };

  const handleSubmitQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizId || !user) return;

    setIsSubmitting(true);
    try {
      const res = await axios.post(`https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/quizzes/submit/${quizId}`, {
        answers: selectedAnswers,
      });
      setScore(res.data.score);
      setIsSubmitted(true);
      navigate(`/quiz/${quizId}/attempt/${res.data.quizResultId}`);
    } catch (err: any) {
      console.error('Error submitting quiz:', err);
      setError(err.response?.data?.message || 'Failed to submit quiz. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-lg text-slate-600">Loading quiz...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50">
        <p className="text-lg text-red-800 mb-4">Error: {error}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  if (!quiz) {
    return <div className="min-h-screen flex items-center justify-center text-lg text-slate-600">Quiz not found.</div>;
  }

  if (user?.role === 'Teacher') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-red-600">Teachers cannot take quizzes.</p>
      </div>
    );
  }

  if (quiz.status !== 'Published') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-red-600">This quiz is not available for taking.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate(-1)} // Go back to previous page
              className="mr-4 p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">{quiz.title}</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Take Quiz: {quiz.title}</h2>
          {isSubmitted && score !== null ? (
            <div className="text-center py-8">
              <p className="text-3xl font-bold text-green-600 mb-4">Quiz Submitted!</p>
              <p className="text-xl text-slate-800">Your Score: {score} / {quiz.questions.length}</p>
              <button
                onClick={() => navigate(-1)}
                className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Back to Class
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitQuiz} className="space-y-6">
              {quiz.questions.map((q, qIndex) => (
                <div key={qIndex} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="text-lg font-semibold text-slate-900 mb-3">{qIndex + 1}. {q.questionText}</p>
                  <div className="space-y-2">
                    {q.options.map((option, oIndex) => (
                      <label key={oIndex} className="flex items-center p-2 rounded-lg hover:bg-slate-100 cursor-pointer">
                        <input
                          type="radio"
                          name={`question-${qIndex}`}
                          value={oIndex}
                          checked={selectedAnswers[qIndex] === oIndex}
                          onChange={() => handleAnswerChange(qIndex, oIndex)}
                          className="form-radio h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
                        />
                        <span className="ml-3 text-slate-800">{option.text}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
