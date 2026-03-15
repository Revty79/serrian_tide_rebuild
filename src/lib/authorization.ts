import { canonicalizeRoleId } from "@/lib/roles";

export type RoleCapabilities = {
  roleId: string;
  isAdmin: boolean;
  hasElevatedAccess: boolean;
  canWorldBuild: boolean;
  canPublish: boolean;
  canAccessSourceForge: boolean;
  canSeeAdmin: boolean;
};

const WORLD_BUILD_ROLES = new Set([
  "admin",
  "privileged",
  "universe_creator",
  "world_developer",
  "world_builder",
]);

const PUBLISH_ROLES = new Set([
  "admin",
  "universe_creator",
  "world_developer",
]);

const SOURCE_FORGE_ROLES = new Set(["admin", "privileged"]);
const ELEVATED_ROLES = new Set(["admin", "privileged"]);

export function getRoleCapabilities(roleId: string | null | undefined): RoleCapabilities {
  const canonicalRoleId = canonicalizeRoleId(roleId);
  const isAdmin = canonicalRoleId === "admin";

  return {
    roleId: canonicalRoleId,
    isAdmin,
    hasElevatedAccess: ELEVATED_ROLES.has(canonicalRoleId),
    canWorldBuild: WORLD_BUILD_ROLES.has(canonicalRoleId),
    canPublish: PUBLISH_ROLES.has(canonicalRoleId),
    canAccessSourceForge: SOURCE_FORGE_ROLES.has(canonicalRoleId),
    canSeeAdmin: isAdmin,
  };
}
