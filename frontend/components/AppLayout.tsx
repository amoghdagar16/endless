"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  // Login page doesn't need sidebar/topbar
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Main app layout with sidebar and topbar
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

