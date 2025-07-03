import React, { useState, useEffect } from 'react';
import { LogOut, BookOpen, Users, ChevronRight, Calendar, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

interface Class {
  _id: string;
  name: string;
  teacher: string; // Teacher ID
  students: string[]; // Array of student IDs
  inviteCode: string;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isTeacher = user?.role === 'Teacher';

  const [classes, setClasses] = useState<Class[]>([]);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [showJoinClassModal, setShowJoinClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [joinInviteCode, setJoinInviteCode] = useState('');
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<{ totalPresent: number; totalRecords: number } | null>(null);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/classes', {
          headers: { 'x-auth-token': token }
        });
        setClasses(res.data);
      } catch (err) {
        console.error('Error fetching classes:', err);
      }
    };

    const fetchAttendanceSummary = async () => {
      if (!isTeacher) {
        try {
          const token = localStorage.getItem('token');
          const res = await axios.get('http://localhost:5000/api/classes/my-attendance-summary', {
            headers: { 'x-auth-token': token }
          });
          setAttendanceSummary(res.data);
        } catch (err) {
          console.error('Error fetching attendance summary:', err);
        }
      }
    };

    fetchClasses();
    fetchAttendanceSummary();
  }, [isTeacher]);

  const handleEnterCourse = (classId: string) => {
    navigate(`/class/${classId}`);
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/classes', { name: newClassName });
      setClasses([...classes, res.data]);
      setCreatedInviteCode(res.data.inviteCode);
      setNewClassName('');
      // setShowCreateClassModal(false); // Keep open to show invite code
    } catch (err) {
      console.error('Error creating class:', err);
    }
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/classes/join', { inviteCode: joinInviteCode });
      setClasses([...classes, res.data]);
      setJoinInviteCode('');
      setShowJoinClassModal(false);
    } catch (err) {
      console.error('Error joining class:', err);
    }
  };

  const totalStudents = classes.reduce((sum, cls) => sum + cls.students.length, 0);
  const attendanceRate = 92; // Mock attendance percentage for students

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">LessonLoop</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500 capitalize">{user?.role} • {user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h2>
          <p className="text-lg text-slate-600">
            {isTeacher 
              ? 'Ready to manage your classes and track student progress?' 
              : 'Ready to continue your learning journey? Choose a course below.'
            }
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 mb-8">
          {isTeacher && (
            <button
              onClick={() => { setShowCreateClassModal(true); setCreatedInviteCode(null); }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center transition-colors"
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              Create New Class
            </button>
          )}
          {!isTeacher && (
            <button
              onClick={() => setShowJoinClassModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center transition-colors"
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              Join Class
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className={`grid grid-cols-1 ${isTeacher ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6 mb-8`}>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{classes.length}</p>
                <p className="text-sm text-slate-600">Active Classes</p>
              </div>
            </div>
          </div>
          
          {isTeacher ? (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mr-4">
                  <Users className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{totalStudents}</p>
                  <p className="text-sm text-slate-600">Total Students</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {attendanceSummary !== null && attendanceSummary.totalRecords > 0
                      ? `${attendanceSummary.totalPresent}/${attendanceSummary.totalRecords}`
                      : 'N/A'}
                  </p>
                  <p className="text-sm text-slate-600">Attendance Rate</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.length === 0 ? (
            <p className="text-slate-600 col-span-full">{isTeacher ? `You haven't created any classes yet.` : `You haven't joined any classes yet.`}</p>
          ) : (
            classes.map((cls) => (
              <div key={cls._id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
                {/* Class Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center`}>
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* Class Info */}
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{cls.name}</h3>
                {isTeacher && <p className="text-sm text-slate-600 mb-2">Invite Code: <span className="font-mono font-semibold text-blue-600">{cls.inviteCode}</span></p>}
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">{isTeacher ? `Students enrolled: ${cls.students.length}` : `Teacher: ${cls.teacher}`}</p>

                {/* Enter Class Button */}
                <button
                  onClick={() => handleEnterCourse(cls._id)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center group"
                >
                  Enter Class
                  <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Create Class Modal */}
      {showCreateClassModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-8 shadow-2xl w-full max-w-md">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Create New Class</h2>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label htmlFor="className" className="block text-sm font-medium text-slate-700 mb-2">Class Name</label>
                <input
                  type="text"
                  id="className"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Biology 101"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Create Class
              </button>
            </form>
            {createdInviteCode && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                <p className="text-lg font-semibold text-blue-800 mb-2">Class Created!</p>
                <p className="text-slate-700">Share this invite code with your students:</p>
                <p className="text-2xl font-bold text-blue-600 tracking-wider mt-2">{createdInviteCode}</p>
                <button
                  onClick={() => navigator.clipboard.writeText(createdInviteCode)}
                  className="mt-4 bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 px-4 rounded-lg"
                >
                  Copy Code
                </button>
              </div>
            )}
            <button
              onClick={() => setShowCreateClassModal(false)}
              className="mt-4 w-full text-slate-600 hover:text-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Join Class Modal */}
      {showJoinClassModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-8 shadow-2xl w-full max-w-md">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Join Class</h2>
            <form onSubmit={handleJoinClass} className="space-y-4">
              <div>
                <label htmlFor="inviteCode" className="block text-sm font-medium text-slate-700 mb-2">Invite Code</label>
                <input
                  type="text"
                  id="inviteCode"
                  value={joinInviteCode}
                  onChange={(e) => setJoinInviteCode(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-3 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter invite code"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Join Class
              </button>
            </form>
            <button
              onClick={() => setShowJoinClassModal(false)}
              className="mt-4 w-full text-slate-600 hover:text-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}