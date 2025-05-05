import React, { createContext, useState, useEffect, useContext } from 'react';
import { getSession } from '@/utils/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUserFromSession() {
      const { session } = getSession();
      
      if (session) {
        setUser(session.user);
      }
      
      setLoading(false);
    }

    loadUserFromSession();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

