import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { authApi } from '../services/api';
import socketService from '../services/socket';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  loginAsDemoRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('sahaayaa_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('sahaayaa_token');
      if (storedToken) {
        try {
          const currentUser = await authApi.getMe();
          setUser(currentUser);
          socketService.connect();
          socketService.subscribeRole(currentUser.role);
        } catch (err) {
          console.warn('Session expired or invalid token');
          localStorage.removeItem('sahaayaa_token');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('sahaayaa_token', newToken);
    setToken(newToken);
    setUser(newUser);
    socketService.connect();
    socketService.subscribeRole(newUser.role);
  };

  const logout = () => {
    localStorage.removeItem('sahaayaa_token');
    setToken(null);
    setUser(null);
    socketService.disconnect();
  };

  const loginAsDemoRole = async (role: UserRole) => {
    setIsLoading(true);
    try {
      const emailMap: Record<UserRole, { email: string; pass: string }> = {
        admin: { email: 'admin@sahaayaa.org', pass: 'admin123' },
        ngo: { email: 'aravind.ngo@sahaayaa.org', pass: 'ngo123' },
        donor: { email: 'donor@sahaayaa.org', pass: 'donor123' },
        requester: { email: 'requester@sahaayaa.org', pass: 'requester123' },
        volunteer: { email: 'volunteer@sahaayaa.org', pass: 'volunteer123' },
      };

      const creds = emailMap[role];
      const res = await authApi.login(creds.email, creds.pass);
      login(res.token, res.user);
    } catch (err) {
      console.error('Failed demo login:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, loginAsDemoRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
