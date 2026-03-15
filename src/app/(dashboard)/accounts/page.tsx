"use client";

import React from "react";
import Link from "next/link";
import { trpc } from "@/trpc/client";
import { Cloud, Server, Database, Container, Trash2, ExternalLink, ShieldCheck } from "lucide-react";

export default function AccountsPage() {
  const { data: accounts, isLoading, refetch } = trpc.accounts.list.useQuery();
  const deleteMutation = trpc.accounts.disconnect.useMutation({
    onSuccess: () => refetch()
  });

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "AWS": return <Cloud className="text-[#FF9900]" />;
      case "GCP": return <Server className="text-[#4285F4]" />;
      case "DIGITALOCEAN": return <Database className="text-[#0080FF]" />;
      case "AZURE": return <Container className="text-[#0078D4]" />;
      default: return <Cloud />;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Cloud Accounts</h1>
          <p className="text-surface-400">Manage your connected cloud environments and scanning credentials.</p>
        </div>
        <Link href="/connect" className="btn-primary">
          Connect New Provider
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-surface-900 rounded-xl border border-surface-800" />
            ))}
          </div>
        ) : accounts?.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 bg-surface-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="text-surface-500" size={32} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No accounts connected</h3>
            <p className="text-surface-400 mb-6 max-w-sm mx-auto">
              You haven't connected any cloud accounts yet. Start by connecting a provider to scan your infrastructure.
            </p>
            <Link href="/connect" className="btn-primary">
              Connect Your First Account
            </Link>
          </div>
        ) : (
          accounts?.map((account) => (
            <div key={account.id} className="card p-5 flex items-center justify-between group hover:border-surface-600 transition-colors">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-surface-800 flex items-center justify-center shadow-inner">
                  {getProviderIcon(account.provider)}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white">{account.alias}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 uppercase">
                      {account.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-surface-500">
                    <span className="flex items-center gap-1">
                      <span className="font-medium">ID:</span> {account.accountId}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="font-medium">Connected:</span> {account.validatedAt ? new Date(account.validatedAt).toLocaleDateString() : "Never"}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    if (confirm("Are you sure you want to disconnect this account?")) {
                      deleteMutation.mutate({ accountId: account.id });
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="p-2 text-surface-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  title="Disconnect Account"
                >
                  <Trash2 size={18} />
                </button>
                <Link 
                  href={`/scan?account=${account.id}`}
                  className="p-2 text-surface-500 hover:text-brand-400 hover:bg-brand-400/10 rounded-lg transition-colors"
                  title="Run Scan"
                >
                  <ExternalLink size={18} />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
      
      {!isLoading && accounts && accounts.length > 0 && (
        <div className="mt-8 p-6 rounded-2xl bg-brand-500/5 border border-brand-500/10">
          <div className="flex gap-4">
            <div className="mt-1">
              <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400">
                <ShieldCheck size={20} />
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-1">Security Note</h4>
              <p className="text-sm text-surface-400 leading-relaxed">
                Connect additional accounts to get a holistic view of your multi-cloud security posture. 
                CloudGuard uses read-only permissions by default to ensure your infrastructure remains secure.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
