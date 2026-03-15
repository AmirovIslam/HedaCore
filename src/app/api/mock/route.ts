import { NextResponse } from "next";
import { mockAccounts, mockScanJobs, mockFindings, mockDashboard } from "@/lib/mock-data";

// NOTE: This is a mock API structure illustrating the tRPC/REST endpoints
// defined in the architecture plan. In a real implementation with Next.js 14, 
// these would likely be tRPC procedures or Server Actions.

export async function GET(request: Request) {
  const url = new URL(request.url);
  const resource = url.searchParams.get("resource");

  try {
    switch (resource) {
      case "dashboard":
        return NextResponse.json(mockDashboard);
      case "accounts":
        return NextResponse.json(mockAccounts);
      case "scans":
        return NextResponse.json(mockScanJobs);
      case "findings":
        // Add basic filtering logic for mock
        const severity = url.searchParams.get("severity");
        let results = mockFindings;
        if (severity && severity !== "ALL") {
          results = results.filter(f => f.severity === severity);
        }
        return NextResponse.json(results);
      default:
        return NextResponse.json({ error: "Invalid resource requested" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  
  try {
    const body = await request.json();

    switch (action) {
      case "scan":
        // Mock starting a scan
        return NextResponse.json({ 
          success: true, 
          jobId: `scan-${Date.now()}`,
          message: "Scan job enqueued successfully"
        });
        
      case "remediate":
        // Mock starting a remediation
        return NextResponse.json({ 
          success: true, 
          actionId: `action-${Date.now()}`,
          message: "Remediation dry-run started" 
        });

      case "connect-provider":
        // Mock connecting a provider
        return NextResponse.json({
          success: true,
          accountId: `acc-${Date.now()}`,
          message: "Credentials validated and account connected"
        });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }
}
