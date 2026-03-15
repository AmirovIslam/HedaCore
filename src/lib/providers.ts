// ============================================
// CloudGuard — Provider Configuration
// ============================================

import { ProviderInfo } from "./types";
import { Cloud, Server, Database, Container } from "lucide-react";

export const providers: ProviderInfo[] = [
  {
    id: "AWS",
    name: "Amazon Web Services",
    icon: Cloud,
    description: "Connect your AWS account using IAM access keys or role assumption for comprehensive security scanning.",
    color: "#FF9900",
    gradient: "from-[#FF9900] to-[#FF6600]",
    credentialFields: [
      { name: "accessKeyId", label: "Access Key ID", type: "text", placeholder: "AKIAIOSFODNN7EXAMPLE", required: true, helpText: "Your IAM user access key ID" },
      { name: "secretAccessKey", label: "Secret Access Key", type: "password", placeholder: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", required: true, helpText: "Your IAM user secret access key" },
      { name: "sessionToken", label: "Session Token", type: "password", placeholder: "Optional — for temporary credentials", required: false, helpText: "Required only for temporary/STS credentials" },
      { name: "roleArn", label: "Role ARN (Optional)", type: "text", placeholder: "arn:aws:iam::123456789012:role/CloudGuardRole", required: false, helpText: "IAM role to assume for scanning" },
      { name: "region", label: "Default Region", type: "select", placeholder: "Select region", required: true, options: [
        { value: "us-east-1", label: "US East (N. Virginia)" },
        { value: "us-west-2", label: "US West (Oregon)" },
        { value: "eu-west-1", label: "EU (Ireland)" },
        { value: "eu-central-1", label: "EU (Frankfurt)" },
        { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
        { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
      ]},
    ],
  },
  {
    id: "GCP",
    name: "Google Cloud Platform",
    icon: Server,
    description: "Connect your GCP project using a service account key for configuration assessment and security scanning.",
    color: "#4285F4",
    gradient: "from-[#4285F4] to-[#1967D2]",
    credentialFields: [
      { name: "serviceAccountJson", label: "Service Account Key (JSON)", type: "textarea", placeholder: '{\n  "type": "service_account",\n  "project_id": "...",\n  ...Paste your service account JSON key\n}', required: true, helpText: "Download from GCP Console → IAM → Service Accounts → Keys" },
      { name: "projectId", label: "Project ID Override", type: "text", placeholder: "my-project-id", required: false, helpText: "Override the project ID from the service account key" },
    ],
  },
  {
    id: "DIGITALOCEAN",
    name: "DigitalOcean",
    icon: Database,
    description: "Connect your DigitalOcean account using a personal access token for infrastructure security scanning.",
    color: "#0080FF",
    gradient: "from-[#0080FF] to-[#0050CC]",
    credentialFields: [
      { name: "apiToken", label: "API Token", type: "password", placeholder: "dop_v1_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", required: true, helpText: "Generate from DigitalOcean Console → API → Personal Access Tokens" },
    ],
  },
  {
    id: "AZURE",
    name: "Microsoft Azure",
    icon: Container,
    description: "Connect your Azure subscription using service principal credentials for cloud security posture assessment.",
    color: "#0078D4",
    gradient: "from-[#0078D4] to-[#005A9E]",
    credentialFields: [
      { name: "tenantId", label: "Tenant ID", type: "text", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", required: true, helpText: "Azure Active Directory tenant ID" },
      { name: "clientId", label: "Client (Application) ID", type: "text", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", required: true, helpText: "Registered application client ID" },
      { name: "clientSecret", label: "Client Secret", type: "password", placeholder: "Your client secret value", required: true, helpText: "Application client secret" },
      { name: "subscriptionId", label: "Subscription ID", type: "text", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", required: true, helpText: "Azure subscription to scan" },
    ],
  },
];

export function getProvider(id: string): ProviderInfo | undefined {
  return providers.find((p) => p.id === id);
}
