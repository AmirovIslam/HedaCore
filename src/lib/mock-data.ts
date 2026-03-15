// ============================================
// CloudGuard — Mock Data for MVP
// ============================================

import type {
  CheckDefinition, Finding, ScanJob, DashboardSummary,
  AIExplanation, AttackPathNode, AttackPathEdge, ScanPreset, CloudAccount
} from "./types";

// ── Cloud Accounts ────────────────────────────
export const mockAccounts: CloudAccount[] = [
  { id: "acc-1", provider: "AWS", alias: "Production AWS", accountId: "123456789012", status: "CONNECTED", validatedAt: "2026-03-14T10:00:00Z" },
  { id: "acc-2", provider: "GCP", alias: "Staging GCP", accountId: "my-staging-project", status: "CONNECTED", validatedAt: "2026-03-13T14:30:00Z" },
  { id: "acc-3", provider: "DIGITALOCEAN", alias: "Dev DO", accountId: "team-dev-12345", status: "CONNECTED", validatedAt: "2026-03-12T09:00:00Z" },
];

// ── Scan Presets ──────────────────────────────
export const scanPresets: ScanPreset[] = [
  { id: "quick", name: "Quick Scan", description: "Essential security checks for a rapid overview", icon: "⚡", checkCount: 25 },
  { id: "iam", name: "IAM Audit", description: "Deep dive into identity and access management", icon: "🔑", checkCount: 45 },
  { id: "storage", name: "Storage Security", description: "Check buckets, blobs, and object storage", icon: "🗄️", checkCount: 30 },
  { id: "network", name: "Network Exposure", description: "Analyze network access and exposure risks", icon: "🌐", checkCount: 35 },
  { id: "compliance", name: "Compliance Baseline", description: "CIS Benchmark and regulatory alignment", icon: "📋", checkCount: 80 },
  { id: "full", name: "Full Scan", description: "All available checks for comprehensive coverage", icon: "🛡️", checkCount: 215 },
];

