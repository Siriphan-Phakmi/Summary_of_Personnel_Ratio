'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { User } from './types/user';
import { useAuthCore } from './hooks/useAuthCore';

// Define authentication status type
type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

// Define auth context type
interface AuthContextType {
  user: User | null;
  authStatus: AuthStatus;
  isLoggingOut: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  error: string | null;
  checkRole: (requiredRole?: string | string[]) => boolean;
}

// Create auth context with default values
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider component to wrap around app
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthCore();

  const contextValue: AuthContextType = {
    user: auth.user,
    authStatus: auth.authStatus,
    isLoggingOut: auth.isLoggingOut,
    login: auth.login,
    logout: auth.logout,
    error: auth.error,
    checkRole: auth.checkRole,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
