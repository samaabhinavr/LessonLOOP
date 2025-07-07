import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { auth } from '../main'; // Import the Firebase auth instance
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import axios from 'axios'; // Re-add axios

export type UserRole = 'Teacher' | 'Student';

interface User {
  uid: string; // Firebase User ID
  email: string | null;
  name?: string; // Add name from backend profile
  role?: UserRole; // Role might still come from your backend/database
  displayName?: string | null;
  photoURL?: string | null;
  profilePicture?: string; // Add profilePicture
  dbUser?: { // Add dbUser object
    _id: string; // MongoDB User ID
    role: UserRole;
    // Add other relevant dbUser properties as needed
  };
  // Add any other custom user properties you store in your backend
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: UserRole, teacherCode?: string) => Promise<void>; // Name and Role are now required for backend registration
  logout: () => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => void; // This might need adjustment for Firebase user profile updates
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in with Firebase
        setIsAuthenticated(true);

        // Get Firebase ID token and set it for Axios
        const idToken = await firebaseUser.getIdToken();
        axios.defaults.headers.common['x-auth-token'] = idToken;

        // Fetch custom user data (like 'role') from your backend using the Firebase UID
        try {
          const res = await axios.get('http://localhost:5000/api/auth/profile');
          const userData = res.data;
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            name: userData.name, // Assign name from backend
            role: userData.role, // Assuming role comes from your backend
            profilePicture: userData.profilePicture, // Assign profilePicture from backend
            dbUser: { _id: userData._id, role: userData.role }, // Include dbUser with _id and role
            // ... other custom data from backend
          });
        } catch (error) {
          console.error('Failed to fetch user profile from backend:', error);
          // If backend profile doesn't exist, set basic Firebase user data
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          });
        }
      } else {
        // User is signed out
        setIsAuthenticated(false);
        setUser(null);
        // Clear Axios default header
        delete axios.defaults.headers.common['x-auth-token'];
      }
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user state and fetching profile
    } catch (error: any) {
      console.error('Login failed:', error.message);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string, role: UserRole, teacherCode?: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Send additional user data to your backend to store in MongoDB
      await axios.post('http://localhost:5000/api/auth/register-profile', {
        uid: firebaseUser.uid,
        name,
        email: firebaseUser.email,
        role,
        teacherCode,
      });

      // onAuthStateChanged will handle setting user state and fetching profile
    } catch (error: any) {
      console.error('Registration failed:', error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // onAuthStateChanged will handle setting user state
    } catch (error: any) {
      console.error('Logout failed:', error.message);
      throw error;
    }
  };

  const updateUser = (updatedUser: Partial<User>) => {
    // This function will need to be adapted.
    // For Firebase Auth profile updates (displayName, photoURL):
    // if (auth.currentUser) {
    //   auth.currentUser.updateProfile({ displayName: updatedUser.displayName, photoURL: updatedUser.photoURL });
    // }
    // For custom user data (like 'role'), you'd update your backend database.
    setUser(prevUser => prevUser ? { ...prevUser, ...updatedUser } : null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, register, logout, updateUser }}>
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