// ── Check Definitions (AWS sample) ───────────
export const mockChecks: CheckDefinition[] = [
  { id: "AWS-IAM-001", provider: "AWS", service: "IAM", title: "IAM policy grants overly broad permissions (wildcard)", description: "Checks if any IAM policy uses wildcard (*) for actions or resources.", severity: "HIGH", category: "Access Control", frameworks: ["CIS AWS 1.5", "SOC 2 CC6.1"], tags: ["IAM", "Permissions", "Least Privilege"], remediationType: "SEMI_AUTOMATED", enabled: true },
  { id: "AWS-IAM-002", provider: "AWS", service: "IAM", title: "Root account has no MFA enabled", description: "Checks whether the root account has multi-factor authentication enabled.", severity: "CRITICAL", category: "Authentication", frameworks: ["CIS AWS 1.5", "PCI DSS 8.3"], tags: ["IAM", "MFA", "Root"], remediationType: "MANUAL", enabled: true },
  { id: "AWS-IAM-003", provider: "AWS", service: "IAM", title: "IAM users with console access lack MFA", description: "Checks if IAM users with console password have MFA enabled.", severity: "HIGH", category: "Authentication", frameworks: ["CIS AWS 1.5"], tags: ["IAM", "MFA"], remediationType: "MANUAL", enabled: true },
  { id: "AWS-IAM-004", provider: "AWS", service: "IAM", title: "Access keys not rotated in 90+ days", description: "Checks if IAM user access keys have been rotated within the last 90 days.", severity: "MEDIUM", category: "Credential Management", frameworks: ["CIS AWS 1.5"], tags: ["IAM", "Keys", "Rotation"], remediationType: "SEMI_AUTOMATED", enabled: true },
  { id: "AWS-IAM-005", provider: "AWS", service: "IAM", title: "Unused IAM credentials detected", description: "Identifies IAM users with credentials not used in 90+ days.", severity: "MEDIUM", category: "Access Control", frameworks: ["CIS AWS 1.5"], tags: ["IAM", "Unused", "Hygiene"], remediationType: "AUTOMATED", enabled: true },
  { id: "AWS-S3-001", provider: "AWS", service: "S3", title: "S3 bucket allows public read access", description: "Checks if any S3 bucket has a policy or ACL allowing public read.", severity: "CRITICAL", category: "Data Exposure", frameworks: ["CIS AWS 1.5", "SOC 2 CC6.6"], tags: ["S3", "Storage", "Public Access"], remediationType: "AUTOMATED", enabled: true },
  { id: "AWS-S3-002", provider: "AWS", service: "S3", title: "S3 bucket lacks server-side encryption", description: "Checks if S3 buckets have default encryption enabled.", severity: "HIGH", category: "Encryption", frameworks: ["CIS AWS 1.5", "PCI DSS 3.4"], tags: ["S3", "Storage", "Encryption"], remediationType: "AUTOMATED", enabled: true },
  { id: "AWS-S3-003", provider: "AWS", service: "S3", title: "S3 bucket versioning not enabled", description: "Checks if S3 buckets have versioning enabled for data protection.", severity: "MEDIUM", category: "Data Protection", frameworks: ["CIS AWS 1.5"], tags: ["S3", "Storage", "Versioning"], remediationType: "AUTOMATED", enabled: true },
  { id: "AWS-S3-004", provider: "AWS", service: "S3", title: "S3 bucket allows public write access", description: "Checks if any S3 bucket allows public write/upload.", severity: "CRITICAL", category: "Data Exposure", frameworks: ["CIS AWS 1.5"], tags: ["S3", "Storage", "Public Access"], remediationType: "AUTOMATED", enabled: true },
  { id: "AWS-EC2-001", provider: "AWS", service: "EC2", title: "Security group allows unrestricted SSH (0.0.0.0/0:22)", description: "Checks if any security group allows SSH from any IP address.", severity: "HIGH", category: "Network Security", frameworks: ["CIS AWS 1.5", "PCI DSS 1.3"], tags: ["EC2", "Network", "Security Group", "SSH"], remediationType: "AUTOMATED", enabled: true },
  { id: "AWS-EC2-002", provider: "AWS", service: "EC2", title: "Security group allows unrestricted RDP (0.0.0.0/0:3389)", description: "Checks if any security group allows RDP from any IP address.", severity: "HIGH", category: "Network Security", frameworks: ["CIS AWS 1.5"], tags: ["EC2", "Network", "Security Group", "RDP"], remediationType: "AUTOMATED", enabled: true },
  { id: "AWS-EC2-003", provider: "AWS", service: "EC2", title: "EBS volume not encrypted", description: "Checks if EBS volumes have encryption enabled.", severity: "MEDIUM", category: "Encryption", frameworks: ["CIS AWS 1.5"], tags: ["EC2", "EBS", "Encryption"], remediationType: "MANUAL", enabled: true },
  { id: "AWS-EC2-004", provider: "AWS", service: "EC2", title: "EC2 instance uses IMDSv1", description: "Checks if EC2 instances require IMDSv2 for metadata service.", severity: "MEDIUM", category: "Configuration", frameworks: ["CIS AWS 1.5"], tags: ["EC2", "IMDS", "Metadata"], remediationType: "AUTOMATED", enabled: true },
  { id: "AWS-VPC-001", provider: "AWS", service: "VPC", title: "VPC flow logs not enabled", description: "Checks if VPC flow logs are enabled for network monitoring.", severity: "MEDIUM", category: "Logging", frameworks: ["CIS AWS 1.5"], tags: ["VPC", "Network", "Logging", "Flow Logs"], remediationType: "AUTOMATED", enabled: true },
  { id: "AWS-VPC-002", provider: "AWS", service: "VPC", title: "Default VPC in use", description: "Checks if the default VPC is being used for production resources.", severity: "LOW", category: "Network Security", frameworks: ["CIS AWS 1.5"], tags: ["VPC", "Network", "Default"], remediationType: "MANUAL", enabled: true },
  { id: "AWS-RDS-001", provider: "AWS", service: "RDS", title: "RDS instance is publicly accessible", description: "Checks if RDS database instances are publicly accessible.", severity: "CRITICAL", category: "Data Exposure", frameworks: ["CIS AWS 1.5", "PCI DSS 1.3"], tags: ["RDS", "Database", "Public Access"], remediationType: "AUTOMATED", enabled: true },
  { id: "AWS-RDS-002", provider: "AWS", service: "RDS", title: "RDS instance not encrypted at rest", description: "Checks if RDS instances have storage encryption enabled.", severity: "HIGH", category: "Encryption", frameworks: ["CIS AWS 1.5", "PCI DSS 3.4"], tags: ["RDS", "Database", "Encryption"], remediationType: "MANUAL", enabled: true },
  { id: "AWS-RDS-003", provider: "AWS", service: "RDS", title: "RDS automated backups disabled", description: "Checks if RDS instances have automated backups configured.", severity: "MEDIUM", category: "Data Protection", frameworks: ["CIS AWS 1.5"], tags: ["RDS", "Database", "Backup"], remediationType: "AUTOMATED", enabled: true },
  { id: "AWS-CT-001", provider: "AWS", service: "CloudTrail", title: "CloudTrail not enabled in all regions", description: "Checks if CloudTrail is enabled for all AWS regions.", severity: "HIGH", category: "Logging", frameworks: ["CIS AWS 1.5", "SOC 2 CC7.2"], tags: ["CloudTrail", "Logging", "Audit"], remediationType: "AUTOMATED", enabled: true },
  { id: "AWS-CT-002", provider: "AWS", service: "CloudTrail", title: "CloudTrail log file validation disabled", description: "Checks if CloudTrail log file integrity validation is enabled.", severity: "MEDIUM", category: "Logging", frameworks: ["CIS AWS 1.5"], tags: ["CloudTrail", "Logging", "Integrity"], remediationType: "AUTOMATED", enabled: true },
  { id: "AWS-KMS-001", provider: "AWS", service: "KMS", title: "KMS key rotation not enabled", description: "Checks if automatic key rotation is enabled for KMS keys.", severity: "MEDIUM", category: "Encryption", frameworks: ["CIS AWS 1.5", "PCI DSS 3.6"], tags: ["KMS", "Encryption", "Key Rotation"], remediationType: "AUTOMATED", enabled: true },
  { id: "AWS-LAMBDA-001", provider: "AWS", service: "Lambda", title: "Lambda function uses deprecated runtime", description: "Checks if Lambda functions use deprecated or end-of-life runtimes.", severity: "MEDIUM", category: "Configuration", frameworks: [], tags: ["Lambda", "Compute", "Runtime"], remediationType: "MANUAL", enabled: true },
  { id: "AWS-LAMBDA-002", provider: "AWS", service: "Lambda", title: "Lambda function has overly permissive execution role", description: "Checks if Lambda execution roles follow least privilege.", severity: "HIGH", category: "Access Control", frameworks: ["CIS AWS 1.5"], tags: ["Lambda", "IAM", "Permissions"], remediationType: "SEMI_AUTOMATED", enabled: true },
  { id: "AWS-ELB-001", provider: "AWS", service: "ELB", title: "Load balancer uses insecure SSL/TLS policy", description: "Checks if ELB/ALB listeners use modern TLS policies.", severity: "HIGH", category: "Encryption", frameworks: ["PCI DSS 4.1"], tags: ["ELB", "Network", "TLS", "SSL"], remediationType: "AUTOMATED", enabled: true },
  { id: "AWS-CF-001", provider: "AWS", service: "CloudFront", title: "CloudFront distribution uses HTTP", description: "Checks if CloudFront distributions enforce HTTPS.", severity: "HIGH", category: "Encryption", frameworks: ["PCI DSS 4.1"], tags: ["CloudFront", "CDN", "HTTPS"], remediationType: "AUTOMATED", enabled: true },

  // GCP Checks
  { id: "gcp-compute-public-ip", provider: "GCP", service: "Compute Engine", title: "VM Instance has a public IP address", description: "Identifies Compute instances directly exposed to the internet via public IP.", severity: "MEDIUM", category: "Network Security", frameworks: ["CIS GCP 1.2"], tags: ["GCP", "Compute", "Network", "Public IP"], remediationType: "SEMI_AUTOMATED", enabled: true },
  { id: "gcp-iam-missing-permissions", provider: "GCP", service: "IAM", title: "Missing or incomplete IAM permissions", description: "Checks if the scanning service account has full Viewer access.", severity: "HIGH", category: "Access Control", frameworks: [], tags: ["GCP", "IAM", "Permissions"], remediationType: "MANUAL", enabled: true },
  { id: "gcp-storage-access-disabled", provider: "GCP", service: "Cloud Storage", title: "Storage bucket has uniform bucket-level access disabled", description: "Checks if uniform bucket-level access is enabled.", severity: "MEDIUM", category: "Data Protection", frameworks: ["CIS GCP 1.2"], tags: ["GCP", "Storage", "Bucket"], remediationType: "AUTOMATED", enabled: true },
  { id: "gcp-cloudsql-public", provider: "GCP", service: "Cloud SQL", title: "Cloud SQL instance open to internet", description: "Checks if Cloud SQL allows connections from 0.0.0.0/0.", severity: "CRITICAL", category: "Data Exposure", frameworks: ["CIS GCP 1.2"], tags: ["GCP", "Cloud SQL", "Database"], remediationType: "SEMI_AUTOMATED", enabled: true },
  { id: "gcp-kms-rotation", provider: "GCP", service: "KMS", title: "KMS Key rotation not enabled", description: "Checks if KMS cryptographic keys have rotation enabled.", severity: "MEDIUM", category: "Encryption", frameworks: ["CIS GCP 1.2"], tags: ["GCP", "KMS", "Encryption"], remediationType: "AUTOMATED", enabled: true },

  // Azure Checks
  { id: "azure-rg-naming-convention", provider: "AZURE", service: "Resource Manager", title: "Dev/Test resources in production subscription", description: "Detects resource groups that appear to be for development or testing.", severity: "LOW", category: "Configuration", frameworks: [], tags: ["Azure", "Resources", "Naming"], remediationType: "MANUAL", enabled: true },
  { id: "azure-iam-missing-permissions", provider: "AZURE", service: "Active Directory", title: "Missing 'Reader' role on subscription", description: "Verifies the service principal has proper read access.", severity: "HIGH", category: "Access Control", frameworks: [], tags: ["Azure", "IAM", "Role"], remediationType: "MANUAL", enabled: true },
  { id: "azure-sql-broad-access", provider: "AZURE", service: "SQL Database", title: "SQL Server Firewall allows broad access", description: "Checks if SQL firewalls allow 0.0.0.0 access.", severity: "CRITICAL", category: "Data Exposure", frameworks: ["CIS Azure 1.3"], tags: ["Azure", "SQL", "Database"], remediationType: "SEMI_AUTOMATED", enabled: true },
  { id: "azure-storage-secure-transfer", provider: "AZURE", service: "Storage Accounts", title: "Storage Account lacks secure transfer requirement", description: "Ensure HTTP is disabled and only HTTPS is allowed.", severity: "HIGH", category: "Encryption", frameworks: ["CIS Azure 1.3"], tags: ["Azure", "Storage", "Encryption"], remediationType: "AUTOMATED", enabled: true },
  { id: "azure-keyvault-purge", provider: "AZURE", service: "Key Vault", title: "Key Vault does not have purge protection", description: "Checks if Key Vaults have purge protection enabled.", severity: "HIGH", category: "Data Protection", frameworks: ["CIS Azure 1.3"], tags: ["Azure", "Key Vault"], remediationType: "AUTOMATED", enabled: true },

  // DigitalOcean Checks
  { id: "do-droplet-missing-ipv6", provider: "DIGITALOCEAN", service: "Droplets", title: "Droplet does not have IPv6 enabled", description: "Checks if Droplets are configured with IPv6 networking.", severity: "LOW", category: "Network Architecture", frameworks: [], tags: ["DO", "Droplet", "Network", "IPv6"], remediationType: "MANUAL", enabled: true },
  { id: "do-droplet-no-vpc", provider: "DIGITALOCEAN", service: "Droplets", title: "Droplet is not assigned to a VPC", description: "Checks if Droplets exist outside of a VPC boundary.", severity: "MEDIUM", category: "Network Security", frameworks: [], tags: ["DO", "Droplet", "VPC"], remediationType: "MANUAL", enabled: true },
  { id: "do-api-access-error", provider: "DIGITALOCEAN", service: "API", title: "API Token lacks sufficient read scopes", description: "Validates API token permissions for full read access.", severity: "HIGH", category: "Access Control", frameworks: [], tags: ["DO", "API", "Token"], remediationType: "MANUAL", enabled: true },
  { id: "do-db-public-node", provider: "DIGITALOCEAN", service: "Databases", title: "Managed Database has public network access", description: "Checks if managed database nodes are exposed to the public internet.", severity: "CRITICAL", category: "Data Exposure", frameworks: [], tags: ["DO", "Database", "Network"], remediationType: "SEMI_AUTOMATED", enabled: true },
  { id: "do-spaces-acl", provider: "DIGITALOCEAN", service: "Spaces", title: "Space Object Storage allows public list/read", description: "Checks Spaces endpoints for permissive ACL configurations.", severity: "CRITICAL", category: "Data Exposure", frameworks: [], tags: ["DO", "Spaces", "Storage"], remediationType: "AUTOMATED", enabled: true },
];

