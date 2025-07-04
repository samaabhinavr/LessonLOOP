import React, { useState } from 'react';
import { CheckCircle, Mail, Lock, Eye, EyeOff, GraduationCap, Users, UserPlus } from 'lucide-react';
import { useAuth, UserRole } from '../context/AuthContext';
import GoogleIcon from './GoogleIcon';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('Student'); // Changed to 'Student' to match backend enum
  const [isRegistering, setIsRegistering] = useState(false);
  const { login, register, loginWithGoogle } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isRegistering) {
        await register(name, email, password, selectedRole);
      } else {
        await login(email, password, selectedRole);
      }
    } catch (error) {
      console.error(isRegistering ? 'Registration failed:' : 'Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle(selectedRole);
    } catch (error) {
      console.error('Google login failed:', error);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">LessonLoop</h1>
            <p className="text-slate-600">{isRegistering ? 'Create your account to start your learning journey.' : 'Welcome back! Sign in to continue your learning journey.'}</p>
          </div>

          {/* Role Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              I am a:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole('Student')} // Changed to 'Student'
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedRole === 'Student'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <GraduationCap className="w-6 h-6 mx-auto mb-2" />
                <span className="text-sm font-medium">Student</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('Teacher')} // Changed to 'Teacher'
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedRole === 'Teacher'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <Users className="w-6 h-6 mx-auto mb-2" />
                <span className="text-sm font-medium">Teacher</span>
              </button>
            </div>
          </div>

          {/* Login/Register Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {isRegistering && (
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-xl transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {isRegistering ? 'Registering...' : 'Signing in...'}
                </div>
              ) : (
                isRegistering ? `Register as ${selectedRole}` : `Sign In as ${selectedRole}`
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-slate-300"></div>
            <span className="px-4 text-slate-500 text-sm">or</span>
            <div className="flex-1 border-t border-slate-300"></div>
          </div>

          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full bg-white border border-slate-300 hover:bg-slate-50 disabled:bg-slate-100 text-slate-700 font-semibold py-3 px-4 rounded-xl transition-colors focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 flex items-center justify-center"
          >
            {isGoogleLoading ? (
              <div className="flex items-center">
                <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                Connecting...
              </div>
            ) : (
              <>
                <GoogleIcon className="w-5 h-5 mr-3" />
                Continue with Google
              </>
            )}
          </button>

          {/* Footer Links */}
          <div className="mt-6 text-center text-sm text-slate-600">
            {isRegistering ? (
              <>Already have an account? <a href="#" onClick={() => setIsRegistering(false)} className="hover:text-blue-600 transition-colors">Sign In</a></>
            ) : (
              <>
                <a href="#" className="hover:text-blue-600 transition-colors">Forgot your password?</a>
                <span className="mx-2">•</span>
                <a href="#" onClick={() => setIsRegistering(true)} className="hover:text-blue-600 transition-colors">Create account</a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}