"use client";

import React from "react";
import { getSeverityBadgeClass } from "@/lib/utils";
import { trpc } from "@/trpc/client";

export default function AttackPathsPage() {
  const [isGeneratingPlan, setIsGeneratingPlan] = React.useState(false);
  const [showPlan, setShowPlan] = React.useState(false);
  const [fixingNodeId, setFixingNodeId] = React.useState<string | null>(null);

  const { data: graphData, isLoading } = trpc.attackPaths.getGraph.useQuery();

  if (isLoading || !graphData) {
    return (
      <div className="flex items-center justify-center p-8 h-screen border-surface-800 shrink-0">
        <svg className="animate-spin h-8 w-8 text-brand-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
      </div>
    );
  }

  const { nodes, edges, narrative } = graphData;

  const handleGeneratePlan = () => {
    setIsGeneratingPlan(true);
    setTimeout(() => {
      setIsGeneratingPlan(false);
      setShowPlan(true);
    }, 1500);
  };

  const handleFixNode = (nodeId: string) => {
    setFixingNodeId(nodeId);
    setTimeout(() => {
      setFixingNodeId(null);
      // In a real app, we'd invalidate the query here
      alert(`Remediation applied for node: ${nodeId}`);
    }, 2000);
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="p-8 border-b border-surface-800 shrink-0">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Attack Paths</h1>
            <p className="text-sm text-surface-400">Visualization of multi-step exploitation chains across your cloud environment</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-outline border-surface-600 text-surface-300">Export Graph</button>
            <button className="btn-primary">Active Paths ({nodes.length > 0 ? 1 : 0})</button>
          </div>
        </div>
        
        <div className="flex gap-4 p-3 bg-surface-900 rounded-lg border border-surface-800 text-sm">
          <div className="flex items-center gap-2 text-surface-400">
            <span className="w-3 h-3 rounded-full bg-blue-500/20 border border-blue-500"></span> Entry Point
          </div>
          <div className="flex items-center gap-2 text-surface-400">
            <span className="w-3 h-3 rounded-full bg-orange-500/20 border border-orange-500"></span> Privilege Escalation
          </div>
          <div className="flex items-center gap-2 text-surface-400">
            <span className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500"></span> Business Impact
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative bg-[#0a0f1c] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] flex p-8 gap-8">
        
        {/* Left Side: Dynamic Path Rendering or Remediation Plan */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
          {showPlan ? (
            <div className="w-full max-w-2xl animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Full Remediation Guide</h2>
                <button onClick={() => setShowPlan(false)} className="text-sm text-brand-400 hover:text-brand-300">Back to Graph</button>
              </div>
              
              <div className="space-y-6">
                {nodes.map((node: any, index: number) => (
                  <div key={node.id} className="card p-6 border-l-4 bg-surface-900/40 border-surface-700">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="text-[10px] font-bold text-surface-500 uppercase mb-1">Step {index + 1}: {node.nodeType}</div>
                        <h3 className="text-white font-semibold">{node.label}</h3>
                      </div>
                      <span className={`badge ${getSeverityBadgeClass(node.severity)}`}>{node.severity}</span>
                    </div>
                    
                    <div className="bg-surface-950/50 rounded-lg p-4 border border-surface-800 mb-4">
                      <h4 className="text-xs font-bold text-brand-400 mb-2 uppercase">Fix Recommendation</h4>
                      <p className="text-sm text-surface-300 leading-relaxed">
                        {node.nodeType === 'ENTRY' ? "Restrict network access to this resource by modifying the Security Group or Firewall rules. Ensure only known internal IP ranges are permitted." :
                         node.nodeType === 'ESCALATION' ? "Review the attached IAM policies and apply the principle of least privilege. Remove wildcard permissions and satisfy access requirements with specific resource ARNs." :
                         "Enable encryption at rest, disable public accessibility, and ensure all access is authenticated and logged for audit purposes."}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleFixNode(node.id)}
                        disabled={fixingNodeId === node.id}
                        className={`flex-1 btn-sm ${fixingNodeId === node.id ? 'bg-surface-800' : 'btn-primary'}`}
                      >
                        {fixingNodeId === node.id ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                            Fixing...
                          </span>
                        ) : 'Apply AI Fix'}
                      </button>
                      <button className="flex-1 btn-outline btn-sm">Copy CLI Command</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-12 w-full max-w-lg">
              {nodes.map((node: any, index: number) => (
                <React.Fragment key={node.id}>
                  <div className={`card p-4 w-full max-w-sm border-l-4 bg-surface-900/80 backdrop-blur shadow-lg z-10 transition-all hover:scale-[1.02]
                    ${node.nodeType === 'ENTRY' ? 'border-blue-500 shadow-blue-500/5' : 
                      node.nodeType === 'ESCALATION' ? 'border-orange-500 shadow-orange-500/5' : 
                      'border-red-500 shadow-red-500/5'}`}
                  >
                    <div className={`text-[10px] font-bold uppercase tracking-wider mb-2
                      ${node.nodeType === 'ENTRY' ? 'text-blue-400' : 
                        node.nodeType === 'ESCALATION' ? 'text-orange-400' : 
                        'text-red-400'}`}
                    >
                      {node.nodeType === 'ENTRY' ? 'Entry Point' : 
                       node.nodeType === 'ESCALATION' ? 'Privilege Escalation' : 
                       'Critical Impact'}
                    </div>
                    <h3 className="font-semibold text-white mb-2 line-clamp-2">{node.label}</h3>
                    <div className="flex justify-between items-center mt-3">
                      <span className={`badge ${getSeverityBadgeClass(node.severity || "LOW")}`}>{node.severity}</span>
                      <span className="text-xs font-mono text-surface-500">Node ID: {node.id}</span>
                    </div>
                  </div>

                  {index < nodes.length - 1 && (
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-0.5 h-12 bg-gradient-to-b from-surface-700 to-surface-600 opacity-50 relative">
                        <div className="absolute top-1/2 left-4 -translate-y-1/2 bg-surface-800 px-2 py-1 rounded text-[10px] text-surface-400 border border-surface-800 whitespace-nowrap">
                          {edges.find((e: any) => e.source === node.id)?.relationship || "leads to"}
                        </div>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}
              
              {nodes.length === 0 && (
                <div className="text-center p-12 bg-surface-900/50 rounded-2xl border border-dashed border-surface-800">
                  <p className="text-surface-500">No complex attack paths identified in the current sample.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Narrative */}
        <div className="w-96 bg-surface-900 border border-surface-800 rounded-xl flex flex-col z-20 overflow-hidden shadow-2xl shadow-black/50">
          <div className="p-4 border-b border-surface-800 bg-surface-800/50">
            <h2 className="font-bold text-white">Security Narrative</h2>
            <div className="flex gap-2 mt-2">
              <span className={`badge ${nodes.some((n: any) => n.severity === 'CRITICAL') ? 'badge-critical' : 'badge-high'}`}>
                {nodes.some((n: any) => n.severity === 'CRITICAL') ? 'Critical Exposure' : 'High Risk'}
              </span>
              <span className="text-xs text-surface-400 mt-0.5">Automated Analysis</span>
            </div>
          </div>
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {narrative.map((step: any) => (
              <div key={step.step} className={`p-4 bg-surface-950 rounded-lg border border-surface-800 border-l-4 
                ${step.step === 1 ? 'border-l-blue-500' : 
                  step.step === 2 ? 'border-l-orange-500' : 
                  'border-l-red-500'}`}
              >
                <h4 className={`text-xs font-bold mb-1 uppercase tracking-tight
                  ${step.step === 1 ? 'text-blue-400' : 
                    step.step === 2 ? 'text-orange-400' : 
                    'text-red-400'}`}
                >
                  {step.step}. {step.title}
                </h4>
                <p className="text-sm text-surface-300 leading-relaxed">{step.description}</p>
              </div>
            ))}
            
            {narrative.length > 0 && !showPlan && (
              <button 
                onClick={handleGeneratePlan}
                disabled={isGeneratingPlan}
                className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
              >
                {isGeneratingPlan ? (
                  <span className="flex items-center gap-2 font-semibold">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Analyzing Path...
                  </span>
                ) : "Generate Remediation Plan"}
              </button>
            )}

            {showPlan && (
              <div className="mt-6 p-4 rounded-lg bg-surface-950 border border-surface-800">
                <div className="text-xs font-bold text-surface-500 uppercase mb-2">Plan Summary</div>
                <p className="text-sm text-surface-400 mb-4">This plan addresses {nodes.length} critical vulnerabilities in the detected chain. Applying these fixes will break the attack path and secure your infrastructure.</p>
                <button className="btn-outline w-full text-xs">Download Full PDF Report</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


