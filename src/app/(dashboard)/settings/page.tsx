"use client";

import React from "react";
import { trpc } from "@/trpc/client";

export default function SettingsPage() {
  const { data: profile, isLoading: isLoadingProfile } = trpc.settings.getProfile.useQuery();
  const { data: team, isLoading: isLoadingTeam } = trpc.settings.getTeam.useQuery();
  const { data: accounts, isLoading: isLoadingAccounts, refetch: refetchAccounts } = trpc.accounts.list.useQuery();
  
  const disconnectMutation = trpc.accounts.disconnect.useMutation({
    onSuccess: () => {
      // Refetch accounts or update local state
      alert("Account disconnected successfully. (Mock)");
      refetchAccounts();
    }
  });

  if (isLoadingProfile || isLoadingTeam || isLoadingAccounts) {
    return (
      <div className="flex items-center justify-center p-8 h-screen border-surface-800 shrink-0">
        <svg className="animate-spin h-8 w-8 text-brand-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-8">Organization Settings</h1>

      <div className="space-y-8">
        {/* Profile */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Profile</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Name</label>
              <input type="text" className="input" defaultValue={profile?.name} />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Email</label>
              <input type="email" className="input" defaultValue={profile?.email} disabled />
            </div>
          </div>
          <button className="btn-primary mt-4">Save Changes</button>
        </div>

        {/* Security */}
        <div className="card p-6 border-brand-500/20">
          <h2 className="text-lg font-semibold text-white mb-4">Security</h2>
          <div className="flex items-center justify-between p-4 bg-surface-900 rounded-lg border border-surface-800">
            <div>
              <h3 className="font-medium text-white">Multi-Factor Authentication (MFA)</h3>
              <p className="text-sm text-surface-400">Add an extra layer of security to your account.</p>
            </div>
            <button className="btn-outline">Enable MFA</button>
          </div>
        </div>

        {/* Team Members */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Team Members</h2>
            <button className="btn-primary py-2 text-xs">Invite Member</button>
          </div>
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-surface-800 text-surface-500">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Email</th>
                <th className="pb-2 font-medium">Role</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/50">
              {team?.map((member) => (
                <tr key={member.id}>
                  <td className="py-3 text-white">{member.name}</td>
                  <td className="py-3 text-surface-400">{member.email}</td>
                  <td className="py-3">
                    {member.role === "Owner" ? (
                      <span className="badge bg-purple-500/10 text-purple-400 border-purple-500/20">Owner</span>
                    ) : (
                      <span className="badge bg-surface-800 text-surface-300 border-surface-700">{member.role}</span>
                    )}
                  </td>
                  <td className={`py-3 font-medium text-xs ${member.status === 'Active' ? 'text-green-400' : 'text-surface-500'}`}>
                    {member.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Connected Accounts */}
        <div className="card p-6 border-surface-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Connected Cloud Accounts</h2>
            <a href="/" className="btn-primary py-2 text-xs">Connect New Provider</a>
          </div>
          {accounts && accounts.length > 0 ? (
            <div className="space-y-3">
              {accounts.map((acc: { id: string; provider: string; alias: string; accountId: string }) => (
                <div key={acc.id} className="flex items-center justify-between p-4 bg-surface-900 rounded-lg border border-surface-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-surface-800 flex items-center justify-center font-bold text-surface-300">
                      {acc.provider === "AWS" ? "AWS" : acc.provider === "GCP" ? "GCP" : "AZ"}
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{acc.alias}</h3>
                      <p className="text-xs text-surface-400">ID: {acc.accountId}</p>
                    </div>
                  </div>
                  <button 
                    className="btn-outline text-red-400 border-red-500/30 hover:bg-red-500/10 text-xs py-1.5"
                    onClick={() => {
                      if(confirm(`Are you sure you want to disconnect ${acc.alias}?`)) {
                        disconnectMutation.mutate({ accountId: acc.id });
                      }
                    }}
                    disabled={disconnectMutation.isPending}
                  >
                    Disconnect
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-surface-500 text-sm">
              No cloud accounts connected.
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="card p-6 border-red-500/30">
          <h2 className="text-lg font-semibold text-red-500 mb-2">Danger Zone</h2>
          <p className="text-sm text-surface-400 mb-4">Destructive actions for your organization.</p>
          <div className="flex items-center justify-between p-4 bg-red-500/5 rounded-lg border border-red-500/20">
            <div>
              <h3 className="font-medium text-white">Delete Organization</h3>
              <p className="text-sm text-red-300/80">Permanently delete this organization, all accounts, and scan data.</p>
            </div>
            <button className="btn-danger">Delete Organization</button>
          </div>
        </div>
      </div>
    </div>
  );
}
