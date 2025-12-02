"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";

export default function DebugCompanyPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        // Get Supabase session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        const info: any = {
          hasSession: !!session,
          sessionError: sessionError?.message || null,
          userEmail: session?.user?.email || null,
          userId: session?.user?.id || null,
        };

        if (session) {
          try {
            // Try to get company
            const companyResponse = await api.get("/auth/my-company");
            info.companyResponse = companyResponse;
            
            // Try to create company if missing
            if (companyResponse.status === "no_company" || companyResponse.status === "not_found") {
              try {
                const createResponse = await api.post("/auth/signup", {
                  company_name: (session.user.email || "user").split("@")[0] + "'s Company",
                  user_name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
                  user_email: session.user.email || "",
                });
                info.createResponse = createResponse;
              } catch (createError: any) {
                info.createError = {
                  message: createError.message,
                  response: createError.response?.data || null,
                };
              }
            }
          } catch (apiError: any) {
            info.apiError = {
              message: apiError.message,
              response: apiError.response?.data || null,
            };
          }
        }

        setDebugInfo(info);
      } catch (error: any) {
        setDebugInfo({ error: error.message });
      } finally {
        setLoading(false);
      }
    };

    fetchDebugInfo();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading debug info...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Company Debug Info</h1>
        <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>
    </div>
  );
}

