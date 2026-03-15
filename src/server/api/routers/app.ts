import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { ClientSecretCredential } from "@azure/identity";
import { ProjectsClient } from "@google-cloud/resource-manager";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { mockDashboard, mockScanJobs, mockFindings, mockAttackPathNodes, mockAttackPathEdges, mockAccounts } from "@/lib/mock-data";

export const dashboardRouter = createTRPCRouter({
  getOverview: publicProcedure.query(async ({ ctx }) => {
    // Aggregate DB queries to replace mockDashboard
    const accountsCount = await ctx.db.cloudAccount.count();
    const findingsCount = await ctx.db.finding.count({ where: { status: "OPEN" } });
    const scansCount = await ctx.db.scanJob.count();
    
    // Average score across completed scans
    const avgScoreResult = await ctx.db.scanJob.aggregate({
      _avg: { score: true },
      where: { status: "COMPLETED" }
    });
    
    // Counts per severity
    const critical = await ctx.db.finding.count({ where: { severity: "CRITICAL", status: "OPEN" } });
    const high = await ctx.db.finding.count({ where: { severity: "HIGH", status: "OPEN" } });
    const medium = await ctx.db.finding.count({ where: { severity: "MEDIUM", status: "OPEN" } });
    const low = await ctx.db.finding.count({ where: { severity: "LOW", status: "OPEN" } });

    return {
      overallScore: avgScoreResult._avg.score ? Math.round(avgScoreResult._avg.score) : 100,
      totalFindings: findingsCount,
      resourcesScanned: accountsCount * 17, // Arbitrary for dashboard visual
      checksRun: scansCount * 85, // Arbitrary for dashboard visual
      accountsConnected: accountsCount,
      severityDistribution: [
        { name: "Critical", value: critical, color: "#EF4444" },
        { name: "High", value: high, color: "#F97316" },
        { name: "Medium", value: medium, color: "#EAB308" },
        { name: "Low", value: low, color: "#3B82F6" },
      ],
      topRiskyServices: [
        { service: "EC2", count: critical + high },
        { service: "S3", count: medium + low },
        { service: "IAM", count: 1 },
      ],
      trendData: [
        { date: "Mon", score: 82 },
        { date: "Tue", score: 85 },
        { date: "Wed", score: 86 },
        { date: "Thu", score: 89 },
        { date: "Fri", score: avgScoreResult._avg.score ? Math.round(avgScoreResult._avg.score) : 100 },
      ],
      recentScans: [], 
    };
  }),

  getRecentScans: publicProcedure
    .input(z.object({ limit: z.number().default(5) }).optional())
    .query(async ({ ctx, input }) => {
      const dbScans = await ctx.db.scanJob.findMany({
        take: input?.limit || 5,
        orderBy: { startedAt: 'desc' },
        include: { cloudAccount: true }
      });
      // Map to expected UI format
      return dbScans.map((s: any) => ({
        id: s.id,
        cloudAccountId: s.cloudAccountId,
        provider: s.cloudAccount.provider,
        accountAlias: s.cloudAccount.alias,
        status: s.status,
        totalChecks: s.totalChecks,
        completedChecks: s.completedChecks,
        findingsCount: s.findingsCount,
        score: s.score,
        startedAt: s.startedAt?.toISOString() || new Date().toISOString(),
        completedAt: s.completedAt?.toISOString() || null
      }));
    }),
});

import { runAwsScan } from "@/server/scanner/aws";
import { runGcpScan } from "@/server/scanner/gcp";
import { runAzureScan } from "@/server/scanner/azure";
import { runDoScan } from "@/server/scanner/do";

export const scanRouter = createTRPCRouter({
  startScan: publicProcedure
    .input(z.object({ accountId: z.string(), checkIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.db.cloudAccount.findUnique({ where: { id: input.accountId } });
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Account not found" });

      const job = await ctx.db.scanJob.create({
        data: {
          orgId: account.orgId,
          cloudAccountId: account.id,
          status: "QUEUED",
          checkIds: input.checkIds,
          startedAt: new Date()
        }
      });

      // Fire and forget the async actual scan (in production use BullMQ instead)
      if (account.provider === "AWS") {
        runAwsScan(job.id);
      } else if (account.provider === "GCP") {
        runGcpScan(job.id);
      } else if (account.provider === "AZURE") {
        runAzureScan(job.id);
      } else if (account.provider === "DIGITALOCEAN") {
        runDoScan(job.id);
      }
      
      return { success: true, jobId: job.id };
    }),
});

export const findingsRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    const dbFindings = await ctx.db.finding.findMany({
      orderBy: { detectedAt: 'desc' },
      take: 20
    });

    if (dbFindings.length === 0) {
      return mockFindings; // Fallback to mock if brand new DB just to show UI
    }

    return dbFindings.map((f: any) => ({
      ...f,
      detectedAt: f.detectedAt.toISOString(),
      evidence: typeof f.evidence === 'string' ? JSON.parse(f.evidence) : f.evidence
    }));
  }),
});

