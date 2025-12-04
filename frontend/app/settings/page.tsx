"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { api, getCompanyId } from "@/lib/api";
import { supabase } from "@/lib/supabase";

interface Company {
  id: string;
  name: string;
  industry?: string;
}

export default function SettingsPage() {
  const { user, companyId, setCompanyId } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [company, setCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompanySelector, setShowCompanySelector] = useState(false);
  const [changingCompany, setChangingCompany] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const cid = companyId || getCompanyId();
      
      // Load current company
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

      // Load all companies for selector
      const companiesResponse = await api.get<{ status: string; data: Company[] }>("/companies/");
      if (companiesResponse.status === "success" && companiesResponse.data) {
        setCompanies(companiesResponse.data);
      }

    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeCompany = async (newCompanyId: string) => {
    setChangingCompany(true);
    try {
      if (!user?.id) {
        alert("User not authenticated");
        return;
      }

      // Try to update company association
      // Backend will reject if user already has a company (one email = one company)
      try {
        await api.patch(`/users/${user.id}`, { 
          company_id: newCompanyId,
          email: user.email || undefined,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
        });
        
        // If successful, update local state
        setCompanyId(newCompanyId);
        const response = await api.get<{ status: string; data: Company }>(`/companies/${newCompanyId}`);
        if (response.status === "success" && response.data) {
          setCompany(response.data);
        }
        setShowCompanySelector(false);
        window.location.reload();
      } catch (error: any) {
        const errorMessage = error.response?.data?.detail || "Failed to change company. One email can only be associated with one company.";
        alert(errorMessage);
      }
    } catch (error) {
      console.error("Failed to change company:", error);
      alert("Failed to change company. Please try again.");
    } finally {
      setChangingCompany(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) {
      alert("User not authenticated");
      return;
    }

    setDeleting(true);
    try {
      // Delete user from database
      await api.delete(`/users/${user.id}`);
      
      // Sign out from Supabase (this will also delete the auth user if configured)
      await supabase.auth.signOut();
      
      // Clear local storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('company_id');
        localStorage.removeItem('theme');
      }
      
      // Redirect to auth page
      router.push('/auth');
    } catch (error: any) {
      console.error("Failed to delete account:", error);
      const errorMessage = error.response?.data?.detail || "Failed to delete account. Please try again.";
      alert(errorMessage);
      setDeleting(false);
    }
  };

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your account and company preferences
        </p>
      </div>

      {/* Account Settings Section */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-border/50 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Account Settings
        </h2>
        
        <div className="space-y-4">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between py-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Appearance
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Switch between light and dark mode
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                theme === 'dark' ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
              role="switch"
              aria-checked={theme === 'dark'}
              aria-label="Toggle dark mode"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Delete Account Section */}
          <div className="pt-4 mt-4 border-t border-red-200 dark:border-red-900/50">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="block text-sm font-medium text-red-700 dark:text-red-400 mb-1">
                  Delete Account
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Company Settings Section */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-border/50 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Company Settings
        </h2>

        <div className="space-y-4">
          {/* Role Display */}
          <div className="pb-4 border-b border-border/50">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your role
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Access control coming soon
            </p>
          </div>

          {/* Change Associated Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Associated Company
            </label>
            {!showCompanySelector ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {company?.name || "No company selected"}
                  </p>
                  {company?.industry && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {company.industry}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowCompanySelector(true)}
                  className="px-4 py-2 text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 border border-brand-200 dark:border-brand-800 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                >
                  Change Company
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="max-h-60 overflow-y-auto space-y-2 border border-border/50 rounded-lg p-3 bg-gray-50 dark:bg-neutral-900">
                  {companies.length > 0 ? (
                    companies.map((comp) => (
                      <button
                        key={comp.id}
                        onClick={() => handleChangeCompany(comp.id)}
                        disabled={changingCompany || comp.id === companyId}
                        className={`w-full p-3 text-left rounded-lg border transition-all ${
                          comp.id === companyId
                            ? "bg-brand-50 dark:bg-brand-900/20 border-brand-300 dark:border-brand-700"
                            : "bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-sm"
                        } ${
                          changingCompany ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {comp.name}
                            </div>
                            {comp.industry && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {comp.industry}
                              </div>
                            )}
                          </div>
                          {comp.id === companyId && (
                            <span className="text-xs px-2 py-1 bg-brand-500 text-white rounded">
                              Current
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      No companies available
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowCompanySelector(false)}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg border border-gray-200 dark:border-neutral-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-red-200 dark:border-red-900/50 max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Delete Account
                </h3>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete your account? This will permanently delete:
            </p>
            
            <ul className="text-sm text-gray-600 dark:text-gray-400 mb-6 space-y-2 list-disc list-inside">
              <li>Your account and profile information</li>
              <li>All your expense records</li>
              <li>All your journal entries</li>
              <li>All associated data</li>
            </ul>
            
            <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-6">
              This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting..." : "Yes, Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

