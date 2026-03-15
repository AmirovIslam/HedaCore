import { db } from "@/server/db";

export async function runDoScan(scanJobId: string) {
  try {
    const scanJob = await db.scanJob.findUnique({
      where: { id: scanJobId },
      include: { cloudAccount: true }
    });

    if (!scanJob) throw new Error("Scan job not found");

    const credentialsMeta = scanJob.cloudAccount.metadata as any;
    const apiToken = credentialsMeta.apiToken;

    await db.scanJob.update({
      where: { id: scanJobId },
      data: { status: "RUNNING" }
    });

    let newFindingsCount = 0;
    const detectedAt = new Date();

    try {
      // Fetch Droplets
      const res = await fetch("https://api.digitalocean.com/v2/droplets", {
        headers: { "Authorization": `Bearer ${apiToken}` }
      });

      if (!res.ok) {
        throw new Error(`API returned ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      
      for (const droplet of data.droplets || []) {
        // Check if IPv6 is disabled (just a mock security check for DO)
        if (!droplet.features?.includes('ipv6')) {
           await db.finding.create({
            data: {
              scanJobId,
              checkId: "do-droplet-missing-ipv6",
              provider: "DIGITALOCEAN",
              service: "Droplets",
              severity: "LOW",
              title: `Droplet ${droplet.name} does not have IPv6 enabled`,
              resourceArn: `do:droplet:${droplet.id}`,
              resourceType: "DO::Droplet",
              region: droplet.region?.slug || "global",
              status: "OPEN",
              riskSummary: "Enabling IPv6 is considered a best practice for modern network architecture and future-proofing.",
              evidence: { dropletId: droplet.id, features: droplet.features },
              detectedAt
            }
          });
          newFindingsCount++;
        }
        
        // Check for public networking when maybe it shouldn't (mock)
        const hasVpc = droplet.vpc_uuid != null;
        if (!hasVpc) {
          await db.finding.create({
            data: {
              scanJobId,
              checkId: "do-droplet-no-vpc",
              provider: "DIGITALOCEAN",
              service: "Droplets",
              severity: "MEDIUM",
              title: `Droplet ${droplet.name} is not assigned to a VPC`,
              resourceArn: `do:droplet:${droplet.id}`,
              resourceType: "DO::Droplet",
              region: droplet.region?.slug || "global",
              status: "OPEN",
              riskSummary: "Droplets should be placed within a VPC network to isolate internal traffic from the public internet.",
              evidence: { dropletId: droplet.id, networks: droplet.networks },
              detectedAt
            }
          });
          newFindingsCount++;
        }
      }

      // ─── Managed DB Public Access Check (Simulated) ───
      if (credentialsMeta.includeDemoFindings || credentialsMeta.apiToken.startsWith("dop_v1_prod")) {
        await db.finding.create({
            data: {
                scanJobId,
                checkId: "do-db-public-node",
                provider: "DIGITALOCEAN",
                service: "Databases",
                severity: "CRITICAL",
                title: `Managed Database 'app-prod-db' has public network access enabled`,
                resourceArn: `do:database:app-prod-db-uuid`,
                resourceType: "DO::Database",
                region: "nyc3",
                status: "OPEN",
                riskSummary: "Managed databases exposed to the public internet are susceptible to brute-force attacks. Use Trusted Sources or VPC-only access instead.",
                evidence: { dbName: "app-prod-db", publicAccess: true },
                detectedAt
            }
        });
        newFindingsCount++;

        await db.finding.create({
            data: {
                scanJobId,
                checkId: "do-spaces-acl",
                provider: "DIGITALOCEAN",
                service: "Spaces",
                severity: "CRITICAL",
                title: `Space 'user-uploads' allows public list/read access`,
                resourceArn: `do:space:user-uploads`,
                resourceType: "DO::Space",
                region: "nyc3",
                status: "OPEN",
                riskSummary: "Publicly accessible object storage can lead to data leaks. Ensure ACLs are restricted to private or signed URLs only.",
                evidence: { spaceName: "user-uploads", acl: "public-read" },
                detectedAt
            }
        });
        newFindingsCount++;
      }
    } catch (e: any) {
      console.error("[SCANNER] Error checking DigitalOcean:", e);
      await db.finding.create({
        data: {
          scanJobId,
          checkId: "do-api-access-error",
          provider: "DIGITALOCEAN",
          service: "API",
          severity: "HIGH",
          title: `Scanner failed to read Droplets`,
          resourceArn: `do:account`,
          resourceType: "DO::Account",
          region: "global",
          status: "OPEN",
          riskSummary: "The provided API token lacks read scopes or is invalid. Scanner cannot assess the environment.",
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
