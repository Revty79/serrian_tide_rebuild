import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { Prisma, PrismaClient } from "@prisma/client";

const args = new Set(process.argv.slice(2));
const isDryRun = args.has("--dry-run");
const backupOnly = args.has("--backup-only");

const SOURCE_DB_URL = process.env.OLD_DATABASE_URL;
const TARGET_DB_URL = process.env.DATABASE_URL;

if (!SOURCE_DB_URL) {
  console.error("Missing OLD_DATABASE_URL in environment.");
  process.exit(1);
}

if (!TARGET_DB_URL) {
  console.error("Missing DATABASE_URL in environment.");
  process.exit(1);
}

const sourceDb = new PrismaClient({
  datasources: {
    db: { url: SOURCE_DB_URL },
  },
});

const targetDb = new PrismaClient({
  datasources: {
    db: { url: TARGET_DB_URL },
  },
});

function toTimestamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

function parseNumberOrNull(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseStagePoints(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const cleaned = String(value).trim();
  if (!cleaned) {
    return null;
  }
  return cleaned;
}

function jsonOrNull(value) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return Prisma.JsonNull;
  }
  return value;
}

async function queryOldTable(sql) {
  try {
    return await sourceDb.$queryRawUnsafe(sql);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes("does not exist")) {
      return [];
    }
    throw error;
  }
}

function pickLatestBySkillId(rows, skillIdKey = "skill_id") {
  const map = new Map();
  for (const row of rows) {
    const skillId = row?.[skillIdKey];
    if (!skillId) continue;
    if (!map.has(skillId)) {
      map.set(skillId, row);
    }
  }
  return [...map.values()];
}

async function writeBackupFile(snapshot) {
  const backupDir = path.join(process.cwd(), "backups", "skills");
  await fs.mkdir(backupDir, { recursive: true });
  const filename = `skills-backup-${toTimestamp()}.json`;
  const filePath = path.join(backupDir, filename);
  await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf8");
  return filePath;
}

async function findFallbackTargetUser(targetUsers) {
  const byId = process.env.SKILL_REFRESH_OWNER_ID?.trim();
  if (byId) {
    const found = targetUsers.find((user) => user.id === byId);
    if (!found) {
      throw new Error(`SKILL_REFRESH_OWNER_ID (${byId}) was not found in target DB users.`);
    }
    return found;
  }

  const byEmail = process.env.SKILL_REFRESH_OWNER_EMAIL?.trim().toLowerCase();
  if (byEmail) {
    const found = targetUsers.find(
      (user) => (user.email ?? "").toLowerCase() === byEmail
    );
    if (!found) {
      throw new Error(`SKILL_REFRESH_OWNER_EMAIL (${byEmail}) was not found in target DB users.`);
    }
    return found;
  }

  const firstAdmin = targetUsers.find((user) => user.roleId === "admin");
  if (firstAdmin) {
    return firstAdmin;
  }

  return targetUsers[0] ?? null;
}

function mapOwners({
  sourceSkills,
  sourceUsers,
  targetUsers,
  fallbackUser,
}) {
  const targetById = new Map(targetUsers.map((user) => [user.id, user]));
  const targetByEmail = new Map(
    targetUsers
      .filter((user) => user.email)
      .map((user) => [user.email.toLowerCase(), user])
  );
  const sourceById = new Map(sourceUsers.map((user) => [user.id, user]));

  const ownerMap = new Map();
  const unmappedSourceOwners = new Set();

  for (const skill of sourceSkills) {
    const sourceOwnerId = skill.created_by;
    if (!sourceOwnerId) {
      ownerMap.set(skill.id, fallbackUser.id);
      continue;
    }

    if (targetById.has(sourceOwnerId)) {
      ownerMap.set(skill.id, sourceOwnerId);
      continue;
    }

    const sourceOwner = sourceById.get(sourceOwnerId);
    const sourceEmail = sourceOwner?.email?.toLowerCase?.();
    if (sourceEmail && targetByEmail.has(sourceEmail)) {
      ownerMap.set(skill.id, targetByEmail.get(sourceEmail).id);
      continue;
    }

    ownerMap.set(skill.id, fallbackUser.id);
    unmappedSourceOwners.add(sourceOwnerId);
  }

  return {
    ownerMap,
    unmappedSourceOwners,
  };
}

