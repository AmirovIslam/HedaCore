"use client";

import React, { useState } from "react";
import { mockAIExplanations } from "@/lib/mock-data";
import { getSeverityBadgeClass, timeAgo } from "@/lib/utils";
import type { Finding } from "@/lib/types";
import { trpc } from "@/trpc/client";

export default function FindingsPage() {
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [activeTab, setActiveTab] = useState<"ai" | "evidence" | "remediation">("ai");
  const [remediationStatus, setRemediationStatus] = useState<"idle" | "dry-run" | "executing" | "success">("idle");

  const { data: findings, isLoading } = trpc.findings.list.useQuery();

  const closeDrawer = () => {
    setSelectedFinding(null);
    setActiveTab("ai");
    setRemediationStatus("idle");
  };

  const handleFix = () => {
    setRemediationStatus("dry-run");
    setTimeout(() => {
      setRemediationStatus("executing");
      setTimeout(() => {
        setRemediationStatus("success");
      }, 2000);
    }, 1500);
  };

  const aiExplanation = selectedFinding 
    ? (mockAIExplanations[selectedFinding.id] || {
        simple: selectedFinding.riskSummary || "This security finding was dynamically detected by the scanner. It requires investigation.",
        technical: "The scanner identified a potential misconfiguration or security risk in the specified resource. Review the Raw Evidence tab for detailed configuration data returned by the Cloud Provider API.",
        businessImpact: "Depending on the resource sensitivity, this could lead to unauthorized access, data exposure, or compliance violations.",
        fixRecommendation: "Review the resource configuration in the Cloud Provider Console and apply the principle of least privilege. Specifically, restrict access to necessary IPs/Roles or toggle security blocks.",
        attackScenario: "An attacker could discover this resource horizontally and attempt exploitation, potentially gaining privileged access to related infrastructure.",
        manualSteps: [
          "1. Open your Cloud Provider Console.",
          "2. Navigate to the affected service and locate the resource.",
          "3. Review the security settings.",
          "4. Apply patches, restrict access, or enable missing protections.",
          "5. Run a new scan to verify the fix."
        ],
        cliCommands: [
          "# Example AWS CLI command to verify:",
          `aws ${selectedFinding.service.toLowerCase()} get-resource --id ${selectedFinding.resourceArn.split(":").pop()}`
        ]
      })
    : null;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="px-8 pt-8 pb-4 border-b border-surface-800 shrink-0">
        <h1 className="text-2xl font-bold text-white mb-4">Findings</h1>
        
        {/* Filters */}
        <div className="flex gap-3 text-sm">
          <input type="text" placeholder="Search resources, titles..." className="input h-10 flex-1 max-w-sm" />
          <select className="input h-10 w-32"><option>Severity</option></select>
          <select className="input h-10 w-32"><option>Service</option></select>
          <select className="input h-10 w-32"><option>Status: Open</option></select>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Findings List */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <svg className="animate-spin h-8 w-8 text-brand-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            </div>
          ) : (
            <div className="space-y-3">
              {findings?.map((finding: any) => (
              <div 
                key={finding.id} 
                onClick={() => setSelectedFinding(finding)}
                className={`card p-4 flex gap-4 cursor-pointer transition-colors ${
                  selectedFinding?.id === finding.id ? "bg-brand-500/5 border-brand-500/30 ring-1 ring-brand-500/30" : "hover:border-surface-600"
                }`}
              >
                <div className="mt-1">
                  <span className={`badge ${getSeverityBadgeClass(finding.severity)}`}>{finding.severity}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium text-surface-200 truncate pr-4">{finding.title}</h3>
                    <span className="text-xs text-surface-500 whitespace-nowrap">{timeAgo(finding.detectedAt)}</span>
                  </div>
                  <div className="flex gap-2 text-xs font-mono text-surface-400 mb-2 truncate">
                    <span>{finding.provider}</span> / <span>{finding.service}</span> / <span className="text-brand-300 truncate">{finding.resourceArn.split(":").pop() || finding.resourceArn}</span>
                  </div>
                  <p className="text-sm text-surface-500 line-clamp-1">{finding.riskSummary}</p>
                </div>
              </div>
            ))}
            </div>
          )}
        </div>

        {/* Finding Detail Drawer (Side Panel) */}
        {selectedFinding && (
          <div className="w-[500px] bg-surface-900 border-l border-surface-800 flex flex-col shadow-2xl animate-slide-in-right z-30 shrink-0">
            {/* Drawer Header */}
            <div className="p-5 border-b border-surface-800 flex justify-between items-start sticky top-0 bg-surface-900 z-10">
              <div className="flex-1 min-w-0 mr-4">
                <div className="flex gap-2 mb-2">
                  <span className={`badge ${getSeverityBadgeClass(selectedFinding.severity)}`}>{selectedFinding.severity}</span>
                  <span className="badge bg-surface-800 text-surface-400">{selectedFinding.status}</span>
                </div>
                <h2 className="text-lg font-bold text-white leading-tight">{selectedFinding.title}</h2>
                <div className="text-xs font-mono text-surface-400 mt-2 break-all">{selectedFinding.resourceArn}</div>
              </div>
              <button onClick={closeDrawer} className="p-1 rounded-md text-surface-500 hover:text-white hover:bg-surface-800">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-surface-800 px-5 sticky top-[108px] bg-surface-900 z-10">
              {[
                { id: "ai", label: "AI Analysis" },
                { id: "evidence", label: "Raw Evidence" },
                { id: "remediation", label: "Remediation" },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id ? "border-brand-500 text-brand-400" : "border-transparent text-surface-400 hover:text-surface-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Drawer Content */}
            <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
              
              {/* AI Analysis Tab */}
              {activeTab === "ai" && aiExplanation && (
                <div className="space-y-6">
                  <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-4 relative">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-purple-400 absolute top-4 right-4"><path d="M9.5 2A5.5 5.5 0 005 7.5c0 .59.14 1.24.38 1.8A4.5 4.5 0 002 13.5C2 16 4 18 6.5 18H7v4h4v-6" /><path d="M14.5 2A5.5 5.5 0 0119 7.5c0 .59-.14 1.24-.38 1.8A4.5 4.5 0 0122 13.5c0 2.5-2 4.5-4.5 4.5H17v4h-4v-6" /></svg>
                    <h3 className="text-sm font-bold text-purple-300 mb-2">Executive Summary</h3>
                    <p className="text-sm text-surface-300 leading-relaxed">{aiExplanation.simple}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-white mb-2 pb-1 border-b border-surface-800">Business Impact</h3>
                    <p className="text-sm text-surface-400 leading-relaxed">{aiExplanation.businessImpact}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-white mb-2 pb-1 border-b border-surface-800">Technical Details</h3>
                    <p className="text-sm text-surface-400 leading-relaxed">{aiExplanation.technical}</p>
                  </div>

                  {aiExplanation.attackScenario && (
                    <div>
                      <h3 className="text-sm font-semibold text-orange-400 mb-2 pb-1 border-b border-surface-800">Attack Scenario</h3>
                      <p className="text-sm text-surface-400 leading-relaxed whitespace-pre-line font-mono bg-surface-950 p-3 rounded-lg border border-surface-800">{aiExplanation.attackScenario}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Evidence Tab */}
              {activeTab === "evidence" && (
                <div className="space-y-4">
                  <p className="text-sm text-surface-400">Raw configuration data collected during scan.</p>
                  <pre className="bg-surface-950 p-4 rounded-xl border border-surface-800 overflow-x-auto text-[11px] font-mono text-brand-200">
                    {JSON.stringify(selectedFinding.evidence, null, 2)}
                  </pre>
                </div>
              )}

              {/* Remediation Tab */}
              {activeTab === "remediation" && aiExplanation && (
                <div className="space-y-6">
                  {/* Action Banner */}
                  <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 p-5">
                    <h3 className="font-semibold text-brand-300 mb-2">Recommendation</h3>
                    <p className="text-sm text-surface-300 mb-4">{aiExplanation.fixRecommendation}</p>
                    
                    {remediationStatus === "idle" && (
                      <button onClick={handleFix} className="btn-primary w-full">Ask AI to Fix This</button>
                    )}
                    
                    {remediationStatus === "dry-run" && (
                      <button disabled className="btn-outline w-full border-brand-500/50 text-brand-400 flex justify-center">
                        <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                        Planning dry-run...
                      </button>
                    )}

                    {remediationStatus === "executing" && (
                      <div className="space-y-3">
                        <div className="p-3 bg-surface-950 rounded border border-yellow-500/20 text-xs font-mono text-yellow-300">
                          &gt; Validating current state...<br/>
                          &gt; Target: {selectedFinding.resourceArn}<br/>
                          &gt; Applying restrictive policy...
                        </div>
                        <button disabled className="btn-primary w-full opacity-70 flex justify-center bg-yellow-600">
                          <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                          Executing Fix...
                        </button>
                      </div>
                    )}

                    {remediationStatus === "success" && (
                      <div className="rounded border border-green-500/30 bg-green-500/10 p-4 text-center">
                        <div className="w-10 h-10 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-2">✓</div>
                        <p className="text-sm font-medium text-green-400">Remediation applied successfully</p>
                        <p className="text-xs text-surface-400 mt-1">Audit log ID: #tx-8f4a2</p>
                      </div>
                    )}
                  </div>

                  {/* Manual Steps */}
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-3 pb-1 border-b border-surface-800">Manual Console Steps</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-surface-400">
                      {aiExplanation.manualSteps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  {/* CLI Snippet */}
                  {aiExplanation.cliCommands && (
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-2 pb-1 border-b border-surface-800">CLI Commands</h3>
                      <pre className="bg-surface-950 p-3 rounded-lg border border-surface-800 overflow-x-auto text-[11px] font-mono text-surface-300">
                        {aiExplanation.cliCommands.join("\n")}
                      </pre>
                    </div>
                  )}

                  {/* Terraform Snippet */}
                  {aiExplanation.terraformSnippet && (
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-2 pb-1 border-b border-surface-800">Terraform (IaC)</h3>
                      <pre className="bg-surface-950 p-3 rounded-lg border border-surface-800 overflow-x-auto text-[11px] font-mono text-purple-300">
                        {aiExplanation.terraformSnippet}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
