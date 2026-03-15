"use client";

import React, { useState } from "react";
import { providers } from "@/lib/providers";
import type { Provider } from "@/lib/types";

// ── SVG Icons (inline for zero-dependency) ────
const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const ScanIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const BoltIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const BrainIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M9.5 2A5.5 5.5 0 005 7.5c0 .59.14 1.24.38 1.8A4.5 4.5 0 002 13.5C2 16 4 18 6.5 18H7v4h4v-6" />
    <path d="M14.5 2A5.5 5.5 0 0119 7.5c0 .59-.14 1.24-.38 1.8A4.5 4.5 0 0122 13.5c0 2.5-2 4.5-4.5 4.5H17v4h-4v-6" />
  </svg>
);

const FixIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
  </svg>
);

const ChevronRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-severity-pass">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

// ── Provider Logo Components ──────────────────
function AWSLogo() {
  return (
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF9900] to-[#FF6600] flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-[#FF9900]/20">
      AWS
    </div>
  );
}

function GCPLogo() {
  return (
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4285F4] to-[#1967D2] flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-[#4285F4]/20">
      GCP
    </div>
  );
}

function DOLogo() {
  return (
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0080FF] to-[#0050CC] flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-[#0080FF]/20">
      DO
    </div>
  );
}

function AzureLogo() {
  return (
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0078D4] to-[#005A9E] flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-[#0078D4]/20">
      AZ
    </div>
  );
}

const providerLogos: Record<string, React.FC> = {
  AWS: AWSLogo,
  GCP: GCPLogo,
  DIGITALOCEAN: DOLogo,
  AZURE: AzureLogo,
};

// ── Feature Cards Data ────────────────────────
const features = [
  {
    icon: <ScanIcon />,
    title: "200+ Security Checks",
    description: "Comprehensive configuration scanning across IAM, storage, networking, compute, and more.",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: <BrainIcon />,
    title: "AI-Powered Analysis",
    description: "Get plain-language explanations and evidence-based remediation guidance for every finding.",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: <FixIcon />,
    title: "Automated Remediation",
    description: "Fix misconfigurations with one click. Dry-run first, approve, then auto-apply with rollback support.",
    color: "text-green-400",
    bgColor: "bg-green-500/10",
  },
  {
    icon: <BoltIcon />,
    title: "Attack Path Detection",
    description: "Visualize how findings chain together into real exploitation paths across your cloud resources.",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
  },
];

// ── Trust Badges ──────────────────────────────
const trustItems = [
  { icon: <LockIcon />, text: "Credentials encrypted with KMS" },
  { icon: <CheckCircleIcon />, text: "Read-only access — scans never modify resources" },
  { icon: <LockIcon />, text: "SOC 2 aligned security controls" },
  { icon: <CheckCircleIcon />, text: "Audit logged — every action recorded" },
];

// ── Landing Page Component ────────────────────
export default function LandingPage() {
  const [hoveredProvider, setHoveredProvider] = useState<string | null>(null);

  return (
    <div className="min-h-screen gradient-bg gradient-mesh relative overflow-hidden">
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />

      {/* Navigation */}
      <nav className="relative z-10 max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-brand-600/20 text-brand-400">
            <ShieldIcon />
          </div>
          <span className="text-xl font-bold text-white">
            Cloud<span className="text-brand-400">Guard</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a href="/login" className="btn-ghost text-surface-300 hover:text-white px-4 py-2 text-sm">
            Sign In
          </a>
          <a href="/register" className="btn-primary text-sm px-5 py-2.5">
            Get Started
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
            AI-Powered Cloud Security Platform
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight">
            Secure Your Cloud<br />
            <span className="text-gradient">In Minutes</span>
          </h1>

          <p className="text-lg md:text-xl text-surface-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Connect your cloud provider, scan 200+ security configurations,
            get AI-powered explanations, and fix misconfigurations — all from one dashboard.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <a href="/register" className="btn-primary text-base px-8 py-3.5 shadow-lg shadow-brand-600/30 hover:shadow-brand-600/50 transition-shadow">
              Start Free Assessment
              <ChevronRight />
            </a>
            <a href="/dashboard" className="btn-outline border-surface-600 text-surface-300 hover:text-white text-base px-8 py-3.5">
              View Demo Dashboard
            </a>
          </div>
        </div>
      </section>

      {/* Cloud Provider Selection */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-center text-2xl font-bold text-white mb-2 animate-slide-up">
          Select Your Cloud Provider
        </h2>
        <p className="text-center text-surface-400 mb-10">
          Connect one or multiple cloud accounts for comprehensive security coverage
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {providers.map((provider) => {
            const LogoComponent = providerLogos[provider.id];
            const isHovered = hoveredProvider === provider.id;
            return (
              <a
                key={provider.id}
                href={`/connect/${provider.id.toLowerCase()}`}
                className={`group relative p-6 rounded-2xl border transition-all duration-300 cursor-pointer
                  ${isHovered
                    ? "border-brand-500/50 bg-surface-800/80 shadow-xl shadow-brand-500/10 -translate-y-1"
                    : "border-surface-700/50 bg-surface-800/40 hover:border-brand-500/30 hover:bg-surface-800/60"
                  }`}
                onMouseEnter={() => setHoveredProvider(provider.id)}
                onMouseLeave={() => setHoveredProvider(null)}
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <LogoComponent />
                  <div>
                    <h3 className="font-semibold text-white text-sm mb-1">{provider.name}</h3>
                    <p className="text-xs text-surface-400 leading-relaxed">
                      {provider.id === "AZURE" ? "Coming Soon" : `${provider.credentialFields.length} credential fields`}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-medium transition-all duration-300 ${isHovered ? "text-brand-400" : "text-surface-500"}`}>
                    Connect <ChevronRight />
                  </div>
                </div>
                {provider.id === "AZURE" && (
                  <div className="absolute top-3 right-3 badge text-[10px] bg-surface-700 text-surface-400 border-surface-600">
                    Soon
                  </div>
                )}
              </a>
            );
          })}
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <div
              key={i}
              className="group p-6 rounded-2xl border border-surface-700/50 bg-surface-800/30 hover:bg-surface-800/60 hover:border-surface-600/50 transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-xl ${feature.bgColor} ${feature.color} flex items-center justify-center mb-4`}>
                {feature.icon}
              </div>
              <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-surface-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Section */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-24">
        <div className="rounded-2xl border border-surface-700/50 bg-surface-800/30 p-8">
          <h3 className="text-center font-semibold text-white mb-6">Built with Security First</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {trustItems.map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-surface-300">
                <span className="text-brand-400">{item.icon}</span>
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-surface-800 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-surface-500 text-sm">
            <div className="p-1.5 rounded-lg bg-brand-600/20 text-brand-400">
              <ShieldIcon />
            </div>
            <span>CloudGuard © 2026</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-surface-500">
            <a href="#" className="hover:text-surface-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-surface-300 transition-colors">Terms</a>
            <a href="#" className="hover:text-surface-300 transition-colors">Security</a>
            <a href="#" className="hover:text-surface-300 transition-colors">Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
