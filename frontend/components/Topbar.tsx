"use client";

import { usePathname } from "next/navigation";
import ProfileMenu from "./ProfileMenu";

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
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
