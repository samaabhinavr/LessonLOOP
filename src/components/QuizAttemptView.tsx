
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

interface Quiz {
  _id: string;
  title: string;
  class: string; // Add class ID to Quiz interface
  questions: Array<{
    questionText: string;
    options: Array<{ text: string }>;
    correctAnswer: number;
    explanation: string;
  }>;
}

interface QuizResult {
  _id: string;
  quiz: string;
  student: { _id: string; name: string; email: string };
  score: number;
  totalQuestions: number;
  answers: Array<{ questionIndex: number; selectedOptionIndex: number }>;
  createdAt: string;
}

export default function QuizAttemptView() {
  const { quizId, attemptId } = useParams<{ quizId: string; attemptId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    const fetchQuizData = async () => {
      try {
        const quizRes = await axios.get(`http://localhost:5000/api/quizzes/quiz/${quizId}`);
        setQuiz(quizRes.data);
      } catch (err) {
        console.error('Error fetching quiz:', err);
        navigate(-1);
      }
    };

    const fetchQuizResult = async () => {
      try {
        const resultRes = await axios.get(`http://localhost:5000/api/quizzes/result/${quizId}/attempt/${attemptId}`);
        setQuizResult(resultRes.data);
      } catch (err) {
        console.error('Error fetching quiz result:', err);
        navigate(-1);
      }
    };

    if (quizId && attemptId) {
      fetchQuizData();
      fetchQuizResult();
    }
  }, [quizId, attemptId, navigate]);

  const handleBack = () => {
    if (quiz && quiz.class) {
      navigate(`/class/${quiz.class}`);
    } else {
      navigate(-1); // Fallback if class ID is not available
    }
  };

  if (!quiz || !quizResult) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={handleBack}
              className="mr-4 p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-slate-900">
              Quiz Review: {quiz.title}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Student: {quizResult.student.name}
            </h2>
            <div className="text-lg font-bold text-slate-900">
              Score: {quizResult.score} / {quizResult.totalQuestions}
            </div>
          </div>

          {quiz.questions.map((question, index) => {
            const studentAnswer = quizResult.answers.find(
              (ans) => ans.questionIndex === index
            );
            const selectedOption = studentAnswer?.selectedOptionIndex;
            const isCorrect = selectedOption === question.correctAnswer;

            return (
              <div key={index} className="mb-6 pb-6 border-b border-slate-200">
                <div className="flex items-start">
                  <div className="mr-4">
                    {isCorrect ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-slate-800 mb-4">
                      {question.questionText}
                    </p>
                    <div className="space-y-3">
                      {question.options.map((option, optionIndex) => {
                        const isSelected = selectedOption === optionIndex;
                        const isCorrectAnswer = question.correctAnswer === optionIndex;

                        let optionClass = 'border-slate-300';
                        if (isSelected && isCorrectAnswer) {
                          optionClass = 'border-green-500 bg-green-50';
                        } else if (isSelected && !isCorrectAnswer) {
                          optionClass = 'border-red-500 bg-red-50';
                        } else if (isCorrectAnswer) {
                          optionClass = 'border-green-500';
                        }

                        return (
                          <div
                            key={optionIndex}
                            className={`p-3 border rounded-lg ${optionClass}`}
                          >
                            <p className="text-slate-700">{option.text}</p>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 p-3 bg-slate-100 rounded-lg">
                      <h4 className="font-semibold text-slate-800">Explanation:</h4>
                      <p className="text-slate-600">{question.explanation}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
