import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const roles = [
  {
    id: "free_user",
    name: "Free User",
    description: "Default role with standard access.",
  },
  {
    id: "admin",
    name: "Admin",
    description: "Administrative access for account and role management.",
  },
  {
    id: "privileged",
    name: "Privileged",
    description: "Expanded permissions for advanced feature usage.",
  },
  {
    id: "universe_creator",
    name: "Universe Creator",
    description: "Can design top-level universe constructs.",
  },
  {
    id: "world_builder",
    name: "World Builder",
    description: "Can create and shape worlds and their settings.",
  },
  {
    id: "world_developer",
    name: "World Developer",
    description: "Can evolve and implement world systems over time.",
  },
];

async function main() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: {
        name: role.name,
        description: role.description,
      },
      create: role,
    });
  }

  console.log(`Seeded ${roles.length} roles.`);
}

main()
  .catch((error) => {
    console.error("Role seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