export const accountsRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    // Return all connected accounts in DB
    const accounts = await ctx.db.cloudAccount.findMany({
      orderBy: { validatedAt: 'desc' }
    });
    return accounts;
  }),
  connect: publicProcedure
    .input(z.object({
      provider: z.string(),
      credentials: z.record(z.string(), z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      // Real AWS Validation if provider is AWS
      let generatedAccountId = `${input.provider.toLowerCase()}-${Math.floor(Math.random() * 10000000000)}`;
      let alias = `${input.provider} Prod Account`;

      if (input.provider === "AWS") {
        try {
          const sts = new STSClient({
            region: input.credentials.region || "us-east-1",
            credentials: {
              accessKeyId: input.credentials.accessKeyId,
              secretAccessKey: input.credentials.secretAccessKey,
              ...(input.credentials.sessionToken ? { sessionToken: input.credentials.sessionToken } : {})
            }
          });
          const identity = await sts.send(new GetCallerIdentityCommand({}));
          if (!identity.Account) {
            throw new Error("Invalid AWS credentials returned empty account ID.");
          }
          generatedAccountId = identity.Account;
          alias = `AWS Account (${identity.Account})`;
        } catch (error: any) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `AWS Validation Failed: ${error.message || "Invalid credentials"}`,
            cause: error
          });
        }
      } else if (input.provider === "GCP") {
        try {
          const saConfig = JSON.parse(input.credentials.serviceAccountJson);
          if (!saConfig.project_id || !saConfig.client_email || !saConfig.private_key) {
            throw new Error("Invalid Service Account JSON block.");
          }
          
          const projectId = input.credentials.projectId || saConfig.project_id;
          
          // Real validation by hitting Resource Manager API
          const projectsClient = new ProjectsClient({
            credentials: {
              client_email: saConfig.client_email,
              private_key: saConfig.private_key
            },
            projectId: projectId,
          });
          
          const [project] = await projectsClient.getProject({ name: `projects/${projectId}` });
          
          generatedAccountId = projectId;
          alias = `GCP Project (${project.name || generatedAccountId})`;
        } catch(error: any) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `GCP Validation Failed: Make sure JSON is correct and Service Account has Viewer permissions. (${error.message})` });
        }
      } else if (input.provider === "DIGITALOCEAN") {
        try {
          const res = await fetch("https://api.digitalocean.com/v2/account", {
            headers: { "Authorization": `Bearer ${input.credentials.apiToken}` }
          });
          if (!res.ok) throw new Error("Invalid API Token");
          const data = await res.json();
          generatedAccountId = data.account?.uuid || generatedAccountId;
          alias = `DO Account (${data.account?.email || "Connected"})`;
        } catch(error: any) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `DigitalOcean Validation Failed: ${error.message}` });
        }
      } else if (input.provider === "AZURE") {
        try {
          const cred = new ClientSecretCredential(
            input.credentials.tenantId,
            input.credentials.clientId,
            input.credentials.clientSecret
          );
          // Just request a token for management API to validate
          await cred.getToken("https://management.azure.com/.default");
          generatedAccountId = input.credentials.subscriptionId;
          alias = `Azure Sub (${generatedAccountId})`;
        } catch (error: any) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Azure Validation Failed: Check Tenant, Client ID, and Secret.` });
        }
      }

      // Find or create a default Org for the MVP
      let org = await ctx.db.organization.findFirst();
      if (!org) {
        org = await ctx.db.organization.create({
          data: {
            name: "CloudGuard Startup",
            slug: "cloudguard-" + Date.now()
          }
        });
      }

      // Save to database
      const newAccount = await ctx.db.cloudAccount.create({
        data: {
          orgId: org.id,
          provider: input.provider,
          alias,
          accountId: generatedAccountId,
          credentialRef: "mock-vault-path", // MVP
          metadata: input.credentials, // TEMPORARY for MVP: Saving creds directly to DB to run scan
          status: "CONNECTED",
          validatedAt: new Date()
        }
      });
      return { success: true, accountId: newAccount.id };
    }),
  disconnect: publicProcedure
    .input(z.object({ accountId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.cloudAccount.delete({
        where: { id: input.accountId }
      });
      return { success: true, accountId: input.accountId };
    }),
});

export const attackPathsRouter = createTRPCRouter({
  getGraph: publicProcedure.query(async ({ ctx }) => {
    // 1. Fetch real findings from DB
    const dbFindings = await ctx.db.finding.findMany({
      orderBy: { detectedAt: 'desc' },
      take: 20
    });

    if (dbFindings.length === 0) {
      return { nodes: mockAttackPathNodes, edges: mockAttackPathEdges, narrative: [] };
    }

    // 2. Simple Heuristic to categorize findings into a path
    // In a real CSPM, this would be a complex graph traversal of resource relationships
    const entry = dbFindings.find(f => f.service === 'EC2' || f.service === 'Resource Manager' || f.checkId.includes('public-ip'));
    const escalation = dbFindings.find(f => f.service === 'IAM' || f.service === 'Active Directory' || f.checkId.includes('role') || f.severity === 'HIGH');
    const impact = dbFindings.find(f => f.service === 'S3' || f.service === 'Storage' || f.service === 'SQL' || f.severity === 'CRITICAL');

    const nodes: any[] = [];
    const edges: any[] = [];
    const narrative: any[] = [];

    if (entry) {
      nodes.push({ id: 'ap-1', findingId: entry.id, nodeType: 'ENTRY', label: entry.title, severity: entry.severity, riskScore: 85 });
      narrative.push({ step: 1, title: "Initial Access", description: `An attacker gains initial access through ${entry.title}. This exposed resource provides a foothold into the environment.` });
    }

    if (escalation && entry) {
      nodes.push({ id: 'ap-2', findingId: escalation.id, nodeType: 'ESCALATION', label: escalation.title, severity: escalation.severity, riskScore: 90 });
      edges.push({ id: 'ae-1', source: 'ap-1', target: 'ap-2', relationship: 'leverages' });
      narrative.push({ step: 2, title: "Privilege Escalation", description: `Using the initial foothold, the attacker identifies ${escalation.title}. Exploiting this allows them to gain elevated privileges within the subscription.` });
    }

    if (impact && (escalation || entry)) {
      const sourceId = escalation ? 'ap-2' : 'ap-1';
      nodes.push({ id: 'ap-3', findingId: impact.id, nodeType: 'IMPACT', label: impact.title, severity: impact.severity, riskScore: 98 });
      edges.push({ id: 'ae-2', source: sourceId, target: 'ap-3', relationship: 'impacts' });
      narrative.push({ step: 3, title: "Data Impact", description: `With elevated access, the attacker targets ${impact.title}. This leads to potential data exfiltration or service disruption, causing significant business impact.` });
    }

    return { 
      nodes: nodes.length > 0 ? nodes : mockAttackPathNodes, 
      edges: edges.length > 0 ? edges : mockAttackPathEdges,
      narrative: narrative.length > 0 ? narrative : [
        { step: 1, title: "Entry Point", description: "No clear path detected yet. Connect more accounts or run deeper scans to reveal potential exploitation chains." }
      ]
    };
  }),
});


export const authRouter = createTRPCRouter({
  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Logic for user auth/session
      return { success: true, token: "mock-jwt-token" };
    }),
  register: publicProcedure
    .input(z.object({ name: z.string(), email: z.string().email(), orgName: z.string(), password: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Logic for organization and user creation
      return { success: true, token: "mock-jwt-token" };
    })
});

export const settingsRouter = createTRPCRouter({
  getProfile: publicProcedure.query(() => {
    return { name: "Jane Doe", email: "jane@acmecorp.com", role: "Owner" };
  }),
  getTeam: publicProcedure.query(() => {
    return [
      { id: "1", name: "Jane Doe", email: "jane@acmecorp.com", role: "Owner", status: "Active" },
      { id: "2", name: "John Smith", email: "john@acmecorp.com", role: "Member", status: "Invited" },
    ];
  })
});
