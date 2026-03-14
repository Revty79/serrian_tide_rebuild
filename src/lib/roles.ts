export const DEFAULT_ROLE_ID = "free_user";
export const ADMIN_ROLE_ID = "admin";

export type SystemRoleDefinition = {
  id: string;
  name: string;
  description: string;
};

export const SYSTEM_ROLE_DEFINITIONS: SystemRoleDefinition[] = [
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

export const ALL_ROLE_IDS = SYSTEM_ROLE_DEFINITIONS.map((role) => role.id);

export function normalizeRoleId(value: string): string {
  return value.trim().toLowerCase();
}

export function formatUserRole(roleId: string): string {
  return normalizeRoleId(roleId || DEFAULT_ROLE_ID);
}