async function main() {
  console.log("Reading skills data from old database...");

  const [sourceSkills, sourceMagicRows, sourceSpecialRows, sourceUsers] = await Promise.all([
    queryOldTable(`
      SELECT
        id,
        created_by,
        name,
        type,
        tier,
        primary_attribute,
        secondary_attribute,
        definition,
        parent_id,
        parent2_id,
        parent3_id,
        is_free,
        is_published,
        created_at,
        updated_at
      FROM skills
      ORDER BY created_at ASC
    `),
    queryOldTable(`
      SELECT *
      FROM magic_type_details
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    `),
    queryOldTable(`
      SELECT *
      FROM special_ability_details
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    `),
    queryOldTable(`
      SELECT id, email, username
      FROM users
    `),
  ]);

  const sourceMagic = pickLatestBySkillId(sourceMagicRows);
  const sourceSpecial = pickLatestBySkillId(sourceSpecialRows);

  const backupSnapshot = {
    metadata: {
      exportedAt: new Date().toISOString(),
      sourceDb: "OLD_DATABASE_URL",
      counts: {
        skills: sourceSkills.length,
        magicDetails: sourceMagic.length,
        specialAbilityDetails: sourceSpecial.length,
      },
    },
    skills: sourceSkills,
    magicTypeDetails: sourceMagic,
    specialAbilityDetails: sourceSpecial,
  };

  const backupFilePath = await writeBackupFile(backupSnapshot);
  console.log(`Backup written: ${backupFilePath}`);

  if (backupOnly) {
    console.log("Backup-only mode enabled. No target DB changes were made.");
    return;
  }

  const targetUsers = await targetDb.user.findMany({
    select: { id: true, email: true, roleId: true },
    orderBy: { createdAt: "asc" },
  });

  if (!targetUsers.length) {
    throw new Error("Target DB has no users. Create at least one user before refreshing skills.");
  }

  const fallbackUser = await findFallbackTargetUser(targetUsers);
  if (!fallbackUser) {
    throw new Error("Could not determine a fallback target user for imported skills.");
  }

  const { ownerMap, unmappedSourceOwners } = mapOwners({
    sourceSkills,
    sourceUsers,
    targetUsers,
    fallbackUser,
  });

  if (unmappedSourceOwners.size > 0) {
    console.warn(
      `Warning: ${unmappedSourceOwners.size} source creator IDs were not found in target DB and will be reassigned to fallback user ${fallbackUser.id}.`
    );
  }

  if (isDryRun) {
    console.log("Dry-run mode enabled. No target DB changes were made.");
    console.log(
      JSON.stringify(
        {
          sourceCounts: {
            skills: sourceSkills.length,
            magicDetails: sourceMagic.length,
            specialAbilityDetails: sourceSpecial.length,
          },
          fallbackUserId: fallbackUser.id,
          reassignedCreatorCount: unmappedSourceOwners.size,
        },
        null,
        2
      )
    );
    return;
  }

  console.log("Refreshing target skills tables...");

  await targetDb.$transaction(async (tx) => {
    await tx.skillMagicDetail.deleteMany();
    await tx.skillSpecialAbilityDetail.deleteMany();
    await tx.skill.deleteMany();

    if (sourceSkills.length > 0) {
      await tx.skill.createMany({
        data: sourceSkills.map((skill) => ({
          id: skill.id,
          createdById: ownerMap.get(skill.id),
          name: skill.name,
          type: skill.type,
          tier: skill.tier,
          primaryAttribute: skill.primary_attribute ?? "NA",
          secondaryAttribute: skill.secondary_attribute ?? "NA",
          definition: skill.definition ?? null,
          parentId: skill.parent_id ?? null,
          parent2Id: skill.parent2_id ?? null,
          parent3Id: skill.parent3_id ?? null,
          isFree: Boolean(skill.is_free),
          isPublished: Boolean(skill.is_published),
          createdAt: skill.created_at ? new Date(skill.created_at) : new Date(),
          updatedAt: skill.updated_at ? new Date(skill.updated_at) : new Date(),
        })),
      });
    }

    const validSkillIds = new Set(sourceSkills.map((skill) => skill.id));

    for (const row of sourceMagic) {
      const skillId = row.skill_id;
      if (!skillId || !validSkillIds.has(skillId)) continue;

      await tx.skillMagicDetail.create({
        data: {
          id: row.id,
          skillId,
          skillName: row.skill_name ?? null,
          tradition: row.tradition ?? null,
          tier2Path: row.tier2_path ?? null,
          containersJson: jsonOrNull(row.containers_json),
          modifiersJson: jsonOrNull(row.modifiers_json),
          manaCost: parseNumberOrNull(row.mana_cost),
          castingTime: parseNumberOrNull(row.casting_time),
          masteryLevel: parseNumberOrNull(row.mastery_level),
          notes: row.notes ?? null,
          flavorLine: row.flavor_line ?? null,
          createdAt: row.created_at ? new Date(row.created_at) : new Date(),
          updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
        },
      });
    }

    for (const row of sourceSpecial) {
      const skillId = row.skill_id;
      if (!skillId || !validSkillIds.has(skillId)) continue;

      await tx.skillSpecialAbilityDetail.create({
        data: {
          id: row.id,
          skillId,
          abilityType: row.ability_type ?? null,
          scalingMethod: row.scaling_method ?? null,
          prerequisites: row.prerequisites ?? null,
          scalingDetails: row.scaling_details ?? null,
          stage1Tag: row.stage1_tag ?? null,
          stage1Desc: row.stage1_desc ?? null,
          stage1Points: parseStagePoints(row.stage1_points),
          stage2Tag: row.stage2_tag ?? null,
          stage2Desc: row.stage2_desc ?? null,
          stage2Points: parseStagePoints(row.stage2_points),
          stage3Tag: row.stage3_tag ?? null,
          stage3Desc: row.stage3_desc ?? null,
          stage4Tag: row.stage4_tag ?? null,
          stage4Desc: row.stage4_desc ?? null,
          finalTag: row.final_tag ?? null,
          finalDesc: row.final_desc ?? null,
          add1Tag: row.add1_tag ?? null,
          add1Desc: row.add1_desc ?? null,
          add2Tag: row.add2_tag ?? null,
          add2Desc: row.add2_desc ?? null,
          add3Tag: row.add3_tag ?? null,
          add3Desc: row.add3_desc ?? null,
          add4Tag: row.add4_tag ?? null,
          add4Desc: row.add4_desc ?? null,
          createdAt: row.created_at ? new Date(row.created_at) : new Date(),
          updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
        },
      });
    }
  });

  console.log(
    `Refresh complete: ${sourceSkills.length} skills, ${sourceMagic.length} magic detail rows, ${sourceSpecial.length} special ability detail rows.`
  );
}

main()
  .catch((error) => {
    console.error("Skill refresh failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sourceDb.$disconnect().catch(() => undefined);
    await targetDb.$disconnect().catch(() => undefined);
  });
