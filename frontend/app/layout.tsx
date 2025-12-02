import type { Metadata } from "next";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";
import AppLayout from "@/components/AppLayout";
import ThemeProvider from "@/components/ThemeProvider";

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
        <ThemeProvider>
          <AuthGuard>
            <AppLayout>{children}</AppLayout>
          </AuthGuard>
        </ThemeProvider>
      </body>
    </html>
  );
}
