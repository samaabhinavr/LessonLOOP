import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { auth } from '../main'; // Import the Firebase auth instance
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import axios from 'axios';

export type UserRole = 'Teacher' | 'Student';

// This interface now represents the complete, merged user profile.
interface UserProfile {
  _id: string; // MongoDB User ID
  firebaseUid: string; // Firebase User ID
  email: string;
  name: string;
  role: UserRole;
  profilePicture?: string;
  isVerified: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean; // True if Firebase authenticated
  isProfileComplete: boolean; // True if MongoDB profile exists
  isLoading: boolean;
  user: (FirebaseUser & Partial<UserProfile>) | null; // Merged Firebase and MongoDB user data
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: UserRole, teacherCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<(FirebaseUser & Partial<UserProfile>) | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start in a loading state
  const [isProfileComplete, setIsProfileComplete] = useState(false); // New state for profile completion

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        axios.defaults.headers.common['x-auth-token'] = idToken;

        try {
          // Fetch the full user profile from our backend
          const res = await axios.get(`https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/auth/profile`);
          const userData: UserProfile = res.data;
          
          console.log('AuthContext: User profile successfully fetched from backend:', userData);
          setUser({ ...firebaseUser, ...userData });
          setIsProfileComplete(true);

        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 404) {
            // User is authenticated via Firebase but no MongoDB profile found.
            console.log('AuthContext: User profile not found in DB. Proceeding with Firebase user data.');
            setUser({ ...firebaseUser, role: undefined, name: undefined, profilePicture: undefined }); // Set basic Firebase user data
            setIsProfileComplete(false);
          } else {
            console.error('AuthContext: Failed to fetch user profile or other error:', error);
            setUser(null); // For other errors, consider user not authenticated with our system
            setIsProfileComplete(false);
          }
        }
      } else {
        // User is signed out
        delete axios.defaults.headers.common['x-auth-token'];
        setUser(null);
        setIsProfileComplete(false);
      }
      // Finished loading, whether successful or not.
      setIsLoading(false);
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []); // Run only once on mount

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle the rest.
    } catch (error: any) {
      console.error('Login failed:', error.message);
      setIsLoading(false);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string, role: UserRole, teacherCode?: string) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // The token is now set by the onAuthStateChanged listener, which will fire immediately.
      // We need to wait for it to set the header before making the next call.
      // A better way is to get the token directly and set it for this one call.
      const idToken = await firebaseUser.getIdToken();

      // Send additional user data to your backend to store in MongoDB
      await axios.post(`https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/auth/register-profile`, 
        {
          uid: firebaseUser.uid,
          name,
          email: firebaseUser.email,
          role,
          teacherCode,
        },
        { headers: { 'x-auth-token': idToken } } // Send token for this specific request
      );
      // onAuthStateChanged will fire again and fetch the newly created profile.
    } catch (error: any) {
      console.error('Registration failed:', error.message);
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      // onAuthStateChanged will handle setting user to null.
    } catch (error: any) {
      console.error('Logout failed:', error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = (updatedUser: Partial<UserProfile>) => {
    setUser(prevUser => prevUser ? { ...prevUser, ...updatedUser } : null);
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !isLoading && user !== null,
    isProfileComplete,
    login,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
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