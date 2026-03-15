import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { evaluateCompliance } from "@/lib/compliance/engine";
import { BUILTIN_FRAMEWORKS } from "@/lib/compliance/definitions";
import { db } from "@/server/db";

export const complianceRouter = createTRPCRouter({
  getFrameworks: publicProcedure.query(async ({ ctx }) => {
    const org = await db.organization.findFirst();
    const customFrameworks = org ? await (db as any).complianceFramework.findMany({
      where: { orgId: org.id },
      include: { controls: true }
    }) : [];

    const builtIn = Object.entries(BUILTIN_FRAMEWORKS).map(([id, def]) => ({
      id,
      name: def.name,
      description: def.description,
      isBuiltIn: true
    }));

    return [
      ...builtIn,
      ...customFrameworks.map(f => ({
        id: f.id,
        name: f.name,
        description: f.description,
        isBuiltIn: false
      }))
    ];
  }),

  getStatus: publicProcedure
    .input(z.object({ frameworkId: z.string() }))
    .query(async ({ input, ctx }) => {
      const org = await db.organization.findFirst();
      return await evaluateCompliance(org?.id || "", input.frameworkId);
    }),

  createCustomFramework: publicProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      controls: z.array(z.object({
        controlId: z.string(),
        title: z.string(),
        description: z.string().optional(),
        checkIds: z.array(z.string())
      }))
    }))
    .mutation(async ({ input, ctx }) => {
      let org = await db.organization.findFirst();
      if (!org) {
        org = await db.organization.create({
          data: { name: "Default Org", slug: "default-" + Date.now() }
        });
      }

      const framework = await (db as any).complianceFramework.create({
        data: {
          orgId: org.id,
          name: input.name,
          description: input.description,
          isBuiltIn: false,
          controls: {
            create: input.controls.map((c: any) => ({
              controlId: c.controlId,
              title: c.title,
              description: c.description,
              checkIds: c.checkIds
            }))
          }
        },
        include: { controls: true }
      });
      return framework;
    })
});
