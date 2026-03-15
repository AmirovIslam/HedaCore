"use client";

import React from "react";
import { getScoreColor, getScoreLabel, getSeverityBadgeClass, timeAgo } from "@/lib/utils";
import { trpc } from "@/trpc/client";

// ── Inline mini chart components (no Recharts dependency needed for MVP) ──

function ScoreRing({ score }: { score: number }) {
  const color = getScoreColor(score);
  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-44 h-44 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="8" className="text-surface-800" />
        <circle
          cx="80" cy="80" r="70" fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-white">{score}</span>
        <span className="text-sm font-medium" style={{ color }}>{getScoreLabel(score)}</span>
      </div>
    </div>
  );
}

function SeverityBar({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.name} className="flex items-center gap-3">
          <span className="text-xs text-surface-400 w-16">{d.name}</span>
          <div className="flex-1 h-2 rounded-full bg-surface-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${(d.value / total) * 100}%`, backgroundColor: d.color }}
            />
          </div>
          <span className="text-xs font-mono text-surface-300 w-8 text-right">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

function TrendChart({ data }: { data: { date: string; score: number }[] }) {
  const max = Math.max(...data.map((d) => d.score));
  const min = Math.min(...data.map((d) => d.score)) - 10;
  const range = max - min;
  const w = 100 / (data.length - 1);

  const points = data.map((d, i) => `${i * w},${100 - ((d.score - min) / range) * 80}`).join(" ");
  const areaPoints = `0,100 ${points} 100,100`;

  return (
    <div className="relative h-40">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#trendGrad)" />
        <polyline points={points} fill="none" stroke="#6366f1" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {data.map((d, i) => (
          <circle key={i} cx={i * w} cy={100 - ((d.score - min) / range) * 80} r="3" fill="#6366f1" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="flex justify-between mt-2">
        {data.map((d) => (
          <span key={d.date} className="text-[10px] text-surface-500">{d.date}</span>
        ))}
      </div>
    </div>
  );
}

function ServiceBar({ data }: { data: { service: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count));
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.service} className="flex items-center gap-3">
          <span className="text-xs text-surface-400 w-20 truncate">{d.service}</span>
          <div className="flex-1 h-2.5 rounded-full bg-surface-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-700 ease-out"
              style={{ width: `${(d.count / max) * 100}%` }}
            />
          </div>
          <span className="text-xs font-mono text-surface-300 w-6 text-right">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

// ── Stats Cards ──
const getStats = (dashboardData: any) => [
  { label: "Total Findings", value: dashboardData.totalFindings, icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z", color: "text-orange-400", bg: "bg-orange-500/10" },
  { label: "Resources Scanned", value: dashboardData.resourcesScanned, icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z", color: "text-blue-400", bg: "bg-blue-500/10" },
  { label: "Checks Run", value: dashboardData.checksRun, icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", color: "text-green-400", bg: "bg-green-500/10" },
  { label: "Accounts", value: dashboardData.accountsConnected, icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z", color: "text-purple-400", bg: "bg-purple-500/10" },
];

export default function DashboardPage() {
  const { data: dashboardData, isLoading: isLoadingDash } = trpc.dashboard.getOverview.useQuery();
  const { data: recentScans, isLoading: isLoadingScans } = trpc.dashboard.getRecentScans.useQuery({ limit: 5 });

  if (isLoadingDash || !dashboardData) {
    return (
      <div className="p-8 h-screen border-surface-800 shrink-0 flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-brand-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
      </div>
    );
  }

  const stats = getStats(dashboardData);
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Security Dashboard</h1>
          <p className="text-surface-400 text-sm mt-1">Overview of your cloud security posture across all accounts</p>
        </div>
        <div className="flex gap-3">
          <a href="/scan" className="btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
            New Scan
          </a>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d={stat.icon}/></svg>
              </div>
              <span className="text-sm text-surface-400">{stat.label}</span>
            </div>
            <p className="text-3xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Score Ring */}
        <div className="card p-6">
          <h3 className="font-semibold text-white mb-4">Security Score</h3>
          <ScoreRing score={dashboardData.overallScore} />
          <p className="text-center text-sm text-surface-400 mt-4">
            Based on {dashboardData.checksRun} checks across {dashboardData.accountsConnected} accounts
          </p>
        </div>

        {/* Severity Distribution */}
        <div className="card p-6">
          <h3 className="font-semibold text-white mb-4">Severity Distribution</h3>
          <SeverityBar data={dashboardData.severityDistribution} />
        </div>

        {/* Score Trend */}
        <div className="card p-6">
          <h3 className="font-semibold text-white mb-4">Security Trend</h3>
          <TrendChart data={dashboardData.trendData} />
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Risky Services */}
        <div className="card p-6">
          <h3 className="font-semibold text-white mb-4">Top Risky Services</h3>
          <ServiceBar data={dashboardData.topRiskyServices} />
        </div>

        {/* Attack Path Preview */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Critical Attack Path</h3>
            <a href="/attack-paths" className="text-xs text-brand-400 hover:text-brand-300">View all →</a>
          </div>
          <div className="bg-surface-900/50 rounded-xl p-4 border border-surface-700/50">
            <div className="flex items-center gap-3 flex-wrap">
              {[ 
                { label: "Open SSH", severity: "HIGH", type: "Entry" },
                { label: "IMDSv1", severity: "MEDIUM", type: "Lateral" },
                { label: "Wildcard IAM", severity: "HIGH", type: "Escalation" },
                { label: "Public S3 Bucket", severity: "CRITICAL", type: "Impact" },
              ].map((node, i) => (
                <React.Fragment key={i}>
                  <div className="flex flex-col items-center gap-1">
                    <span className={`text-[10px] uppercase font-semibold ${
                      node.type === "Entry" ? "text-blue-400" : node.type === "Lateral" ? "text-yellow-400" 
                      : node.type === "Escalation" ? "text-orange-400" : "text-red-400"
                    }`}>{node.type}</span>
                    <div className={`px-3 py-2 rounded-lg border text-xs font-medium ${
                      node.severity === "CRITICAL" ? "border-red-500/30 bg-red-500/10 text-red-300" 
                      : node.severity === "HIGH" ? "border-orange-500/30 bg-orange-500/10 text-orange-300"
                      : "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                    }`}>{node.label}</div>
                  </div>
                  {i < 3 && (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-surface-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
                    </svg>
                  )}
                </React.Fragment>
              ))}
            </div>
            <p className="text-xs text-surface-400 mt-3">
              An attacker could exploit open SSH, steal temporary credentials via IMDSv1, escalate through a wildcard IAM policy, and exfiltrate data from a public S3 bucket.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Scans */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Recent Scans</h3>
          <a href="/scan" className="text-xs text-brand-400 hover:text-brand-300">View all →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700/50">
                <th className="text-left py-3 px-4 text-surface-400 font-medium">Account</th>
                <th className="text-left py-3 px-4 text-surface-400 font-medium">Provider</th>
                <th className="text-left py-3 px-4 text-surface-400 font-medium">Status</th>
                <th className="text-left py-3 px-4 text-surface-400 font-medium">Score</th>
                <th className="text-left py-3 px-4 text-surface-400 font-medium">Findings</th>
                <th className="text-left py-3 px-4 text-surface-400 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {recentScans?.map((scan) => (
                <tr key={scan.id} className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors">
                  <td className="py-3 px-4 text-surface-200 font-medium">{scan.accountAlias}</td>
                  <td className="py-3 px-4">
                    <span className={`badge text-[10px] ${
                      scan.provider === "AWS" ? "bg-[#FF9900]/10 text-[#FF9900] border-[#FF9900]/20" 
                      : scan.provider === "GCP" ? "bg-[#4285F4]/10 text-[#4285F4] border-[#4285F4]/20"
                      : "bg-[#0080FF]/10 text-[#0080FF] border-[#0080FF]/20"
                    }`}>{scan.provider}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`badge text-[10px] ${
                      scan.status === "COMPLETED" ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : scan.status === "RUNNING" ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      : "bg-surface-500/10 text-surface-400 border-surface-500/20"
                    }`}>{scan.status}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono font-medium" style={{ color: getScoreColor(scan.score || 0) }}>{scan.score ?? "—"}</span>
                  </td>
                  <td className="py-3 px-4 text-surface-300">{scan.findingsCount}</td>
                  <td className="py-3 px-4 text-surface-500">{timeAgo(scan.startedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