// ── Mock Findings ─────────────────────────────
export const mockFindings: Finding[] = [
  {
    id: "f-001", scanJobId: "scan-1", checkId: "AWS-IAM-002", provider: "AWS", service: "IAM", severity: "CRITICAL",
    title: "Root account has no MFA enabled", resourceArn: "arn:aws:iam::123456789012:root", resourceType: "AWS::IAM::RootAccount",
    region: "global", status: "OPEN", riskSummary: "The AWS root account does not have multi-factor authentication enabled, allowing single-factor access to the most privileged account.",
    evidence: { mfaEnabled: false, lastLogin: "2026-03-14T08:00:00Z", accessKeysActive: true }, detectedAt: "2026-03-15T10:00:00Z"
  },
  {
    id: "f-002", scanJobId: "scan-1", checkId: "AWS-S3-001", provider: "AWS", service: "S3", severity: "CRITICAL",
    title: "S3 bucket allows public read access", resourceArn: "arn:aws:s3:::customer-data-exports", resourceType: "AWS::S3::Bucket",
    region: "us-east-1", status: "OPEN", riskSummary: "S3 bucket 'customer-data-exports' has a bucket policy allowing s3:GetObject from principal '*', exposing all objects to the public internet.",
    evidence: { bucketName: "customer-data-exports", publicAccess: true, policyStatement: { Effect: "Allow", Principal: "*", Action: "s3:GetObject", Resource: "arn:aws:s3:::customer-data-exports/*" }, objectCount: 45892, totalSize: "12.4 GB" },
    detectedAt: "2026-03-15T10:01:00Z"
  },
  {
    id: "f-003", scanJobId: "scan-1", checkId: "AWS-EC2-001", provider: "AWS", service: "EC2", severity: "HIGH",
    title: "Security group allows unrestricted SSH (0.0.0.0/0:22)", resourceArn: "arn:aws:ec2:us-east-1:123456789012:security-group/sg-0abc123def456", resourceType: "AWS::EC2::SecurityGroup",
    region: "us-east-1", status: "OPEN", riskSummary: "Security group 'web-servers-sg' allows inbound SSH access from any IP address (0.0.0.0/0) on port 22.",
    evidence: { groupName: "web-servers-sg", groupId: "sg-0abc123def456", ingressRules: [{ protocol: "tcp", fromPort: 22, toPort: 22, cidr: "0.0.0.0/0" }], attachedInstances: ["i-0abc123", "i-0def456"] },
    detectedAt: "2026-03-15T10:02:00Z"
  },
  {
    id: "f-004", scanJobId: "scan-1", checkId: "AWS-IAM-001", provider: "AWS", service: "IAM", severity: "HIGH",
    title: "IAM policy grants overly broad permissions (wildcard)", resourceArn: "arn:aws:iam::123456789012:policy/AdminFullAccess", resourceType: "AWS::IAM::Policy",
    region: "global", status: "OPEN", riskSummary: "Policy 'AdminFullAccess' uses Action:* and Resource:*, granting unrestricted access to all AWS services and resources.",
    evidence: { policyName: "AdminFullAccess", statement: { Effect: "Allow", Action: "*", Resource: "*" }, attachedTo: [{ type: "User", name: "deploy-bot" }, { type: "Role", name: "ci-cd-role" }] },
    detectedAt: "2026-03-15T10:03:00Z"
  },
  {
    id: "f-005", scanJobId: "scan-1", checkId: "AWS-RDS-001", provider: "AWS", service: "RDS", severity: "CRITICAL",
    title: "RDS instance is publicly accessible", resourceArn: "arn:aws:rds:us-east-1:123456789012:db:production-db", resourceType: "AWS::RDS::DBInstance",
    region: "us-east-1", status: "OPEN", riskSummary: "RDS instance 'production-db' (PostgreSQL) is configured as publicly accessible, exposing the database to internet-based attacks.",
    evidence: { dbInstanceId: "production-db", engine: "postgres", engineVersion: "15.4", publiclyAccessible: true, vpcId: "vpc-0abc123", subnetGroup: "default-vpc-subnet-group", port: 5432 },
    detectedAt: "2026-03-15T10:04:00Z"
  },
  {
    id: "f-006", scanJobId: "scan-1", checkId: "AWS-S3-002", provider: "AWS", service: "S3", severity: "HIGH",
    title: "S3 bucket lacks server-side encryption", resourceArn: "arn:aws:s3:::app-logs-2026", resourceType: "AWS::S3::Bucket",
    region: "us-east-1", status: "OPEN", riskSummary: "S3 bucket 'app-logs-2026' does not have default server-side encryption enabled.",
    evidence: { bucketName: "app-logs-2026", encryptionEnabled: false, objectCount: 128450 },
    detectedAt: "2026-03-15T10:05:00Z"
  },
  {
    id: "f-007", scanJobId: "scan-1", checkId: "AWS-CT-001", provider: "AWS", service: "CloudTrail", severity: "HIGH",
    title: "CloudTrail not enabled in all regions", resourceArn: "arn:aws:cloudtrail:us-east-1:123456789012:trail/management-trail", resourceType: "AWS::CloudTrail::Trail",
    region: "us-east-1", status: "OPEN", riskSummary: "CloudTrail trail 'management-trail' is not configured as a multi-region trail, leaving activity in other regions unmonitored.",
    evidence: { trailName: "management-trail", isMultiRegion: false, isLogging: true, regions: ["us-east-1"] },
    detectedAt: "2026-03-15T10:06:00Z"
  },
  {
    id: "f-008", scanJobId: "scan-1", checkId: "AWS-IAM-004", provider: "AWS", service: "IAM", severity: "MEDIUM",
    title: "Access keys not rotated in 90+ days", resourceArn: "arn:aws:iam::123456789012:user/legacy-service", resourceType: "AWS::IAM::User",
    region: "global", status: "OPEN", riskSummary: "IAM user 'legacy-service' has access keys that have not been rotated in 187 days.",
    evidence: { userName: "legacy-service", accessKeyAge: 187, lastUsed: "2026-03-10T14:00:00Z", keyId: "AKIA1234567890ABCDEF" },
    detectedAt: "2026-03-15T10:07:00Z"
  },
  {
    id: "f-009", scanJobId: "scan-1", checkId: "AWS-VPC-001", provider: "AWS", service: "VPC", severity: "MEDIUM",
    title: "VPC flow logs not enabled", resourceArn: "arn:aws:ec2:us-east-1:123456789012:vpc/vpc-0abc123", resourceType: "AWS::EC2::VPC",
    region: "us-east-1", status: "OPEN", riskSummary: "VPC 'vpc-0abc123' does not have flow logs enabled, limiting network traffic visibility.",
    evidence: { vpcId: "vpc-0abc123", flowLogsEnabled: false, subnets: 6, instances: 12 },
    detectedAt: "2026-03-15T10:08:00Z"
  },
  {
    id: "f-010", scanJobId: "scan-1", checkId: "AWS-KMS-001", provider: "AWS", service: "KMS", severity: "MEDIUM",
    title: "KMS key rotation not enabled", resourceArn: "arn:aws:kms:us-east-1:123456789012:key/abc-123-def", resourceType: "AWS::KMS::Key",
    region: "us-east-1", status: "OPEN", riskSummary: "KMS key 'abc-123-def' does not have automatic annual key rotation enabled.",
    evidence: { keyId: "abc-123-def", alias: "alias/app-encryption", rotationEnabled: false, keyState: "Enabled", createdDaysAgo: 412 },
    detectedAt: "2026-03-15T10:09:00Z"
  },
  {
    id: "f-011", scanJobId: "scan-1", checkId: "AWS-EC2-004", provider: "AWS", service: "EC2", severity: "MEDIUM",
    title: "EC2 instance uses IMDSv1", resourceArn: "arn:aws:ec2:us-east-1:123456789012:instance/i-0abc123", resourceType: "AWS::EC2::Instance",
    region: "us-east-1", status: "OPEN", riskSummary: "EC2 instance 'i-0abc123' allows IMDSv1, which is vulnerable to SSRF-based credential theft.",
    evidence: { instanceId: "i-0abc123", metadataOptions: { httpTokens: "optional", httpEndpoint: "enabled" }, instanceType: "t3.medium" },
    detectedAt: "2026-03-15T10:10:00Z"
  },
  {
    id: "f-012", scanJobId: "scan-1", checkId: "AWS-VPC-002", provider: "AWS", service: "VPC", severity: "LOW",
    title: "Default VPC in use", resourceArn: "arn:aws:ec2:us-east-1:123456789012:vpc/vpc-default", resourceType: "AWS::EC2::VPC",
    region: "us-east-1", status: "OPEN", riskSummary: "The default VPC is being used with 3 running instances instead of a custom VPC with proper network segmentation.",
    evidence: { vpcId: "vpc-default", isDefault: true, instances: 3, subnets: 3 },
    detectedAt: "2026-03-15T10:11:00Z"
  },
];

