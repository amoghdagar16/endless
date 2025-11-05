"use client";

import { COMPANY_ID } from "@/lib/api";
import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/expenses": "Expenses",
  "/journals": "Journal Entries",
  "/documents": "Smart Parser",
  "/ai": "AI Console",
};

export default function Topbar() {
  const pathname = usePathname();
  const pageTitle = pageTitles[pathname] || "MiniBooks";

  return (
    <header className="h-16 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-border/70 fixed top-0 right-0 left-60 z-10 transition-all">
      <div className="h-full px-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{pageTitle}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {pathname === "/" && "Your financial insights at a glance"}
            {pathname === "/expenses" && "Track and manage business expenses"}
            {pathname === "/journals" && "View accounting journal entries"}
            {pathname === "/documents" && "Extract data from receipts"}
            {pathname === "/ai" && "Ask your AI accountant anything"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-neutral-800 rounded-lg border border-border/50">
            <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {COMPANY_ID ? (
                <span className="font-mono">{COMPANY_ID.slice(0, 8)}</span>
              ) : (
                "No Company"
              )}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
