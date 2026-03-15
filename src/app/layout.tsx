import type { Metadata } from "next";
import { TRPCProvider } from "@/trpc/Provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "CloudGuard — AI-Powered Cloud Security Posture Management",
  description:
    "Secure your cloud infrastructure in minutes. Connect AWS, GCP, Azure, or DigitalOcean and get AI-powered security assessment with automated remediation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-surface-950 text-surface-100 custom-scrollbar">
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
