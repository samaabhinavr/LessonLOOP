import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, BookOpen, FileText, BarChart3, ClipboardList, Download, Eye, CheckCircle, XCircle, Clock, PlusCircle, Sparkles } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

interface QuizQuestion {
  questionText: string;
  options: { text: string }[];
  correctAnswer: number;
}

interface Quiz {
  _id: string;
  title: string;
  status: 'Draft' | 'Published' | 'Archived';
  dueDate?: string;
  questions: QuizQuestion[];
  createdBy: string;
  class: string;
}

interface Student {
  id: string;
  name: string;
  quiz1: number;
  quiz2: number;
  midterm: number;
  final: number;
  average: number;
}

interface Material {
  _id: string;
  title: string;
  fileType: string; // e.g., "application/pdf", "video/mp4"
  fileSize: number; // in bytes
  uploadDate: string;
  fileUrl: string; // URL to access the file
}

interface ClassData {
  _id: string;
  name: string;
  teacher: { _id: string; name: string; email: string };
  students: { _id: string; name: string; email: string }[];
  inviteCode: string;
  // Add other class properties as they become available from the backend
}

interface GradebookEntry {
  id: string;
  name: string;
  email: string;
  averageScore: number;
}

type TabType = 'quizzes' | 'gradebook' | 'materials' | 'attendance' | 'my-grades';

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
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);

  const students = [
    { id: '1', name: 'Alice Smith', quiz1: 85, quiz2: 92, midterm: 88, final: 0, average: 88.3 },
    { id: '2', name: 'Bob Johnson', quiz1: 78, quiz2: 80, midterm: 79, final: 0, average: 79 },
    { id: '3', name: 'Charlie Brown', quiz1: 95, quiz2: 88, midterm: 91, final: 0, average: 91.3 },
    { id: '4', name: 'Diana Prince', quiz1: 70, quiz2: 75, midterm: 72, final: 0, average: 72.3 },
  ];

  const [materials, setMaterials] = useState<Material[]>([]);

  const [myGrades, setMyGrades] = useState<any[]>([]);

  const fetchAttendance = useCallback(async () => {
    if (id && isTeacher && classData) {
      try {
        const res = await axios.get(`http://localhost:5000/api/attendance/${id}/${attendanceDate}`);
        const fetchedRecords = res.data.records;

        // Initialize records with all students from classData, defaulting to 'Absent'
        const initialRecords = classData.students.map(student => ({
          student: student._id,
          status: 'Absent',
        }));

        // Merge fetched records with initial records
        const mergedRecords = initialRecords.map(initialRecord => {
          const fetchedRecord = fetchedRecords.find(rec => rec.student === initialRecord.student);
          return fetchedRecord ? { ...initialRecord, status: fetchedRecord.status } : initialRecord;
        });
        setAttendanceRecords(mergedRecords);
      } catch (err) {
        console.error('Error fetching attendance:', err);
        // If attendance is not found, initialize with all students defaulting to 'Absent'
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          const initialRecords = classData.students.map(student => ({ student: student._id, status: 'Absent' }));
          setAttendanceRecords(initialRecords);
        }
      }
    }
  }, [id, isTeacher, attendanceDate, classData]);

  const fetchClassData = useCallback(async () => {
    if (id) {
      try {
        const res = await axios.get(`http://localhost:5000/api/classes/${id}`);
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
        const res = await axios.get(`http://localhost:5000/api/quizzes/${id}`);
        setQuizzes(res.data);
      } catch (err) {
        console.error('Error fetching quizzes:', err);
      }
    }
  }, [id]);

  const fetchGradebookData = useCallback(async () => {
    if (id && isTeacher) { // Only teachers can view the gradebook
      try {
        const res = await axios.get(`http://localhost:5000/api/classes/${id}/gradebook`);
        setGradebookData(res.data);
      } catch (err) {
        console.error('Error fetching gradebook data:', err);
      }
    }
  }, [id, isTeacher]);

  const fetchMyGrades = useCallback(async () => {
    if (id && !isTeacher) { // Only students can view their grades
      try {
        const res = await axios.get(`http://localhost:5000/api/classes/${id}/my-grades`);
        setMyGrades(res.data);
      } catch (err) {
        console.error('Error fetching my grades:', err);
      }
    }
  }, [id, isTeacher]);

  const fetchMaterials = useCallback(async () => {
    if (id) {
      try {
        const res = await axios.get(`http://localhost:5000/api/resources/${id}`);
        setMaterials(res.data);
      } catch (err) {
        console.error('Error fetching materials:', err);
      }
    }
  }, [id]);

  useEffect(() => {
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
    if (activeTab === 'attendance') {
      fetchAttendance();
    }
  }, [id, activeTab, fetchAttendance, fetchClassData, fetchQuizzes, fetchGradebookData, fetchMyGrades, fetchMaterials, isTeacher]);

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
      const res = await axios.post(`http://localhost:5000/api/resources/upload/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-auth-token': localStorage.getItem('token'),
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
      const res = await axios.post('http://localhost:5000/api/quizzes/generate-mcq', {
        topic: aiTopic,
        numQuestions: aiNumQuestions,
        difficulty: aiDifficulty,
        gradeLevel: aiGradeLevel,
      });
      setNewQuizQuestions(res.data.questions);
    } catch (err) {
      console.error('Error generating MCQs:', err);
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
        questions: newQuizQuestions,
        dueDate: newQuizDueDate || undefined,
        dueTime: newQuizDueTime || undefined,
      };
      const res = await axios.post('http://localhost:5000/api/quizzes', quizData);
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
      const res = await axios.put(`http://localhost:5000/api/quizzes/quiz/${editingQuiz._id}`, quizData);
      setQuizzes(quizzes.map(q => q._id === editingQuiz._id ? res.data : q));
      setEditingQuiz(null);
    } catch (err) {
      console.error('Error updating quiz:', err);
    }
  };

  const handleSaveAttendance = async () => {
    if (!id || !classData) return;

    try {
      const recordsToSave = classData.students.map(student => {
        const record = attendanceRecords.find(rec => rec.student === student._id);
        return {
          student: student._id,
          status: record ? record.status : 'Absent', // Default to Absent if not marked
        };
      });

      await axios.post(`http://localhost:5000/api/attendance/${id}`, {
        date: attendanceDate,
        records: recordsToSave,
      }, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      console.log('Attendance saved successfully!');
      // Optionally, re-fetch attendance to ensure UI is up-to-date
      fetchAttendance();
    } catch (err) {
      console.error('Error saving attendance:', err);
    }
  };

  const handleAttendanceChange = (studentId: string, status: 'Present' | 'Absent') => {
    setAttendanceRecords(prevRecords => {
      const existingRecordIndex = prevRecords.findIndex(rec => rec.student === studentId);
      if (existingRecordIndex > -1) {
        const updatedRecords = [...prevRecords];
        updatedRecords[existingRecordIndex] = { student: studentId, status };
        return updatedRecords;
      } else {
        return [...prevRecords, { student: studentId, status }];
      }
    });
  };

  const handlePublishQuiz = async (quizId: string) => {
    try {
      const res = await axios.put(`http://localhost:5000/api/quizzes/publish/${quizId}`);
      setQuizzes(quizzes.map(quiz => quiz._id === quizId ? res.data : quiz));
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

  if (!classData) {
    return <div className="min-h-screen flex items-center justify-center">Loading class data...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
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
              {isTeacher && (
                <button
                  onClick={() => setActiveTab('attendance')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'attendance'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center">
                    <ClipboardList className="w-4 h-4 mr-2" />
                    Attendance
                  </div>
                </button>
              )}
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
                    <div key={quiz._id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <h4 className="text-lg font-medium text-slate-900 mr-3">{quiz.title}</h4>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(quiz.status)}`}>
                              {getStatusIcon(quiz.status)}
                              <span className="ml-1">{quiz.status}</span>
                            </span>
                          </div>
                          <div className="flex items-center text-sm text-slate-600 space-x-4">
                            {quiz.dueDate && <span>Due: {new Date(quiz.dueDate).toLocaleString()}</span>}
                            <span>{quiz.questions.length} questions</span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {quiz.status === 'Published' && !isTeacher && (
                            <button 
                              onClick={() => navigate(`/quiz/${quiz._id}`)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                              Take Quiz
                            </button>
                          )}
                          {isTeacher && quiz.status === 'Draft' && (
                            <button
                              onClick={() => handlePublishQuiz(quiz._id)}
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
                                onClick={() => navigate(`/quiz/${quiz._id}/results`)}
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
                    <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                      Export Grades
                    </button>
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
                          <tr key={grade.quizId} className="hover:bg-slate-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-slate-900">{grade.quizTitle}</div>
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-center text-sm ${getGradeColor(grade.score)}`}>
                              {grade.score}%
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

            {activeTab === 'attendance' && isTeacher && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-slate-900">Attendance for {new Date(attendanceDate).toLocaleDateString()}</h3>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="border border-slate-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-4">
                  {classData?.students.length === 0 ? (
                    <p className="text-slate-600">No students enrolled in this class yet.</p>
                  ) : (
                    classData?.students.map((student) => {
                      const studentRecord = attendanceRecords.find(rec => rec.student === student._id);
                      const status = studentRecord ? studentRecord.status : 'Not Marked';
                      return (
                        <div key={student._id} className="flex items-center justify-between bg-slate-50 rounded-lg p-4 border border-slate-200">
                          <span className="text-lg font-medium text-slate-900">{student.name}</span>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => handleAttendanceChange(student._id, 'Present')}
                              className={`px-4 py-2 rounded-lg font-medium transition-colors ${status === 'Present' ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-800 hover:bg-green-100 hover:text-green-800'}`}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAttendanceChange(student._id, 'Absent')}
                              className={`px-4 py-2 rounded-lg font-medium transition-colors ${status === 'Absent' ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-800 hover:bg-red-100 hover:text-red-800'}`}
                            >
                              Absent
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="flex justify-end mt-6">
                  <button
                    onClick={handleSaveAttendance}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Save Attendance
                  </button>
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
                      <div key={material._id} className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center">
                            {getFileIcon(material.fileType)}
                            <span className="ml-2 text-xs font-medium text-slate-500 bg-slate-200 px-2 py-1 rounded">
                              {material.fileType.split('/')[1]?.toUpperCase() || 'FILE'}
                            </span>
                          </div>
                          <a
                            href={`http://localhost:5000${material.fileUrl}`}
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

      {/* Attendance Modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-8 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Take Attendance</h2>
            <form onSubmit={handleSaveAttendance} className="space-y-6">
              <div>
                <label htmlFor="attendanceDate" className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                <input
                  type="date"
                  id="attendanceDate"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">Students</h3>
              {classData?.students.map((student) => {
                const studentRecord = attendanceRecords.find(rec => rec.student === student._id);
                const status = studentRecord ? studentRecord.status : 'Not Marked';
                return (
                  <div key={student._id} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-900">{student.name}</span>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => handleAttendanceChange(student._id, 'Present')}
                        className={`px-3 py-1 rounded-lg text-sm font-medium ${studentRecord?.status === 'Present' ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-800'}`}
                      >
                        Present
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAttendanceChange(student._id, 'Absent')}
                        className={`px-3 py-1 rounded-lg text-sm font-medium ${studentRecord?.status === 'Absent' ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-800'}`}
                      >
                        Absent
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAttendanceModal(false)}
                  className="bg-slate-300 hover:bg-slate-400 text-slate-800 font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Save Attendance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
