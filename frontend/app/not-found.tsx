"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="max-w-md w-full">
        {/* 404 Number */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-brand-500 dark:text-brand-400 opacity-20">
            404
          </h1>
        </div>

        {/* Main Message */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Oops! This isn't the page you probably want!
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Make sure to re-check your path :')
          </p>
        </div>

        {/* Illustration/Icon */}
        <div className="mb-8 flex justify-center">
          <svg
            className="w-32 h-32 text-gray-300 dark:text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
          >
            Go Back
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>

        {/* Helpful Links */}
        <div className="mt-8 pt-8 border-t border-border/50">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Quick links:
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link
              href="/expenses"
              className="text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
            >
              Expenses
            </Link>
            <Link
              href="/journals"
              className="text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
            >
              Journals
            </Link>
            <Link
              href="/documents"
              className="text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
            >
              Documents
            </Link>
            <Link
              href="/ai"
              className="text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
            >
              AI Console
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

