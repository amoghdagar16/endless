"use client";

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useAuth } from "@/contexts/AuthContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, companyId } = useAuth();

  // Public routes that don't require auth
  const publicRoutes = ['/auth', '/login', '/signup', '/forgot-password'];
  const isPublicRoute = publicRoutes.includes(pathname);
  const isOnboarding = pathname === '/onboarding';

  // Redirect logic
  useEffect(() => {
    if (!loading) {
      if (!user && !isPublicRoute) {
        // Not logged in and trying to access protected route
        router.push('/auth');
      } else if (user && isPublicRoute) {
        // Logged in and trying to access login/signup
        router.push('/');
      } else if (user && !isPublicRoute && !isOnboarding) {
        // User is logged in but doesn't have a company - redirect to onboarding
        // This handles the case where user signed in but doesn't exist in our database
        if (!companyId) {
          router.push('/onboarding');
        }
      }
    }
  }, [user, loading, companyId, pathname, router, isPublicRoute, isOnboarding]);

  // Show loading screen while checking auth
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg dark:bg-neutral-900">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  // Show auth pages without sidebar/topbar
  if (isPublicRoute || isOnboarding) {
    return <>{children}</>;
  }

  // Show full app layout for authenticated users with company
  return (
    <div className="flex h-screen overflow-hidden bg-bg dark:bg-neutral-900">
      <Sidebar />
      <div className="flex-1 ml-60 flex flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto mt-16 p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