// ── Mock AI Explanation ───────────────────────
export const mockAIExplanations: Record<string, AIExplanation> = {
  "f-001": {
    simple: "Your AWS root account — the most powerful account — can be accessed with just a password. If someone guesses or steals that password, they get full control over everything in your AWS environment.",
    technical: "The AWS root account has unrestricted access to all services and resources. Without MFA, it relies solely on password authentication, making it vulnerable to credential stuffing, phishing, and brute-force attacks. The root account was last accessed on 2026-03-14, and active access keys were detected, compounding the risk.",
    businessImpact: "Complete account takeover is possible. An attacker could delete all resources, exfiltrate data, incur massive charges, and leave no operational infrastructure. Recovery from a root compromise is extremely costly and time-consuming.",
    fixRecommendation: "Enable MFA on the root account immediately using a hardware security key (FIDO2) or virtual MFA app. Delete root access keys. Use IAM users or roles for all operational tasks.",
    attackScenario: "1. Attacker obtains root password via phishing email targeting admin\n2. Logs into AWS Console with single-factor authentication\n3. Creates new IAM admin user as backdoor\n4. Disables CloudTrail to hide activity\n5. Exfiltrates data from S3 and RDS\n6. Launches crypto-mining instances across regions",
    manualSteps: [
      "Sign in to the AWS Management Console as root",
      "Navigate to IAM → Dashboard → Security Status",
      "Click 'Activate MFA on your root account'",
      "Choose 'Virtual MFA device' or 'Hardware MFA device'",
      "Complete the MFA setup process",
      "Delete any active root access keys under Security Credentials"
    ],
    cliCommands: [
      "# Note: MFA activation for root must be done through the Console",
      "# Delete root access keys via Console: IAM → Security Credentials → Access Keys → Delete",
      "# Verify MFA status:",
      "aws iam get-account-summary --query 'SummaryMap.AccountMFAEnabled'"
    ],
  },
  "f-002": {
    simple: "One of your storage buckets (like a folder in the cloud) is wide open for anyone on the internet to read. It contains over 45,000 files totaling 12.4 GB — all publicly accessible.",
    technical: "S3 bucket 'customer-data-exports' has a bucket policy with Principal: '*' granting s3:GetObject on all objects (/*). This exposes 45,892 objects (12.4 GB) to unauthenticated access. The bucket name suggests it contains customer data, significantly amplifying the data breach risk.",
    businessImpact: "This is a potential data breach with regulatory implications (GDPR, CCPA, PCI DSS). Customer data exposure can result in fines, lawsuits, loss of customer trust, and mandatory breach notifications.",
    fixRecommendation: "Remove the public access policy statement immediately. Enable S3 Block Public Access at the account and bucket level. Audit the bucket contents for sensitive data. Enable server-side encryption and access logging.",
    attackScenario: "1. Attacker scans for misconfigured S3 buckets using tools like bucket-finder\n2. Discovers 'customer-data-exports' is publicly readable\n3. Downloads all 45,892 objects using aws s3 sync\n4. Extracts customer PII, financial data, or credentials\n5. Sells data on dark web or uses for targeted attacks",
    manualSteps: [
      "Go to S3 Console → customer-data-exports → Permissions",
      "Delete the bucket policy allowing Principal: '*'",
      "Enable 'Block Public Access' settings (all four options)",
      "Review and enable account-level Block Public Access",
      "Enable server-side encryption (SSE-S3 or SSE-KMS)",
      "Enable access logging to an audit bucket"
    ],
    cliCommands: [
      "# Block all public access on the bucket",
      "aws s3api put-public-access-block --bucket customer-data-exports --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true",
      "",
      "# Delete the permissive bucket policy",
      "aws s3api delete-bucket-policy --bucket customer-data-exports",
      "",
      "# Enable default encryption",
      "aws s3api put-bucket-encryption --bucket customer-data-exports --server-side-encryption-configuration '{\"Rules\":[{\"ApplyServerSideEncryptionByDefault\":{\"SSEAlgorithm\":\"AES256\"}}]}'"
    ],
    terraformSnippet: `resource "aws_s3_bucket_public_access_block" "customer_data" {
  bucket = aws_s3_bucket.customer_data_exports.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}`,
  },
};

