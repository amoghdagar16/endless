"use client";

import { COMPANY_ID } from "@/lib/api";

export default function Topbar() {
  return (
    <header className="h-16 bg-white border-b border-gray-200 fixed top-0 right-0 left-64 z-10">
      <div className="h-full px-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Financial Overview</h2>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            Company ID: <span className="font-mono text-xs">{COMPANY_ID.slice(0, 8)}...</span>
          </div>
        </div>
      </div>
    </header>
  );
}
