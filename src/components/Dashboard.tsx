import React, { useState, useEffect, useCallback } from 'react';
import { LogOut, BookOpen, Users, ChevronRight, GraduationCap, PlusCircle, User as UserIcon, Settings, Upload, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

interface Class {
  id: string;
  name: string;
  teacher: string; // Teacher ID
  teacherName?: string; // Added teacherName
  students: string[]; // Array of student IDs
  inviteCode: string;
}

interface Notification {
  id: string;
  recipient: string;
  type: 'newQuiz' | 'newPoll';
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export default function Dashboard() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const isTeacher = user?.role === 'Teacher';

  const [classes, setClasses] = useState<Class[]>([]);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [showJoinClassModal, setShowJoinClassModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [joinInviteCode, setJoinInviteCode] = useState('');
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);
  const [averageGrade, setAverageGrade] = useState<number | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await axios.get('https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, []);

  useEffect(() => {
    if (!user) return; // Only fetch data if user is authenticated

    const fetchClasses = async () => {
      try {
        const res = await axios.get('https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/classes');
        setClasses(res.data);
      } catch (err) {
        console.error('Error fetching classes:', err);
      }
    };

    const fetchAverageGrade = async () => {
      if (!isTeacher) {
        try {
          const res = await axios.get('https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/student/average-grade');
          setAverageGrade(res.data.averageGrade);
        } catch (err) {
          console.error('Error fetching average grade:', err);
        }
      }
    };

    fetchClasses();
    fetchAverageGrade();
    fetchNotifications(); // <--- Added this line
  }, [user, isTeacher, fetchNotifications]);

  const markNotificationAsRead = async (id: string) => {
    try {
      await axios.put(`https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/notifications/mark-read/${id}`);
      setNotifications(notifications.map(notif => notif.id === id ? { ...notif, read: true } : notif));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await axios.put('https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/notifications/mark-all-read');
      setNotifications(notifications.map(notif => ({ ...notif, read: true })));
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await axios.delete(`https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/notifications/${id}`);
      setNotifications(notifications.filter(notif => notif.id !== id));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const deleteAllReadNotifications = async () => {
    try {
      await axios.delete('https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/notifications/read');
      setNotifications(notifications.filter(notif => !notif.read));
    } catch (err) {
      console.error('Error deleting all read notifications:', err);
    }
  };

  const handleEnterCourse = (classId: string) => {
    if (classId) {
      navigate(`/class/${classId}`);
    } else {
      console.error('Attempted to enter class with undefined ID. This might indicate an issue with class creation where the _id is not returned.');
      // Optionally, you could show a user-friendly alert here
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/classes', { name: newClassName });
      console.log('Class creation response data:', res.data);
      setClasses([...classes, res.data]);
      setCreatedInviteCode(res.data.inviteCode);
      setNewClassName('');
      setShowCreateClassModal(false); // Close modal after creation
      navigate(`/class/${res.data.id}`); // Navigate to the new class page
    } catch (err) {
      console.error('Error creating class:', err);
    }
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/classes/join', { inviteCode: joinInviteCode });
      setClasses([...classes, res.data]);
      setJoinInviteCode('');
      setShowJoinClassModal(false);
    } catch (err) {
      console.error('Error joining class:', err);
    }
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('profilePicture', file);

      try {
        const res = await axios.post('https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/auth/upload-profile-picture', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        updateUser({ profilePicture: res.data.profilePicture });
      } catch (err) {
        console.error('Error uploading profile picture:', err);
      }
    }
  };

  const totalStudents = classes.reduce((sum, cls) => sum + cls.students.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img src="/image.png" alt="LessonLoop Logo" className="h-10" />
            </div>
            <div className="relative flex items-center space-x-4">
              {!isTeacher && (
                <div className="relative">
                  <button onClick={() => setShowNotificationsModal(true)} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                    <Bell className="w-6 h-6 text-slate-600" />
                    {notifications.filter(n => !n.read).length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {notifications.filter(n => !n.read).length}
                      </span>
                    )}
                  </button>
                </div>
              )}
              <div className="relative">
                <button onClick={() => setProfileMenuOpen(!profileMenuOpen)} className="flex items-center space-x-2">
                  <img src={user?.profilePicture ? `https://asia-south1-lessonloop-633d9.cloudfunctions.net/api${user.profilePicture}` : 'https://i.pravatar.cc/150?u=a042581f4e29026704d'} alt="Profile" className="w-10 h-10 rounded-full" />
                  <span className="text-sm font-medium text-slate-900">{user?.name}</span>
                </button>
                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1">
                    <div className="px-4 py-2 text-sm text-slate-700">
                      <p className="font-semibold">{user?.name}</p>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                    </div>
                    <div className="border-t border-slate-200"></div>
                    <button onClick={() => setShowProfileModal(true)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Profile</button>
                    <button onClick={logout} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Logout</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome back, {user?.name}!
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
                  <GraduationCap className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {averageGrade !== null ? `${averageGrade.toFixed(2)}%` : 'N/A'}
                  </p>
                  <p className="text-sm text-slate-600">Average Grade</p>
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
              <div key={cls.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
                {/* Class Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center`}>
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* Class Info */}
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{cls.name}</h3>
                {isTeacher && <p className="text-sm text-slate-600 mb-2">Invite Code: <span className="font-mono font-semibold text-blue-600">{cls.inviteCode}</span></p>}
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">{isTeacher ? `Students enrolled: ${cls.students.length}` : `Teacher: ${cls.teacherName || 'N/A'}`}</p>

                {/* Enter Class Button */}
                <button
                  onClick={() => handleEnterCourse(cls.id)}
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

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-8 shadow-2xl w-full max-w-md">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Profile</h2>
            <div className="flex items-center space-x-4 mb-6">
              <div className="relative">
                <img src={user?.profilePicture ? `https://asia-south1-lessonloop-633d9.cloudfunctions.net/api${user.profilePicture}` : 'https://i.pravatar.cc/150?u=a042581f4e29026704d'} alt="Profile" className="w-20 h-20 rounded-full" />
                <label htmlFor="profilePictureInput" className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1 cursor-pointer hover:bg-blue-700">
                  <Upload className="w-4 h-4" />
                  <input id="profilePictureInput" type="file" className="hidden" onChange={handleProfilePictureUpload} />
                </label>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">{user?.name}</p>
                <p className="text-sm text-slate-500">{user?.email}</p>
              </div>
            </div>
            <form className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700 mb-2">Current Password</label>
                <input type="password" id="currentPassword" className="w-full border border-slate-300 rounded-lg p-3" />
              </div>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
                <input type="password" id="newPassword" className="w-full border border-slate-300 rounded-lg p-3" />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">Update Password</button>
            </form>
            <button onClick={() => setShowProfileModal(false)} className="mt-4 w-full text-slate-600 hover:text-slate-800">Close</button>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {showNotificationsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-8 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Notifications</h2>
            {notifications.length === 0 ? (
              <p className="text-slate-600">No notifications yet.</p>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border ${notification.read ? 'bg-slate-50 border-slate-200' : 'bg-blue-50 border-blue-200'} flex justify-between items-center`}
                  >
                    <div>
                      <p className="font-medium text-slate-800">{notification.message}</p>
                      <p className="text-sm text-slate-500">{new Date(notification.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!notification.read && (
                        <button
                          onClick={() => markNotificationAsRead(notification.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded-full"
                        >
                          Mark as Read
                        </button>
                      )}
                      {notification.read && (
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded-full"
                        >
                          Delete
                        </button>
                      )}
                      {notification.link && notification.read && (
                        <button
                          onClick={() => {
                            navigate(notification.link);
                            setShowNotificationsModal(false);
                          }}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs px-3 py-1 rounded-full"
                        >
                          View
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end space-x-4 mt-6">
              {notifications.filter(n => n.read).length > 0 && (
                <button
                  onClick={deleteAllReadNotifications}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Delete All Read
                </button>
              )}
              {notifications.filter(n => !n.read).length > 0 && (
                <button
                  onClick={markAllNotificationsAsRead}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Mark All as Read
                </button>
              )}
              <button
                onClick={() => setShowNotificationsModal(false)}
                className="bg-slate-300 hover:bg-slate-400 text-slate-800 font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}