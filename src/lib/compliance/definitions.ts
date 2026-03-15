export interface ComplianceControlStatus {
  id: string;
  controlId: string;
  title: string;
  description: string;
  checkIds: string[];
  status: "PASS" | "FAIL" | "PARTIAL" | "NOT_EVALUATED";
  findings: any[];
}

export interface FrameworkDefinition {
  name: string;
  description: string;
  controls: {
    controlId: string;
    title: string;
    description: string;
    checkIds: string[];
  }[];
}

export const BUILTIN_FRAMEWORKS: Record<string, FrameworkDefinition> = {
  "ISO-27001": {
    name: "ISO 27001",
    description: "International standard for information security management.",
    controls: [
      {
        controlId: "A.8.1",
        title: "User endpoint devices",
        description: "Information on user endpoint devices shall be protected.",
        checkIds: ["azure-storage-secure-transfer", "aws-s3-public-access"]
      },
      {
        controlId: "A.12.1",
        title: "Operational procedures and responsibilities",
        description: "IT operating procedures shall be documented.",
        checkIds: ["azure-iam-missing-permissions"]
      }
    ]
  },
  "NIST-CSF": {
    name: "NIST CSF",
    description: "NIST Cybersecurity Framework.",
    controls: [
      {
        controlId: "PR.AC-1",
        title: "Identities and credentials are managed",
        description: "Management of credentials for authorized users.",
        checkIds: ["azure-iam-missing-permissions", "aws-iam-mfa-root"]
      },
      {
        controlId: "PR.DS-1",
        title: "Data-at-rest is protected",
        description: "Protective measures for data at rest.",
        checkIds: ["azure-sql-broad-access", "aws-rds-encryption"]
      }
    ]
  },
  "NIST-800-53": {
    name: "NIST 800-53",
    description: "Security and Privacy Controls for Information Systems and Organizations.",
    controls: [
      { controlId: "AC-2", title: "Account Management", description: "Manage information system accounts.", checkIds: ["azure-iam-missing-permissions"] },
      { controlId: "SC-7", title: "Boundary Protection", description: "Monitor and control communications at external boundary.", checkIds: ["azure-vnet-nsg", "aws-vpc-flow-logs"] }
    ]
  },
  "SOC2": {
    name: "SOC 2 Type II",
    description: "Trust Services Criteria for Security, Availability, and Confidentiality.",
    controls: [
      { controlId: "CC6.1", title: "Logical Access Security", description: "Restrict logical access to confidential information.", checkIds: ["azure-sql-firewall", "aws-iam-mfa-root"] },
      { controlId: "CC7.1", title: "System Monitoring", description: "Monitor the system for security events.", checkIds: ["azure-monitor-logs", "aws-cloudtrail-enabled"] }
    ]
  }
};
