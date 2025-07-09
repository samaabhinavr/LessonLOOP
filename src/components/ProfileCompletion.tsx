import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { UserRole } from '../context/AuthContext';

const ProfileCompletion: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [teacherCode, setTeacherCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!user?.uid || !user?.email) {
      setError('User not fully authenticated with Firebase. Please try logging in again.');
      setLoading(false);
      return;
    }

    if (!name || !role) {
      setError('Name and Role are required.');
      setLoading(false);
      return;
    }

    if (role === 'Teacher' && !teacherCode) {
      setError('Teacher code is required for teachers.');
      setLoading(false);
      return;
    }

    try {
      await axios.post(`https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/auth/register-profile`, {
        uid: user.uid,
        name,
        email: user.email,
        role,
        teacherCode: role === 'Teacher' ? teacherCode : undefined,
      });
      // Profile registered successfully. AuthContext's onAuthStateChanged will re-fetch.
      console.log('Profile registered successfully. Redirecting to dashboard.');
      navigate('/dashboard'); // Redirect to dashboard after successful registration
    } catch (err: any) {
      console.error('Error completing profile:', err);
      setError(err.response?.data?.msg || 'Failed to complete profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded shadow-md text-center w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Complete Your Profile</h2>
        <p className="text-gray-700 mb-4">
          Welcome, {user?.email || 'user'}! Please complete your profile to access the dashboard.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 text-left">Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              required
            />
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 text-left">Role</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              required
            >
              <option value="">Select a role</option>
              <option value="Student">Student</option>
              <option value="Teacher">Teacher</option>
            </select>
          </div>
          {role === 'Teacher' && (
            <div>
              <label htmlFor="teacherCode" className="block text-sm font-medium text-gray-700 text-left">Teacher Code</label>
              <input
                type="text"
                id="teacherCode"
                value={teacherCode}
                onChange={(e) => setTeacherCode(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
            </div>
          )}
          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Completing...' : 'Complete Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileCompletion;
