"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { GradientText } from "@/components/GradientText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { Input } from "@/components/Input";
import { Tabs } from "@/components/Tabs";
import { WBNav } from "@/components/worldbuilder/WBNav";

/* ---------- types & helpers ---------- */

// Transform API response (camelCase) to frontend format (snake_case for certain fields)
function transformNpcFromApi(npc: any): any {
  return {
    ...npc,
    timeline_tag: npc.timelineTag,
    description_short: npc.descriptionShort,
    base_movement: npc.baseMovement,
    hp_total: npc.hpTotal,
    armor_soak: npc.armorSoak,
    defense_notes: npc.defenseNotes,
    challenge_rating: npc.challengeRating,
    skill_allocations: npc.skillAllocations,
    skill_checkpoint: npc.skillCheckpoint,
    is_initial_setup_locked: npc.isInitialSetupLocked,
    xp_spent: npc.xpSpent,
    xp_checkpoint: npc.xpCheckpoint,
    attitude_toward_party: npc.attitudeTowardParty,
    is_free: npc.isFree,
    isPublished: npc.isPublished,
    created_by: npc.createdBy,
    can_edit: npc.canEdit !== undefined ? npc.canEdit : true, // Default true for backwards compatibility
  };
}

type NPCTabKey = "identity" | "stats" | "skills" | "story" | "connections" | "preview";

type SimpleUser = {
  id: string;
  role: string | null;
};

function isLocalNpcId(value: NPC["id"]): value is string {
  return typeof value === "string" && value.length < 20;
}

function normalizeAttributeCode(value: string | null | undefined): string {
  const v = (value ?? "").trim().toLowerCase();
  if (!v) return "";
  if (v === "str" || v === "strength") return "STR";
  if (v === "dex" || v === "dexterity") return "DEX";
  if (v === "con" || v === "constitution") return "CON";
  if (v === "int" || v === "intelligence") return "INT";
  if (v === "wis" || v === "wisdom") return "WIS";
  if (v === "cha" || v === "charisma") return "CHA";
  if (v === "na" || v === "n/a") return "NA";
  return v.substring(0, 3).toUpperCase();
}

function isSpecialAbilityType(value: string | null | undefined): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "special ability" || normalized === "special_ability" || normalized === "special-ability";
}

export type NPC = {
  id: string | number;
  name: string;
  is_free?: boolean;
  created_by?: string; // User ID of creator
  can_edit?: boolean; // Whether current user can edit this NPC

  // Identity & tags
  alias?: string | null;
  importance?: string | null; // Minion, Supporting, Major, Nemesis, etc.
  role?: string | null; // Archetype: merchant, warlord, guide, rival, etc.
  race?: string | null;
  occupation?: string | null;
  location?: string | null; // Current home/base
  timeline_tag?: string | null;
  tags?: string | null; // comma list: "city guard, black market"
  age?: string | null;
  gender?: string | null;

  description_short?: string | null; // one-line pitch
  appearance?: string | null; // physical look, mannerisms

  // Stats (mirrors your core attributes)
  strength?: number | null;
  dexterity?: number | null;
  constitution?: number | null;
  intelligence?: number | null;
  wisdom?: number | null;
  charisma?: number | null;
  hp_total?: number | null;
  initiative?: number | null;
  armor_soak?: string | null;
  defense_notes?: string | null; // AC, resistances, notes
  base_movement?: number | null; // Racial attribute for initiative calculation

  // Controls & Allocations
  challenge_rating?: number | null; // CR for encounter balancing
  skill_allocations?: Record<string, number> | null; // skill_id -> points (current state)
  skill_checkpoint?: Record<string, number> | null; // skill_id -> points (last saved state)
  is_initial_setup_locked?: boolean; // True once initial 50 skill points are saved
  xp_spent?: number | null; // Total XP spent on skills after initial allocation
  xp_checkpoint?: number | null; // XP spent at last checkpoint

  // Story / personality
  personality?: string | null; // quick read on vibe
  ideals?: string | null;
  bonds?: string | null;
  flaws?: string | null;
  goals?: string | null;
  secrets?: string | null;
  backstory?: string | null;
  motivations?: string | null;
  hooks?: string | null; // how to pull PCs into scenes

  // Connections & power
  faction?: string | null;
  relationships?: string | null; // who they care about
  attitude_toward_party?: string | null;
  allies?: string | null;
  enemies?: string | null;
  affiliations?: string | null;
  resources?: string | null; // money, troops, contacts, gear

  notes?: string | null;

  // meta
  createdBy?: string | null;
  isPublished?: boolean;
};

const NPC_TABS: { id: NPCTabKey; label: string }[] = [
  { id: "identity", label: "Identity" },
  { id: "stats", label: "Stats" },
  { id: "skills", label: "Skills & Abilities" },
  { id: "story", label: "Story & Personality" },
  { id: "connections", label: "Connections & Power" },
  { id: "preview", label: "Preview" },
];

const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------- main page ---------- */

