import { db } from "@/server/db";
import { BUILTIN_FRAMEWORKS, ComplianceControlStatus } from "./definitions";

export async function evaluateCompliance(orgId: string, frameworkId: string): Promise<ComplianceControlStatus[]> {
  // 1. Get findings for the organization
  const org = orgId ? { id: orgId } : await db.organization.findFirst();
  if (!org) return [];

  const findings = await db.finding.findMany({
    where: {
      scanJob: {
        orgId: org.id
      },
      status: "OPEN"
    }
  });

  // 2. Identify the framework
  let framework;
  if (frameworkId in BUILTIN_FRAMEWORKS) {
    framework = BUILTIN_FRAMEWORKS[frameworkId];
  } else {
    framework = await (db as any).complianceFramework.findFirst({
      where: { id: frameworkId, orgId: org.id },
      include: { controls: true }
    });
  }

  if (!framework) return [];

  // 3. Group findings by checkId for O(1) lookup
  const findingsByCheckId = new Map<string, any[]>();
  for (const finding of findings) {
    if (!findingsByCheckId.has(finding.checkId)) {
      findingsByCheckId.set(finding.checkId, []);
    }
    findingsByCheckId.get(finding.checkId)!.push(finding);
  }

  // 4. Map controls to findings
  return framework.controls.map((control: any) => {
    const relatedFindings = (control.checkIds as string[]).flatMap(id => findingsByCheckId.get(id) || []);
    
    let status: ComplianceControlStatus["status"] = "PASS";
    if (relatedFindings.length > 0) {
      const criticalCount = relatedFindings.filter((f: any) => f.severity === "CRITICAL" || f.severity === "HIGH").length;
      status = criticalCount > 0 ? "FAIL" : "PARTIAL";
    } else if (control.checkIds.length === 0) {
      status = "NOT_EVALUATED";
    }

    return {
      id: "id" in control ? control.id : control.controlId, // Fixed potential missing ID
      controlId: control.controlId,
      title: control.title,
      description: control.description || "",
      checkIds: control.checkIds,
      status,
      findings: relatedFindings
    };
  });
}
