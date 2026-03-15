// ============================================
// CloudGuard — Shared Type Definitions
// ============================================

export type Provider = "AWS" | "GCP" | "AZURE" | "DIGITALOCEAN";
export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
export type ScanStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
export type FindingStatus = "OPEN" | "RESOLVED" | "SUPPRESSED" | "FALSE_POSITIVE";
export type RemediationType = "MANUAL" | "AUTOMATED" | "SEMI_AUTOMATED";
export type UserRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export interface CloudAccount {
  id: string;
  provider: Provider;
  alias: string;
  accountId: string;
  status: "CONNECTED" | "INVALID" | "REVOKED";
  validatedAt: string;
}

export interface CheckDefinition {
  id: string;
  provider: Provider;
  service: string;
  title: string;
  description: string;
  severity: Severity;
  category: string;
  frameworks: string[];
  tags: string[];
  remediationType: RemediationType;
  enabled: boolean;
}

export interface ScanJob {
  id: string;
  cloudAccountId: string;
  provider: Provider;
  accountAlias: string;
  status: ScanStatus;
  totalChecks: number;
  completedChecks: number;
  findingsCount: number;
  score: number | null;
  startedAt: string;
  completedAt: string | null;
}

export interface Finding {
  id: string;
  scanJobId: string;
  checkId: string;
  provider: Provider;
  service: string;
  severity: Severity;
  title: string;
  resourceArn: string;
  resourceType: string;
  region: string;
  status: FindingStatus;
  riskSummary: string;
  evidence: Record<string, any>;
  detectedAt: string;
}

export interface AIExplanation {
  simple: string;
  technical: string;
  businessImpact: string;
  fixRecommendation: string;
  attackScenario: string;
  manualSteps: string[];
  cliCommands: string[];
  terraformSnippet?: string;
}

export interface AttackPathNode {
  id: string;
  findingId: string;
  nodeType: "ENTRY" | "LATERAL" | "ESCALATION" | "IMPACT";
  label: string;
  riskScore: number;
  severity: Severity;
}

export interface AttackPathEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
}

export interface DashboardSummary {
  overallScore: number;
  totalFindings: number;
  resourcesScanned: number;
  checksRun: number;
  accountsConnected: number;
  severityDistribution: { name: string; value: number; color: string }[];
  topRiskyServices: { service: string; count: number }[];
  trendData: { date: string; score: number }[];
  recentScans: ScanJob[];
}

export interface ScanPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  checkCount: number;
}

export interface ProviderInfo {
  id: Provider;
  name: string;
  icon: any;
  description: string;
  color: string;
  gradient: string;
  credentialFields: CredentialField[];
}

export interface CredentialField {
  name: string;
  label: string;
  type: "text" | "password" | "textarea" | "select";
  placeholder: string;
  required: boolean;
  helpText?: string;
  options?: { value: string; label: string }[];
}
