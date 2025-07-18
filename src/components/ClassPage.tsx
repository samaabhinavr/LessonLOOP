import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, BookOpen, FileText, BarChart3, ClipboardList, Download, Eye, CheckCircle, XCircle, Clock, PlusCircle, Sparkles, Radio } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import LivePoll from './LivePoll';

interface QuizQuestion {
  questionText: string;
  options: { text: string }[];
  correctAnswer: number;
}

interface Quiz {
  id: string;
  title: string;
  topic: string;
  difficulty: string;
  status: 'Draft' | 'Published' | 'Archived';
  dueDate?: string;
  questions: QuizQuestion[];
  createdBy: string;
  class: string;
}


interface Material {
  id: string;
  title: string;
  fileType: string; // e.g., "application/pdf", "video/mp4"
  fileSize: number; // in bytes
  uploadDate: string;
  fileUrl: string; // URL to access the file
}

interface ClassData {
  id: string;
  name: string;
  teacher: { id: string; name: string; email: string };
  students: { id: string; name: string; email: string }[];
  inviteCode: string;
  // Add other class properties as they become available from the backend
}

interface QuizResultForStudent {
  id: string;
  quiz: { id: string; title: string; topic: string; difficulty: string; questions: any[] };
  score: number;
  totalQuestions: number;
  isLate: boolean;
  createdAt: string;
}

interface GradebookEntry {
  id: string;
  name: string;
  email: string;
  averageScore: number;
}

type TabType = 'quizzes' | 'gradebook' | 'materials' | 'my-grades' | 'analytics' | 'live-poll';

