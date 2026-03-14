import { prisma } from "@/lib/prisma";
import { SYSTEM_ROLE_DEFINITIONS } from "@/lib/roles";

export async function ensureSystemRoles(): Promise<void> {
  for (const role of SYSTEM_ROLE_DEFINITIONS) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: {
        name: role.name,
        description: role.description,
      },
      create: {
        id: role.id,
        name: role.name,
        description: role.description,
      },
    });
  }
}
