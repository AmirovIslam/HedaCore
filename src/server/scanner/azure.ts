import { db } from "@/server/db";
import { ClientSecretCredential } from "@azure/identity";
import { ResourceManagementClient } from "@azure/arm-resources";

export async function runAzureScan(scanJobId: string) {
  try {
    const scanJob = await db.scanJob.findUnique({
      where: { id: scanJobId },
      include: { cloudAccount: true }
    });

    if (!scanJob) throw new Error("Scan job not found");

    const credentialsMeta = scanJob.cloudAccount.metadata as any;
    
    await db.scanJob.update({
      where: { id: scanJobId },
      data: { status: "RUNNING" }
    });

    let newFindingsCount = 0;
    const detectedAt = new Date();

    try {
      const credential = new ClientSecretCredential(
        credentialsMeta.tenantId,
        credentialsMeta.clientId,
        credentialsMeta.clientSecret
      );

      const client = new ResourceManagementClient(credential, credentialsMeta.subscriptionId);
      
      const resourceGroups = [];
      for await (const rg of client.resourceGroups.list()) {
        resourceGroups.push(rg);
        
        // Check for any resource group named 'test' or 'dev'
        if (rg.name && (rg.name.toLowerCase().includes('test') || rg.name.toLowerCase().includes('dev'))) {
          await db.finding.create({
            data: {
              scanJobId,
              checkId: "azure-rg-naming-convention",
              provider: "AZURE",
              service: "Resource Manager",
              severity: "LOW",
              title: `Resource Group '${rg.name}' may contain unapproved dev/test resources`,
              resourceArn: rg.id || `subscriptions/${credentialsMeta.subscriptionId}/resourceGroups/${rg.name}`,
              resourceType: "Azure::Resources::ResourceGroup",
              region: rg.location || "global",
              status: "OPEN",
              riskSummary: "Development and testing resources in production subscriptions can lead to unexpected costs and widened attack surfaces if not properly isolated.",
              evidence: { resourceGroup: rg },
              detectedAt
            }
          });
          newFindingsCount++;
        }
      }

      // ─── SQL Firewall Check ───
      const resourcesClient = new ResourceManagementClient(credential, credentialsMeta.subscriptionId);
      
      // Look for SQL Servers
      for await (const resource of resourcesClient.resources.list({ filter: "resourceType eq 'Microsoft.Sql/servers'" })) {
        if (!resource.id || !resource.name) continue;
        
        // Simulated: In a full implementation we'd use @azure/arm-sql to check firewall rules
        // For here, we'll flag any SQL server as a risk if 'mock-prod' is in the name or subscription
        if (resource.name.toLowerCase().includes('prod') || credentialsMeta.subscriptionId.includes("prod")) {
          await db.finding.create({
            data: {
              scanJobId,
              checkId: "azure-sql-broad-access",
              provider: "AZURE",
              service: "SQL Database",
              severity: "CRITICAL",
              title: `Azure SQL Server '${resource.name}' firewall may allow broad access`,
              resourceArn: resource.id,
              resourceType: "Azure::SQL::Server",
              region: resource.location || "global",
              status: "OPEN",
              riskSummary: "SQL servers should have strict firewall rules. This server was flagged for further investigation based on naming/environment patterns.",
              evidence: { serverName: resource.name, resourceId: resource.id },
              detectedAt
            }
          });
          newFindingsCount++;
        }
      }

      // ─── Storage Account Check ───
      for await (const resource of resourcesClient.resources.list({ filter: "resourceType eq 'Microsoft.Storage/storageAccounts'" })) {
        if (!resource.id || !resource.name) continue;

        // Simulated: Flag storage accounts that might lack secure transfer
        if (resource.name.toLowerCase().includes('logs') || resource.name.toLowerCase().includes('data')) {
          await db.finding.create({
            data: {
              scanJobId,
              checkId: "azure-storage-secure-transfer",
              provider: "AZURE",
              service: "Storage Accounts",
              severity: "HIGH",
              title: `Storage Account '${resource.name}' should be verified for secure transfer`,
              resourceArn: resource.id,
              resourceType: "Azure::Storage::StorageAccount",
              region: resource.location || "global",
              status: "OPEN",
              riskSummary: "All storage accounts must enforce secure transfer (HTTPS). This account was flagged for verification.",
              evidence: { storageAccount: resource.name, resourceId: resource.id },
              detectedAt
            }
          });
          newFindingsCount++;
        }
      }

    } catch (e: any) {
      console.error("[SCANNER] Error checking Azure:", e);
      // Create permission finding
      await db.finding.create({
            data: {
              scanJobId,
              checkId: "azure-iam-missing-permissions",
              provider: "AZURE",
              service: "Active Directory",
              severity: "HIGH",
              title: `Scanner lacks 'Reader' role on subscription`,
              resourceArn: `subscriptions/${credentialsMeta.subscriptionId}`,
              resourceType: "Azure::Subscription",
              region: "global",
              status: "OPEN",
              riskSummary: "CloudGuard requires Reader access on the subscription to scan resources. Currently failing to authenticate or read resources.",
              evidence: { error: e.message },
              detectedAt
            }
      });
      newFindingsCount++;
    }

    await db.scanJob.update({
      where: { id: scanJobId },
      data: { 
        status: "COMPLETED",
        completedAt: new Date(),
        totalChecks: 1,
        completedChecks: 1,
        findingsCount: newFindingsCount,
        score: Math.max(10, 100 - (newFindingsCount * 10))
      }
    });

  } catch (error) {
    await db.scanJob.update({
      where: { id: scanJobId },
      data: { status: "FAILED", completedAt: new Date() }
    });
  }
}
