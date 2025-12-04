"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authHelpers } from '@/lib/supabase';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: signInError } = await authHelpers.signIn(email, password);

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    } else if (data.user) {
      // Check if user exists in our database
      try {
        const userResponse = await api.get<{ status: string; data: any }>(`/users/by-email/${data.user.email}`);
        
        if (userResponse.status === "success" && userResponse.data) {
          // User exists in database - check if they have a company
          if (userResponse.data.company_id) {
            // User has company - go to dashboard
            router.push('/');
          } else {
            // User exists but no company - go to onboarding
            router.push('/onboarding');
          }
        } else {
          // User doesn't exist in database - go to onboarding
          router.push('/onboarding');
        }
      } catch (error: any) {
        // User doesn't exist in database (404) - redirect to onboarding
        if (error.response?.status === 404) {
          router.push('/onboarding');
        } else {
          // Other error - show message
          setError('Failed to verify account. Please try again or sign up first.');
          setLoading(false);
        }
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-blue-50 dark:from-neutral-900 dark:to-neutral-950 p-4">
      <div className="card w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-600 rounded-xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xl font-bold text-white">MiniBooks</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Sign in to your account to continue</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <Link href="/forgot-password" className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Don't have an account?{' '}
          <Link href="/signup" className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
