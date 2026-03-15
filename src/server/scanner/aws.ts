import { S3Client, ListBucketsCommand, GetPublicAccessBlockCommand } from "@aws-sdk/client-s3";
import { EC2Client, DescribeSecurityGroupsCommand } from "@aws-sdk/client-ec2";
import { IAMClient, GenerateCredentialReportCommand, GetCredentialReportCommand } from "@aws-sdk/client-iam";
import { db } from "@/server/db";

// Sleep utility for polling
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function runAwsScan(scanJobId: string) {
  try {
    console.log(`[SCANNER] Starting scan job ${scanJobId}`);
    
    // 1. Fetch scan job and account details
    const scanJob = await db.scanJob.findUnique({
      where: { id: scanJobId },
      include: { cloudAccount: true }
    });

    if (!scanJob) throw new Error("Scan job not found");
    if (scanJob.cloudAccount.provider !== "AWS") throw new Error("Scanner currently only supports AWS");

    const credentialsMeta = scanJob.cloudAccount.metadata as any;
    if (!credentialsMeta || !credentialsMeta.accessKeyId || !credentialsMeta.secretAccessKey) {
      throw new Error("Missing AWS credentials in account metadata for scanning.");
    }

    const region = credentialsMeta.region || "us-east-1";
    const awsConfig = {
      region,
      credentials: {
        accessKeyId: credentialsMeta.accessKeyId,
        secretAccessKey: credentialsMeta.secretAccessKey,
        ...(credentialsMeta.sessionToken ? { sessionToken: credentialsMeta.sessionToken } : {})
      }
    };

    let totalChecksRun = 0;
    let newFindingsCount = 0;
    const detectedAt = new Date();

    // Initialize AWS SDK Clients
    const s3 = new S3Client(awsConfig);
    const ec2 = new EC2Client(awsConfig);
    const iam = new IAMClient(awsConfig);

    // Update Job Status
    await db.scanJob.update({
      where: { id: scanJobId },
      data: { status: "RUNNING" }
    });

    // ============================================
    // CHECK 1: S3 Buckets Missing Public Access Block
    // ============================================
    try {
      console.log(`[SCANNER] Checking S3 Buckets...`);
      const { Buckets } = await s3.send(new ListBucketsCommand({}));
      totalChecksRun += (Buckets?.length || 0);
      
      for (const bucket of Buckets || []) {
        if (!bucket.Name) continue;
        
        try {
          const publicAccess = await s3.send(new GetPublicAccessBlockCommand({ Bucket: bucket.Name }));
          const conf = publicAccess.PublicAccessBlockConfiguration;
          if (!conf?.BlockPublicAcls || !conf?.BlockPublicPolicy || !conf?.IgnorePublicAcls || !conf?.RestrictPublicBuckets) {
            // Finding: S3 Bucket doesn't block all public access
            await db.finding.create({
              data: {
                scanJobId,
                checkId: "aws-s3-public-access-block",
                provider: "AWS",
                service: "S3",
                severity: "HIGH",
                title: `S3 Bucket ${bucket.Name} does not block all public access`,
                resourceArn: `arn:aws:s3:::${bucket.Name}`,
                resourceType: "AWS::S3::Bucket",
                region,
                status: "OPEN",
                riskSummary: "Without Block Public Access enabled, an accidental bucket policy or ACL change could expose sensitive data to the internet.",
                evidence: {
                  BlockPublicAcls: conf?.BlockPublicAcls || false,
                  BlockPublicPolicy: conf?.BlockPublicPolicy || false,
                  IgnorePublicAcls: conf?.IgnorePublicAcls || false,
                  RestrictPublicBuckets: conf?.RestrictPublicBuckets || false
                },
                detectedAt
              }
            });
            newFindingsCount++;
          }
        } catch (err: any) {
          // If error is NoSuchPublicAccessBlockConfiguration, it means no block is set -> VULNERABLE
          if (err.name === 'NoSuchPublicAccessBlockConfiguration' || err.Code === 'NoSuchPublicAccessBlockConfiguration') {
            await db.finding.create({
              data: {
                scanJobId,
                checkId: "aws-s3-public-access-block",
                provider: "AWS",
                service: "S3",
                severity: "HIGH",
                title: `S3 Bucket ${bucket.Name} does not block all public access`,
                resourceArn: `arn:aws:s3:::${bucket.Name}`,
                resourceType: "AWS::S3::Bucket",
                region,
                status: "OPEN",
                riskSummary: "No Public Access Block configuration exists. An accidental bucket policy or ACL change could expose sensitive data to the internet.",
                evidence: { error: "No Public Access Block configuration exists" },
                detectedAt
              }
            });
            newFindingsCount++;
          }
        }
      }
    } catch (e) {
      console.error("[SCANNER] Error checking S3", e);
    }

    // ============================================
    // CHECK 2: EC2 Security Groups allowing 0.0.0.0/0 on sensitive ports
    // ============================================
    try {
      console.log(`[SCANNER] Checking EC2 Security Groups...`);
      const { SecurityGroups } = await ec2.send(new DescribeSecurityGroupsCommand({}));
      totalChecksRun += (SecurityGroups?.length || 0);

      const sensitivePorts = [22, 3389]; // SSH, RDP
      
      for (const sg of SecurityGroups || []) {
        let isBad = false;
        let badPort = 0;
        
        for (const permission of sg.IpPermissions || []) {
          if (permission.IpRanges?.some(r => r.CidrIp === "0.0.0.0/0")) {
            if (permission.FromPort && sensitivePorts.includes(permission.FromPort)) {
              isBad = true;
              badPort = permission.FromPort;
              break;
            }
          }
        }

        if (isBad && sg.GroupId) {
          await db.finding.create({
            data: {
              scanJobId,
              checkId: `aws-ec2-open-port-${badPort}`,
              provider: "AWS",
              service: "EC2",
              severity: "CRITICAL",
              title: `Security Group ${sg.GroupName} allows 0.0.0.0/0 to port ${badPort}`,
              resourceArn: `arn:aws:ec2:${region}:${scanJob.cloudAccount.accountId}:security-group/${sg.GroupId}`,
              resourceType: "AWS::EC2::SecurityGroup",
              region,
              status: "OPEN",
              riskSummary: `Allowing inbound traffic from the internet (0.0.0.0/0) to remote administration port ${badPort} heavily increases the risk of unauthorized access or brute-force attacks.`,
              evidence: { GroupId: sg.GroupId, GroupName: sg.GroupName, Port: badPort, VpcId: sg.VpcId },
              detectedAt
            }
          });
          newFindingsCount++;
        }
      }
    } catch (e) {
      console.error("[SCANNER] Error checking EC2", e);
    }

    // ============================================
    // CHECK 3: IAM Root Account lacking MFA
    // ============================================
    try {
      console.log(`[SCANNER] Checking IAM Credential Report for Root MFA...`);
      // Request generation (can take time)
      await iam.send(new GenerateCredentialReportCommand({}));
      totalChecksRun += 1;
      
      let reportReady = false;
      let csvData = "";
      
      // Poll up to 5 times
      for (let i = 0; i < 5; i++) {
        await sleep(2000);
        try {
          const res = await iam.send(new GetCredentialReportCommand({}));
          if (res.Content) {
            csvData = Buffer.from(res.Content).toString("utf-8");
            reportReady = true;
            break;
          }
        } catch (e: any) {
          if (e.name !== "ReportInProgressException") {
            throw e;
          }
        }
      }

      if (reportReady && csvData) {
        const lines = csvData.split('\n');
        // Find the root account line (typically first data line, user 'root')
        const rootLine = lines.find(l => l.startsWith('<root_account>'));
        if (rootLine) {
          const cols = rootLine.split(',');
          // In AWS credential report CSV, column index 7 is typically 'mfa_active'
          // However, we can do a simple parse: 
          const mfaActiveCol = cols[7]; 
          
          if (mfaActiveCol === "false") {
            await db.finding.create({
              data: {
                scanJobId,
                checkId: "aws-iam-root-mfa",
                provider: "AWS",
                service: "IAM",
                severity: "CRITICAL",
                title: "Root account does not have MFA enabled",
                resourceArn: `arn:aws:iam::${scanJob.cloudAccount.accountId}:root`,
                resourceType: "AWS::IAM::User",
                region: "global",
                status: "OPEN",
                riskSummary: "The root user has unrestricted access to all resources in the AWS account. Without Multi-Factor Authentication (MFA), compromised credentials would lead to complete account takeover.",
                evidence: { rootAccountLine: rootLine },
                detectedAt
              }
            });
            newFindingsCount++;
          }
        }
      }
    } catch (e) {
      console.error("[SCANNER] Error checking IAM", e);
    }

    // Calculate arbitrary score for the MVP based on findings count
    const baseScore = 100;
    const finalScore = Math.max(10, baseScore - (newFindingsCount * 10));

    // Finish Scan
    await db.scanJob.update({
      where: { id: scanJobId },
      data: { 
        status: "COMPLETED",
        completedAt: new Date(),
        totalChecks: totalChecksRun,
        completedChecks: totalChecksRun,
        findingsCount: newFindingsCount,
        score: finalScore
      }
    });

    console.log(`[SCANNER] Scan ${scanJobId} completed. Found ${newFindingsCount} issues!`);

  } catch (error) {
    console.error(`[SCANNER] Critical failure during scan ${scanJobId}:`, error);
    await db.scanJob.update({
      where: { id: scanJobId },
      data: { 
        status: "FAILED",
        completedAt: new Date()
      }
    });
  }
}