// ── Mock Scan Jobs ────────────────────────────
export const mockScanJobs: ScanJob[] = [
  { id: "scan-1", cloudAccountId: "acc-1", provider: "AWS", accountAlias: "Production AWS", status: "COMPLETED", totalChecks: 25, completedChecks: 25, findingsCount: 12, score: 62, startedAt: "2026-03-15T10:00:00Z", completedAt: "2026-03-15T10:12:00Z" },
  { id: "scan-2", cloudAccountId: "acc-1", provider: "AWS", accountAlias: "Production AWS", status: "COMPLETED", totalChecks: 215, completedChecks: 215, findingsCount: 47, score: 58, startedAt: "2026-03-13T08:00:00Z", completedAt: "2026-03-13T08:45:00Z" },
  { id: "scan-3", cloudAccountId: "acc-2", provider: "GCP", accountAlias: "Staging GCP", status: "COMPLETED", totalChecks: 120, completedChecks: 120, findingsCount: 23, score: 71, startedAt: "2026-03-12T14:00:00Z", completedAt: "2026-03-12T14:30:00Z" },
  { id: "scan-4", cloudAccountId: "acc-3", provider: "DIGITALOCEAN", accountAlias: "Dev DO", status: "COMPLETED", totalChecks: 50, completedChecks: 50, findingsCount: 8, score: 78, startedAt: "2026-03-11T09:00:00Z", completedAt: "2026-03-11T09:15:00Z" },
];

