import { createTRPCRouter } from "@/server/api/trpc";
import { dashboardRouter, scanRouter, findingsRouter, accountsRouter, attackPathsRouter, authRouter, settingsRouter } from "./routers/app";
import { complianceRouter } from "./routers/compliance";

// Primary router for the server
export const appRouter = createTRPCRouter({
  dashboard: dashboardRouter,
  scan: scanRouter,
  findings: findingsRouter,
  accounts: accountsRouter,
  attackPaths: attackPathsRouter,
  auth: authRouter,
  settings: settingsRouter,
  compliance: complianceRouter,
});

export type AppRouter = typeof appRouter;
