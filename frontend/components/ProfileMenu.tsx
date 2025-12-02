"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentUser, signOut } from "@/lib/auth";

export default function ProfileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Load user email
    const loadUser = async () => {
      const user = await getCurrentUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    loadUser();

    // Load theme
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme as "light" | "dark");
    applyTheme(savedTheme as "light" | "dark");

    // Close menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const applyTheme = (newTheme: "light" | "dark") => {
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
    }
    localStorage.setItem("theme", newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    try {
      // Update password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      setTimeout(() => {
        setPasswordSuccess("");
      }, 3000);
    } catch (error: any) {
      setPasswordError(error.message || "Failed to update password");
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const { api } = await import("@/lib/api");
      
      // Delete account via backend
      await api.delete("/auth/delete-account");
      
      // Sign out and redirect
      await signOut();
      router.push("/login");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      alert(`Failed to delete account: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Email Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-neutral-800 rounded-lg border border-border/50 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
      >
        <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></div>
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {userEmail || "Loading..."}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Profile Menu Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-neutral-900 rounded-xl shadow-elevate border border-border/70 z-50 overflow-hidden">
          <div className="p-4 border-b border-border/70">
            <h3 className="font-semibold text-gray-900 dark:text-white">Profile Settings</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{userEmail}</p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {/* Theme Toggle */}
            <div className="p-4 border-b border-border/70">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Theme
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Switch between light and dark mode
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    theme === "dark" ? "bg-brand-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      theme === "dark" ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </label>
            </div>

            {/* Phone Number */}
            <div className="p-4 border-b border-border/70">
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full px-3 py-2 text-sm rounded-lg border border-border/70 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
                disabled
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Phone number functionality coming soon
              </p>
            </div>

            {/* Change Password */}
            <div className="p-4 border-b border-border/70">
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Change Password
              </div>
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border/70 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border/70 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
                    required
                    minLength={6}
                  />
                </div>
                {passwordError && (
                  <div className="text-xs text-red-600 dark:text-red-400">{passwordError}</div>
                )}
                {passwordSuccess && (
                  <div className="text-xs text-green-600 dark:text-green-400">{passwordSuccess}</div>
                )}
                <button
                  type="submit"
                  className="w-full px-3 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
                >
                  Update Password
                </button>
              </form>
            </div>

            {/* Delete Account */}
            <div className="p-4">
              <div className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                Danger Zone
              </div>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Delete Account
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Are you sure? This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {isDeleting ? "Deleting..." : "Yes, Delete"}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-border/70 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

