import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, BarChart2 } from 'lucide-react';

interface QuizResult {
  _id: string;
  quiz: string;
  student: { _id: string; name: string; email: string };
  score: number;
  totalQuestions: number;
  answers: Array<{ questionIndex: number; selectedOptionIndex: number }>;
  createdAt: string;
  isLate: boolean;
}

export default function QuizResults() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [quizTitle, setQuizTitle] = useState('');

  useEffect(() => {
    if (user?.role !== 'Teacher') {
      navigate('/dashboard'); // Only teachers can view this page
      return;
    }

    const fetchQuizResults = async () => {
      if (quizId) {
        try {
          const res = await axios.get(`http://localhost:5000/api/quizzes/results/${quizId}`);
          setQuizResults(res.data);
          // Optionally fetch quiz title from the first result or a separate API call
          if (res.data.length > 0) {
            // Assuming quiz title can be derived or fetched separately
            // For now, let's make another call to get quiz details
            const quizRes = await axios.get(`http://localhost:5000/api/quizzes/quiz/${quizId}`);
            setQuizTitle(quizRes.data.title);
          }
        } catch (err) {
          console.error('Error fetching quiz results:', err);
          navigate(-1); // Go back if results not found or error
        }
      }
    };
    fetchQuizResults();
  }, [quizId, navigate, user]);

  const handleBack = () => {
    navigate(-1); // Go back to the previous page (ClassPage)
  };

  if (user?.role !== 'Teacher') {
    return <div className="min-h-screen flex items-center justify-center">Access Denied.</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={handleBack}
              className="mr-4 p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                <BarChart2 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Quiz Results: {quizTitle}</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Results for {quizTitle}</h2>
          {quizResults.length === 0 ? (
            <p className="text-slate-600">No results found for this quiz yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-slate-200 rounded-lg">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Student Name
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Date Submitted
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {quizResults.map((result) => (
                    <tr key={result._id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/quiz/${result.quiz}/attempt/${result._id}`)}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{result.student.name}</div>
                        <div className="text-xs text-slate-500">{result.student.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        {result.score} / {result.totalQuestions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-slate-500">
                        {new Date(result.createdAt).toLocaleString()}
                        {result.isLate && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Late
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