export default function ClassPage() {
  const [activeTab, setActiveTab] = useState<TabType>('quizzes');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isTeacher = user?.role === 'Teacher';

  const [classData, setClassData] = useState<ClassData | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [gradebookData, setGradebookData] = useState<GradebookEntry[]>([]);
  const [showUploadMaterialModal, setShowUploadMaterialModal] = useState(false);
  const [newMaterialTitle, setNewMaterialTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showCreateQuizModal, setShowCreateQuizModal] = useState(false);
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizQuestions, setNewQuizQuestions] = useState<QuizQuestion[]>([
    { questionText: '', options: [{ text: '' }, { text: '' }, { text: '' }, { text: '' }], correctAnswer: 0 },
  ]);
  const [newQuizDueDate, setNewQuizDueDate] = useState('');
  const [newQuizDueTime, setNewQuizDueTime] = useState('');
  const [aiTopic, setAiTopic] = useState('');
  const [aiNumQuestions, setAiNumQuestions] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState('Beginner');
  const [aiGradeLevel, setAiGradeLevel] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  

  const [materials, setMaterials] = useState<Material[]>([]);

  const [myGrades, setMyGrades] = useState<QuizResultForStudent[]>([]);

  const fetchClassData = useCallback(async () => {
    if (id) {
      try {
        const res = await axios.get(`https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/classes/${id}`);
        setClassData(res.data);
      } catch (err) {
        console.error('Error fetching class data:', err);
        if (axios.isAxiosError(err)) {
          console.error('Axios error details:', err.response?.data, err.response?.status, err.response?.headers);
        } else {
          console.error('Non-Axios error:', err);
        }
        navigate('/dashboard');
      }
    }
  }, [id, navigate]);

  const fetchQuizzes = useCallback(async () => {
    if (id) {
      try {
        const res = await axios.get(`https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/quizzes/${id}`);
        setQuizzes(res.data);
      } catch (err) {
        console.error('Error fetching quizzes:', err);
      }
    }
  }, [id]);

  const fetchGradebookData = useCallback(async () => {
    if (id && isTeacher) { // Only teachers can view the gradebook
      try {
        const res = await axios.get(`https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/classes/${id}/gradebook`);
        setGradebookData(res.data);
      } catch (err) {
        console.error('Error fetching gradebook data:', err);
      }
    }
  }, [id, isTeacher]);

  const fetchMyGrades = useCallback(async () => {
    if (id && !isTeacher) { // Only students can view their grades
      try {
        const res = await axios.get(`https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/quizzes/my-results/${id}`);
        setMyGrades(res.data);
      } catch (err) {
        console.error('Error fetching my grades:', err);
      }
    }
  }, [id, isTeacher]);

  const handleExportData = async () => {
    if (!id) return;
    try {
      const res = await axios.get(`https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/classes/${id}/export-data`, {
        responseType: 'blob', // Important for downloading files
      });

      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${classData?.name.replace(/\s/g, '_') || 'class'}_report.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting class data:', err);
      alert('Failed to export data. Please try again.');
    }
  };

  const fetchMaterials = useCallback(async () => {
    if (id) {
      try {
        const res = await axios.get(`https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/resources/${id}`);
        setMaterials(res.data);
      } catch (err) {
        console.error('Error fetching materials:', err);
      }
    }
  }, [id]);

  useEffect(() => {
    if (!user) return; // Only fetch data if user is authenticated

    fetchClassData();
    fetchQuizzes();
    if (activeTab === 'materials') {
      fetchMaterials();
    }
    if (activeTab === 'gradebook') {
      fetchGradebookData();
    }
    if (activeTab === 'my-grades') {
      fetchMyGrades();
    }
  }, [id, activeTab, fetchClassData, fetchQuizzes, fetchGradebookData, fetchMyGrades, fetchMaterials, user, isTeacher]);

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleAddQuestion = () => {
    setNewQuizQuestions([
      ...newQuizQuestions,
      { questionText: '', options: [{ text: '' }, { text: '' }, { text: '' }, { text: '' }], correctAnswer: 0 },
    ]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedFile || !newMaterialTitle) return;

    const formData = new FormData();
    formData.append('title', newMaterialTitle);
    formData.append('file', selectedFile);
    formData.append('classId', id);

    try {
      const res = await axios.post(`https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/resources/upload/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setMaterials([...materials, res.data]);
      setShowUploadMaterialModal(false);
      setNewMaterialTitle('');
      setSelectedFile(null);
    } catch (err) {
      console.error('Error uploading material:', err);
    }
  };

  const handleQuestionChange = (
    index: number,
    field: keyof QuizQuestion,
    value: string | number | { text: string }[]
  ) => {
    const updatedQuestions = [...newQuizQuestions];
    if (field === 'options') {
      updatedQuestions[index].options = value as { text: string }[];
    } else if (field === 'questionText') {
      updatedQuestions[index].questionText = value as string;
    } else if (field === 'correctAnswer') {
      updatedQuestions[index].correctAnswer = value as number;
    }
    setNewQuizQuestions(updatedQuestions);
  };

  const handleOptionChange = (qIndex: number, oIndex: number, text: string) => {
    const updatedQuestions = [...newQuizQuestions];
    updatedQuestions[qIndex].options[oIndex].text = text;
    setNewQuizQuestions(updatedQuestions);
  };

  const handleCorrectAnswerChange = (qIndex: number, value: string) => {
    const updatedQuestions = [...newQuizQuestions];
    updatedQuestions[qIndex].correctAnswer = parseInt(value);
    setNewQuizQuestions(updatedQuestions);
  };

  const handleGenerateMCQ = async () => {
    setAiLoading(true);
    try {
      const res = await axios.post('https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/quizzes/generate-mcq', {
        topic: aiTopic,
        numQuestions: aiNumQuestions,
        difficulty: aiDifficulty,
        gradeLevel: aiGradeLevel,
      });
      setNewQuizQuestions(res.data.questions);
    } catch (err) {
      console.error('Error generating MCQs:', err);
      alert('Failed to generate questions. Please try again or adjust your inputs.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      const quizData = {
        classId: id,
        title: newQuizTitle,
        topic: aiTopic,
        difficulty: aiDifficulty,
        questions: newQuizQuestions,
        dueDate: newQuizDueDate || undefined,
        dueTime: newQuizDueTime || undefined,
      };
      const res = await axios.post('https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/quizzes', quizData);
      setQuizzes([...quizzes, res.data]);
      setShowCreateQuizModal(false);
      setNewQuizTitle('');
      setNewQuizQuestions([
        { questionText: '', options: [{ text: '' }, { text: '' }, { text: '' }, { text: '' }], correctAnswer: 0 },
      ]);
      setNewQuizDueDate('');
      setNewQuizDueTime('');
    } catch (err) {
      console.error('Error creating quiz:', err);
    }
  };

  const handleUpdateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuiz) return;

    try {
      const quizData = {
        title: editingQuiz.title,
        questions: editingQuiz.questions,
        dueDate: editingQuiz.dueDate || undefined,
      };
      const res = await axios.put(`https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/quizzes/quiz/${editingQuiz.id}`, quizData);
      setQuizzes(quizzes.map(q => q.id === editingQuiz.id ? res.data : q));
      setEditingQuiz(null);
    } catch (err) {
      console.error('Error updating quiz:', err);
    }
  };

  const handlePublishQuiz = async (quizId: string) => {
    try {
      const res = await axios.put(`https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/quizzes/publish/${quizId}`);
      setQuizzes(quizzes.map(quiz => quiz.id === quizId ? res.data : quiz));
    } catch (err) {
      console.error('Error publishing quiz:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Published':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'Archived':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'Draft':
        return <Clock className="w-4 h-4 text-amber-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Published':
        return 'bg-green-100 text-green-800';
      case 'Archived':
        return 'bg-red-100 text-red-800';
      case 'Draft':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) {
      return <FileText className="w-5 h-5 text-red-500" />;
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return <FileText className="w-5 h-5 text-blue-500" />;
    } else if (fileType.includes('powerpoint') || fileType.includes('presentation')) {
      return <FileText className="w-5 h-5 text-orange-500" />;
    } else if (fileType.includes('video')) {
      return <Eye className="w-5 h-5 text-purple-500" />;
    } else {
      return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'text-green-600 font-semibold';
    if (grade >= 80) return 'text-blue-600 font-semibold';
    if (grade >= 70) return 'text-amber-600 font-semibold';
    return 'text-red-600 font-semibold';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Loading State */}
      {!classData ? (
        <div className="min-h-screen flex items-center justify-center">Loading class data...</div>
      ) : (
        <>
          {/* Header */}
          <header className="bg-white border-b border-slate-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center h-16">
                <button
                  onClick={handleBackToDashboard}
                  className="mr-4 p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center mr-3">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-slate-900">{classData.name}</h1>
                    <p className="text-sm text-slate-500 capitalize">{user?.role} View</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Course Header */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-3">{classData.name}</h2>
              <p className="text-slate-600 leading-relaxed">{classData.teacher?.name ? `Taught by ${classData.teacher.name}` : ''}</p>
              {isTeacher && (
                <p className="text-sm text-slate-600 mt-2">Invite Code: <span className="font-mono font-semibold text-blue-600">{classData.inviteCode}</span></p>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
              <div className="border-b border-slate-200">
                <nav className="flex space-x-8 px-6">
                  <button
                    onClick={() => setActiveTab('quizzes')}
                    className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'quizzes'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <ClipboardList className="w-4 h-4 mr-2" />
                      Quizzes
                    </div>
                  </button>
                  {isTeacher && (
                    <button
                      onClick={() => setActiveTab('gradebook')}
                      className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === 'gradebook'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Gradebook
                      </div>
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/class/${id}/analytics`)}
                    className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'analytics'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Analytics
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('materials')}
                    className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'materials'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      Materials
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('live-poll')}
                    className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'live-poll'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <Radio className="w-4 h-4 mr-2" />
                      Live Poll
                    </div>
                  </button>
                  
                  {!isTeacher && (
                    <button
                      onClick={() => setActiveTab('my-grades')}
                      className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === 'my-grades'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        My Grades
                      </div>
                    </button>
                  )}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'quizzes' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-semibold text-slate-900">Course Quizzes</h3>
                      {isTeacher && (
                        <button
                          onClick={() => setShowCreateQuizModal(true)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                        >
                          <PlusCircle className="w-5 h-5 mr-2" />
                          Create Quiz
                        </button>
                      )}
                    </div>
                    {quizzes.length === 0 ? (
                      <p className="text-slate-600">No quizzes available for this class yet.</p>
                    ) : (
                      quizzes.map((quiz) => (
                        <div key={quiz.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center mb-2">
                                <h4 className="text-lg font-medium text-slate-900 mr-3">{quiz.title}</h4>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(quiz.status)}`}>
                                  {getStatusIcon(quiz.status)}
                                  <span className="ml-1">{quiz.status}</span>
                                </span>
                              </div>
                              <div className="text-xs text-slate-500">Topic: {quiz.topic} | Difficulty: {quiz.difficulty}</div>
                              <div className="flex items-center text-sm text-slate-600 space-x-4">
                                {quiz.dueDate && <span>Due: {new Date(quiz.dueDate).toLocaleDateString()} {new Date(quiz.dueDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
                                <span>{quiz.questions.length} questions</span>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              {quiz.status === 'Published' && !isTeacher && (
                                <button 
                                  onClick={() => navigate(`/quiz/${quiz.id}`)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                >
                                  Take Quiz
                                </button>
                              )}
                              {isTeacher && quiz.status === 'Draft' && (
                                <button
                                  onClick={() => handlePublishQuiz(quiz.id)}
                                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                >
                                  Publish
                                </button>
                              )}
                              {isTeacher && (
                                <>
                                  <button 
                                    onClick={() => setEditingQuiz(quiz)}
                                    className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => navigate(`/quiz/${quiz.id}/results`)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                  >
                                    Results
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'gradebook' && isTeacher && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-semibold text-slate-900">Student Grades</h3>
                      {isTeacher && (
                        <div className="flex space-x-2">
                          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                            Export Grades
                          </button>
                          <button
                            onClick={handleExportData}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                          >
                            Export Class Data
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white border border-slate-200 rounded-lg">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Student Name
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Average Score
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {gradebookData.length === 0 ? (
                            <tr>
                              <td colSpan={2} className="px-6 py-4 whitespace-nowrap text-center text-sm text-slate-500">
                                No grade data available yet.
                              </td>
                            </tr>
                          ) : (
                            gradebookData.map((student) => (
                              <tr key={student.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-slate-900">{student.name}</div>
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-center text-sm ${getGradeColor(student.averageScore)}`}>
                                  {student.averageScore}%
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === 'my-grades' && !isTeacher && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-6">My Grades</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white border border-slate-200 rounded-lg">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Quiz Title
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Score
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {myGrades.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-center text-sm text-slate-500">
                                You have not taken any quizzes yet.
                              </td>
                            </tr>
                          ) : (
                            myGrades.map((grade) => (
                              <tr key={grade.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/quiz/${grade.quiz.id}/attempt/${grade.id}`)}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-slate-900">{grade.quiz.title}</div>
                                  <div className="text-xs text-slate-500">Topic: {grade.quiz.topic} | Difficulty: {grade.quiz.difficulty}</div>
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-center text-sm ${getGradeColor((grade.score / grade.totalQuestions) * 100)}`}>
                                  {grade.score} / {grade.totalQuestions}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-slate-500">
                                  {grade.isLate ? <span className="text-red-500">Late</span> : <span className="text-green-500">On Time</span>}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}


                {activeTab === 'materials' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-semibold text-slate-900">Course Materials</h3>
                      {isTeacher && (
                        <button
                          onClick={() => setShowUploadMaterialModal(true)}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                          Upload Material
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {materials.length === 0 ? (
                        <p className="text-slate-600">No materials available for this class yet.</p>
                      ) : (
                        materials.map((material) => (
                          <div key={material.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center">
                                {getFileIcon(material.fileType)}
                                <span className="ml-2 text-xs font-medium text-slate-500 bg-slate-200 px-2 py-1 rounded">
                                  {material.fileType.split('/')[1]?.toUpperCase() || 'FILE'}
                                </span>
                              </div>
                              <a
                                href={`https://asia-south1-lessonloop-633d9.cloudfunctions.net/api${material.fileUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                                download
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                            <h4 className="text-sm font-medium text-slate-900 mb-2 line-clamp-2">{material.title}</h4>
                            <div className="flex justify-between items-center text-xs text-slate-500">
                              <span>{(material.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                              <span>{new Date(material.uploadDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'live-poll' && (
                  <LivePoll />
                )}
              </div>
            </div>
          </main>

          {/* Create Quiz Modal */}
          {showCreateQuizModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl p-8 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Create New Quiz</h2>
                <form onSubmit={handleCreateQuiz} className="space-y-6">
                  <div>
                    <label htmlFor="quizTitle" className="block text-sm font-medium text-slate-700 mb-2">Quiz Title</label>
                    <input
                      type="text"
                      id="quizTitle"
                      value={newQuizTitle}
                      onChange={(e) => setNewQuizTitle(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Chapter 1 Review Quiz"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="dueDate" className="block text-sm font-medium text-slate-700 mb-2">Due Date & Time (Optional)</label>
                    <div className="flex space-x-2">
                      <input
                        type="date"
                        id="dueDate"
                        value={newQuizDueDate}
                        onChange={(e) => setNewQuizDueDate(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="time"
                        id="dueTime"
                        value={newQuizDueTime}
                        onChange={(e) => setNewQuizDueTime(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">Generate Questions with AI</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="aiTopic" className="block text-sm font-medium text-slate-700 mb-2">Topic</label>
                      <input
                        type="text"
                        id="aiTopic"
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Photosynthesis"
                      />
                    </div>
                    <div>
                      <label htmlFor="aiNumQuestions" className="block text-sm font-medium text-slate-700 mb-2">Number of Questions</label>
                      <input
                        type="number"
                        id="aiNumQuestions"
                        value={aiNumQuestions}
                        onChange={(e) => setAiNumQuestions(parseInt(e.target.value))}
                        className="w-full border border-slate-300 rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500"
                        min="1"
                        max="20"
                      />
                    </div>
                    <div>
                      <label htmlFor="aiDifficulty" className="block text-sm font-medium text-slate-700 mb-2">Difficulty</label>
                      <select
                        id="aiDifficulty"
                        value={aiDifficulty}
                        onChange={(e) => setAiDifficulty(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="aiGradeLevel" className="block text-sm font-medium text-slate-700 mb-2">Grade Level</label>
                      <input
                        type="text"
                        id="aiGradeLevel"
                        value={aiGradeLevel}
                        onChange={(e) => setAiGradeLevel(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., 5th Grade or High School"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateMCQ}
                    disabled={aiLoading}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                  >
                    {aiLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    ) : (
                      <Sparkles className="w-5 h-5 mr-2" />
                    )}
                    Generate with AI
                  </button>

                  <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">Manual Questions</h3>
                  {newQuizQuestions.map((q, qIndex) => (
                    <div key={qIndex} className="border border-slate-200 rounded-lg p-4 space-y-4 bg-slate-50">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Question {qIndex + 1}</label>
                        <textarea
                          value={q.questionText}
                          onChange={(e) => handleQuestionChange(qIndex, 'questionText', e.target.value)}
                          className="w-full border border-slate-300 rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter question text"
                          rows={3}
                          required
                        ></textarea>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {q.options.map((opt, oIndex) => (
                          <div key={oIndex}>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Option {oIndex + 1}</label>
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                              className="w-full border border-slate-300 rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500"
                              placeholder={`Option ${oIndex + 1}`}
                              required
                            />
                          </div>
                        ))}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Correct Answer (Option Number)</label>
                        <select
                          value={q.correctAnswer}
                          onChange={(e) => handleCorrectAnswerChange(qIndex, e.target.value)}
                          className="w-full border border-slate-300 rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="">Select correct option</option>
                          {q.options.map((_, oIndex) => (
                            <option key={oIndex} value={oIndex}>{`Option ${oIndex + 1}`}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                  >
                    <PlusCircle className="w-5 h-5 mr-2" />
                    Add Another Question
                  </button>

                  <div className="flex justify-end space-x-4 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowCreateQuizModal(false)}
                      className="bg-slate-300 hover:bg-slate-400 text-slate-800 font-semibold py-3 px-4 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                    >
                      Create Quiz
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Upload Material Modal */}
          {showUploadMaterialModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl p-8 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Upload New Material</h2>
                <form onSubmit={handleUploadMaterial} className="space-y-6">
                  <div>
                    <label htmlFor="materialTitle" className="block text-sm font-medium text-slate-700 mb-2">Material Title</label>
                    <input
                      type="text"
                      id="materialTitle"
                      value={newMaterialTitle}
                      onChange={(e) => setNewMaterialTitle(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Lecture Notes Chapter 1"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="materialFile" className="block text-sm font-medium text-slate-700 mb-2">Select File</label>
                    <input
                      type="file"
                      id="materialFile"
                      onChange={handleFileChange}
                      className="w-full border border-slate-300 rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      required
                    />
                    {selectedFile && (
                      <p className="mt-2 text-sm text-slate-500">Selected: {selectedFile.name}</p>
                    )}
                  </div>
                  <div className="flex justify-end space-x-4 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowUploadMaterialModal(false)}
                      className="bg-slate-300 hover:bg-slate-400 text-slate-800 font-semibold py-3 px-4 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                    >
                      Upload
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Quiz Modal */}
          {editingQuiz && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl p-8 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Edit Quiz</h2>
                <form onSubmit={handleUpdateQuiz} className="space-y-6">
                  <div>
                    <label htmlFor="editingQuizTitle" className="block text-sm font-medium text-slate-700 mb-2">Quiz Title</label>
                    <input
                      type="text"
                      id="editingQuizTitle"
                      value={editingQuiz.title}
                      onChange={(e) => setEditingQuiz({ ...editingQuiz, title: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Chapter 1 Review Quiz"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="editingDueDate" className="block text-sm font-medium text-slate-700 mb-2">Due Date & Time (Optional)</label>
                    <div className="flex space-x-2">
                      <input
                        type="date"
                        id="editingDueDate"
                        value={editingQuiz.dueDate ? new Date(editingQuiz.dueDate).toISOString().split('T')[0] : ''}
                        onChange={(e) => setEditingQuiz({ ...editingQuiz, dueDate: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="time"
                        id="editingDueTime"
                        value={editingQuiz.dueDate ? new Date(editingQuiz.dueDate).toTimeString().slice(0, 5) : ''}
                        onChange={(e) => {
                          const newDueDate = editingQuiz.dueDate ? new Date(editingQuiz.dueDate) : new Date();
                          const [hours, minutes] = e.target.value.split(':');
                          newDueDate.setHours(parseInt(hours));
                          newDueDate.setMinutes(parseInt(minutes));
                          setEditingQuiz({ ...editingQuiz, dueDate: newDueDate.toISOString() });
                        }}
                        className="w-full border border-slate-300 rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">Questions</h3>
                  {editingQuiz.questions.map((q, qIndex) => (
                    <div key={qIndex} className="border border-slate-200 rounded-lg p-4 space-y-4 bg-slate-50">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Question {qIndex + 1}</label>
                        <textarea
                          value={q.questionText}
                          onChange={(e) => {
                            const updatedQuestions = [...editingQuiz.questions];
                            updatedQuestions[qIndex].questionText = e.target.value;
                            setEditingQuiz({ ...editingQuiz, questions: updatedQuestions });
                          }}
                          className="w-full border border-slate-300 rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter question text"
                          rows={3}
                          required
                        ></textarea>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {q.options.map((opt, oIndex) => (
                          <div key={oIndex}>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Option {oIndex + 1}</label>
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => {
                                const updatedQuestions = [...editingQuiz.questions];
                                updatedQuestions[qIndex].options[oIndex].text = e.target.value;
                                setEditingQuiz({ ...editingQuiz, questions: updatedQuestions });
                              }}
                              className="w-full border border-slate-300 rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500"
                              placeholder={`Option ${oIndex + 1}`}
                              required
                            />
                          </div>
                        ))}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Correct Answer (Option Number)</label>
                        <select
                          value={q.correctAnswer}
                          onChange={(e) => {
                            const updatedQuestions = [...editingQuiz.questions];
                            updatedQuestions[qIndex].correctAnswer = parseInt(e.target.value);
                            setEditingQuiz({ ...editingQuiz, questions: updatedQuestions });
                          }}
                          className="w-full border border-slate-300 rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="">Select correct option</option>
                          {q.options.map((_, oIndex) => (
                            <option key={oIndex} value={oIndex}>{`Option ${oIndex + 1}`}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end space-x-4 mt-6">
                    <button
                      type="button"
                      onClick={() => setEditingQuiz(null)}
                      className="bg-slate-300 hover:bg-slate-400 text-slate-800 font-semibold py-3 px-4 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                    >
                      Update Quiz
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}