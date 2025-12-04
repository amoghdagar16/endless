"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';

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
    // Load company_id from localStorage first (before checking session)
    // This prevents the redirect loop by having companyId available immediately
    if (typeof window !== 'undefined') {
      const storedCompanyId = localStorage.getItem('company_id');
      if (storedCompanyId) {
        setCompanyId(storedCompanyId);
      }
    }

    // Check active session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      
      // Load company_id from database for authenticated users
      if (session?.user && typeof window !== 'undefined') {
        try {
          const userResponse = await api.get<{ status: string; data: any }>(`/users/by-email/${session.user.email}`);
          if (userResponse.status === "success" && userResponse.data?.company_id) {
            const dbCompanyId = userResponse.data.company_id;
            setCompanyId(dbCompanyId);
            localStorage.setItem('company_id', dbCompanyId);
          } else {
            // User exists but no company_id - set to null so they get redirected to onboarding
            setCompanyId(null);
            if (typeof window !== 'undefined') {
              localStorage.removeItem('company_id');
            }
          }
        } catch (error: any) {
          // User doesn't exist in database (404) - set to null so they get redirected to onboarding
          if (error.response?.status === 404) {
            setCompanyId(null);
            if (typeof window !== 'undefined') {
              localStorage.removeItem('company_id');
            }
          } else {
            // Other error - fallback to localStorage
            const storedCompanyId = localStorage.getItem('company_id');
            if (storedCompanyId) {
              setCompanyId(storedCompanyId);
            } else {
              setCompanyId(null);
            }
          }
        }
      }
      
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        // Only clear company_id on logout
        setCompanyId(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('company_id');
        }
      } else {
        // On login, load company_id from database
        if (typeof window !== 'undefined' && session.user.email) {
          try {
            const userResponse = await api.get<{ status: string; data: any }>(`/users/by-email/${session.user.email}`);
            if (userResponse.status === "success" && userResponse.data?.company_id) {
              const dbCompanyId = userResponse.data.company_id;
              setCompanyId(dbCompanyId);
              localStorage.setItem('company_id', dbCompanyId);
            } else {
              // User exists but no company_id - set to null so they get redirected to onboarding
              setCompanyId(null);
              if (typeof window !== 'undefined') {
                localStorage.removeItem('company_id');
              }
            }
          } catch (error: any) {
            // User doesn't exist in database (404) - set to null so they get redirected to onboarding
            if (error.response?.status === 404) {
              setCompanyId(null);
              if (typeof window !== 'undefined') {
                localStorage.removeItem('company_id');
              }
            } else {
              // Other error - fallback to localStorage
              const storedCompanyId = localStorage.getItem('company_id');
              if (storedCompanyId) {
                setCompanyId(storedCompanyId);
              } else {
                setCompanyId(null);
              }
            }
          }
        }
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
