"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { getProvider } from "@/lib/providers";
import { trpc } from "@/trpc/client";

export default function ConnectProviderPage() {
  const params = useParams();
  const providerId = (params.provider as string || "").toUpperCase();
  const provider = getProvider(providerId);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "validating" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const connectAccount = trpc.accounts.connect.useMutation({
    onSuccess: () => {
      setStatus("success");
      setTimeout(() => { window.location.href = "/dashboard"; }, 1500);
    },
    onError: (error) => {
      setStatus("error");
      setErrorMsg(error.message || "Failed to validate credentials.");
    }
  });

  if (!provider) {
    return (
      <div className="min-h-screen gradient-bg gradient-mesh flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Provider not found</h1>
          <a href="/" className="text-brand-400 hover:text-brand-300">← Back to home</a>
        </div>
      </div>
    );
  }

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setStatus("idle");
    setErrorMsg("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("validating");
    connectAccount.mutate({
      provider: providerId,
      credentials: formData,
    });
  };

  return (
    <div className="min-h-screen gradient-bg gradient-mesh">
      {/* Nav */}
      <nav className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-brand-600/20 text-brand-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span className="text-xl font-bold text-white">Cloud<span className="text-brand-400">Guard</span></span>
        </a>
        <a href="/" className="btn-ghost text-surface-400 text-sm">← Back</a>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${provider.gradient} flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 shadow-lg`}>
            {provider.id === "DIGITALOCEAN" ? "DO" : provider.id === "AZURE" ? "AZ" : provider.id}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Connect {provider.name}</h1>
          <p className="text-surface-400 max-w-md mx-auto">{provider.description}</p>
        </div>

        {/* Security Notice */}
        <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-4 mb-8 flex items-start gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-brand-400 mt-0.5 shrink-0"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          <div className="text-sm">
            <p className="text-brand-300 font-medium mb-1">Your credentials are encrypted and secure</p>
            <p className="text-surface-400">Credentials are encrypted with AES-256 and stored in a dedicated secret vault. They are never logged, exposed in the UI, or accessible to our team.</p>
          </div>
        </div>

        {/* Credential Form */}
        <div className="rounded-2xl border border-surface-700/50 bg-surface-800/60 backdrop-blur-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {provider.credentialFields.map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">
                  {field.label} {field.required && <span className="text-red-400">*</span>}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    className="input min-h-[120px] font-mono text-sm"
                    placeholder={field.placeholder}
                    value={formData[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    required={field.required}
                  />
                ) : field.type === "select" ? (
                  <select
                    className="input"
                    value={formData[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    required={field.required}
                  >
                    <option value="">{field.placeholder}</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    className="input font-mono text-sm"
                    placeholder={field.placeholder}
                    value={formData[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    required={field.required}
                  />
                )}
                {field.helpText && (
                  <p className="mt-1.5 text-xs text-surface-500">{field.helpText}</p>
                )}
              </div>
            ))}

            {/* Status Messages */}
            {status === "success" && (
              <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-green-400"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span className="text-sm text-green-300">Connection validated successfully! Redirecting to dashboard...</span>
              </div>
            )}
            {status === "error" && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-red-400"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <span className="text-sm text-red-300">{errorMsg || "Failed to validate credentials."}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={status === "validating" || status === "success"} className="btn-primary flex-1 py-3 text-base">
                {status === "validating" ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Validating...
                  </span>
                ) : status === "success" ? "✓ Connected" : "Test & Connect"}
              </button>
            </div>
          </form>
        </div>

        {/* Instructions */}
        <div className="mt-8 rounded-2xl border border-surface-700/50 bg-surface-800/30 p-6">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-brand-400"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            Setup Instructions
          </h3>
          {providerId === "AWS" && (
            <ol className="text-sm text-surface-400 space-y-2 list-decimal list-inside">
              <li>Create a dedicated IAM user (e.g., <code className="text-brand-300 bg-surface-700 px-1.5 py-0.5 rounded">cloudguard-scanner</code>)</li>
              <li>Attach the <code className="text-brand-300 bg-surface-700 px-1.5 py-0.5 rounded">SecurityAudit</code> managed policy</li>
              <li>Generate an access key pair under Security Credentials</li>
              <li>Paste the Access Key ID and Secret Access Key above</li>
              <li>We recommend using a cross-account IAM role for production</li>
            </ol>
          )}
          {providerId === "GCP" && (
            <ol className="text-sm text-surface-400 space-y-2 list-decimal list-inside">
              <li>Go to GCP Console → IAM & Admin → Service Accounts</li>
              <li>Create a new service account (e.g., <code className="text-brand-300 bg-surface-700 px-1.5 py-0.5 rounded">cloudguard-scanner</code>)</li>
              <li>Grant the <code className="text-brand-300 bg-surface-700 px-1.5 py-0.5 rounded">Viewer</code> role</li>
              <li>Create and download a JSON key</li>
              <li>Paste the entire JSON key contents above</li>
            </ol>
          )}
          {providerId === "DIGITALOCEAN" && (
            <ol className="text-sm text-surface-400 space-y-2 list-decimal list-inside">
              <li>Go to DigitalOcean Console → API → Personal Access Tokens</li>
              <li>Click &quot;Generate New Token&quot;</li>
              <li>Name it <code className="text-brand-300 bg-surface-700 px-1.5 py-0.5 rounded">cloudguard-scanner</code> with read-only scope</li>
              <li>Copy and paste the token above</li>
            </ol>
          )}
          {providerId === "AZURE" && (
            <ol className="text-sm text-surface-400 space-y-2 list-decimal list-inside">
              <li>Register an application in Azure AD</li>
              <li>Create a client secret</li>
              <li>Grant the <code className="text-brand-300 bg-surface-700 px-1.5 py-0.5 rounded">Reader</code> role on the target subscription</li>
              <li>Copy Tenant ID, Client ID, Client Secret, and Subscription ID</li>
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
