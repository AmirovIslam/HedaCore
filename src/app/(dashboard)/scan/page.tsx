"use client";

import React, { useState, useMemo } from "react";
import { mockAccounts, mockChecks, scanPresets } from "@/lib/mock-data";
import { trpc } from "@/trpc/client";

export default function ScanConfigurationPage() {
  const [selectedAccount, setSelectedAccount] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("ALL");
  const [selectedService, setSelectedService] = useState("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState("ALL");
  const [selectedChecks, setSelectedChecks] = useState<Set<string>>(new Set(mockChecks.map(c => c.id)));
  const [activePreset, setActivePreset] = useState("full");
  
  const { data: accounts, isLoading: isLoadingAccounts } = trpc.accounts.list.useQuery();
  
  // Initialize selectedAccount when accounts load
  React.useEffect(() => {
    if (accounts && accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0].id);
    }
  }, [accounts, selectedAccount]);

  const startScan = trpc.scan.startScan.useMutation({
    onSuccess: () => {
      // Mock scanning progress animation then redirect
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    }
  });

  // Derive available filters based on current data
  const providersList = useMemo(() => ["ALL", ...Array.from(new Set(mockChecks.map(c => c.provider))).sort()], []);
  const services = useMemo(() => {
    const relevantChecks = selectedProvider === "ALL" ? mockChecks : mockChecks.filter(c => c.provider === selectedProvider);
    return ["ALL", ...Array.from(new Set(relevantChecks.map(c => c.service))).sort()]
  }, [selectedProvider]);
  
  // Filter checks
  const filteredChecks = useMemo(() => {
    return mockChecks.filter((c) => {
      const matchSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchProvider = selectedProvider === "ALL" || c.provider === selectedProvider;
      const matchService = selectedService === "ALL" || c.service === selectedService;
      const matchSeverity = selectedSeverity === "ALL" || c.severity === selectedSeverity;
      return matchSearch && matchProvider && matchService && matchSeverity;
    });
  }, [searchQuery, selectedProvider, selectedService, selectedSeverity]);

  const toggleCheck = (id: string) => {
    const next = new Set(selectedChecks);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedChecks(next);
    setActivePreset("custom");
  };

  const selectAllFiltered = () => {
    const next = new Set(selectedChecks);
    filteredChecks.forEach(c => next.add(c.id));
    setSelectedChecks(next);
  };

  const deselectAllFiltered = () => {
    const next = new Set(selectedChecks);
    filteredChecks.forEach(c => next.delete(c.id));
    setSelectedChecks(next);
  };

  const handleStartScan = () => {
    startScan.mutate({
      accountId: selectedAccount,
      checkIds: Array.from(selectedChecks)
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Configure Scan</h1>
          <p className="text-surface-400 text-sm">Select target account and configure security checks</p>
          {startScan.error && (
            <p className="mt-2 text-sm text-red-500 font-medium">{startScan.error.message}</p>
          )}
        </div>
        <button 
          onClick={handleStartScan} 
          disabled={selectedChecks.size === 0 || startScan.isPending} 
          className="btn-primary"
        >
          {startScan.isPending ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              Starting Scan...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"/></svg>
              Start Scan ({selectedChecks.size} checks)
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Controls */}
        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-3">1. Target Environment</h3>
            <select 
              className="input text-sm"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              disabled={isLoadingAccounts || !accounts || accounts.length === 0}
            >
              {isLoadingAccounts ? (
                <option>Loading accounts...</option>
              ) : accounts && accounts.length > 0 ? (
                accounts.map((acc: any) => (
                  <option key={acc.id} value={acc.id}>{acc.alias} ({acc.provider})</option>
                ))
              ) : (
                <option value="">No accounts connected</option>
              )}
            </select>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-3">2. Scan Presets</h3>
            <div className="space-y-2">
              {scanPresets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => {
                    setActivePreset(preset.id);
                    if (preset.id === "full") {
                      setSelectedChecks(new Set(mockChecks.map(c => c.id)));
                    } else if (preset.id === "iam") {
                      setSelectedChecks(new Set(mockChecks.filter(c => c.service === "IAM").map(c => c.id)));
                    } else {
                      // Just mock partial selection for demo
                      setSelectedChecks(new Set(mockChecks.slice(0, preset.checkCount).map(c => c.id)));
                    }
                  }}
                  className={`w-full flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                    activePreset === preset.id 
                      ? "bg-brand-500/10 border-brand-500/30 ring-1 ring-brand-500/50" 
                      : "bg-surface-800/50 border-surface-700/50 hover:bg-surface-800"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>{preset.icon}</span>
                    <span className={`font-medium text-sm ${activePreset === preset.id ? "text-brand-300" : "text-surface-200"}`}>
                      {preset.name}
                    </span>
                  </div>
                  <span className="text-xs text-surface-500">{preset.description} ({preset.checkCount} checks)</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Check Library */}
        <div className="lg:col-span-3 card flex flex-col overflow-hidden h-[800px]">
          <div className="p-4 border-b border-surface-800 bg-surface-800/30">
            <h3 className="text-sm font-semibold text-white mb-4">3. Check Library ({selectedChecks.size} selected)</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>
                <input 
                  type="text" 
                  placeholder="Search checks by ID, title, or tags..." 
                  className="input pl-9 text-sm h-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2 w-full mt-3 sm:mt-0 sm:w-auto overflow-x-auto">
                <select className="input text-sm h-10 w-32 shrink-0" value={selectedProvider} onChange={(e) => { setSelectedProvider(e.target.value); setSelectedService("ALL"); }}>
                  {providersList.map(p => <option key={p} value={p}>{p === "ALL" ? "All Clouds" : p}</option>)}
                </select>
                <select className="input text-sm h-10 w-32 shrink-0" value={selectedService} onChange={(e) => setSelectedService(e.target.value)}>
                  {services.map(s => <option key={s} value={s}>{s === "ALL" ? "All Services" : s}</option>)}
                </select>
                <select className="input text-sm h-10 w-36 shrink-0" value={selectedSeverity} onChange={(e) => setSelectedSeverity(e.target.value)}>
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-4 mt-4 text-sm">
              <button onClick={selectAllFiltered} className="text-brand-400 hover:text-brand-300">Select Filtered ({filteredChecks.length})</button>
              <button onClick={deselectAllFiltered} className="text-surface-400 hover:text-surface-300">Deselect Filtered</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {filteredChecks.length === 0 ? (
              <div className="p-8 text-center text-surface-500">No checks match your filters.</div>
            ) : (
              <div className="space-y-1">
                {filteredChecks.map(check => {
                  const isSelected = selectedChecks.has(check.id);
                  return (
                    <div 
                      key={check.id}
                      onClick={() => toggleCheck(check.id)}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected 
                          ? "bg-brand-500/5 border-brand-500/20" 
                          : "bg-surface-800/20 border-transparent hover:bg-surface-800/50"
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => {}} // handled by parent div click
                        className="mt-1 rounded border-surface-600 bg-surface-700 text-brand-500 focus:ring-brand-500/50"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-xs text-brand-400">{check.id}</span>
                          <span className={`badge text-[10px] ${
                            check.severity === "CRITICAL" ? "bg-red-500/10 text-red-500 border-red-500/20" 
                            : check.severity === "HIGH" ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                            : check.severity === "MEDIUM" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                            : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                          }`}>{check.severity}</span>
                          <span className="text-xs font-medium text-surface-200 truncate">{check.title}</span>
                        </div>
                        <p className="text-xs text-surface-400 line-clamp-1 mb-2">{check.description}</p>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-surface-500 flex-wrap">
                          <span className="bg-surface-800 px-1.5 py-0.5 rounded border border-surface-700">{check.service}</span>
                          <span className="bg-surface-800 px-1.5 py-0.5 rounded border border-surface-700">{check.category}</span>
                          {check.tags.slice(0, 2).map(t => (
                            <span key={t} className="bg-surface-800/50 px-1.5 py-0.5 rounded">#{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
