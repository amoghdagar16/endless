"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  companyId: string | null;
  setCompanyId: (id: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  companyId: null,
  setCompanyId: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      
      // Load company_id from user metadata or localStorage
      if (session?.user) {
        const storedCompanyId = localStorage.getItem('company_id');
        if (storedCompanyId) {
          setCompanyId(storedCompanyId);
        }
      }
      
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        setCompanyId(null);
        localStorage.removeItem('company_id');
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSetCompanyId = (id: string | null) => {
    setCompanyId(id);
    if (id) {
      localStorage.setItem('company_id', id);
    } else {
      localStorage.removeItem('company_id');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, companyId, setCompanyId: handleSetCompanyId }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
