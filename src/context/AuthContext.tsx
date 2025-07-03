import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import { jwtDecode, JwtPayload } from 'jwt-decode';

export type UserRole = 'Teacher' | 'Student'; // Match backend enum

interface User {
  id: string;
  email: string;
  role: UserRole;
  name?: string; // Name might not be in JWT payload directly, but can be added
}

interface DecodedToken extends JwtPayload {
  user: {
    id: string;
    email: string;
    role: UserRole;
    name?: string;
  };
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  loginWithGoogle: (role: UserRole) => Promise<void>; // Keep for future implementation
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode<DecodedToken>(token);
        // Check if token is expired
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem('token');
          setIsAuthenticated(false);
          setUser(null);
        } else {
          setIsAuthenticated(true);
          setUser({
            id: decoded.user.id,
            email: decoded.user.email,
            role: decoded.user.role,
            name: decoded.user.name,
          });
          // Set auth token for axios
          axios.defaults.headers.common['x-auth-token'] = token;
        }
      } catch (error) {
        console.error('Failed to decode token:', error);
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        setUser(null);
      }
    }
  }, []);

  const setAuthToken = (token: string | null) => {
    if (token) {
      localStorage.setItem('token', token);
      axios.defaults.headers.common['x-auth-token'] = token;
    } else {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['x-auth-token'];
    }
  };

  const login = async (email: string, password: string, role: UserRole) => {
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password, role });
      setAuthToken(res.data.token);
      const decoded = jwtDecode<DecodedToken>(res.data.token);
      setIsAuthenticated(true);
      setUser({
        id: decoded.user.id,
        email: decoded.user.email,
        role: decoded.user.role,
        name: decoded.user.name,
      });
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Login failed:', axiosError.response?.data || axiosError.message);
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string, role: UserRole) => {
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', { name, email, password, role });
      setAuthToken(res.data.token);
      const decoded = jwtDecode<DecodedToken>(res.data.token);
      setIsAuthenticated(true);
      setUser({
        id: decoded.user.id,
        email: decoded.user.email,
        role: decoded.user.role,
        name: decoded.user.name,
      });
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Registration failed:', axiosError.response?.data || axiosError.message);
      throw error;
    }
  };

  const loginWithGoogle = async (role: UserRole) => {
    // This will require backend integration for Google OAuth
    console.warn('Google login not yet implemented with backend.');
    // For now, keep the simulation or remove if not needed immediately
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsAuthenticated(true);
    setUser({
      id: 'google-user-id', // Placeholder
      name: role === 'Teacher' ? 'Dr. Sarah Johnson (Google)' : 'Alex Thompson (Google)',
      email: 'google_user@example.com',
      role
    });
  };

  const logout = () => {
    setAuthToken(null);
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}