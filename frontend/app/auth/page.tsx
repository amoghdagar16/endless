"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AuthLandingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-blue-50 to-purple-50 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 p-4">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding & Features */}
        <div className="hidden md:block space-y-8">
          <div>
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-brand-500 to-brand-600 rounded-xl mb-6">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-2xl font-bold text-white">MiniBooks</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              AI-Powered Financial Management
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              Streamline your business expenses with intelligent automation and real-time insights.
            </p>
          </div>

          {/* Features List */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Smart Receipt Parsing</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">AI automatically extracts data from receipts and invoices</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Real-Time Analytics</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Get instant insights into your spending patterns and trends</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Double-Entry Accounting</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Professional journal entries and financial reporting</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">AI Assistant</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ask questions and get intelligent answers about your finances</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Options */}
        <div className="w-full">
          <div className="card max-w-md mx-auto">
            {/* Tab Switcher */}
            <div className="flex gap-2 mb-8 p-1 bg-gray-100 dark:bg-neutral-800 rounded-lg">
              <button
                onClick={() => setActiveTab('signin')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'signin'
                    ? 'bg-white dark:bg-neutral-700 text-brand-600 dark:text-brand-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setActiveTab('signup')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'signup'
                    ? 'bg-white dark:bg-neutral-700 text-brand-600 dark:text-brand-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Content */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {activeTab === 'signin' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {activeTab === 'signin'
                  ? 'Sign in to continue to MiniBooks'
                  : 'Get started with AI-powered expense management'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Link
                href={activeTab === 'signin' ? '/login' : '/signup'}
                className="btn btn-primary w-full flex items-center justify-center gap-2"
              >
                {activeTab === 'signin' ? (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Continue to Sign In
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Continue to Sign Up
                  </>
                )}
              </Link>

              {activeTab === 'signin' && (
                <Link
                  href="/forgot-password"
                  className="block text-center text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
                >
                  Forgot password?
                </Link>
              )}
            </div>

            {/* Mobile: Show features below */}
            <div className="md:hidden mt-8 pt-8 border-t border-border/50">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Why MiniBooks?</h3>
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>AI-powered receipt parsing</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Real-time financial insights</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Professional accounting tools</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

