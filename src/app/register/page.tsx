"use client";

import React, { useState } from "react";
import { trpc } from "@/trpc/client";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", orgName: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      window.location.href = "/dashboard";
    },
    onSettled: () => {
      setLoading(false);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    setLoading(true);
    registerMutation.mutate({
      name: form.name,
      email: form.email,
      orgName: form.orgName,
      password: form.password
    });
  };

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="min-h-screen gradient-bg gradient-mesh flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-brand-600/20 text-brand-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <span className="text-xl font-bold text-white">Cloud<span className="text-brand-400">Guard</span></span>
          </a>
          <h1 className="text-2xl font-bold text-white mb-2">Create your account</h1>
          <p className="text-surface-400">Start securing your cloud in minutes</p>
        </div>

        <div className="rounded-2xl border border-surface-700/50 bg-surface-800/60 backdrop-blur-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Full Name</label>
              <input type="text" className="input" placeholder="Jane Doe" value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Work Email</label>
              <input type="email" className="input" placeholder="you@company.com" value={form.email} onChange={(e) => update("email", e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Organization Name</label>
              <input type="text" className="input" placeholder="Acme Corp" value={form.orgName} onChange={(e) => update("orgName", e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Password</label>
              <input type="password" className="input" placeholder="Min. 8 characters" value={form.password} onChange={(e) => update("password", e.target.value)} required minLength={8} />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Confirm Password</label>
              <input type="password" className="input" placeholder="••••••••" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} required />
            </div>
            <div className="pt-1">
              <label className="flex items-start gap-2 text-sm text-surface-400 cursor-pointer">
                <input type="checkbox" required className="mt-0.5 rounded border-surface-600 bg-surface-700 text-brand-500 focus:ring-brand-500" />
                <span>I agree to the <a href="#" className="text-brand-400 hover:text-brand-300">Terms of Service</a> and <a href="#" className="text-brand-400 hover:text-brand-300">Privacy Policy</a></span>
              </label>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base mt-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Creating account...
                </span>
              ) : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-surface-400">
            Already have an account?{" "}
            <a href="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">Sign In</a>
          </div>
        </div>
      </div>
    </div>
  );
}