export default function NPCsPage() {
  const router = useRouter();

  // Escape -> back/fallback (same pattern as creatures)
  useEffect(() => {
    const onKey = (e: any) => {
      if (e.key === "Escape") {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push("/worldbuilder");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const [currentUser, setCurrentUser] = useState<SimpleUser | null>(null);

  // library data
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NPCTabKey>("identity");
  const [skillSubTab, setSkillSubTab] = useState<"strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma" | "special">("strength");
  const [qtext, setQtext] = useState("");
  const [loading, setLoading] = useState(true);
  const [races, setRaces] = useState<Array<{ 
    id: string; 
    name: string; 
    baseMovement?: number;
    maxStrength?: number;
    maxDexterity?: number;
    maxConstitution?: number;
    maxIntelligence?: number;
    maxWisdom?: number;
    maxCharisma?: number;
  }>>([]);
  const [allSkills, setAllSkills] = useState<Array<{ 
    id: string; 
    name: string; 
    primaryAttribute: string;
    secondaryAttribute: string;
    tier: number | null;
    parentId: string | null;
    parent2Id: string | null;
    parent3Id: string | null;
    type: string;
  }>>([]);

  // Load NPCs from database on mount (mirrors creatures)
  useEffect(() => {
    async function loadNPCs() {
      setLoading(true);

      // Load current user (non-blocking for other data)
      try {
        const userResponse = await fetch("/api/profile/me");
        const userData = await userResponse.json();
        if (userData.ok && userData.user) {
          setCurrentUser({ id: userData.user.id, role: userData.user.role });
        }
      } catch (error) {
        console.error("Error loading current user:", error);
      }

      // Load NPCs (do not block races/skills if this fails)
      try {
        const response = await fetch("/api/worldbuilder/npcs", { cache: "no-store" });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.ok) {
          throw new Error(data?.error || `HTTP ${response.status}`);
        }
        const transformedNpcs = (data.npcs || []).map(transformNpcFromApi);
        setNpcs(transformedNpcs);
      } catch (error) {
        console.error("Error loading NPCs:", error);
        setNpcs([]);
      }

      // Load races for dropdown (independent)
      try {
        const racesResponse = await fetch("/api/worldbuilder/races");
        if (racesResponse.ok) {
          const racesData = await racesResponse.json();
          if (racesData.ok && Array.isArray(racesData.races)) {
            setRaces(racesData.races.map((r: any) => ({
              id: r.id,
              name: r.name,
              baseMovement: r.baseMovement || 5,
              maxStrength: r.maxStrength,
              maxDexterity: r.maxDexterity,
              maxConstitution: r.maxConstitution,
              maxIntelligence: r.maxIntelligence,
              maxWisdom: r.maxWisdom,
              maxCharisma: r.maxCharisma,
            })));
          } else {
            setRaces([]);
          }
        } else {
          setRaces([]);
        }
      } catch (error) {
        console.error("Error loading races:", error);
        setRaces([]);
      }

      // Load skills for skill allocation (independent)
      try {
        const skillsResponse = await fetch("/api/worldbuilder/skills", { cache: "no-store" });
        if (skillsResponse.ok) {
          const skillsData = await skillsResponse.json();
          if (skillsData.ok && Array.isArray(skillsData.skills)) {
            setAllSkills(skillsData.skills.map((s: any) => ({
              id: s.id,
              name: s.name,
              primaryAttribute: s.primaryAttribute,
              secondaryAttribute: s.secondaryAttribute,
              tier: s.tier === null || s.tier === undefined ? null : Number(s.tier),
              parentId: s.parentId,
              parent2Id: s.parent2Id,
              parent3Id: s.parent3Id,
              type: s.type ?? "",
            })));
          } else {
            setAllSkills([]);
          }
        } else {
          setAllSkills([]);
        }
      } catch (error) {
        console.error("Error loading skills:", error);
        setAllSkills([]);
      } finally {
        setLoading(false);
      }
    }

    loadNPCs();
  }, []);

  const selected: NPC | null = useMemo(
    () =>
      npcs.find((c) => String(c.id) === String(selectedId ?? "")) ?? null,
    [npcs, selectedId]
  );

  const selectedCanEdit = useMemo(() => {
    if (!selected || !currentUser) return false;
    if (isLocalNpcId(selected.id)) return true;
    if (currentUser.role?.toLowerCase() === "admin") return true;
    if (selected.createdBy === currentUser.id) return true;
    if (selected.created_by === currentUser.id) return true;
    return selected.can_edit === true;
  }, [selected, currentUser]);

  // Ensure something is selected once we have data
  useEffect(() => {
    if (!selected && npcs.length) {
      const first = npcs[0];
      if (first) setSelectedId(String(first.id));
    }
  }, [npcs, selected]);

  const filteredList = useMemo(() => {
    const q = qtext.trim().toLowerCase();
    if (!q) return npcs;
    return npcs.filter((c) => {
      const base = [
        c.name,
        c.alias ?? "",
        c.role ?? "",
        c.race ?? "",
        c.occupation ?? "",
        c.location ?? "",
        c.tags ?? "",
        c.importance ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return base.includes(q);
    });
  }, [npcs, qtext]);

  /* ---------- CRUD helpers ---------- */

  function createNPC() {
    const id = uid();
    const row: NPC = {
      id,
      name: "New NPC",
      is_free: false,
      alias: null,
      importance: null,
      role: null,
      race: null,
      occupation: null,
      location: null,
      timeline_tag: null,
      tags: null,
      description_short: null,
      appearance: null,
      strength: 25,
      dexterity: 25,
      constitution: 25,
      intelligence: 25,
      wisdom: 25,
      charisma: 25,
      hp_total: null,
      initiative: null,
      armor_soak: null,
      defense_notes: null,
      base_movement: 5, // Default base movement
      challenge_rating: 1,
      skill_allocations: {},
      personality: null,
      ideals: null,
      bonds: null,
      flaws: null,
      goals: null,
      secrets: null,
      backstory: null,
      hooks: null,
      faction: null,
      relationships: null,
      attitude_toward_party: null,
      resources: null,
      notes: null,
      createdBy: currentUser?.id ?? null,
      isPublished: false,
    };
    setNpcs((prev) => [row, ...prev]);
    setSelectedId(String(id));
    setActiveTab("identity");
  }

  const updateSelected = useCallback((patch: Partial<NPC>) => {
    if (!selected) return;
    const idStr = String(selected.id);
    setNpcs((prev) =>
      prev.map((c) =>
        String(c.id) === idStr
          ? {
              ...c,
              ...patch,
            }
          : c
      )
    );
  }, [selected]);

  async function saveSelected() {
    if (!selected) return;

    const isNew = isLocalNpcId(selected.id);
    if (!isNew && !selectedCanEdit) {
      alert("You can only save NPCs you created. Admins can edit any NPC.");
      return;
    }

    try {
      const payload = {
        name: selected.name,
        isFree: selected.is_free ?? false,

        alias: selected.alias,
        importance: selected.importance,
        role: selected.role,
        race: selected.race,
        occupation: selected.occupation,
        location: selected.location,
        timelineTag: selected.timeline_tag,
        tags: selected.tags,
        age: selected.age,
        gender: selected.gender,
        descriptionShort: selected.description_short,
        appearance: selected.appearance,

        strength: selected.strength,
        dexterity: selected.dexterity,
        constitution: selected.constitution,
        intelligence: selected.intelligence,
        wisdom: selected.wisdom,
        charisma: selected.charisma,
        hpTotal: selected.hp_total,
        initiative: selected.initiative,
        baseMovement: selected.base_movement,
        armorSoak: selected.armor_soak,
        defenseNotes: selected.defense_notes,

        challengeRating: selected.challenge_rating,
        skillAllocations: selected.skill_allocations,
        skillCheckpoint: selected.skill_checkpoint,
        isInitialSetupLocked: selected.is_initial_setup_locked,
        xpSpent: selected.xp_spent,
        xpCheckpoint: selected.xp_checkpoint,

        personality: selected.personality,
        ideals: selected.ideals,
        bonds: selected.bonds,
        flaws: selected.flaws,
        goals: selected.goals,
        secrets: selected.secrets,
        backstory: selected.backstory,
        motivations: selected.motivations,
        hooks: selected.hooks,

        faction: selected.faction,
        relationships: selected.relationships,
        attitudeTowardParty: selected.attitude_toward_party,
        allies: selected.allies,
        enemies: selected.enemies,
        affiliations: selected.affiliations,
        resources: selected.resources,

        notes: selected.notes,
        isPublished: selected.isPublished ?? false,
      };

      let response: Response;
      if (isNew) {
        response = await fetch("/api/worldbuilder/npcs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch(`/api/worldbuilder/npcs/${selected.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.error || "Failed to save NPC");
      }

      if (isNew && data.npc) {
        const oldId = selected.id;
        const transformedNpc = transformNpcFromApi(data.npc);
        setNpcs((prev) =>
          prev.map((c) =>
            String(c.id) === String(oldId) ? transformedNpc : c
          )
        );
        setSelectedId(String(data.npc.id));
      } else if (data.npc) {
        const transformedNpc = transformNpcFromApi(data.npc);
        setNpcs((prev) =>
          prev.map((c) =>
            String(c.id) === String(data.npc.id) ? transformedNpc : c
          )
        );
      }

      alert("NPC saved successfully!");
    } catch (error) {
      console.error("Error saving NPC:", error);
      alert(
        `Failed to save NPC: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async function deleteSelected() {
    if (!selected || !currentUser) return;

    const idStr = String(selected.id);
    const isNew = isLocalNpcId(selected.id);
    if (!isNew && !selectedCanEdit) {
      alert(
        "You can only delete NPCs you created. Admins can delete any NPC."
      );
      return;
    }

    if (!confirm("Delete this NPC?")) return;

    if (isNew) {
      setNpcs((prev) =>
        prev.filter((c) => String(c.id) !== idStr)
      );
      setSelectedId(null);
      return;
    }

    try {
      const response = await fetch(
        `/api/worldbuilder/npcs/${selected.id}`,
        {
          method: "DELETE",
        }
      );
      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.error || "Failed to delete NPC");
      }

      setNpcs((prev) =>
        prev.filter((c) => String(c.id) !== idStr)
      );
      setSelectedId(null);
    } catch (error) {
      console.error("Error deleting NPC:", error);
      alert(
        `Failed to delete NPC: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /* ---------- Point Allocation Systems ---------- */

  // Get max attributes for selected race
  const selectedRaceData = useMemo(() => {
    if (!selected?.race) return null;
    return races.find(r => r.name === selected.race || r.id === selected.race) || null;
  }, [selected?.race, races]);

  // Calculate total attribute points spent (each attribute starts at 25, budget is 150 total)
  const calculateAttributePointsSpent = useMemo(() => {
    if (!selected) return 0;
    const str = selected.strength ?? 25;
    const dex = selected.dexterity ?? 25;
    const con = selected.constitution ?? 25;
    const int = selected.intelligence ?? 25;
    const wis = selected.wisdom ?? 25;
    const cha = selected.charisma ?? 25;
    return str + dex + con + int + wis + cha;
  }, [selected]);

  const attributePointsRemaining = 150 - calculateAttributePointsSpent;

  // Calculate total skill points spent (budget is 50, can only spend on tier 1 skills)
  const calculateSkillPointsSpent = useMemo(() => {
    if (!selected?.skill_allocations) return 0;
    return Object.values(selected.skill_allocations).reduce((sum, points) => sum + points, 0);
  }, [selected?.skill_allocations]);

  const skillPointsRemaining = 50 - calculateSkillPointsSpent;

  // Calculate skill rank (points + attribute mod)
  // For tier 1: rank = points + attribute mod
  // For tier 2: rank = parent rank + points in tier 2 skill
  // For tier 3: rank = tier 2 parent rank + points in tier 3 skill
  const calculateSkillRank = (skillPoints: number, attributeName: string, skillId?: string, tier?: number | null, contextParentId?: string): number => {
    if (!selected) return skillPoints;
    
    // Handle NA or empty for special abilities - no attribute modifier
    const attrUpper = attributeName?.toUpperCase();
    if (!attrUpper || attrUpper === 'NA' || attrUpper === 'N/A') {
      return skillPoints; // Special abilities: rank = points only
    }
    
    // For tier 2 and tier 3 skills, we need to add parent skill rank
    if (tier && tier > 1 && skillId) {
      const skill = allSkills.find(s => s.id === skillId);
      if (skill) {
        // Use contextParentId if provided (when viewing under a specific parent tree),
        // otherwise fall back to first available parent
        const parentId = contextParentId || skill.parentId || skill.parent2Id || skill.parent3Id;
        
        if (parentId) {
          const parentSkill = allSkills.find(s => s.id === parentId);
          if (parentSkill) {
            // Determine the correct allocation key for the parent
            let parentAllocationKey: string;
            let grandparentId: string | undefined;
            
            if (parentSkill.tier === 1) {
              // Parent is tier 1, use simple key
              parentAllocationKey = parentId;
            } else if (parentSkill.tier === 2) {
              // Parent is tier 2, need to find its tier 1 grandparent context
              // Look through allocations to find the contexted key
              const allocations = selected.skill_allocations || {};
              const contextedKey = Object.keys(allocations).find(key => {
                if (key.includes(':')) {
                  const skillIdPart = key.split(':')[1];
                  return skillIdPart === parentId;
                }
                return false;
              });
              
              if (contextedKey) {
                parentAllocationKey = contextedKey;
                grandparentId = contextedKey.split(':')[0]; // Extract tier 1 grandparent for recursive call
              } else {
                // Fallback to simple key if no context found
                parentAllocationKey = parentId;
              }
            } else {
              // Shouldn't happen, but fallback to simple key
              parentAllocationKey = parentId;
            }
            
            const parentPoints = selected.skill_allocations?.[parentAllocationKey] ?? 0;
            // Recursively calculate parent rank, passing grandparent context if available
            const parentRank = calculateSkillRank(parentPoints, parentSkill.primaryAttribute || "", parentId, parentSkill.tier, grandparentId);
            // Tier 2/3 rank = parent rank + points spent in this skill
            return parentRank + skillPoints;
          }
        }
      }
    }
    
    // Tier 1: standard calculation (points + attribute mod)
    let attributeValue = 25; // default
    
    // Support both full names and 3-letter codes
    const normalizedAttr = attributeName.toLowerCase();
    if (normalizedAttr === 'str' || normalizedAttr === 'strength') {
      attributeValue = selected.strength ?? 25;
    } else if (normalizedAttr === 'dex' || normalizedAttr === 'dexterity') {
      attributeValue = selected.dexterity ?? 25;
    } else if (normalizedAttr === 'con' || normalizedAttr === 'constitution') {
      attributeValue = selected.constitution ?? 25;
    } else if (normalizedAttr === 'int' || normalizedAttr === 'intelligence') {
      attributeValue = selected.intelligence ?? 25;
    } else if (normalizedAttr === 'wis' || normalizedAttr === 'wisdom') {
      attributeValue = selected.wisdom ?? 25;
    } else if (normalizedAttr === 'cha' || normalizedAttr === 'charisma') {
      attributeValue = selected.charisma ?? 25;
    }
    
    const attributeMod = calculateMod(attributeValue);
    return skillPoints + attributeMod;
  };

  // Calculate skill percentage (100 - (rank + attribute))
  // For tier 1: % = 100 - (rank + attribute)
  // For tier 2: % = 100 - (rank + attribute) where rank includes parent
  // For tier 3: % = 100 - (rank + attribute) where rank includes tier 2 parent
  const calculateSkillPercent = (skillPoints: number, attributeName: string, skillId?: string, tier?: number | null, contextParentId?: string): number => {
    if (!selected) return 100;
    
    // Handle NA or empty for special abilities - simply 100 - points
    const attrUpper = attributeName?.toUpperCase();
    if (!attrUpper || attrUpper === 'NA' || attrUpper === 'N/A') {
      return 100 - skillPoints; // Special abilities: % = 100 - points only
    }
    
    let attributeValue = 25; // default
    
    // Support both full names and 3-letter codes
    const normalizedAttr = attributeName.toLowerCase();
    if (normalizedAttr === 'str' || normalizedAttr === 'strength') {
      attributeValue = selected.strength ?? 25;
    } else if (normalizedAttr === 'dex' || normalizedAttr === 'dexterity') {
      attributeValue = selected.dexterity ?? 25;
    } else if (normalizedAttr === 'con' || normalizedAttr === 'constitution') {
      attributeValue = selected.constitution ?? 25;
    } else if (normalizedAttr === 'int' || normalizedAttr === 'intelligence') {
      attributeValue = selected.intelligence ?? 25;
    } else if (normalizedAttr === 'wis' || normalizedAttr === 'wisdom') {
      attributeValue = selected.wisdom ?? 25;
    } else if (normalizedAttr === 'cha' || normalizedAttr === 'charisma') {
      attributeValue = selected.charisma ?? 25;
    }
    
    // If no points spent, skill is untrained - return 100%
    if (skillPoints === 0) return 100;
    
    const rank = calculateSkillRank(skillPoints, attributeName, skillId, tier, contextParentId);
    return 100 - (rank + attributeValue);
  };

  // CR to XP lookup table for skill experience
  const CR_TO_XP = useMemo<Record<number, number>>(() => ({
    1: 0, 2: 25, 3: 50, 4: 75, 5: 125, 6: 200, 7: 325, 8: 525, 9: 850, 10: 1020,
    11: 1224, 12: 1469, 13: 1763, 14: 2116, 15: 2540, 16: 3048, 17: 3658, 18: 4390, 19: 5268, 20: 6322,
    21: 7587, 22: 9105, 23: 10926, 24: 13112, 25: 15735, 26: 18882, 27: 22659, 28: 27191, 29: 32630, 30: 39156,
    31: 45812, 32: 53501, 33: 62696, 34: 73355, 35: 85826, 36: 100423, 37: 117517, 38: 137495, 39: 160869, 40: 188217,
    41: 220214, 42: 257650, 43: 301450, 44: 352696, 45: 412654, 46: 482805, 47: 564882, 48: 660912, 49: 773267, 50: 904722,
  }), []);

  // Calculate available XP based on CR (only after initial 50 skill points are spent)
  const availableXP = useMemo(() => {
    if (!selected?.challenge_rating) return 0;
    const cr = selected.challenge_rating;
    // Only show XP if initial setup is locked
    if (!selected.is_initial_setup_locked) return 0;
    return CR_TO_XP[cr] || 0;
  }, [selected?.challenge_rating, selected?.is_initial_setup_locked, CR_TO_XP]);

  const xpSpent = selected?.xp_spent ?? 0;
  const xpRemaining = selected?.is_initial_setup_locked ? availableXP - xpSpent : 0;

  // Helper to generate allocation key
  // For tier 1 skills: use skillId
  // For tier 2/3 skills with multiple parents: use "parentId:skillId" to track points per tree
  function getAllocationKey(skillId: string, parentId?: string): string {
    return parentId ? `${parentId}:${skillId}` : skillId;
  }

  // Helper to update skill allocation
  function updateSkillAllocation(skillId: string, newPoints: number, parentId?: string) {
    if (!selected) return;
    
    const allocationKey = getAllocationKey(skillId, parentId);
    const currentAllocations = selected.skill_allocations || {};
    const currentPoints = currentAllocations[allocationKey] ?? 0;
    const checkpoint = selected.skill_checkpoint || {};
    const checkpointValue = checkpoint[allocationKey] ?? 0;
    const currentXPSpent = selected.xp_spent ?? 0;
    
    // If initial setup is NOT locked, use initial point spending rules
    if (!selected.is_initial_setup_locked) {
      // Cap at 10 for tier 1 skills during initial allocation
      if (newPoints > 10) {
        return;
      }
      
      // If removing points
      if (newPoints <= 0) {
        const updatedAllocations = { ...currentAllocations };
        delete updatedAllocations[allocationKey];
        updateSelected({ skill_allocations: updatedAllocations });
        return;
      }
      
      // If adding points, check budget
      if (newPoints > currentPoints) {
        const pointDifference = newPoints - currentPoints;
        if (skillPointsRemaining < pointDifference) {
          return; // Not enough points remaining
        }
      }
      
      const updatedAllocations = { ...currentAllocations };
      updatedAllocations[allocationKey] = newPoints;
      updateSelected({ skill_allocations: updatedAllocations });
      return;
    }
    
    // XP SPENDING MODE (initial setup is locked)
    
    // DECREASE: Can decrease but not below checkpoint
    if (newPoints < currentPoints) {
      if (newPoints < checkpointValue) {
        alert(`Cannot reduce below last saved checkpoint (${checkpointValue} points). Create a new checkpoint first if you want to permanently reduce this skill.`);
        return;
      }
      
      // Calculate XP refund
      let xpRefund = 0;
      for (let i = newPoints; i < currentPoints; i++) {
        if (i === 0) {
          xpRefund += 10; // New skill cost
        } else {
          xpRefund += i; // Upgrade cost
        }
      }
      
      const updatedAllocations = { ...currentAllocations };
      if (newPoints <= 0) {
        delete updatedAllocations[allocationKey];
      } else {
        updatedAllocations[allocationKey] = newPoints;
      }

      updateSelected({ 
        skill_allocations: updatedAllocations,
        xp_spent: Math.max(0, currentXPSpent - xpRefund)
      });
      return;
    }
    
    // INCREASE: Can only increase by 1 at a time with XP
    if (newPoints !== currentPoints + 1) {
      return; // Only allow +1 increases
    }
    
    // Calculate XP cost
    let xpCost = 0;
    if (currentPoints === 0) {
      // New skill: costs 10 XP (with exception for some races - future enhancement)
      xpCost = 10;
    } else {
      // Upgrading existing skill: cost equals current points in skill
      xpCost = currentPoints;
    }
    
    // Check if enough XP remaining
    if (xpRemaining < xpCost) {
      alert(`Not enough XP. This upgrade costs ${xpCost} XP, but you only have ${xpRemaining} XP remaining.`);
      return;
    }
    
    // Apply the upgrade
    const updatedAllocations = { ...currentAllocations };
    updatedAllocations[allocationKey] = newPoints;
    updateSelected({ 
      skill_allocations: updatedAllocations,
      xp_spent: currentXPSpent + xpCost
    });
  }

  // Function to lock initial setup and enable XP spending
  function lockInitialSetup() {
    if (!selected) return;
    if (calculateSkillPointsSpent !== 50) {
      alert('You must spend exactly 50 skill points before locking initial setup.');
      return;
    }
    
    // Create checkpoint of current skill allocations
    const checkpoint = { ...(selected.skill_allocations || {}) };
    
    updateSelected({ 
      is_initial_setup_locked: true,
      skill_checkpoint: checkpoint,
      xp_spent: 0,
      xp_checkpoint: 0
    });
  }

  // Function to create a new checkpoint (save current state)
  function createCheckpoint() {
    if (!selected || !selected.is_initial_setup_locked) return;
    
    const checkpoint = { ...(selected.skill_allocations || {}) };
    const xpCheckpoint = selected.xp_spent ?? 0;
    
    updateSelected({
      skill_checkpoint: checkpoint,
      xp_checkpoint: xpCheckpoint
    });
    
    alert('Checkpoint created! Skills saved at current state.');
  }

  /* ---------- preview text ---------- */

  // Calculate modifier from attribute score
  const calculateMod = (attrValue: number | null): number => {
    if (attrValue === null || attrValue === undefined) return -5;
    if (attrValue < 1) return -5;
    
    // Clear progression based on ranges:
    if (attrValue === 1) return -5;           // 1: -5
    if (attrValue >= 2 && attrValue <= 5) return -4;   // 2-5: -4
    if (attrValue >= 6 && attrValue <= 10) return -3;  // 6-10: -3
    if (attrValue >= 11 && attrValue <= 15) return -2; // 11-15: -2
    if (attrValue >= 16 && attrValue <= 20) return -1; // 16-20: -1
    if (attrValue >= 21 && attrValue <= 29) return 0;  // 21-29: 0
    
    // 30+: starts at +1 and increases by +1 every 5 points
    // 30-34: +1, 35-39: +2, 40-44: +3, 45-49: +4, etc.
    if (attrValue >= 30) {
      return Math.floor((attrValue - 30) / 5) + 1;
    }
    
    return -5; // fallback
  };

  // Calculate percentage from attribute score
  const calculatePercent = (attrValue: number | null): number => {
    if (attrValue === null || attrValue === undefined) return 100;
    return 100 - attrValue;
  };

  const calculateBaseInitiative = (dexterity: number | null): number => {
    if (dexterity === null || dexterity === undefined || dexterity < 1) return 1;
    if (dexterity < 5) return 1;
    return 1 + Math.floor(dexterity / 5);
  };

  // Derive location HP from total HP using predefined percentages
  const locationHP = useMemo(() => {
    const total = selected?.hp_total ?? 0;
    const segments = [
      ["head", 0.1],
      ["chest", 0.3],
      ["leftArm", 0.15],
      ["rightArm", 0.15],
      ["leftLeg", 0.15],
      ["rightLeg", 0.15],
    ] as const;

    let allocated = 0;
    const baseValues = segments.reduce((acc, [key, pct]) => {
      const value = Math.floor(total * pct);
      allocated += value;
      acc[key] = value;
      return acc;
    }, {} as Record<(typeof segments)[number][0], number>);

    const remainder = total - allocated;
    return {
      ...baseValues,
      chest: baseValues.chest + remainder, // Assign any rounding difference to chest so sums match total
    };
  }, [selected?.hp_total]);

  // Auto-calculate derived stats when attributes change
  useEffect(() => {
    if (!selected) return;

    const constitution = selected.constitution ?? null;
    const dexterity = selected.dexterity ?? null;
    const baseMovement = selected.base_movement ?? null;

    let conMod = -5;
    if (constitution !== null && constitution !== undefined) {
      if (constitution >= 5) conMod = -4;
      if (constitution >= 10) conMod = -3;
      if (constitution >= 15) conMod = -2;
      if (constitution >= 20) conMod = -1;
      if (constitution >= 25) conMod = 0;
      if (constitution >= 30) conMod = Math.floor((constitution - 30) / 5) + 1;
    }

    const newHP =
      constitution === null || constitution === undefined
        ? 0
        : constitution * 2 + conMod;

    const baseInit =
      dexterity === null || dexterity === undefined || dexterity < 1
        ? 1
        : dexterity < 5
          ? 1
          : 1 + Math.floor(dexterity / 5);
    const movement = baseMovement ?? 5;
    const newInitiative = baseInit * movement;
    
    // Only update if values changed to avoid infinite loops
    if (selected.hp_total !== newHP || selected.initiative !== newInitiative) {
      updateSelected({
        hp_total: newHP,
        initiative: newInitiative,
      });
    }
  }, [selected, updateSelected]);

  const previewText = useMemo(() => {
    if (!selected) return "";
    const n = selected;
    const nvLocal = (x: unknown) =>
      x === null || x === undefined || x === "" ? "—" : String(x);

    return [
      `NPC: ${n.name}`,
      `Alias: ${nvLocal(n.alias)}`,
      `Importance: ${nvLocal(n.importance)} | Role: ${nvLocal(
        n.role
      )}`,
      `Race: ${nvLocal(n.race)} | Occupation: ${nvLocal(
        n.occupation
      )}`,
      `Age: ${nvLocal(n.age)} | Gender: ${nvLocal(n.gender)}`,
      `Location: ${nvLocal(n.location)} | Timeline: ${nvLocal(
        n.timeline_tag
      )}`,
      `Tags: ${nvLocal(n.tags)}`,
      "",
      "— Quick Description —",
      `One-liner: ${nvLocal(n.description_short)}`,
      `Appearance: ${nvLocal(n.appearance)}`,
      "",
      "— Stats —",
      `STR: ${nvLocal(n.strength)}  DEX: ${nvLocal(
        n.dexterity
      )}  CON: ${nvLocal(n.constitution)}`,
      `INT: ${nvLocal(n.intelligence)}  WIS: ${nvLocal(
        n.wisdom
      )}  CHA: ${nvLocal(n.charisma)}`,
      `HP: ${nvLocal(n.hp_total)}  Init: ${nvLocal(
        n.initiative
      )}`,
      `Armor / Soak: ${nvLocal(n.armor_soak)}`,
      `Defense Notes: ${nvLocal(n.defense_notes)}`,
      "",
      "— Controls —",
      `Challenge Rating: ${nvLocal(n.challenge_rating)}`,
      "",
      "— Skills —",
      n.skill_allocations && Object.keys(n.skill_allocations).length > 0
        ? Object.entries(n.skill_allocations)
            .filter(([, points]) => points > 0)
            .map(([allocationKey, points]) => {
              // Parse allocation key: "skillId" for tier 1, "parentId:skillId" for tier 2/3
              const skillId = allocationKey.includes(':') ? allocationKey.split(':')[1] : allocationKey;
              const skill = allSkills.find(s => s.id === skillId);
              return `${skill?.name ?? skillId}: ${points} points`;
            })
            .join("\n")
        : "No skills allocated",
      "",
      "— Personality & Story —",
      `Personality: ${nvLocal(n.personality)}`,
      `Ideals: ${nvLocal(n.ideals)}`,
      `Bonds: ${nvLocal(n.bonds)}`,
      `Flaws: ${nvLocal(n.flaws)}`,
      `Goals: ${nvLocal(n.goals)}`,
      `Secrets: ${nvLocal(n.secrets)}`,
      "",
      "Backstory:",
      nvLocal(n.backstory),
      "",
      "Motivations:",
      nvLocal(n.motivations),
      "",
      "Hooks:",
      nvLocal(n.hooks),
      "",
      "— Connections & Power —",
      `Faction: ${nvLocal(n.faction)}`,
      `Relationships: ${nvLocal(n.relationships)}`,
      `Attitude toward party: ${nvLocal(
        n.attitude_toward_party
      )}`,
      "",
      "Allies:",
      nvLocal(n.allies),
      "",
      "Enemies:",
      nvLocal(n.enemies),
      "",
      "Affiliations:",
      nvLocal(n.affiliations),
      "",
      "Resources:",
      nvLocal(n.resources),
      "",
      "Notes:",
      nvLocal(n.notes),
    ].join("\n");
  }, [selected, allSkills]);

  /* ---------- render ---------- */

  return (
    <main className="min-h-screen px-6 py-10">
      <header className="max-w-7xl mx-auto mb-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <GradientText
              as="h1"
              variant="title"
              glow
              className="font-evanescent text-4xl sm:text-5xl tracking-tight"
            >
              NPC Builder
            </GradientText>
            <p className="mt-1 text-sm text-zinc-300/90 max-w-2xl">
              Create reusable NPCs for your worlds, eras, and campaigns.
              This tool focuses on fast identity, clean stats, and sharp
              story hooks, so your G.O.D brain can stay in G.O.D mode.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Link href="/worldbuilder/toolbox">
              <Button variant="secondary" size="sm" type="button">
              ← Toolbox
              </Button>
            </Link>
          </div>
        </div>
        <div className="flex justify-end">
          <WBNav current="npcs" />
        </div>
      </header>

      <section className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-6">
          {/* LEFT: library */}
          <Card
            padded={false}
            className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-5 shadow-2xl flex flex-col gap-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-zinc-200">
                NPC Library
              </h2>
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={createNPC}
              >
                + New NPC
              </Button>
            </div>

            {/* Filter */}
            <div className="space-y-2">
              <Input
                value={qtext}
                onChange={(e) => setQtext(e.target.value)}
                placeholder="Search by name, role, race, tags..."
              />
            </div>

            {/* List */}
            <div className="mt-2 flex-1 min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <div className="flex items-center justify-between px-3 py-2 text-xs text-zinc-400 border-b border-white/10">
                <span>NPCs: {filteredList.length}</span>
                <span className="uppercase tracking-wide text-[10px] text-zinc-500">
                  NPC records
                </span>
              </div>

            <div className="max-h-[420px] overflow-auto">
              {loading ? (
                <div className="px-3 py-6 text-center text-xs text-zinc-500">
                  Loading NPCs...
                </div>
              ) : filteredList.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-zinc-500">
                  No NPCs yet. Create your first character.
                </div>
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[300px]">
                  <thead className="text-left text-zinc-400">
                    <tr>
                      <th className="px-3 py-1">Name</th>
                      <th className="px-3 py-1">Role</th>
                      <th className="px-3 py-1">Importance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.map((n) => {
                      const idStr = String(n.id);
                      const isSel = selectedId === idStr;
                      return (
                        <tr
                          key={idStr}
                          className={`border-t border-white/5 cursor-pointer hover:bg-white/5 ${
                            isSel ? "bg-white/10" : ""
                          }`}
                          onClick={() => setSelectedId(idStr)}
                        >
                          <td className="px-3 py-1.5">
                            <div className="flex items-center gap-2">
                              <span>{n.name || "(unnamed)"}</span>
                            </div>
                          </td>
                          <td className="px-3 py-1.5">
                            {n.role ?? "—"}
                          </td>
                          <td className="px-3 py-1.5">
                            {n.importance ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              )}
            </div>

            {/* Quick rename + delete */}
            <div className="flex items-center justify-between px-3 py-2 text-xs text-zinc-400 border-t border-white/10">
              <div className="flex flex-col gap-1 flex-1 pr-2">
                <span>NPC Name</span>
                <input
                  className="rounded-md border border-white/15 bg-black/50 px-2 py-1 text-xs text-zinc-100 outline-none"
                  disabled={!selected || !selectedCanEdit}
                  value={selected?.name ?? ""}
                  onChange={(e) => updateSelected({ name: e.target.value })}
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                type="button"
                disabled={!selected || !selectedCanEdit}
                onClick={deleteSelected}
              >
                Delete
              </Button>
            </div>
          </div>
        </Card>

        {/* RIGHT: editor */}
        <Card
          padded={false}
          className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-5 shadow-2xl"
        >
          {loading ? (
            <p className="text-sm text-zinc-400">
              Loading NPCs...
            </p>
          ) : !selected ? (
            <p className="text-sm text-zinc-400">
              Select an NPC on the left or create a new one to begin editing.
            </p>
          ) : (
            <>
              <div className="mb-4 flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div className="flex-1">
                  <Input
                    value={selected.name}
                    onChange={(e) =>
                      updateSelected({ name: e.target.value })
                    }
                    placeholder="NPC name (e.g., Captain Rhea Voss, Old Man Harlan...)"
                  />
                  <p className="mt-1 text-[11px] text-zinc-400">
                    This is the label you&apos;ll see everywhere in
                    the tools.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.is_free ?? false}
                        disabled={!selectedCanEdit}
                        onChange={(e) =>
                          updateSelected({
                            is_free: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-white/20 bg-black/30 text-violet-500 focus:ring-violet-500/50"
                      />
                      <span className="text-sm text-zinc-300">
                        Free (available to all users)
                      </span>
                    </label>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-2">
                  <Tabs
                    tabs={NPC_TABS}
                    activeId={activeTab}
                    onChange={(id) =>
                      setActiveTab(id as NPCTabKey)
                    }
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      onClick={deleteSelected}
                      disabled={!selectedCanEdit}
                    >
                      Delete
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      type="button"
                      onClick={saveSelected}
                      disabled={!selectedCanEdit}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* IDENTITY */}
                {activeTab === "identity" && (
                        <div className="space-y-4">
                          <FormField
                            label="Alias / Nickname"
                            htmlFor="npc-alias"
                          >
                            <Input
                              id="npc-alias"
                              value={selected.alias ?? ""}
                              onChange={(e) =>
                                updateSelected({
                                  alias: e.target.value,
                                })
                              }
                            />
                          </FormField>

                          <FormField
                            label="Race / Species"
                            htmlFor="npc-race-select"
                            description="Select a race to auto-set Base Movement for initiative"
                          >
                            <select
                              id="npc-race-select"
                              value={selectedRaceData?.name ?? selected.race ?? ""}
                              onChange={(e) => {
                                const raceName = e.target.value;
                                const race = races.find(r => r.name === raceName);
                                updateSelected({
                                  race: raceName,
                                  base_movement: race?.baseMovement ?? 5
                                });
                              }}
                              className="w-full rounded-xl border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-zinc-100"
                            >
                              <option value="">-- Select Race --</option>
                              {races.map((race) => (
                                <option key={race.id} value={race.name}>
                                  {race.name}
                                </option>
                              ))}
                            </select>
                            {races.length === 0 && (
                              <p className="mt-2 text-xs text-amber-300">
                                No playable races available. Race builder is{" "}
                                <Link href="/worldbuilder/coming-soon" className="underline text-amber-200">
                                  coming soon
                                </Link>
                                .
                              </p>
                            )}
                          </FormField>

                          <FormField
                            label="Challenge Rating (CR)"
                            htmlFor="npc-cr"
                            description="Numeric rating for encounter difficulty (1-50)"
                          >
                            <select
                              id="npc-cr"
                              value={selected.challenge_rating ?? 1}
                              onChange={(e) =>
                                updateSelected({
                                  challenge_rating: Number(e.target.value),
                                })
                              }
                              className="w-full rounded-xl border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-zinc-100"
                            >
                              {Array.from({ length: 50 }, (_, i) => i + 1).map((cr) => (
                                <option key={cr} value={cr}>
                                  CR {cr} {CR_TO_XP[cr] !== undefined ? `(${CR_TO_XP[cr].toLocaleString()} XP)` : ''}
                                </option>
                              ))}
                            </select>
                          </FormField>

                          {/* XP Display - Only shows after 50 starting skill points are spent */}
                          {calculateSkillPointsSpent >= 50 && availableXP > 0 && (
                            <Card className="rounded-2xl border border-violet-400/30 bg-violet-400/5 p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-violet-200">Available Experience Points</p>
                                  <p className="text-xs text-zinc-400 mt-0.5">Based on CR {selected.challenge_rating}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-violet-200">{availableXP.toLocaleString()}</p>
                                  <p className="text-xs text-zinc-400">XP</p>
                                </div>
                              </div>
                              <p className="text-xs text-violet-300 mt-2">
                                Use this XP to purchase additional skills beyond the starting 50 points.
                              </p>
                            </Card>
                          )}

                          {calculateSkillPointsSpent < 50 && (
                            <Card className="rounded-2xl border border-amber-300/30 bg-amber-300/5 p-4">
                              <p className="text-xs text-amber-200">
                                <span className="font-semibold">💡 Tip:</span> Spend all 50 starting skill points to unlock bonus XP based on this NPC's CR.
                              </p>
                            </Card>
                          )}

                          <div className="grid gap-3 md:grid-cols-2">
                            <FormField
                              label="Importance"
                              htmlFor="npc-importance"
                              description="Minion, Supporting, Major, Nemesis..."
                            >
                              <Input
                                id="npc-importance"
                                value={selected.importance ?? ""}
                                onChange={(e) =>
                                  updateSelected({
                                    importance: e.target.value,
                                  })
                                }
                              />
                            </FormField>
                            <FormField
                              label="Role / Archetype"
                              htmlFor="npc-role"
                              description="Guard captain, fence, warlord, mentor, rival..."
                            >
                              <Input
                                id="npc-role"
                                value={selected.role ?? ""}
                                onChange={(e) =>
                                  updateSelected({
                                    role: e.target.value,
                                  })
                                }
                              />
                            </FormField>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <FormField
                              label="Occupation"
                              htmlFor="npc-occupation"
                            >
                              <Input
                                id="npc-occupation"
                                value={selected.occupation ?? ""}
                                onChange={(e) =>
                                  updateSelected({
                                    occupation: e.target.value,
                                  })
                                }
                              />
                            </FormField>
                            <FormField
                              label="Primary Location"
                              htmlFor="npc-location"
                              description="City, region, stronghold, station..."
                            >
                              <Input
                                id="npc-location"
                                value={selected.location ?? ""}
                                onChange={(e) =>
                                  updateSelected({
                                    location: e.target.value,
                                  })
                                }
                              />
                            </FormField>
                            <FormField
                              label="Timeline Tag"
                              htmlFor="npc-timeline"
                              description="Era / arc label this NPC belongs to."
                            >
                              <Input
                                id="npc-timeline"
                                value={selected.timeline_tag ?? ""}
                                onChange={(e) =>
                                  updateSelected({
                                    timeline_tag: e.target.value,
                                  })
                                }
                              />
                            </FormField>
                            <FormField
                              label="Age"
                              htmlFor="npc-age"
                              description="Age or age range (e.g., 32, mid-30s, ancient)"
                            >
                              <Input
                                id="npc-age"
                                value={selected.age ?? ""}
                                onChange={(e) =>
                                  updateSelected({
                                    age: e.target.value,
                                  })
                                }
                              />
                            </FormField>
                            <FormField
                              label="Gender"
                              htmlFor="npc-gender"
                              description="Gender identity or presentation"
                            >
                              <Input
                                id="npc-gender"
                                value={selected.gender ?? ""}
                                onChange={(e) =>
                                  updateSelected({
                                    gender: e.target.value,
                                  })
                                }
                              />
                            </FormField>
                          </div>

                          <FormField
                            label="Tags"
                            htmlFor="npc-tags"
                            description="Comma-separated: city guard, black market, noble, etc."
                          >
                            <Input
                              id="npc-tags"
                              value={selected.tags ?? ""}
                              onChange={(e) =>
                                updateSelected({
                                  tags: e.target.value,
                                })
                              }
                            />
                          </FormField>

                          <FormField
                            label="One-line Description"
                            htmlFor="npc-desc-short"
                          >
                            <textarea
                              id="npc-desc-short"
                              value={selected.description_short ?? ""}
                              onChange={(e) =>
                                updateSelected({
                                  description_short: e.target.value,
                                })
                              }
                              className="w-full min-h-[72px] rounded-xl border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-zinc-100"
                            />
                          </FormField>

                          <FormField
                            label="Appearance & Mannerisms"
                            htmlFor="npc-appearance"
                          >
                            <textarea
                              id="npc-appearance"
                              value={selected.appearance ?? ""}
                              onChange={(e) =>
                                updateSelected({
                                  appearance: e.target.value,
                                })
                              }
                              className="w-full min-h-[120px] rounded-xl border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-zinc-100"
                            />
                          </FormField>
                        </div>
                  )}

                {/* STATS */}
                {activeTab === "stats" && (
                        <div className="space-y-4">
                          <Card className="rounded-2xl border border-blue-300/30 bg-blue-300/5 p-4">
                            <p className="text-xs text-zinc-300">
                              <span className="font-semibold text-blue-200">Auto-Calculated:</span> Modifiers (Mod) and 
                              Percentages (%) are automatically calculated from attribute scores. HP and Initiative update 
                              based on Constitution and Dexterity.
                            </p>
                          </Card>

                          {!selectedRaceData && (
                            <Card className="rounded-2xl border border-amber-300/30 bg-amber-300/5 p-4">
                              <p className="text-xs text-amber-200">
                                <span className="font-semibold">⚠️ No Race Selected:</span> Select a race in the Identity tab 
                                to enforce max attribute limits and enable proper initiative calculations.
                              </p>
                            </Card>
                          )}

                          <Card className={[
                            "rounded-2xl border p-4",
                            attributePointsRemaining < 0 
                              ? "border-red-400/40 bg-red-400/10" 
                              : "border-violet-400/30 bg-violet-400/5"
                          ].join(" ")}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-zinc-200">Attribute Point Budget</p>
                                <p className="text-xs text-zinc-400 mt-0.5">Each attribute starts at 25 • Total budget: 150 points</p>
                              </div>
                              <div className="text-right">
                                <p className={[
                                  "text-2xl font-bold",
                                  attributePointsRemaining < 0 ? "text-red-300" : "text-violet-200"
                                ].join(" ")}>
                                  {attributePointsRemaining}
                                </p>
                                <p className="text-xs text-zinc-400">remaining</p>
                              </div>
                            </div>
                            {attributePointsRemaining < 0 && (
                              <p className="text-xs text-red-300 mt-2">
                                ⚠️ Over budget! Reduce attributes to continue.
                              </p>
                            )}
                          </Card>

                          <div className="space-y-3">
                            <p className="text-sm font-medium text-zinc-200">Core Attributes</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {(
                                [
                                  ["STR", "strength", "Strength"],
                                  ["DEX", "dexterity", "Dexterity"],
                                  ["CON", "constitution", "Constitution"],
                                  ["INT", "intelligence", "Intelligence"],
                                  ["WIS", "wisdom", "Wisdom"],
                                  ["CHA", "charisma", "Charisma"],
                                ] as const
                              ).map(([label, key, fullName]) => {
                                const attrValue = (selected as any)[key] ?? 0;
                                const mod = calculateMod(attrValue);
                                const percent = calculatePercent(attrValue);
                                const modSign = mod >= 0 ? '+' : '';
                                
                                // Get max value for this attribute from selected race
                                const maxByAttribute = {
                                  strength: selectedRaceData?.maxStrength ?? 50,
                                  dexterity: selectedRaceData?.maxDexterity ?? 50,
                                  constitution: selectedRaceData?.maxConstitution ?? 50,
                                  intelligence: selectedRaceData?.maxIntelligence ?? 50,
                                  wisdom: selectedRaceData?.maxWisdom ?? 50,
                                  charisma: selectedRaceData?.maxCharisma ?? 50,
                                } as const;
                                const maxValue = maxByAttribute[key];
                                const isOverMax = attrValue > maxValue;
                                
                                return (
                                  <Card key={key} className={[
                                    "rounded-xl border p-3",
                                    isOverMax ? "border-red-400/40 bg-red-400/10" : "border-white/10 bg-black/20"
                                  ].join(" ")}>
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-semibold text-violet-200">{label}</span>
                                      <span className="text-[10px] text-zinc-400">{fullName}</span>
                                    </div>
                                    {selectedRaceData && (
                                      <p className="text-[9px] text-zinc-500 mb-1">Max: {maxValue}</p>
                                    )}
                                    <FormField label="#" htmlFor={`npc-${key}`}>
                                      <Input
                                        id={`npc-${key}`}
                                        type="number"
                                        min="0"
                                        max={maxValue}
                                        value={attrValue || 25}
                                        onChange={(e) => {
                                          const newValue = e.target.value === "" ? 25 : Number(e.target.value);
                                          // Enforce max attribute cap
                                          const cappedValue = Math.min(newValue, maxValue);
                                          updateSelected({
                                            [key]: cappedValue,
                                          } as any);
                                        }}
                                        className="text-center"
                                      />
                                    </FormField>
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                      <div className="text-center">
                                        <p className="text-[10px] text-zinc-400">Mod</p>
                                        <p className="text-sm font-medium text-amber-200">{modSign}{mod}</p>
                                      </div>
                                      <div className="text-center">
                                        <p className="text-[10px] text-zinc-400">%</p>
                                        <p className="text-sm font-medium text-emerald-200">{percent}</p>
                                      </div>
                                    </div>
                                  </Card>
                                );
                              })}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                            <FormField 
                              label="Base Movement (from Race)" 
                              htmlFor="npc-base-movement"
                              description="Automatically set by selected race"
                            >
                              <Input
                                id="npc-base-movement"
                                type="number"
                                value={selectedRaceData?.baseMovement ?? selected.base_movement ?? ""}
                                readOnly
                                disabled
                                placeholder="Select a race"
                                className="bg-zinc-800/50 cursor-not-allowed"
                              />
                            </FormField>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                            <Card className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-3">
                              <FormField label="HP Total" htmlFor="npc-hp-total">
                                <Input
                                  id="npc-hp-total"
                                  type="number"
                                  value={selected.hp_total ?? ""}
                                  readOnly
                                  className="bg-black/40 text-emerald-200 font-semibold"
                                />
                              </FormField>
                              <p className="text-[10px] text-zinc-400 mt-1">
                                Auto: (CON × 2) + CON Mod
                              </p>
                            </Card>
                            
                            <Card className="rounded-xl border border-blue-400/30 bg-blue-400/5 p-3">
                              <FormField label="Initiative" htmlFor="npc-initiative-display">
                                <Input
                                  id="npc-initiative-display"
                                  type="number"
                                  value={selected.initiative ?? ""}
                                  readOnly
                                  className="bg-black/40 text-blue-200 font-semibold"
                                />
                              </FormField>
                              <p className="text-[10px] text-zinc-400 mt-1">
                                Auto: Base Init ({calculateBaseInitiative(selected.dexterity ?? null)}) × Base Movement ({selected.base_movement ?? 5})
                              </p>
                            </Card>

                            <FormField
                              label="Armor / Soak"
                              htmlFor="npc-armor-soak"
                              description="Armor rating, soak, shield"
                            >
                              <Input
                                id="npc-armor-soak"
                                value={selected.armor_soak ?? ""}
                                onChange={(e) =>
                                  updateSelected({
                                    armor_soak: e.target.value,
                                  })
                                }
                              />
                            </FormField>
                          </div>

                          <Card className="mt-2 rounded-2xl border border-white/10 bg-black/30 p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-zinc-100">Location Hit Points</p>
                                <p className="text-[11px] text-zinc-400">Split from total HP for called shots and injuries.</p>
                              </div>
                              <span className="text-xs text-emerald-200 font-semibold">Total: {selected.hp_total ?? 0}</span>
                            </div>

                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {[
                                ["Head", locationHP.head],
                                ["Chest", locationHP.chest],
                                ["Left Arm", locationHP.leftArm],
                                ["Right Arm", locationHP.rightArm],
                                ["Left Leg", locationHP.leftLeg],
                                ["Right Leg", locationHP.rightLeg],
                              ].map(([label, value]) => (
                                <div key={label} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                                  <p className="text-[11px] text-zinc-400">{label}</p>
                                  <p className="text-sm font-semibold text-zinc-100">{value}</p>
                                </div>
                              ))}
                            </div>

                            <p className="mt-3 text-[11px] text-zinc-400">
                              Auto-calculated from HP Total (Head 10%, Chest 30%, each limb 15%).
                            </p>
                          </Card>

                          <FormField
                            label="Defense Notes"
                            htmlFor="npc-defense-notes"
                            description="Resistances, vulnerabilities, special defenses."
                          >
                            <textarea
                              id="npc-defense-notes"
                              value={selected.defense_notes ?? ""}
                              onChange={(e) =>
                                updateSelected({
                                  defense_notes: e.target.value,
                                })
                              }
                              className="w-full min-h-[120px] rounded-xl border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-zinc-100"
                            />
                          </FormField>
                        </div>
                )}

                {/* SKILLS & ABILITIES */}
                {activeTab === "skills" && (
                        <div className="space-y-4">
                          <Card className={[
                            "rounded-2xl border p-4",
                            skillPointsRemaining < 0 
                              ? "border-red-400/40 bg-red-400/10" 
                              : selected.is_initial_setup_locked
                              ? "border-blue-400/30 bg-blue-400/5"
                              : "border-emerald-400/30 bg-emerald-400/5"
                          ].join(" ")}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-zinc-200">
                                  {selected.is_initial_setup_locked ? "XP Remaining" : "Skill Point Budget"}
                                </p>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                  {selected.is_initial_setup_locked 
                                    ? `CR ${selected.challenge_rating}: ${availableXP.toLocaleString()} total • ${xpSpent.toLocaleString()} spent`
                                    : "Tier 1 Skills Only • Total budget: 50 points"}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className={[
                                  "text-2xl font-bold",
                                  skillPointsRemaining < 0 ? "text-red-300" : selected.is_initial_setup_locked ? "text-blue-200" : "text-emerald-200"
                                ].join(" ")}>
                                  {selected.is_initial_setup_locked ? xpRemaining.toLocaleString() : skillPointsRemaining}
                                </p>
                                <p className="text-xs text-zinc-400">{selected.is_initial_setup_locked ? "XP" : "remaining"}</p>
                              </div>
                            </div>
                            {!selected.is_initial_setup_locked && skillPointsRemaining < 0 && (
                              <p className="text-xs text-red-300 mt-2">
                                ⚠️ Over budget! Reduce skill allocations to continue.
                              </p>
                            )}
                            {!selected.is_initial_setup_locked && skillPointsRemaining === 0 && (
                              <div className="mt-3 pt-3 border-t border-white/10">
                                <Button
                                  type="button"
                                  variant="primary"
                                  size="sm"
                                  onClick={lockInitialSetup}
                                  className="w-full"
                                >
                                  Lock Initial Setup & Enable XP Spending
                                </Button>
                                <p className="text-xs text-zinc-400 mt-2 text-center">
                                  Once locked, you can spend XP to further improve skills.
                                </p>
                              </div>
                            )}
                            {selected.is_initial_setup_locked && (
              <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                                <p className="text-xs text-blue-300">
                                  ✓ Initial setup locked. Use XP to improve skills further.
                                </p>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={createCheckpoint}
                                  className="w-full"
                                  disabled={xpSpent === (selected.xp_checkpoint ?? 0)}
                                >
                                  Create Checkpoint (Save Current State)
                                </Button>
                                <p className="text-xs text-zinc-400 text-center">
                                  Checkpoints let you reduce skills to try new builds.
                                </p>
                              </div>
                            )}
                          </Card>

                          {/* Skill Sub-Tabs */}
                          <div className="flex flex-wrap gap-2">
                            {[
                              { id: "strength" as const, label: "Strength" },
                              { id: "dexterity" as const, label: "Dexterity" },
                              { id: "constitution" as const, label: "Constitution" },
                              { id: "intelligence" as const, label: "Intelligence" },
                              { id: "wisdom" as const, label: "Wisdom" },
                              { id: "charisma" as const, label: "Charisma" },
                              { id: "special" as const, label: "Special Abilities" },
                            ].map((tab) => (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => setSkillSubTab(tab.id)}
                                className={[
                                  "px-3 py-1.5 text-sm rounded-lg border transition",
                                  skillSubTab === tab.id
                                    ? "border-violet-400/40 bg-violet-400/10 text-violet-200"
                                    : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                                ].join(" ")}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>

                          {allSkills.length === 0 ? (
                            <Card className="rounded-2xl border border-amber-300/30 bg-amber-300/5 p-6">
                              <div className="text-center space-y-3">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 mb-2">
                                  <svg
                                    className="w-8 h-8 text-amber-300"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M13 10V3L4 14h7v7l9-11h-7z"
                                    />
                                  </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-amber-200">
                                  No Tier 1 Skills Available
                                </h3>
                                <p className="text-sm text-zinc-300 max-w-md mx-auto">
                                  Create Tier 1 skills in the Skillsets page first, then return here to allocate points.
                                </p>
                              </div>
                            </Card>
                          ) : (
                            <div className="space-y-3">
                              <Card className="rounded-2xl border border-white/10 bg-black/20 p-4 max-h-[400px] overflow-y-auto">
                                <div className="space-y-3">
                                  {(() => {
                                    // Filter skills by current sub-tab attribute
                                    const step1Filtered = allSkills.filter((skill) => {
                                      const primary = normalizeAttributeCode(skill.primaryAttribute);
                                      const secondary = normalizeAttributeCode(skill.secondaryAttribute);
                                      
                                      if (skillSubTab === "special") {
                                        // Special abilities tab - only show skills with type "special ability"
                                        return isSpecialAbilityType(skill.type);
                                      }
                                      
                                      // Match by attribute (STR, DEX, CON, INT, WIS, CHA)
                                      const attrMatch = skillSubTab.substring(0, 3).toUpperCase();
                                      return primary === attrMatch || secondary === attrMatch;
                                    });
                                    
                                    const filteredSkills = step1Filtered.filter((skill) => {
                                      // Special abilities may not have tiers - allow all special abilities through
                                      if (skillSubTab === "special") {
                                        return true; // Don't filter special abilities by tier
                                      }
                                      
                                      // Tier 1 always unlocked
                                      if (skill.tier === 1) return true;
                                      // Skills with no tier (null) are always available
                                      if (skill.tier === null || skill.tier === undefined) return true;
                                      
                                      // Tier 2/3 require parent skill at 25+ points
                                      // Need to check all allocation keys since tier 2/3 might have contexted keys
                                      if (skill.parentId) {
                                        const allocations = selected.skill_allocations || {};
                                        
                                        // For tier 2 skills, parent is tier 1 (no context prefix)
                                        if (skill.tier === 2) {
                                          const parentPoints = allocations[skill.parentId] ?? 0;
                                          return parentPoints >= 25;
                                        }
                                        
                                        // For tier 3 skills, parent is tier 2 (might have context prefix)
                                        if (skill.tier === 3) {
                                          // Check if any allocation key contains this tier 2 parent and has 25+ points
                                          const hasEnoughPoints = Object.entries(allocations).some(([key, points]) => {
                                            // Key could be "parentId:tier2Id" or just "tier2Id"
                                            const skillIdInKey = key.includes(':') ? key.split(':')[1] : key;
                                            return skillIdInKey === skill.parentId && points >= 25;
                                          });
                                          return hasEnoughPoints;
                                        }
                                      }
                                      return false;
                                    });

                                    if (filteredSkills.length === 0) {
                                      return (
                                        <div className="text-center py-8">
                                          <p className="text-sm text-zinc-400">
                                            No {skillSubTab === "special" ? "special ability" : skillSubTab} skills available.
                                          </p>
                                          <p className="text-xs text-zinc-500 mt-1">
                                            Create skills with this attribute in the Skillsets page.
                                          </p>
                                        </div>
                                      );
                                    }

                                    // For special abilities tab, show all filtered skills (no tier hierarchy)
                                    // For other tabs, separate tier 1 skills (to display with their children)
                                    const skillsToDisplay = skillSubTab === "special" 
                                      ? filteredSkills 
                                      : filteredSkills.filter(s => s.tier === 1);
                                    
                                    return skillsToDisplay.map((skill) => {
                                      const allocated = selected.skill_allocations?.[skill.id] ?? 0;
                                      const checkpointValue = (selected.skill_checkpoint || {})[skill.id] ?? 0;
                                      const canDecrease = selected.is_initial_setup_locked ? allocated > checkpointValue : allocated > 0;
                                      const rank = calculateSkillRank(allocated, skill.primaryAttribute || "", skill.id, skill.tier);
                                      const percent = calculateSkillPercent(allocated, skill.primaryAttribute || "", skill.id, skill.tier);
                                      const atMax = allocated >= 10 && !selected.is_initial_setup_locked;
                                      
                                      // Calculate XP cost for next upgrade
                                      let nextUpgradeCost = 0;
                                      if (selected.is_initial_setup_locked) {
                                        if (allocated === 0) {
                                          nextUpgradeCost = 10; // New skill
                                        } else {
                                          nextUpgradeCost = allocated; // Upgrade cost = current points
                                        }
                                      } else {
                                        nextUpgradeCost = 1; // Initial point spending is 1-to-1
                                      }
                                      
                                      // Find child skills (tier 2 only) for this tier 1 skill
                                      // Check all three parent fields since skills like Spellcraft, Talismanism, and Faith share children
                                      const childSkills = filteredSkills.filter(s => 
                                        s.tier === 2 && (s.parentId === skill.id || s.parent2Id === skill.id || s.parent3Id === skill.id)
                                      );
                                      
                                      return (
                                      <div key={skill.id} className="space-y-2">
                                        {/* Tier 1 Skill */}
                                        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                              <p className="text-sm font-medium text-zinc-200">{skill.name}</p>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1">
                                              <span className="text-xs text-zinc-400">Rank: {rank}</span>
                                              <span className="text-xs text-emerald-300">%: {percent}</span>
                                              {atMax && (
                                                <span className="text-xs text-amber-300">MAX</span>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Button
                                              type="button"
                                              variant="secondary"
                                              size="sm"
                                              onClick={() => updateSkillAllocation(skill.id, Math.max(0, allocated - 1))}
                                              disabled={!canDecrease}
                                              title={
                                                selected.is_initial_setup_locked 
                                                  ? checkpointValue > 0 
                                                    ? `Cannot reduce below checkpoint (${checkpointValue})` 
                                                    : "Refund XP by reducing skill"
                                                  : "Reduce skill points"
                                              }
                                            >
                                              -
                                            </Button>
                                            <span className="text-sm font-semibold text-violet-200 w-12 text-center">
                                              {allocated}
                                            </span>
                                            <Button
                                              type="button"
                                              variant="secondary"
                                              size="sm"
                                              onClick={() => updateSkillAllocation(skill.id, allocated + 1)}
                                              disabled={
                                                selected.is_initial_setup_locked 
                                                  ? xpRemaining < nextUpgradeCost
                                                  : (atMax || skillPointsRemaining <= 0)
                                              }
                                              title={
                                                selected.is_initial_setup_locked
                                                  ? `Cost: ${nextUpgradeCost} XP (${xpRemaining} remaining)`
                                                  : atMax 
                                                  ? "Max skill level reached (10)" 
                                                  : `Cost: ${nextUpgradeCost} point${nextUpgradeCost !== 1 ? 's' : ''}`
                                              }
                                            >
                                              +
                                            </Button>
                                          </div>
                                        </div>
                                        
                                        {/* Tier 2/3 Child Skills */}
                                        {childSkills.map((childSkill) => {
                                          // Use parent-contexted allocation key for multi-parent skills
                                          const childAllocationKey = getAllocationKey(childSkill.id, skill.id);
                                          const childAllocated = selected.skill_allocations?.[childAllocationKey] ?? 0;
                                          const childCheckpointValue = (selected.skill_checkpoint || {})[childAllocationKey] ?? 0;
                                          const childCanDecrease = selected.is_initial_setup_locked ? childAllocated > childCheckpointValue : childAllocated > 0;
                                          const childRank = calculateSkillRank(childAllocated, childSkill.primaryAttribute || "", childSkill.id, childSkill.tier, skill.id);
                                          const childPercent = calculateSkillPercent(childAllocated, childSkill.primaryAttribute || "", childSkill.id, childSkill.tier, skill.id);
                                          const childAtMax = childAllocated >= 10 && !selected.is_initial_setup_locked;
                                          
                                          let childNextUpgradeCost = 0;
                                          if (selected.is_initial_setup_locked) {
                                            if (childAllocated === 0) {
                                              childNextUpgradeCost = 10;
                                            } else {
                                              childNextUpgradeCost = childAllocated;
                                            }
                                          } else {
                                            childNextUpgradeCost = 1;
                                          }
                                          
                                          // Find tier 3 children of this tier 2 skill
                                          // Check all three parent fields since skills can have multiple parents
                                          const tier3Children = filteredSkills.filter(s => 
                                            s.tier === 3 && (s.parentId === childSkill.id || s.parent2Id === childSkill.id || s.parent3Id === childSkill.id)
                                          );
                                          
                                          // Debug: Log tier 3 findings
                                          if (childSkill.tier === 2 && childSkill.name && filteredSkills.some(s => s.tier === 3)) {
                                            console.log(`Tier 2: ${childSkill.name} (${childSkill.id})`);
                                            console.log(`  Found ${tier3Children.length} tier 3 children`);
                                            console.log(`  All tier 3 skills in filtered:`, filteredSkills.filter(s => s.tier === 3).map(s => ({ name: s.name, parentId: s.parentId })));
                                          }
                                          
                                          return (
                                            <div key={childSkill.id} className="space-y-2">
                                              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/5 border border-white/10 ml-6">
                                                <div className="flex-1">
                                                  <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-zinc-200">{childSkill.name}</p>
                                                    <span className={[
                                                      "text-xs px-1.5 py-0.5 rounded font-semibold",
                                                      childSkill.tier === 2 ? "bg-blue-500/20 text-blue-300" : "bg-purple-500/20 text-purple-300"
                                                    ].join(" ")}>
                                                      T{childSkill.tier}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-xs text-zinc-400">Rank: {childRank}</span>
                                                    <span className="text-xs text-emerald-300">%: {childPercent}</span>
                                                    {childAtMax && <span className="text-xs text-amber-300">MAX</span>}
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => updateSkillAllocation(childSkill.id, Math.max(0, childAllocated - 1), skill.id)}
                                                    disabled={!childCanDecrease}
                                                    title={
                                                      selected.is_initial_setup_locked 
                                                        ? childCheckpointValue > 0 
                                                          ? `Cannot reduce below checkpoint (${childCheckpointValue})` 
                                                          : "Refund XP by reducing skill"
                                                        : "Reduce skill points"
                                                    }
                                                  >
                                                    -
                                                  </Button>
                                                  <span className="text-sm font-semibold text-violet-200 w-12 text-center">{childAllocated}</span>
                                                  <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => updateSkillAllocation(childSkill.id, childAllocated + 1, skill.id)}
                                                    disabled={
                                                      selected.is_initial_setup_locked
                                                        ? (childAtMax || xpRemaining < childNextUpgradeCost)
                                                        : (childAtMax || skillPointsRemaining <= 0)
                                                    }
                                                    title={
                                                      selected.is_initial_setup_locked
                                                        ? childAtMax
                                                          ? "Max points reached (10)"
                                                          : `Costs ${childNextUpgradeCost} XP`
                                                        : childAtMax
                                                        ? "Max points reached (10)"
                                                        : "Add skill point"
                                                    }
                                                  >
                                                    +
                                                  </Button>
                                                </div>
                                              </div>
                                              
                                              {/* Tier 3 Skills */}
                                              {tier3Children.map((tier3Skill) => {
                                                // Use tier 1 grandparent context for tier 3 skills (not tier 2 parent)
                                                // This ensures tier 3 skills track separately per magic tree
                                                const t3AllocationKey = getAllocationKey(tier3Skill.id, skill.id);
                                                const t3Allocated = selected.skill_allocations?.[t3AllocationKey] ?? 0;
                                                const t3CheckpointValue = (selected.skill_checkpoint || {})[t3AllocationKey] ?? 0;
                                                const t3CanDecrease = selected.is_initial_setup_locked ? t3Allocated > t3CheckpointValue : t3Allocated > 0;
                                                const t3Rank = calculateSkillRank(t3Allocated, tier3Skill.primaryAttribute || "", tier3Skill.id, tier3Skill.tier, skill.id);
                                                const t3Percent = calculateSkillPercent(t3Allocated, tier3Skill.primaryAttribute || "", tier3Skill.id, tier3Skill.tier, skill.id);
                                                const t3AtMax = t3Allocated >= 10 && !selected.is_initial_setup_locked;
                                                
                                                let t3NextUpgradeCost = 0;
                                                if (selected.is_initial_setup_locked) {
                                                  if (t3Allocated === 0) {
                                                    t3NextUpgradeCost = 10;
                                                  } else {
                                                    t3NextUpgradeCost = t3Allocated;
                                                  }
                                                } else {
                                                  t3NextUpgradeCost = 1;
                                                }
                                                
                                                return (
                                                  <div key={tier3Skill.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/5 border border-white/10 ml-12">
                                                    <div className="flex-1">
                                                      <div className="flex items-center gap-2">
                                                        <p className="text-sm font-medium text-zinc-200">{tier3Skill.name}</p>
                                                        <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-purple-500/20 text-purple-300">
                                                          T3
                                                        </span>
                                                      </div>
                                                      <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-xs text-zinc-400">Rank: {t3Rank}</span>
                                                        <span className="text-xs text-emerald-300">%: {t3Percent}</span>
                                                        {t3AtMax && <span className="text-xs text-amber-300">MAX</span>}
                                                      </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                      <Button
                                                        type="button"
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => updateSkillAllocation(tier3Skill.id, Math.max(0, t3Allocated - 1), skill.id)}
                                                        disabled={!t3CanDecrease}
                                                        title={
                                                          selected.is_initial_setup_locked 
                                                            ? t3CheckpointValue > 0 
                                                              ? `Cannot reduce below checkpoint (${t3CheckpointValue})` 
                                                              : "Refund XP by reducing skill"
                                                            : "Reduce skill points"
                                                        }
                                                      >
                                                        -
                                                      </Button>
                                                      <span className="text-sm font-semibold text-violet-200 w-12 text-center">{t3Allocated}</span>
                                                      <Button
                                                        type="button"
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => updateSkillAllocation(tier3Skill.id, t3Allocated + 1, skill.id)}
                                                        disabled={
                                                          selected.is_initial_setup_locked
                                                            ? (t3AtMax || xpRemaining < t3NextUpgradeCost)
                                                            : (t3AtMax || skillPointsRemaining <= 0)
                                                        }
                                                        title={
                                                          selected.is_initial_setup_locked
                                                            ? t3AtMax
                                                              ? "Max points reached (10)"
                                                              : `Costs ${t3NextUpgradeCost} XP`
                                                            : t3AtMax
                                                            ? "Max points reached (10)"
                                                            : "Add skill point"
                                                        }
                                                      >
                                                        +
                                                      </Button>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          );
                                        })}
                                      </div>
                                      );
                                    });
                                  })()}
                                </div>
                              </Card>
                            </div>
                          )}

                          <Card className="rounded-2xl border border-blue-300/30 bg-blue-300/5 p-4">
                            <p className="text-xs text-zinc-300">
                              <span className="font-semibold text-blue-200">Coming Soon:</span> Special abilities, racial traits, 
                              spells, and magic disciplines will be added here for advanced NPC customization.
                            </p>
                          </Card>
                        </div>
                )}

                {/* STORY */}
                {activeTab === "story" && (
                        <div className="space-y-4">
                          <FormField
                            label="Personality Summary"
                            htmlFor="npc-personality"
                          >
                            <textarea
                              id="npc-personality"
                              value={selected.personality ?? ""}
                              onChange={(e) =>
                                updateSelected({
                                  personality: e.target.value,
                                })
                              }
                              className="w-full min-h-[100px] rounded-xl border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-zinc-100"
                            />
                          </FormField>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <FormField
                              label="Ideals"
                              htmlFor="npc-ideals"
                            >
                              <textarea
                                id="npc-ideals"
                                value={selected.ideals ?? ""}
                                onChange={(e) =>
                                  updateSelected({
                                    ideals: e.target.value,
                                  })
                                }
                                className="w-full min-h-[80px] rounded-xl border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-zinc-100"
                              />
                            </FormField>
                            <FormField
                              label="Bonds"
                              htmlFor="npc-bonds"
                            >
                              <textarea
                                id="npc-bonds"
                                value={selected.bonds ?? ""}
                                onChange={(e) =>
                                  updateSelected({
                                    bonds: e.target.value,
                                  })
                                }
                                className="w-full min-h-[80px] rounded-xl border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-zinc-100"
                              />
                            </FormField>
                            <FormField
                              label="Flaws"
                              htmlFor="npc-flaws"
                            >
                              <textarea
                                id="npc-flaws"
                                value={selected.flaws ?? ""}
                                onChange={(e) =>
                                  updateSelected({
                                    flaws: e.target.value,
                                  })
                                }
                                className="w-full min-h-[80px] rounded-xl border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-zinc-100"
                              />
                            </FormField>
                          </div>

                          <FormField
                            label="Goals"
                            htmlFor="npc-goals"
                            description="What are they actively trying to achieve?"
                          >
                            <textarea
                              id="npc-goals"
                              value={selected.goals ?? ""}
                              onChange={(e) =>
                                updateSelected({
                                  goals: e.target.value,
                                })
                              }
                              className="w-full min-h-[80px] rounded-xl border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-zinc-100"
                            />
                          </FormField>

                          <FormField
                            label="Secrets"
                            htmlFor="npc-secrets"
                            description="Things they hide from others (or themselves)."
                          >
                            <textarea
                              id="npc-secrets"
                              value={selected.secrets ?? ""}
                              onChange={(e) =>
                                updateSelected({
                                  secrets: e.target.value,
                                })
                              }
                              className="w-full min-h-[80px] rounded-xl border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-zinc-100"
                            />
                          </FormField>

                          <FormField
                            label="Backstory"
                            htmlFor="npc-backstory"
                          >
                            <textarea
                              id="npc-backstory"
                              value={selected.backstory ?? ""}
                              onChange={(e) =>
                                updateSelected({
                                  backstory: e.target.value,
                                })
                              }
                              className="w-full min-h-[160px] rounded-xl border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-zinc-100"
                            />
                          </FormField>

                          <FormField
                            label="Motivations"
                            htmlFor="npc-motivations"
                            description="What drives them? What do they value most?"
                          >
                            <textarea
                              id="npc-motivations"
                              value={selected.motivations ?? ""}
                              onChange={(e) =>
                                updateSelected({
                                  motivations: e.target.value,
                                })
                              }
                              className="w-full min-h-[100px] rounded-xl border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-zinc-100"
                            />
                          </FormField>

                          <FormField
                            label="Story Hooks"
                            htmlFor="npc-hooks"
                            description="Ways to bring this NPC on-screen and entangle the PCs."
                          >
                            <textarea
                              id="npc-hooks"
                              value={selected.hooks ?? ""}
                              onChange={(e) =>
                                updateSelected({
                                  hooks: e.target.value,
                                })
                              }
                              className="w-full min-h-[120px] rounded-xl border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-zinc-100"
                            />
                          </FormField>
                        </div>
                )}

                {/* CONNECTIONS */}
                {activeTab === "connections" && (
                        <div className="space-y-4">
                          <FormField
                            label="Faction / Organization"
                            htmlFor="npc-faction"
                          >
                            <Input
                              id="npc-faction"
                              value={selected.faction ?? ""}
                              onChange={(e) =>
                                updateSelected({
                                  faction: e.target.value,
                                })
                              }
                            />
                          </FormField>

                          <FormField
                            label="Relationships"
                            htmlFor="npc-relationships"
                            description="Family, allies, enemies, protégés, rivals..."
                          >
                            <textarea
                              id="npc-relationships"
                              value={selected.relationships ?? ""}
                              onChange={(e) =>
                                updateSelected({
                                  relationships: e.target.value,
                                })
                              }
                              className="w-full min-h-[120px] rounded-xl border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-zinc-100"
                            />
                          </FormField>

                          <FormField
                            label="Attitude Toward Party"
                            htmlFor="npc-attitude-party"
                          >
                            <textarea
                              id="npc-attitude-party"
                              value={selected.attitude_toward_party ?? ""}
                              onChange={(e) =>
                                updateSelected({
                                  attitude_toward_party:
                                    e.target.value,
                                })
                              }
                              className="w-full min-h-[80px] rounded-xl border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-zinc-100"
                            />
                          </FormField>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <FormField
                              label="Allies"
                              htmlFor="npc-allies"
                              description="Friends, supporters, protectors"
                            >
                              <textarea
                                id="npc-allies"
                                value={selected.allies ?? ""}
                                onChange={(e) =>
                                  updateSelected({
                                    allies: e.target.value,
                                  })
                                }
                                className="w-full min-h-[100px] rounded-xl border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-zinc-100"
                              />
                            </FormField>
                            <FormField
                              label="Enemies"
                              htmlFor="npc-enemies"
                              description="Rivals, antagonists, threats"
                            >
                              <textarea
                                id="npc-enemies"
                                value={selected.enemies ?? ""}
                                onChange={(e) =>
                                  updateSelected({
                                    enemies: e.target.value,
                                  })
                                }
                                className="w-full min-h-[100px] rounded-xl border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-zinc-100"
                              />
                            </FormField>
                            <FormField
                              label="Affiliations"
                              htmlFor="npc-affiliations"
                              description="Groups, guilds, orders"
                            >
                              <textarea
                                id="npc-affiliations"
                                value={selected.affiliations ?? ""}
                                onChange={(e) =>
                                  updateSelected({
                                    affiliations: e.target.value,
                                  })
                                }
                                className="w-full min-h-[100px] rounded-xl border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-zinc-100"
                              />
                            </FormField>
                          </div>

                          <FormField
                            label="Resources / Assets"
                            htmlFor="npc-resources"
                            description="What muscle, money, information, or arcane tech they can bring to bear."
                          >
                            <textarea
                              id="npc-resources"
                              value={selected.resources ?? ""}
                              onChange={(e) =>
                                updateSelected({
                                  resources: e.target.value,
                                })
                              }
                              className="w-full min-h-[120px] rounded-xl border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-zinc-100"
                            />
                          </FormField>

                          <FormField
                            label="G.O.D Notes"
                            htmlFor="npc-notes"
                          >
                            <textarea
                              id="npc-notes"
                              value={selected.notes ?? ""}
                              onChange={(e) =>
                                updateSelected({
                                  notes: e.target.value,
                                })
                              }
                              className="w-full min-h-[120px] rounded-xl border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-zinc-100"
                            />
                          </FormField>
                        </div>
                )}

                {/* PREVIEW */}
                {activeTab === "preview" && (
                        <div className="space-y-3">
                          <p className="text-xs text-zinc-400">
                            Copy-paste friendly NPC summary for docs or
                            notes:
                          </p>
                          <textarea
                            readOnly
                            value={previewText}
                            className="w-full min-h-[260px] rounded-xl border border-white/10 bg-neutral-950/60 px-3 py-2 text-xs font-mono text-zinc-100"
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </Card>
            </section>
          </main>
        );
      }
    