// ── Dashboard Summary ─────────────────────────
export const mockDashboard: DashboardSummary = {
  overallScore: 62,
  totalFindings: 90,
  resourcesScanned: 342,
  checksRun: 410,
  accountsConnected: 3,
  severityDistribution: [
    { name: "Critical", value: 8, color: "#ef4444" },
    { name: "High", value: 22, color: "#f97316" },
    { name: "Medium", value: 35, color: "#eab308" },
    { name: "Low", value: 18, color: "#3b82f6" },
    { name: "Info", value: 7, color: "#6b7280" },
  ],
  topRiskyServices: [
    { service: "IAM", count: 18 },
    { service: "S3", count: 14 },
    { service: "EC2", count: 12 },
    { service: "RDS", count: 9 },
    { service: "VPC", count: 8 },
    { service: "CloudTrail", count: 6 },
    { service: "Lambda", count: 5 },
  ],
  trendData: [
    { date: "Feb 1", score: 45 },
    { date: "Feb 8", score: 48 },
    { date: "Feb 15", score: 52 },
    { date: "Feb 22", score: 50 },
    { date: "Mar 1", score: 55 },
    { date: "Mar 8", score: 58 },
    { date: "Mar 15", score: 62 },
  ],
  recentScans: [],
};

// ── Attack Path Mock ──────────────────────────
export const mockAttackPathNodes: AttackPathNode[] = [
  { id: "ap-1", findingId: "f-003", nodeType: "ENTRY", label: "Open SSH (0.0.0.0/0)", riskScore: 8.5, severity: "HIGH" },
  { id: "ap-2", findingId: "f-011", nodeType: "LATERAL", label: "IMDSv1 on EC2", riskScore: 7.0, severity: "MEDIUM" },
  { id: "ap-3", findingId: "f-004", nodeType: "ESCALATION", label: "Wildcard IAM Policy", riskScore: 9.0, severity: "HIGH" },
  { id: "ap-4", findingId: "f-002", nodeType: "IMPACT", label: "Public S3 Data Exfil", riskScore: 9.5, severity: "CRITICAL" },
  { id: "ap-5", findingId: "f-005", nodeType: "IMPACT", label: "Public RDS Access", riskScore: 9.0, severity: "CRITICAL" },
];

export const mockAttackPathEdges: AttackPathEdge[] = [
  { id: "ae-1", source: "ap-1", target: "ap-2", relationship: "enables SSRF via" },
  { id: "ae-2", source: "ap-2", target: "ap-3", relationship: "steals credentials from" },
  { id: "ae-3", source: "ap-3", target: "ap-4", relationship: "grants access to" },
  { id: "ae-4", source: "ap-3", target: "ap-5", relationship: "grants access to" },
];
