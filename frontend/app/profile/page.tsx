"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api, getCompanyId } from "@/lib/api";
import Link from "next/link";

interface Company {
  id: string;
  name: string;
  industry?: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    setLoading(true);
    try {
      const cid = getCompanyId();
      
      if (cid) {
        try {
          const response = await api.get<{ status: string; data: Company }>(`/companies/${cid}`);
          if (response.status === "success" && response.data) {
            setCompany(response.data);
          }
        } catch (error) {
          console.error("Failed to fetch company:", error);
        }
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const userEmail = user?.email || "User";
  const userInitials = userEmail
    .split("@")[0]
    .split(".")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          View your profile information
        </p>
      </div>

      {/* User Info Card */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-border/50 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-500 flex items-center justify-center text-white font-semibold text-xl">
            {userInitials}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {userEmail}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {company?.name || "No company associated"}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-border/50 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="space-y-3">
          <Link
            href="/settings"
            className="block px-4 py-3 text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 border border-brand-200 dark:border-brand-800 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span>Manage Settings</span>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

