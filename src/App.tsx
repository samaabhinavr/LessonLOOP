import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ClassPage from './components/ClassPage';
import QuizAttempt from './components/QuizAttempt';
import QuizResults from './components/QuizResults';
import QuizAttemptView from './components/QuizAttemptView';
import Analytics from './components/Analytics';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import ProfileCompletion from './components/ProfileCompletion'; // Import ProfileCompletion
import { AuthProvider, useAuth } from './context/AuthContext';
import { PollProvider } from './context/PollContext';

function AppRoutes() {
  const { isAuthenticated, isProfileComplete, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated && isProfileComplete ? <Navigate to="/dashboard" replace /> : <Login />} 
      />
      <Route 
        path="/complete-profile" 
        element={isAuthenticated && !isProfileComplete ? <ProfileCompletion /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/dashboard" 
        element={isAuthenticated && isProfileComplete ? <Dashboard /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/class/:id" 
        element={isAuthenticated && isProfileComplete ? <ClassPage /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/quiz/:quizId" 
        element={isAuthenticated && isProfileComplete ? <QuizAttempt /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/quiz/:quizId/results" 
        element={isAuthenticated && isProfileComplete ? <QuizResults /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/quiz/:quizId/attempt/:attemptId" 
        element={isAuthenticated && isProfileComplete ? <QuizAttemptView /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/class/:classId/analytics" 
        element={isAuthenticated && isProfileComplete ? <Analytics /> : <Navigate to="/login" replace />} 
      />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/" element={isAuthenticated && isProfileComplete ? <Navigate to='/dashboard' replace /> : (isAuthenticated && !isProfileComplete ? <Navigate to="/complete-profile" replace /> : <Navigate to='/login' replace />)} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <PollProvider>
        <Router>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            <AppRoutes />
          </div>
        </Router>
      </PollProvider>
    </AuthProvider>
  );
}

export default App;