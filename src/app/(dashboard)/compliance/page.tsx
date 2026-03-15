"use client";

import React, { useState } from "react";
import { trpc } from "@/trpc/client";
import { 
  ShieldCheck, 
  ShieldAlert, 
  ChevronRight, 
  Plus, 
  BarChart3,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";

import CreateFrameworkModal from "@/components/compliance/CreateFrameworkModal";

export default function CompliancePage() {
  const [selectedFrameworkId, setSelectedFrameworkId] = useState("ISO-27001");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const utils = trpc.useContext();
  const { data: frameworks, isLoading: loadingFrameworks, refetch: refetchFrameworks } = trpc.compliance.getFrameworks.useQuery();
  const { data: status, isLoading: loadingStatus } = trpc.compliance.getStatus.useQuery({ 
    frameworkId: selectedFrameworkId 
  });

  const selectedFramework = frameworks?.find(f => f.id === selectedFrameworkId);

  // Statistics
  const totalControls = status?.length || 0;
  const passedControls = status?.filter(s => s.status === "PASS").length || 0;
  const failedControls = status?.filter(s => s.status === "FAIL").length || 0;
  const partialControls = status?.filter(s => s.status === "PARTIAL").length || 0;
  const coveragePercent = totalControls > 0 ? Math.round((passedControls / totalControls) * 100) : 0;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Compliance Monitoring</h1>
          <p className="text-surface-400">Evaluate your cloud security posture against industry standards.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-brand-600/10"
        >
          <Plus className="w-4 h-4" />
          Custom Framework
        </button>
      </div>

      <CreateFrameworkModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => {
          refetchFrameworks();
        }}
      />

      {/* Framework Selector & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Framework Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-surface-900 border border-surface-800 rounded-2xl p-4 overflow-y-auto max-h-[600px] custom-scrollbar">
            <h3 className="text-xs font-bold text-surface-500 uppercase tracking-widest mb-4 px-2">Frameworks</h3>
            <h3 className="text-sm font-semibold text-surface-200">Standard Frameworks</h3>
            <div className="p-2 space-y-1">
              {frameworks?.map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFrameworkId(f.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-between group
                    ${selectedFrameworkId === f.id 
                      ? "bg-brand-600/15 text-brand-400 border border-brand-500/20" 
                      : "text-surface-400 hover:text-surface-200 hover:bg-surface-800/50"}`}
                >
                  <span>{f.name}</span>
                  {f.isBuiltIn && <ShieldCheck className={`w-3.5 h-3.5 ${selectedFrameworkId === f.id ? "opacity-100" : "opacity-0 group-hover:opacity-50"}`} />}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-brand-600/20 to-purple-600/20 border border-brand-500/20 rounded-xl p-5 space-y-4">
            <h4 className="text-sm font-semibold text-brand-300 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Evaluation Result
            </h4>
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-surface-800" />
                  <circle 
                    cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" 
                    strokeDasharray={176} 
                    strokeDashoffset={176 - (176 * coveragePercent) / 100}
                    className="text-brand-500 transition-all duration-1000 ease-out" 
                  />
                </svg>
                <span className="absolute text-sm font-bold text-white">{coveragePercent}%</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{passedControls}</p>
                <p className="text-xs text-surface-500 uppercase tracking-wider font-semibold">Passed Checks</p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls Table */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-surface-900 border border-surface-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-surface-800 bg-surface-950/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="text-white font-semibold">{selectedFramework?.name} Controls</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-800 text-surface-400 uppercase">{totalControls} Controls</span>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                <input 
                  type="text" 
                  placeholder="Filter controls..." 
                  className="w-full bg-surface-950 border border-surface-800 rounded-lg py-1.5 pl-10 pr-4 text-xs text-white placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              {loadingStatus ? (
                <div className="p-12 text-center text-surface-500">Evaluating framework...</div>
              ) : (
                <table className="w-full text-left">
                  <thead className="text-xs font-semibold text-surface-500 bg-surface-950/30 uppercase tracking-tight">
                    <tr>
                      <th className="px-6 py-4">Control ID</th>
                      <th className="px-6 py-4">Requirement</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4">Findings</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800/50">
                    {status?.map((control) => (
                      <tr key={control.id} className="group hover:bg-surface-800/30 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-brand-400">{control.controlId}</td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-surface-200">{control.title}</p>
                          <p className="text-xs text-surface-500 mt-1 line-clamp-1 group-hover:line-clamp-none transition-all">{control.description}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            <StatusBadge status={control.status} />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex -space-x-2">
                             {control.findings.length > 0 ? (
                               control.findings.slice(0, 3).map((f, i) => (
                                 <div key={i} className={`w-6 h-6 rounded-full border border-surface-900 flex items-center justify-center text-[8px] font-bold
                                   ${f.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                   !
                                 </div>
                               ))
                             ) : (
                               <span className="text-xs text-surface-600">—</span>
                             )}
                             {control.findings.length > 3 && (
                               <div className="w-6 h-6 rounded-full border border-surface-900 bg-surface-800 flex items-center justify-center text-[8px] font-bold text-surface-400">
                                 +{control.findings.length - 3}
                               </div>
                             )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-1 rounded hover:bg-surface-750 text-surface-500 hover:text-white transition-all">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "PASS":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
          <CheckCircle2 className="w-3 h-3" />
          PASSED
        </span>
      );
    case "FAIL":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/10 text-red-500 text-[10px] font-bold">
          <XCircle className="w-3 h-3" />
          FAILED
        </span>
      );
    case "PARTIAL":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 text-amber-500 text-[10px] font-bold">
          <AlertCircle className="w-3 h-3" />
          PARTIAL
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-surface-800 text-surface-400 text-[10px] font-bold">
          NO DATA
        </span>
      );
  }
}
