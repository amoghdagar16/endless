"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (!session) {
          setError("Authentication failed. Please try again.");
          setLoading(false);
          return;
        }

        // Check if user has a company
        const { api } = await import("@/lib/api");
        try {
          const companyResponse = await api.get("/auth/my-company");
          
          if (companyResponse.status === "no_company" || companyResponse.status === "not_found") {
            // User doesn't have a company - create one with default name
            const userEmail = session.user.email || "";
            const defaultCompanyName = userEmail.split("@")[0] + "'s Company";
            
            try {
              await api.post("/auth/signup", {
                company_name: defaultCompanyName,
                user_name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
                user_email: userEmail,
              });
            } catch (createError: any) {
              console.error("Failed to create company:", createError);
              // Continue anyway - user can create company later
            }
          }
        } catch (companyError: any) {
          console.error("Error checking company:", companyError);
          // Continue anyway
        }

        // Redirect to dashboard
        router.push("/");
      } catch (err: any) {
        console.error("Auth callback error:", err);
        setError(err.message || "Authentication failed");
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900">
      <div className="text-center">
        <svg
          className="animate-spin h-8 w-8 text-brand-500 mx-auto mb-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <p className="text-sm text-gray-500 dark:text-gray-400">Completing sign in...</p>
      </div>
    </div>
  );
}

