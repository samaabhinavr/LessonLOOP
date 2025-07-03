import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ClassPage from './components/ClassPage';
import QuizAttempt from './components/QuizAttempt';
import QuizResults from './components/QuizResults';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} 
      />
      <Route 
        path="/dashboard" 
        element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/class/:id" 
        element={isAuthenticated ? <ClassPage /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/quiz/:quizId" 
        element={isAuthenticated ? <QuizAttempt /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/quiz/:quizId/results" 
        element={isAuthenticated ? <QuizResults /> : <Navigate to="/login" replace />} 
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;