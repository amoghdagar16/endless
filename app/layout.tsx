import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export const metadata: Metadata = {
  title: "MiniBooks - AI Financial Companion",
  description: "QuickBooks-style financial management with AI oversight",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
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
      </body>
    </html>
  );
}
