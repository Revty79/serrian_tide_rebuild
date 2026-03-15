"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { GradientText } from "@/components/GradientText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { Input } from "@/components/Input";
import { Tabs } from "@/components/Tabs";
import { WBNav } from "@/components/worldbuilder/WBNav";

/* ---------- core types & constants ---------- */

const ATTR_ITEMS = ["STR", "DEX", "CON", "INT", "WIS", "CHA", "NA"] as const;
type Attr = (typeof ATTR_ITEMS)[number];

const TYPE_ITEMS = [
  "standard",
  "magic regeneration",
  "magic access",
  "magic stabilization",
  "sphere",
  "discipline",
  "resonance",
  "spell",
  "psionic skill",
  "reverberation",
  "special ability",
] as const;
type SkillType = (typeof TYPE_ITEMS)[number];

const TIER_ITEMS = ["1", "2", "3", "N/A"] as const;
type TierText = (typeof TIER_ITEMS)[number];

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

const DETAIL_TYPES = new Set<SkillType>([
  "spell",
  "psionic skill",
  "reverberation",
  "special ability",
]);

type Skill = {
  id: string | number;
  name: string;
  type: SkillType;
  tier: number | null; // null == "N/A"
  primary_attribute: Attr;
  secondary_attribute: Attr;
  is_free?: boolean;
  definition?: string;
  parent_id?: string | number | null;
  parent2_id?: string | number | null;
  parent3_id?: string | number | null;
  created_by?: { username?: string; id?: string } | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type TreeRow = {
  skill: Skill;
  depth: number;
};

function transformApiSkill(s: any): Skill {
  return {
    id: s.id,
    name: s.name,
    type: s.type,
    tier: s.tier,
    primary_attribute: s.primaryAttribute,
    secondary_attribute: s.secondaryAttribute,
    is_free: s.isFree ?? false,
    definition: s.definition ?? "",
    parent_id: s.parentId ?? null,
    parent2_id: s.parent2Id ?? null,
    parent3_id: s.parent3Id ?? null,
    created_by: s.createdBy
      ? typeof s.createdBy === "object"
        ? { id: s.createdBy.id, username: s.createdBy.username }
        : { id: s.createdBy, username: "" }
      : null,
    created_at: s.createdAt ?? null,
    updated_at: s.updatedAt ?? null,
  };
}

async function parseJsonResponse(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON response (HTTP ${response.status})`);
  }
}

const uid = () => Math.random().toString(36).slice(2, 10);
const tierToText = (t: number | null): TierText =>
  t === null ? "N/A" : (String(t) as TierText);
const textToTier = (tx: TierText): number | null =>
  tx === "N/A" ? null : parseInt(tx, 10);

function attrOverlap(parent: Skill, c1: Attr, c2: Attr) {
  const child = new Set([c1, c2].filter((a) => a && a !== "NA"));
  const par = new Set(
    [parent.primary_attribute, parent.secondary_attribute].filter(
      (a) => a && a !== "NA"
    )
  );
  for (const a of child) if (par.has(a)) return true;
  return child.size === 0;
}

function parentCandidates(
  all: Skill[],
  current: Skill | null,
  childTier: number | null,
  a1: Attr,
  a2: Attr
) {
  let opts = [...all];
  if (childTier === null || childTier <= 1) opts = [];
  else opts = opts.filter((o) => o.tier === childTier - 1);
  opts = opts.filter((o) => attrOverlap(o, a1, a2));
  if (current) opts = opts.filter((o) => String(o.id) !== String(current.id));
  return opts;
}

/* ==========================================================
   MAGIC BUILDER — visual only (no API, no localStorage)
   ========================================================== */

const CONTAINERS: Record<string, number> = {
  Target: 1,
  "AoE (Area)": 2,
  Control: 2,
  "Temporal/Spatial": 5,
};
const STAND_ALONES: Record<string, any> = {
  Damage: { type: "per", base: 3, per: 2 },
  Healing: { type: "per", base: 3, per: 2 },
  Buff: { type: "per", base: 2, per: 1 },
  Debuff: { type: "per", base: 2, per: 1 },
  "Summon (minor)": { type: "flat", cost: 8 },
  "Summon (major)": { type: "flat", cost: 15 },
  "Create/Destroy (basic)": { type: "flat", cost: 5 },
  "Create/Destroy (major)": { type: "flat", cost: 12 },
  "Transform/Alter": { type: "flat", cost: 10 },
  "Illusion / Mask": { type: "flat", cost: 4 },
  "Reveal / Detect": { type: "flat", cost: 4 },
  "Counter / Cancel": { type: "flat", cost: 6 },
  "Accelerate / Hasten": { type: "per", base: 4, per: 1 },
  "Decelerate / Slow": { type: "per", base: 4, per: 1 },
  Teleportation: { type: "flat", cost: 8 },
  Banish: { type: "flat", cost: 10 },
  "Pocket Space": { type: "flat", cost: 12 },
  "Spatial Bubble": { type: "flat", cost: 8 },
  "Temporal Stasis": { type: "flat", cost: 6 },
  "Link / Bind": { type: "flat", cost: 6 },
  "Transfer Life Force": { type: "per", base: 4, per: 2 },
  "Push (Control)": { type: "flat", cost: 3, control_only: true },
  "Pull (Control)": { type: "flat", cost: 3, control_only: true },
  "Grapple/Restrain (Control)": { type: "flat", cost: 4, control_only: true },
  "Immobilize (Control)": { type: "flat", cost: 6, control_only: true },
  "Stun/Daze (Control)": { type: "flat", cost: 6, control_only: true },
  "Disarm (Control)": { type: "flat", cost: 5 },
  "Knockdown (Control)": { type: "flat", cost: 4 },
  "Blind/Deaf/Silence (Control)": {
    type: "flat",
    cost: 5,
    control_only: true,
  },
  "Anchor/Lock (Control)": { type: "flat", cost: 6 },
};
const RANGES: Record<string, number> = {
  Self: 1,
  Touch: 2,
  "Melee Reach": 3,
  "Short (30 ft)": 4,
  "Medium (60 ft)": 5,
  "Long (120 ft)": 7,
  "Line of Sight": 10,
  Unlimited: 15,
};
const SHAPES: Record<string, { base: number; per_inc: number; label: string }> =
  {
    "Radius (10 ft)": { base: 3, per_inc: 2, label: "+2 per +10 ft" },
    "Cone (30 ft)": { base: 3, per_inc: 2, label: "+2 per +10 ft" },
    "Line (30 ft)": { base: 3, per_inc: 2, label: "+2 per +10 ft" },
    "Wall (30 ft)": { base: 4, per_inc: 2, label: "+2 per +10 ft" },
    "Sphere/Cube/Zone": { base: 5, per_inc: 3, label: "+3 per size" },
  };
const DURATIONS: Record<string, number> = {
  Instantaneous: 1,
  "Combat Step": 2,
  "Combat Round": 5,
  Lingering: 2,
};
const MULTI_TARGET = { base: 3, per_target: 1 };
const MODIFIERS: Record<string, number> = {
  Concentration: -2,
  "Static Assignment": 1,
  "Per Success Assignment": 3,
  "Sense Modifier": 2,
  "Component Requirement": -2,
  "Environmental Dependency": -3,
  "Backlash Risk": -5,
  "Expose / Conceal": 2,
  "Release (Delayed)": 2,
  "Progressive Spell": 3,
};
const MASTERY_BANDS: Array<[string, number, number]> = [
  ["Apprentice", 1, 10],
  ["Novice", 11, 20],
  ["Master", 21, 50],
  ["High Master", 51, 90],
  ["Grand Master", 91, 200],
];
const masteryFor = (mana: number) => {
  if (mana <= 0) return "Apprentice";
  for (const [n, lo, hi] of MASTERY_BANDS)
    if (lo <= mana && mana <= hi) return n;
  return "Beyond Grand Master";
};

type MBNode = {
  container: string;
  effects: Array<[string, number]>;
  range: string;
  shape: string;
  shape_increments: number;
  duration: string;
  lingering: number;
  multi_target: number;
  children: MBNode[];
};

function MagicBuilder({
  seedSkill,
  allSkills,
  onClose,
}: {
  seedSkill: Skill;
  allSkills: Skill[];
  onClose: () => void;
}) {
  const [blocks, setBlocks] = useState<MBNode[]>([
    {
      container: "Target",
      effects: [],
      range: "",
      shape: "",
      shape_increments: 0,
      duration: "",
      lingering: 0,
      multi_target: 0,
      children: [],
    },
  ]);
  const [mods, setMods] = useState<Record<string, number>>(
    Object.fromEntries(Object.keys(MODIFIERS).map((k) => [k, 0])) as Record<
      string,
      number
    >
  );
  const [trad, setTrad] = useState<string>(() => {
    const t = (seedSkill?.type || "").toLowerCase();
    if (t === "psionic skill") return "Psionics (Psionic Skill)";
    if (t === "reverberation") return "Bardic Resonance (Reverberation)";
    return "Spellcraft, Talismanism, Faith (Spells)";
  });
  const [path, setPath] = useState<string>("(none)");
  const [name, setName] = useState<string>(seedSkill?.name || "");
  const [notes, setNotes] = useState<string>("");
  const [flavor, setFlavor] = useState<string>("");

  // For looking up parent skills, spheres/disciplines/resonances should link to tier 2 skills
  const parentType = trad.startsWith("Psionics")
    ? "discipline"
    : trad.startsWith("Bardic")
    ? "resonance"
    : "sphere";

  const pathOptions = useMemo(() => {
    const items = [
      "(none)",
      ...allSkills
        .filter((s) => s.type === parentType)
        .map((s) => s.name)
        .sort(),
    ];
    const seedParents = [
      seedSkill?.parent_id,
      seedSkill?.parent2_id,
      seedSkill?.parent3_id,
    ]
      .map((pid) => allSkills.find((x) => String(x.id) === String(pid)))
      .filter(Boolean) as Skill[];
    const exact = seedParents.find((p) => p.type === parentType)?.name;
    if (exact && items.includes(exact) && path === "(none)") setPath(exact);
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentType, allSkills, seedSkill?.id]);

  const nodeSubtotal = (n: MBNode): number => {
    let m = CONTAINERS[n.container] || 0;
    for (const [ename, cnt] of n.effects) {
      const meta = STAND_ALONES[ename];
      if (!meta) continue;
      if (meta.type === "flat") m += meta.cost;
      else m += meta.base + Math.max(0, (cnt || 1) - 1) * meta.per;
    }
    m += RANGES[n.range] || 0;
    if (n.shape) {
      const meta = SHAPES[n.shape];
      if (meta)
        m += meta.base + meta.per_inc * Math.max(0, n.shape_increments || 0);
    }
    if (n.duration) {
      m += DURATIONS[n.duration] || 0;
      if (n.duration === "Lingering") m += Number(n.lingering || 0);
    }
    if (n.container === "Target" && (n.multi_target || 0) > 0) {
      m +=
        MULTI_TARGET.base +
        Math.max(0, (n.multi_target || 0) - 1) * MULTI_TARGET.per_target;
    }
    for (const ch of n.children) m += nodeSubtotal(ch);
    return m;
  };

  const totalMana =
    blocks.reduce((a, b) => a + nodeSubtotal(b), 0) +
    Object.entries(mods).reduce(
      (a, [k, v]) => a + (MODIFIERS[k] || 0) * (Number(v) || 0),
      0
    );
  const castingTime = Math.floor(totalMana / 2);
  const mastery = masteryFor(totalMana);

  const addRoot = () =>
    setBlocks((b) => [
      ...b,
      {
        container: "Target",
        effects: [],
        range: "",
        shape: "",
        shape_increments: 0,
        duration: "",
        lingering: 0,
        multi_target: 0,
        children: [],
      },
    ]);

  const updateNodeAt = (pathIdx: number[], patch: Partial<MBNode>) => {
    setBlocks((prev) => {
      const clone = structuredClone(prev) as MBNode[];
      let cur: any = clone;
      for (let i = 0; i < pathIdx.length - 1; i++) {
        const idx = pathIdx[i];
        if (idx === undefined) return prev;
        cur = cur[idx].children;
      }
      const last = pathIdx[pathIdx.length - 1];
      if (last === undefined) return prev;
      cur[last] = { ...cur[last], ...patch };
      return clone;
    });
  };

  const addChildAt = (pathIdx: number[]) => {
    setBlocks((prev) => {
      const clone = structuredClone(prev) as MBNode[];
      let cur: any = clone;
      for (let i = 0; i < pathIdx.length - 1; i++) {
        const idx = pathIdx[i];
        if (idx === undefined) return prev;
        cur = cur[idx].children;
      }
      const last = pathIdx[pathIdx.length - 1];
      if (last === undefined) return prev;
      cur[last].children.push({
        container: "Target",
        effects: [],
        range: "",
        shape: "",
        shape_increments: 0,
        duration: "",
        lingering: 0,
        multi_target: 0,
        children: [],
      });
      return clone;
    });
  };

  const removeAt = (pathIdx: number[]) => {
    setBlocks((prev) => {
      const clone = structuredClone(prev) as MBNode[];
      if (pathIdx.length === 1) {
        const idx = pathIdx[0];
        if (idx === undefined) return prev;
        clone.splice(idx, 1);
        return clone.length
          ? clone
          : [
              {
                container: "Target",
                effects: [],
                range: "",
                shape: "",
                shape_increments: 0,
                duration: "",
                lingering: 0,
                multi_target: 0,
                children: [],
              },
            ];
      }
      let cur: any = clone;
      for (let i = 0; i < pathIdx.length - 2; i++) {
        const idx = pathIdx[i];
        if (idx === undefined) return prev;
        cur = cur[idx].children;
      }
      const lastIdx = pathIdx[pathIdx.length - 1];
      if (lastIdx === undefined) return prev;
      cur.splice(lastIdx, 1);
      return clone;
    });
  };

  const addEffectAt = (pathIdx: number[], name: string, count: number) => {
    if (!name) return;
    setBlocks((prev) => {
      const clone = structuredClone(prev) as MBNode[];
      let cur: any = clone;
      for (let i = 0; i < pathIdx.length - 1; i++) {
        const idx = pathIdx[i];
        if (idx === undefined) return prev;
        cur = cur[idx].children;
      }
      const last = pathIdx[pathIdx.length - 1];
      if (last === undefined) return prev;
      const info = STAND_ALONES[name];
      const c = info?.type === "per" ? Math.max(1, Number(count) || 1) : 1;
      cur[last].effects.push([name, c]);
      return clone;
    });
  };

  const saveBuild = async () => {
    if (!name.trim()) {
      alert("Name is required.");
      return;
    }
    const tradition = trad.startsWith("Psionics")
      ? "psionics"
      : trad.startsWith("Bardic")
      ? "bardic"
      : "spellcraft";

    const serialize = (n: MBNode): any => ({
      container: n.container,
      effects: n.effects.map(([nm, c]) => ({
        name: nm,
        count: Number(c) || 1,
      })),
      addons: {
        range: n.range || "",
        shape: n.shape || "",
        shape_increments: Number(n.shape_increments || 0),
        duration: n.duration || "",
        lingering: Number(n.lingering || 0),
        multi_target: Number(n.multi_target || 0),
      },
      children: n.children.map(serialize),
    });

    const rec = {
      skill_id: (seedSkill?.id as any) ?? null,
      skill_name: name.trim(),
      tradition,
      tier2_path: path && path !== "(none)" ? path : null,
      containers_json: JSON.stringify(blocks.map(serialize)),
      modifiers_json: JSON.stringify(mods),
      mana_cost: totalMana,
      casting_time: castingTime,
      mastery_level: mastery,
      notes: notes || null,
      flavor_line: flavor || null,
      saved_at: new Date().toISOString(),
    };

    // Save to API
    try {
      const response = await fetch(`/api/worldbuilder/skills/magic-details/${seedSkill.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillName: rec.skill_name,
          tradition: rec.tradition,
          tier2Path: rec.tier2_path,
          containersJson: rec.containers_json,
          modifiersJson: rec.modifiers_json,
          manaCost: rec.mana_cost,
          castingTime: rec.casting_time,
          masteryLevel: rec.mana_cost, // Send mana cost as mastery level (integer)
          notes: rec.notes,
          flavorLine: rec.flavor_line,
        }),
      });

      const data = await parseJsonResponse(response);
      if (!data.ok) {
        throw new Error(data.error || "Failed to save magic details");
      }

      alert("Magic build saved successfully.");
    } catch (err) {
      console.error("Save magic details error:", err);
      alert(`Failed to save: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const NodeCard = ({ node, pathIdx }: { node: MBNode; pathIdx: number[] }) => {
    const effectsList = node.effects.length
      ? node.effects
          .map(
            ([n, c], i) =>
              `${i + 1}. ${n}${
                STAND_ALONES[n]?.type === "per" ? ` ×${c}` : ""
              }`
          )
          .join("\n")
      : "(none)";
    const [effName, setEffName] = useState<string>(
      Object.keys(STAND_ALONES)[0] || ""
    );
    const [effCnt, setEffCnt] = useState<number>(1);

    return (
      <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-sm">
            Container {pathIdx.join("/")}
          </div>
          <div className="ms-auto flex gap-2">
            <button
              className="rounded border border-white/15 px-2 py-1 text-xs hover:bg-white/10"
              onClick={() => addChildAt(pathIdx)}
            >
              Add Child
            </button>
            <button
              className="rounded border border-rose-400/30 text-rose-200 px-2 py-1 text-xs hover:bg-rose-400/10"
              onClick={() => removeAt(pathIdx)}
            >
              Remove
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
          <label className="block">
            Type
            <select
              className="mt-1 w-full rounded border border-white/10 bg-black/50 px-2 py-1 text-sm"
              value={node.container}
              onChange={(e) =>
                updateNodeAt(pathIdx, { container: e.target.value })
              }
            >
              {Object.keys(CONTAINERS).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Range
            <select
              className="mt-1 w-full rounded border border-white/10 bg-black/50 px-2 py-1 text-sm"
              value={node.range}
              onChange={(e) => updateNodeAt(pathIdx, { range: e.target.value })}
            >
              <option value=""></option>
              {Object.keys(RANGES).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Duration
            <select
              className="mt-1 w-full rounded border border-white/10 bg-black/50 px-2 py-1 text-sm"
              value={node.duration}
              onChange={(e) =>
                updateNodeAt(pathIdx, { duration: e.target.value })
              }
            >
              <option value=""></option>
              {Object.keys(DURATIONS).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
          <label className="block">
            Shape
            <select
              className="mt-1 w-full rounded border border-white/10 bg-black/50 px-2 py-1 text-sm"
              value={node.shape}
              onChange={(e) =>
                updateNodeAt(pathIdx, { shape: e.target.value })
              }
            >
              <option value=""></option>
              {Object.keys(SHAPES).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Shape +inc
            <input
              type="number"
              className="mt-1 w-full rounded border border-white/10 bg-black/50 px-2 py-1 text-sm"
              value={node.shape_increments}
              onChange={(e) =>
                updateNodeAt(pathIdx, {
                  shape_increments: Number(e.target.value) || 0,
                })
              }
            />
          </label>
          <label className="block">
            Lingering +steps
            <input
              type="number"
              className="mt-1 w-full rounded border border-white/10 bg-black/50 px-2 py-1 text-sm"
              value={node.lingering}
              onChange={(e) =>
                updateNodeAt(pathIdx, {
                  lingering: Number(e.target.value) || 0,
                })
              }
            />
          </label>
        </div>

        {node.container === "Target" && (
          <label className="block text-sm">
            Multi-Target (+targets)
            <input
              type="number"
              className="mt-1 w-full rounded border border-white/10 bg-black/50 px-2 py-1 text-sm"
              value={node.multi_target}
              onChange={(e) =>
                updateNodeAt(pathIdx, {
                  multi_target: Number(e.target.value) || 0,
                })
              }
            />
          </label>
        )}

        <div className="rounded-lg border border-white/10 p-2">
          <div className="font-medium mb-1 text-sm">Effects</div>
          <div className="flex gap-2 items-center">
            <select
              className="rounded border border-white/10 bg-black/50 px-2 py-1 text-sm"
              value={effName}
              onChange={(e) => setEffName(e.target.value)}
            >
              {Object.keys(STAND_ALONES).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <span className="text-xs">×</span>
            <input
              type="number"
              className="w-20 rounded border border-white/10 bg-black/50 px-2 py-1 text-sm"
              value={effCnt}
              onChange={(e) => setEffCnt(Number(e.target.value) || 1)}
            />
            <button
              className="rounded border border-emerald-400/40 text-emerald-200 px-2 py-1 text-xs hover:bg-emerald-400/10"
              onClick={() => addEffectAt(pathIdx, effName, effCnt)}
            >
              Add Effect
            </button>
          </div>
          <textarea
            className="mt-2 w-full h-24 rounded border border-white/10 bg-black/50 p-2 text-xs"
            readOnly
            value={effectsList}
          />
        </div>

        {node.children.length > 0 && (
          <div className="space-y-2">
            {node.children.map((ch, i) => (
              <NodeCard key={i} node={ch} pathIdx={[...pathIdx, i]} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-amber-300/30 bg-amber-300/5 p-4 space-y-4 mt-4">
      <div className="flex items-center gap-2">
        <div className="text-amber-200 font-semibold text-sm">
          Magic Builder — {seedSkill?.name || "(unnamed)"}
        </div>
        <div className="ms-auto flex gap-2">
          <button
            className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
            onClick={addRoot}
          >
            ➕ Add Root Container
          </button>
          <button
            className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
            onClick={saveBuild}
          >
            Save
          </button>
          <button
            className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <label className="block">
          Tradition / Output
          <select
            className="mt-1 w-full rounded border border-white/10 bg-black/50 px-2 py-1 text-sm"
            value={trad}
            onChange={(e) => setTrad(e.target.value)}
          >
            {[
              "Spellcraft, Talismanism, Faith (Spells)",
              "Psionics (Psionic Skill)",
              "Bardic Resonance (Reverberation)",
            ].map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          Tier-2 Path
          <select
            className="mt-1 w-full rounded border border-white/10 bg-black/50 px-2 py-1 text-sm"
            value={path}
            onChange={(e) => setPath(e.target.value)}
          >
            {pathOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          Name
          <input
            className="mt-1 w-full rounded border border-white/10 bg-black/50 px-2 py-1 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block">
          Flavor Line
          <input
            className="mt-1 w-full rounded border border-white/10 bg-black/50 px-2 py-1 text-sm"
            value={flavor}
            onChange={(e) => setFlavor(e.target.value)}
          />
        </label>
      </div>

      <div className="space-y-3">
        {blocks.map((n, i) => (
          <NodeCard key={i} node={n} pathIdx={[i]} />
        ))}
      </div>

      <div className="rounded-xl border border-white/10 p-3">
        <div className="font-semibold mb-2 text-sm">Modifiers (global)</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
          {Object.entries(MODIFIERS).map(([m, delta]) => (
            <label
              key={m}
              className="flex items-center justify-between gap-2 rounded border border-white/10 bg-black/40 px-2 py-1"
            >
              <span>
                {m} ({delta > 0 ? `+${delta}` : delta})
              </span>
              <input
                type="number"
                min={0}
                className="w-20 rounded bg-black/50 px-2 py-1 text-xs"
                value={mods[m] || 0}
                onChange={(e) =>
                  setMods({
                    ...mods,
                    [m]: Math.max(0, Number(e.target.value) || 0),
                  })
                }
              />
            </label>
          ))}
        </div>
      </div>

      <label className="block text-sm">
        Notes / Special Conditions
        <textarea
          className="mt-1 w-full h-28 rounded border border-white/10 bg-black/50 p-2 text-sm"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      <div className="rounded-xl border border-white/10 p-3 space-y-1 text-sm">
        <div className="font-semibold">Live Summary</div>
        <div>Spell Cost (Mana): {totalMana}</div>
        <div>Casting Time (initiative): {castingTime}</div>
        <div>Mastery Level: {mastery}</div>
      </div>
    </div>
  );
}

/* ==========================================================
   SPECIAL ABILITY DETAILS — visual only (no API)
   ========================================================== */

const ABILITY_TYPES = ["Utility", "Combat", "Magic/Psionic", "Other"] as const;
const SCALING_METHODS = [
  "Point-Based",
  "Point & Roll-Based",
  "Skill % Based",
  "Point Multiplier Based",
  "Other",
] as const;
const MAX_SECTIONS = 9;
const CANONICAL_TITLES = ["Stage 1", "Stage 2", "Stage 3", "Stage 4", "Final"];
type UpSection = { tag: string; desc: string; points: string };

function SpecialAbilityDetails({
  seedSkill,
  onClose,
}: {
  seedSkill: Skill;
  onClose: () => void;
}) {
  const [abilityType, setAbilityType] = useState<string>("Utility");
  const [scalingMethod, setScalingMethod] = useState<string>("Point-Based");
  const [prereq, setPrereq] = useState<string>("");
  const [details, setDetails] = useState<string>("");
  const [sections, setSections] = useState<UpSection[]>([
    { tag: "", desc: "", points: "" },
  ]);

  useEffect(() => {
    if (sections.length === 0)
      setSections([{ tag: "", desc: "", points: "" }]);
  }, [sections.length]);

  const addSection = () =>
    setSections((arr) =>
      arr.length >= MAX_SECTIONS
        ? arr
        : [...arr, { tag: "", desc: "", points: "" }]
    );
  const removeSection = (idx: number) =>
    setSections((arr) => {
      const cp = [...arr];
      cp.splice(idx, 1);
      return cp.length ? cp : [{ tag: "", desc: "", points: "" }];
    });

  const save = async () => {
    const norm = (s: string) => (s?.trim() ? s.trim() : null);
    const secs = [...sections];
    while (secs.length < MAX_SECTIONS)
      secs.push({ tag: "", desc: "", points: "" });

    const rec = {
      skill_id: seedSkill?.id ?? null,
      ability_type: abilityType,
      scaling_method: scalingMethod,
      prerequisites: norm(prereq),
      scaling_details: norm(details),
      stage1_tag: norm(secs[0]?.tag || ""),
      stage1_desc: norm(secs[0]?.desc || ""),
      stage1_points: norm(secs[0]?.points || ""),
      stage2_tag: norm(secs[1]?.tag || ""),
      stage2_desc: norm(secs[1]?.desc || ""),
      stage2_points: norm(secs[1]?.points || ""),
      stage3_tag: norm(secs[2]?.tag || ""),
      stage3_desc: norm(secs[2]?.desc || ""),
      stage4_tag: norm(secs[3]?.tag || ""),
      stage4_desc: norm(secs[3]?.desc || ""),
      final_tag: norm(secs[4]?.tag || ""),
      final_desc: norm(secs[4]?.desc || ""),
      add1_tag: norm(secs[5]?.tag || ""),
      add1_desc: norm(secs[5]?.desc || ""),
      add2_tag: norm(secs[6]?.tag || ""),
      add2_desc: norm(secs[6]?.desc || ""),
      add3_tag: norm(secs[7]?.tag || ""),
      add3_desc: norm(secs[7]?.desc || ""),
      add4_tag: norm(secs[8]?.tag || ""),
      add4_desc: norm(secs[8]?.desc || ""),
      saved_at: new Date().toISOString(),
    };

    // Save to API
    try {
      const response = await fetch(`/api/worldbuilder/skills/special-ability-details/${seedSkill.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          abilityType: rec.ability_type,
          scalingMethod: rec.scaling_method,
          prerequisites: rec.prerequisites,
          scalingDetails: rec.scaling_details,
          stage1Tag: rec.stage1_tag,
          stage1Desc: rec.stage1_desc,
          stage1Points: rec.stage1_points,
          stage2Tag: rec.stage2_tag,
          stage2Desc: rec.stage2_desc,
          stage2Points: rec.stage2_points,
          stage3Tag: rec.stage3_tag,
          stage3Desc: rec.stage3_desc,
          stage4Tag: rec.stage4_tag,
          stage4Desc: rec.stage4_desc,
          finalTag: rec.final_tag,
          finalDesc: rec.final_desc,
          add1Tag: rec.add1_tag,
          add1Desc: rec.add1_desc,
          add2Tag: rec.add2_tag,
          add2Desc: rec.add2_desc,
          add3Tag: rec.add3_tag,
          add3Desc: rec.add3_desc,
          add4Tag: rec.add4_tag,
          add4Desc: rec.add4_desc,
        }),
      });

      const data = await parseJsonResponse(response);
      if (!data.ok) {
        throw new Error(data.error || "Failed to save special ability details");
      }

      alert("Special ability details saved successfully.");
    } catch (err) {
      console.error("Save special ability details error:", err);
      alert(`Failed to save: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  return (
    <div className="rounded-2xl border border-sky-300/30 bg-sky-300/5 p-4 space-y-4 mt-4">
      <div className="flex items-center gap-2">
        <div className="text-sky-200 font-semibold text-sm">
          Special Ability Details — {seedSkill?.name || "(unnamed)"}
        </div>
        <div className="ms-auto flex gap-2">
          <button
            className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
            onClick={save}
          >
            Save
          </button>
          <button
            className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <label className="block">
          Ability Type
          <select
            className="mt-1 w-full rounded border border-white/10 bg-black/50 px-2 py-1 text-sm"
            value={abilityType}
            onChange={(e) => setAbilityType(e.target.value)}
          >
            {ABILITY_TYPES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          Scaling Method
          <select
            className="mt-1 w-full rounded border border-white/10 bg-black/50 px-2 py-1 text-sm"
            value={scalingMethod}
            onChange={(e) => setScalingMethod(e.target.value)}
          >
            {SCALING_METHODS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm">
        Prerequisites
        <input
          className="mt-1 w-full rounded border border-white/10 bg-black/50 px-2 py-1 text-sm"
          value={prereq}
          onChange={(e) => setPrereq(e.target.value)}
        />
      </label>

      <label className="block text-sm">
        Scaling Details
        <textarea
          className="mt-1 w-full h-28 rounded border border-white/10 bg-black/50 p-2 text-sm"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />
      </label>

      <div className="font-semibold text-sm">Upgrade Sections</div>
      <div className="space-y-3">
        {sections.map((s, i) => (
          <div
            key={i}
            className="rounded-lg border border-white/10 bg-black/40 p-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="font-medium text-sm">
                {i < CANONICAL_TITLES.length
                  ? CANONICAL_TITLES[i]
                  : `Additional ${i - CANONICAL_TITLES.length + 1}`}
              </div>
              <div className="ms-auto">
                <button
                  className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
                  onClick={() => removeSection(i)}
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
              <label className="block">
                Tag / Name
                <input
                  className="mt-1 w-full rounded border border-white/10 bg-black/50 px-2 py-1 text-sm"
                  value={s.tag}
                  onChange={(e) => {
                    const cp = [...sections];
                    const existing = cp[i];
                    if (existing) {
                      cp[i] = {
                        tag: e.target.value,
                        desc: existing.desc,
                        points: existing.points,
                      };
                    }
                    setSections(cp);
                  }}
                />
              </label>
              <label className="block">
                Points (only first two saved)
                <input
                  className="mt-1 w-full rounded border border-white/10 bg-black/50 px-2 py-1 text-sm"
                  value={s.points}
                  onChange={(e) => {
                    const cp = [...sections];
                    const existing = cp[i];
                    if (existing) {
                      cp[i] = {
                        tag: existing.tag,
                        desc: existing.desc,
                        points: e.target.value,
                      };
                    }
                    setSections(cp);
                  }}
                />
              </label>
            </div>

            <label className="block text-sm mt-2">
              Description
              <textarea
                className="mt-1 w-full h-24 rounded border border-white/10 bg-black/50 p-2 text-sm"
                value={s.desc}
                onChange={(e) => {
                  const cp = [...sections];
                  const existing = cp[i];
                  if (existing) {
                    cp[i] = {
                      tag: existing.tag,
                      desc: e.target.value,
                      points: existing.points,
                    };
                  }
                  setSections(cp);
                }}
              />
            </label>
          </div>
        ))}
      </div>

      <div>
        <button
          className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
          onClick={addSection}
          disabled={sections.length >= MAX_SECTIONS}
        >
          Add upgrade section
        </button>
      </div>
    </div>
  );
}

/* ==========================================================
   BULK IMPORT HELPERS
   ========================================================== */

type BulkRow = {
  primaryAttribute: Attr;
  secondaryAttribute: Attr;
  type: SkillType;
  tier: number | null;
  name: string;
  parentName: string | null;
  definition: string;
};

function normalizeAttr(raw: string): Attr {
  const up = raw.trim().toUpperCase();
  if (!up || up === "N/A" || up === "NA") return "NA";
  const found = ATTR_ITEMS.find((a) => a === up);
  return (found ?? "NA") as Attr;
}

function normalizeType(raw: string): SkillType {
  const low = raw.trim().toLowerCase();
  const found = TYPE_ITEMS.find((t) => t.toLowerCase() === low);
  return (found ?? "standard") as SkillType;
}

function normalizeTier(raw: string): number | null {
  const t = raw.trim();
  if (!t || t.toUpperCase() === "N/A") return null;
  const n = parseInt(t, 10);
  return Number.isNaN(n) ? null : n;
}

function parseBulkInput(text: string): BulkRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (!lines.length) return [];

  // Drop header row if present
  if (lines[0] && (/skill name/i.test(lines[0]) || /primary attribute/i.test(lines[0]))) {
    lines.shift();
  }

  const rows: BulkRow[] = [];

  for (const line of lines) {
    const cols = line.split("\t");
    // Require at least name (5th column), allow missing parent and definition
    if (cols.length < 5) continue;

    const [
      primaryAttrRaw = "",
      secondaryAttrRaw = "",
      typeRaw = "",
      tierRaw = "",
      nameRaw = "",
      parentRaw = "",
      defRaw = "",
    ] = cols;

    const name = nameRaw.trim();
    if (!name) continue;

    rows.push({
      primaryAttribute: normalizeAttr(primaryAttrRaw),
      secondaryAttribute: normalizeAttr(secondaryAttrRaw),
      type: normalizeType(typeRaw),
      tier: normalizeTier(tierRaw),
      name,
      parentName:
        parentRaw.trim() &&
        !/^(n\/a|na)$/i.test(parentRaw)
          ? parentRaw.trim()
          : null,
      definition: defRaw.trim(),
    });
  }

  return rows;
}

/* ==========================================================
   MAIN EDITOR — wired to DB/API + bulk import
   ========================================================== */

type SkillTabKey = "core" | "parents" | "preview";

const SKILL_TABS: { id: SkillTabKey; label: string }[] = [
  { id: "core", label: "Core Details" },
  { id: "parents", label: "Parents & Pathing" },
  { id: "preview", label: "Preview" },
];

export default function SkillsetsPage() {
  const router = useRouter();

  // Current user
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    role: string;
  } | null>(null);

  // Bulk import state
  const [importText, setImportText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  // Esc -> back/fallback
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (typeof window !== "undefined" && window.history.length > 1)
          router.back();
        else router.push("/worldbuilder");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  // Data
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load skills from database on mount
  useEffect(() => {
    async function loadSkills() {
      try {
        // Load current user
        const userResponse = await fetch("/api/profile/me");
        const userData = await parseJsonResponse(userResponse);
        if (userData.ok && userData.user) {
          setCurrentUser({ id: userData.user.id, role: userData.user.role });
        }

        const response = await fetch("/api/worldbuilder/skills");
        const data = await parseJsonResponse(response);

        if (!data.ok) {
          throw new Error(data.error || "Failed to load skills");
        }

        const transformed: Skill[] = (data.skills || []).map(transformApiSkill);
        setSkills(transformed);
      } catch (error) {
        console.error("Error loading skills:", error);
        alert(
          `Failed to load skills: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } finally {
        setLoading(false);
      }
    }

    loadSkills();
  }, []);

  // filters + paging
  const [qtext, setQtext] = useState("");
  const [fType, setFType] = useState<"" | SkillType>("");

  const [fPrimary, setFPrimary] = useState<"" | Attr>("");
  const [fSecondary, setFSecondary] = useState<"" | Attr>("");
  const [fTier, setFTier] = useState<"" | TierText>("");
  const [fParent, setFParent] = useState<string>(""); // Filter by parent skill ID
  const [fHasParent, setFHasParent] = useState<"" | "yes" | "no">(""); // Has any parent or not
  const [fIsFree, setFIsFree] = useState<"" | "yes" | "no">(""); // Free content filter
  const [fCreator, setFCreator] = useState<string>(""); // Filter by creator id / mine / unassigned
  const [listMode, setListMode] = useState<"table" | "tree">("table");
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [pageIndex, setPageIndex] = useState<number>(0);

  // editor UI
  const [activeTab, setActiveTab] = useState<SkillTabKey>("core");
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const selected = useMemo(
    () => skills.find((s) => String(s.id) === String(selectedId)) ?? null,
    [skills, selectedId]
  );

  const skillNameById = useMemo(
    () =>
      new Map(
        skills.map((s) => [String(s.id), s.name || "(unnamed)"] as const)
      ),
    [skills]
  );

  const creatorOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of skills) {
      const creatorId = s.created_by?.id;
      if (!creatorId) continue;
      const creatorName = s.created_by?.username?.trim();
      map.set(creatorId, creatorName || creatorId.slice(0, 8));
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [skills]);

  const relatedSkillIds = useMemo(() => {
    if (!fParent) return null;

    const idToSkill = new Map(skills.map((s) => [String(s.id), s] as const));
    if (!idToSkill.has(fParent)) return new Set<string>();

    const neighbors = new Map<string, Set<string>>();
    const connect = (a: string, b: string) => {
      const aSet = neighbors.get(a) ?? new Set<string>();
      aSet.add(b);
      neighbors.set(a, aSet);

      const bSet = neighbors.get(b) ?? new Set<string>();
      bSet.add(a);
      neighbors.set(b, bSet);
    };

    for (const s of skills) {
      const id = String(s.id);
      const parentIds = [s.parent_id, s.parent2_id, s.parent3_id]
        .filter(
          (pid): pid is string | number => pid !== null && pid !== undefined
        )
        .map((pid) => String(pid));

      for (const parentId of parentIds) {
        if (parentId === id || !idToSkill.has(parentId)) continue;
        connect(id, parentId);
      }
    }

    const visited = new Set<string>();
    const queue: string[] = [fParent];
    visited.add(fParent);

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      for (const next of neighbors.get(current) ?? []) {
        if (visited.has(next)) continue;
        visited.add(next);
        queue.push(next);
      }
    }

    return visited;
  }, [skills, fParent]);

  const filtered = useMemo(() => {
    const q = qtext.trim().toLowerCase();
    return skills.filter((s) => {
      if (fType && s.type !== fType) return false;
      if (fPrimary && s.primary_attribute !== fPrimary) return false;
      if (fSecondary && s.secondary_attribute !== fSecondary) return false;
      if (fTier && tierToText(s.tier) !== fTier) return false;

      // Parent filters
      if (fParent) {
        if (!relatedSkillIds?.has(String(s.id))) return false;
      }

      const hasAnyParent = Boolean(s.parent_id || s.parent2_id || s.parent3_id);
      if (fHasParent === "yes" && !hasAnyParent) return false;
      if (fHasParent === "no" && hasAnyParent) return false;

      // Free content filter
      if (fIsFree === "yes" && !s.is_free) return false;
      if (fIsFree === "no" && s.is_free) return false;

      // Creator filter
      if (fCreator === "__me__" && s.created_by?.id !== currentUser?.id) return false;
      if (fCreator === "__unassigned__" && s.created_by?.id) return false;
      if (
        fCreator &&
        fCreator !== "__me__" &&
        fCreator !== "__unassigned__" &&
        s.created_by?.id !== fCreator
      ) {
        return false;
      }

      if (q) {
        const hay = [
          s.name,
          s.type,
          s.primary_attribute,
          s.secondary_attribute,
          tierToText(s.tier),
          s.definition || "",
          s.created_by?.username || "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    skills,
    qtext,
    fType,
    fPrimary,
    fSecondary,
    fTier,
    fParent,
    relatedSkillIds,
    fHasParent,
    fIsFree,
    fCreator,
    currentUser?.id,
  ]);

  const treeRows = useMemo<TreeRow[]>(() => {
    const idToSkill = new Map(filtered.map((s) => [String(s.id), s]));
    const childrenByParent = new Map<string, Skill[]>();
    const roots: Skill[] = [];
    const sortByTierThenName = (a: Skill, b: Skill) => {
      const aTier = a.tier ?? 999;
      const bTier = b.tier ?? 999;
      if (aTier !== bTier) return aTier - bTier;
      return a.name.localeCompare(b.name);
    };

    for (const s of filtered) {
      const parentIds = [s.parent_id, s.parent2_id, s.parent3_id]
        .filter((pid): pid is string | number => pid !== null && pid !== undefined)
        .map((pid) => String(pid));
      const parentIdInScope = parentIds.find(
        (pid) => pid !== String(s.id) && idToSkill.has(pid)
      );

      if (!parentIdInScope) {
        roots.push(s);
        continue;
      }

      const existing = childrenByParent.get(parentIdInScope) ?? [];
      existing.push(s);
      childrenByParent.set(parentIdInScope, existing);
    }

    roots.sort(sortByTierThenName);
    for (const children of childrenByParent.values()) {
      children.sort(sortByTierThenName);
    }

    const out: TreeRow[] = [];
    const visited = new Set<string>();
    const walk = (node: Skill, depth: number, path: Set<string>) => {
      const nodeId = String(node.id);
      if (path.has(nodeId)) return;
      out.push({ skill: node, depth });
      visited.add(nodeId);
      const nextPath = new Set(path);
      nextPath.add(nodeId);
      for (const child of childrenByParent.get(nodeId) ?? []) {
        walk(child, depth + 1, nextPath);
      }
    };

    for (const root of roots) {
      walk(root, 0, new Set<string>());
    }

    const leftovers = filtered
      .filter((s) => !visited.has(String(s.id)))
      .sort(sortByTierThenName);
    for (const orphan of leftovers) {
      walk(orphan, 0, new Set<string>());
    }

    return out;
  }, [filtered]);

  const totalRows = listMode === "tree" ? treeRows.length : filtered.length;

  const pages = Math.max(
    1,
    Math.ceil(totalRows / Math.max(1, pageSize))
  );
  const clampedIndex = Math.max(0, Math.min(pageIndex, pages - 1));
  const start = clampedIndex * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);
  const pageTreeRows = treeRows.slice(start, start + pageSize);
  const pageRowsIsEmpty =
    listMode === "tree" ? pageTreeRows.length === 0 : pageRows.length === 0;
  const creatorLabel = (skill: Skill) =>
    skill.created_by?.username?.trim() ||
    (skill.created_by?.id ? skill.created_by.id.slice(0, 8) : "—");

  useEffect(() => {
    if (pageIndex >= pages) setPageIndex(Math.max(0, pages - 1));
  }, [pages, pageIndex]);

  // CRUD shell
  function createSkill() {
    const now = new Date().toISOString();
    const item: Skill = {
      id: uid(),
      name: "(unnamed)",
      type: "standard",
      tier: 1,
      primary_attribute: "STR",
      secondary_attribute: "NA",
      is_free: false,
      definition: "",
      parent_id: null,
      parent2_id: null,
      parent3_id: null,
      created_at: now,
      updated_at: now,
      created_by: null,
    };
    setSkills((prev) => [item, ...prev]);
    setSelectedId(String(item.id));
    setActiveTab("core");
  }

  async function deleteSelected() {
    if (!selected || !currentUser) return;
    const id = String(selected.id);
    const isNew = typeof selected.id === "string" && selected.id.length < 20;

    const isAdmin = currentUser.role?.toLowerCase() === "admin";
    const isCreator = selected.created_by?.id === currentUser.id;

    if (!isNew && !isAdmin && !isCreator) {
      alert(
        "You can only delete skills you created. Admins can delete any skill."
      );
      return;
    }

    // If it's a temporary ID (never saved to DB), just remove from UI
    if (isNew) {
      setSkills((prev) => prev.filter((x) => String(x.id) !== id));
      setSelectedId(null);
      setShowDetails(false);
      return;
    }

    // Confirm deletion
    if (!confirm(`Are you sure you want to delete "${selected.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/worldbuilder/skills/${selected.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
          const data = await parseJsonResponse(response);
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data = await parseJsonResponse(response);

      if (!data.ok) {
        throw new Error(data.error || "Failed to delete skill");
      }

      // Successfully deleted from DB, now remove from UI
      setSkills((prev) => prev.filter((x) => String(x.id) !== id));
      setSelectedId(null);
      setShowDetails(false);
      alert("Skill deleted successfully!");
    } catch (error) {
      console.error("Error deleting skill:", error);
      alert(
        `Failed to delete skill: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      // Don't remove from UI if delete failed
    }
  }

  function updateSelected(patch: Partial<Skill>) {
    if (!selected) return;
    const id = String(selected.id);
    const now = new Date().toISOString();
    setSkills((prev) =>
      prev.map((s) =>
        String(s.id) === id ? { ...s, ...patch, updated_at: now } : s
      )
    );
  }

  async function saveSelected() {
    if (!selected) return;

    try {
      const payload = {
        name: selected.name,
        type: selected.type,
        tier: selected.tier,
        primaryAttribute: selected.primary_attribute,
        secondaryAttribute: selected.secondary_attribute,
        isFree: selected.is_free ?? false,
        definition: selected.definition || null,
        parentId: selected.parent_id || null,
        parent2Id: selected.parent2_id || null,
        parent3Id: selected.parent3_id || null,
      };

      const isNew = typeof selected.id === "string" && selected.id.length < 20;

      let response;
      if (isNew) {
        response = await fetch("/api/worldbuilder/skills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch(`/api/worldbuilder/skills/${selected.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await parseJsonResponse(response);

      if (!data.ok) {
        throw new Error(data.error || "Failed to save skill");
      }

      if (data.skill) {
        const updated = transformApiSkill(data.skill);
        setSkills((prev) =>
          prev.map((s) =>
            String(s.id) === String(selected.id) ? updated : s
          )
        );
        setSelectedId(updated.id as string);
      }

      alert("Skill saved successfully!");
    } catch (error) {
      console.error("Error saving skill:", error);
      alert(
        `Failed to save skill: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  function setParentsOrdered(ids: (string | number | null | undefined)[]) {
    const ordered = ids
      .filter(Boolean)
      .map(String)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 3);
    updateSelected({
      parent_id: ordered[0] ?? null,
      parent2_id: ordered[1] ?? null,
      parent3_id: ordered[2] ?? null,
    });
  }

  const candidateParents = useMemo(() => {
    if (!selected) return [] as Skill[];
    return parentCandidates(
      skills,
      selected,
      selected.tier,
      selected.primary_attribute,
      selected.secondary_attribute
    );
  }, [skills, selected]);

  const previewText = useMemo(() => {
    if (!selected) return "";
    const s = selected;
    const lines: string[] = [];
    lines.push(`Skill: ${s.name || "(unnamed)"}`);
    lines.push(`Type: ${s.type} · Tier: ${tierToText(s.tier)}`);
    lines.push(
      `Attributes: ${s.primary_attribute}${
        s.secondary_attribute !== "NA" ? ` / ${s.secondary_attribute}` : ""
      }`
    );
    lines.push("");

    const parents = [s.parent_id, s.parent2_id, s.parent3_id]
      .map((id) => skills.find((x) => String(x.id) === String(id))?.name)
      .filter(Boolean);

    lines.push(
      `Parents: ${
        parents.length ? parents.join(", ") : "(none assigned yet)"
      }`
    );
    lines.push("");

    lines.push("— Definition —");
    lines.push(s.definition || "(no writeup yet)");

    return lines.join("\n");
  }, [selected, skills]);

  const showMagicBuilder =
    showDetails &&
    selected &&
    (selected.type === "spell" ||
      selected.type === "psionic skill" ||
      selected.type === "reverberation");
  const showSpecialDetails =
    showDetails && selected && selected.type === "special ability";

  async function handleBulkImport() {
    if (!importText.trim()) {
      alert("Paste your data first.");
      return;
    }

    const rows = parseBulkInput(importText);
    if (!rows.length) {
      setImportResult(
        "No valid rows found. Make sure columns are tab-separated."
      );
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    // map existing skill names → ids (user-local)
    const nameToId = new Map<string, string>();
    for (const s of skills) {
      if (!s.name) continue;
      nameToId.set(s.name.trim().toLowerCase(), String(s.id));
    }

    let imported = 0;
    let skipped = 0;
    let failed = 0;
    const createdSkills: Skill[] = [];

    try {
      for (const row of rows) {
        const key = row.name.trim().toLowerCase();

        // avoid double-imports
        if (nameToId.has(key)) {
          skipped++;
          continue;
        }

        let parentId: string | null = null;
        if (row.parentName) {
          const parentKey = row.parentName.trim().toLowerCase();
          const knownParentId = nameToId.get(parentKey);
          if (knownParentId) {
            parentId = knownParentId;
          }
        }

        const payload = {
          name: row.name,
          type: row.type,
          tier: row.tier,
          primaryAttribute: row.primaryAttribute,
          secondaryAttribute: row.secondaryAttribute,
          isFree: false,
          definition: row.definition,
          parentId,
        };

        const res = await fetch("/api/worldbuilder/skills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          failed++;
          continue;
        }

        const data = await parseJsonResponse(res);
        if (!data.ok || !data.skill) {
          failed++;
          continue;
        }

        const created = transformApiSkill(data.skill);
        createdSkills.push(created);
        nameToId.set(key, String(created.id));
        imported++;
      }

      if (createdSkills.length) {
        setSkills((prev) => [...createdSkills, ...prev]);
      }

      setImportResult(
        `Import complete: ${imported} added, ${skipped} skipped (already existed), ${failed} failed.`
      );
    } catch (err) {
      console.error("Bulk import error:", err);
      setImportResult(
        "Import failed: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
    } finally {
      setIsImporting(false);
    }
  }

  /* ---------- render ---------- */

  return (
    <main className="min-h-screen px-6 py-10">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <GradientText
              as="h1"
              variant="title"
              glow
              className="font-evanescent text-4xl sm:text-5xl tracking-tight"
            >
              The Source Forge — Skills
            </GradientText>
            <p className="mt-1 text-sm text-zinc-300/90 max-w-2xl">
              Define and manage the full skill lattice: standards,
              magic, psionics, reverberations, and special abilities.
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
          <WBNav current="skillsets" />
        </div>
      </header>

      <section className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-6">
        {/* LEFT: list + filters */}
        <Card
          padded={false}
          className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-5 shadow-2xl flex flex-col gap-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-200">
              Skill Library
            </h2>
            <Button
              variant="primary"
              size="sm"
              type="button"
              onClick={createSkill}
            >
              + New Skill
            </Button>
          </div>

          {/* Filters */}
          <div className="space-y-2">
            <Input
              value={qtext}
              onChange={(e) => {
                setQtext(e.target.value);
                setPageIndex(0);
              }}
              placeholder="Search name/type/attr/definition…"
            />

            {/* Quick Filters Row 1 */}
            <div className="grid grid-cols-2 gap-2">
              <select
                className="rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-zinc-100 outline-none"
                value={fType}
                onChange={(e) => {
                  setFType(e.target.value as SkillType | "");
                  setPageIndex(0);
                }}
              >
                <option value="">Type (all)</option>
                {TYPE_ITEMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                className="rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-zinc-100 outline-none"
                value={fTier}
                onChange={(e) => {
                  setFTier(e.target.value as TierText | "");
                  setPageIndex(0);
                }}
              >
                <option value="">Tier (all)</option>
                {TIER_ITEMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Attributes */}
            <div className="grid grid-cols-2 gap-2">
              <select
                className="rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-zinc-100 outline-none"
                value={fPrimary}
                onChange={(e) => {
                  setFPrimary(e.target.value as Attr | "");
                  setPageIndex(0);
                }}
              >
                <option value="">Primary (all)</option>
                {ATTR_ITEMS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <select
                className="rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-zinc-100 outline-none"
                value={fSecondary}
                onChange={(e) => {
                  setFSecondary(e.target.value as Attr | "");
                  setPageIndex(0);
                }}
              >
                <option value="">Secondary (all)</option>
                {ATTR_ITEMS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            {/* Advanced Filters */}
            <details className="group">
              <summary className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-300 py-1 list-none flex items-center gap-1">
                <span className="group-open:rotate-90 transition-transform">▶</span>
                Advanced Filters
              </summary>
              <div className="mt-2 space-y-2 pl-3 border-l-2 border-white/10">
                {/* Parent Skill Filter */}
                <select
                  className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-zinc-100 outline-none"
                  value={fParent}
                  onChange={(e) => {
                    setFParent(e.target.value);
                    setPageIndex(0);
                  }}
                >
                  <option value="">Filter by Skill Link (parent/child)...</option>
                  {skills
                    .filter((s) => s.tier !== null && s.tier >= 1)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.name} (T{s.tier})
                      </option>
                    ))}
                </select>
                {fParent && (
                  <p className="text-[10px] text-zinc-500">
                    Showing selected skill plus all connected parents/children.
                  </p>
                )}

                {/* Has Parent Filter */}
                <select
                  className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-zinc-100 outline-none"
                  value={fHasParent}
                  onChange={(e) => {
                    setFHasParent(e.target.value as "" | "yes" | "no");
                    setPageIndex(0);
                  }}
                >
                  <option value="">Has Parent? (all)</option>
                  <option value="yes">Has Parent (child skills)</option>
                  <option value="no">No Parent (root skills)</option>
                </select>

                {/* Free Content Filter */}
                <select
                  className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-zinc-100 outline-none"
                  value={fIsFree}
                  onChange={(e) => {
                    setFIsFree(e.target.value as "" | "yes" | "no");
                    setPageIndex(0);
                  }}
                >
                  <option value="">Content Type (all)</option>
                  <option value="yes">Free Content</option>
                  <option value="no">Premium Content</option>
                </select>

                {/* Creator Filter */}
                <select
                  className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-zinc-100 outline-none"
                  value={fCreator}
                  onChange={(e) => {
                    setFCreator(e.target.value);
                    setPageIndex(0);
                  }}
                >
                  <option value="">Creator (all)</option>
                  {currentUser && <option value="__me__">Created by me</option>}
                  {creatorOptions.map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                  <option value="__unassigned__">Unassigned creator</option>
                </select>

                {/* View Mode */}
                <select
                  className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-zinc-100 outline-none"
                  value={listMode}
                  onChange={(e) => {
                    setListMode(e.target.value as "table" | "tree");
                    setPageIndex(0);
                  }}
                >
                  <option value="table">List View (table)</option>
                  <option value="tree">Tree View (hierarchy)</option>
                </select>

                {/* Clear Advanced Filters */}
                {(fParent || fHasParent || fIsFree || fCreator || listMode !== "table") && (
                  <button
                    onClick={() => {
                      setFParent("");
                      setFHasParent("");
                      setFIsFree("");
                      setFCreator("");
                      setListMode("table");
                      setPageIndex(0);
                    }}
                    className="w-full text-xs text-amber-400 hover:text-amber-300 py-1 text-center"
                  >
                    Clear Advanced Filters
                  </button>
                )}
              </div>
            </details>

            {/* Active Filters Summary */}
            {(qtext ||
              fType ||
              fTier ||
              fPrimary ||
              fSecondary ||
              fParent ||
              fHasParent ||
              fIsFree ||
              fCreator ||
              listMode !== "table") && (
              <div className="text-xs text-zinc-400 pt-1 border-t border-white/10">
                Showing {totalRows} of {skills.length} skills
                <button
                  onClick={() => {
                    setQtext("");
                    setFType("");
                    setFTier("");
                    setFPrimary("");
                    setFSecondary("");
                    setFParent("");
                    setFHasParent("");
                    setFIsFree("");
                    setFCreator("");
                    setListMode("table");
                    setPageIndex(0);
                  }}
                  className="ml-2 text-red-400 hover:text-red-300"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>

          {/* List */}
          <div className="mt-2 flex-1 min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
            <div className="flex items-center justify-between px-3 py-2 text-xs text-zinc-400 border-b border-white/10">
              <span>
                {loading
                  ? "Loading skills…"
                  : `Results: ${totalRows} (${listMode === "tree" ? "tree" : "table"})`}
              </span>
              <div className="flex items-center gap-1">
                <span>Page size</span>
                <select
                  className="rounded-lg border border-white/10 bg-black/50 px-2 py-1 text-xs text-zinc-100 outline-none"
                  value={String(pageSize)}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value, 10));
                    setPageIndex(0);
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="max-h-[420px] overflow-auto">
              {loading ? (
                <div className="px-3 py-6 text-center text-xs text-zinc-500">
                  Loading…
                </div>
              ) : pageRowsIsEmpty ? (
                <div className="px-3 py-6 text-center text-xs text-zinc-500">
                  {skills.length
                    ? "No results."
                    : "No skills yet. Create your first one or use bulk import below."}
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="text-left text-zinc-400">
                    <tr>
                      <th className="px-3 py-1">Name</th>
                      <th className="px-3 py-1">Type</th>
                      <th className="px-3 py-1">Tier</th>
                      <th className="px-3 py-1">Attr</th>
                      <th className="px-3 py-1">Parents</th>
                      <th className="px-3 py-1">Creator</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(listMode === "tree"
                      ? pageTreeRows.map((row) => ({ skill: row.skill, depth: row.depth }))
                      : pageRows.map((skill) => ({ skill, depth: 0 }))
                    ).map(({ skill: s, depth }) => {
                      const isFocusSkill = fParent && String(s.id) === fParent;
                      const isSelected = selectedId === String(s.id);
                      const parents = [s.parent_id, s.parent2_id, s.parent3_id]
                        .map((pid) => (pid ? skillNameById.get(String(pid)) : ""))
                        .filter(Boolean)
                        .join(", ");
                      return (
                        <tr
                          key={listMode === "tree" ? `${String(s.id)}:${depth}` : String(s.id)}
                          className={`border-t border-white/5 cursor-pointer hover:bg-white/5 ${
                            isFocusSkill
                              ? "bg-amber-300/20 shadow-[inset_0_0_0_1px_rgba(252,211,77,0.45)]"
                              : isSelected
                              ? "bg-white/10"
                              : ""
                          }`}
                          onClick={() => {
                            setSelectedId(String(s.id));
                            setActiveTab("core");
                          }}
                        >
                          <td className="px-3 py-1.5">
                            <div
                              className="flex items-center gap-1"
                              style={
                                listMode === "tree"
                                  ? { paddingLeft: `${depth * 14}px` }
                                  : undefined
                              }
                            >
                              {listMode === "tree" && depth > 0 && (
                                <span className="text-zinc-500">↳</span>
                              )}
                              <span
                                className={
                                  isFocusSkill ? "font-semibold text-amber-200" : ""
                                }
                              >
                                {s.name || "(unnamed)"}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-1.5">{s.type}</td>
                          <td className="px-3 py-1.5">
                            {tierToText(s.tier)}
                          </td>
                          <td className="px-3 py-1.5">
                            {s.primary_attribute}
                            {s.secondary_attribute !== "NA"
                              ? `/${s.secondary_attribute}`
                              : ""}
                          </td>
                          <td className="px-3 py-1.5">
                            {parents || "—"}
                          </td>
                          <td className="px-3 py-1.5">{creatorLabel(s)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-3 py-2 text-xs text-zinc-400 border-t border-white/10">
              <div>
                Page {clampedIndex + 1} / {pages}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setPageIndex(0)}
                  disabled={clampedIndex <= 0}
                >
                  ⏮
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() =>
                    setPageIndex((i) => Math.max(0, i - 1))
                  }
                  disabled={clampedIndex <= 0}
                >
                  ◀
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() =>
                    setPageIndex((i) =>
                      Math.min(pages - 1, i + 1)
                    )
                  }
                  disabled={clampedIndex >= pages - 1}
                >
                  ▶
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setPageIndex(pages - 1)}
                  disabled={clampedIndex >= pages - 1}
                >
                  ⏭
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              disabled={
                !selected ||
                !currentUser ||
                (currentUser.role?.toLowerCase() !== "admin" &&
                  selected.created_by?.id !== currentUser.id)
              }
              onClick={deleteSelected}
            >
              Delete Selected
            </Button>
          </div>

          {/* Bulk import from spreadsheet (tab-separated) */}
          <div className="mt-4 rounded-2xl border border-dashed border-amber-300/50 bg-amber-300/5 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-amber-100">
                Bulk import skills
              </span>
              <span className="text-[10px] text-amber-200/80">
                Paste tab-separated rows
              </span>
            </div>

            <textarea
              className="w-full h-32 rounded-xl border border-white/15 bg-black/60 px-2 py-1 text-[11px] text-zinc-100 font-mono"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={[
                "Primary Attribute\tSecondary Attribute\tSkill Type\tSkill Tier\tSkill Name\tParent Skill\tDefinition",
                "STR\tN/A\tstandard\t1\tLoad-Bearing\tN/A\tTraining in managing physical load across the body...",
                "STR\tN/A\tstandard\t2\tPowerlifting\tLoad-Bearing\tFocused on the exertion of maximum strength...",
              ].join("\n")}
            />

            <div className="flex items-center justify-between gap-2">
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={handleBulkImport}
                disabled={isImporting}
              >
                {isImporting ? "Importing..." : "Import skills"}
              </Button>
              {importResult && (
                <span className="text-[10px] text-amber-100">
                  {importResult}
                </span>
              )}
            </div>

            <p className="text-[10px] text-amber-200/80">
              Columns must be: Primary Attribute, Secondary Attribute, Skill
              Type, Skill Tier, Skill Name, Parent Skill, Definition. Header row
              is optional. Parents are matched by name if they already exist.
            </p>
          </div>
        </Card>

        {/* RIGHT: editor */}
        <Card
          padded={false}
          className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-5 shadow-2xl"
        >
          {!selected ? (
            <p className="text-sm text-zinc-400">
              Select a skill on the left or create a new one to begin
              editing.
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
                    placeholder="Skill name (e.g., Swordplay, Firebolt, Battle Hymn...)"
                  />
                  <p className="mt-1 text-[11px] text-zinc-400">
                    This is the label that will show up everywhere:
                    races, world builder, and modules.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.is_free ?? false}
                        onChange={(e) =>
                          updateSelected({ is_free: e.target.checked })
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
                    tabs={SKILL_TABS}
                    activeId={activeTab}
                    onChange={(id) =>
                      setActiveTab(id as SkillTabKey)
                    }
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      type="button"
                      onClick={saveSelected}
                    >
                      Save
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      onClick={() => setShowDetails(false)}
                    >
                      Close details
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tab content */}
              <div className="space-y-4">
                {/* CORE */}
                {activeTab === "core" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <FormField
                        label="Type"
                        htmlFor="skill-type"
                        description="What kind of skill is this?"
                      >
                        <div className="flex gap-2">
                          <select
                            id="skill-type"
                            className="w-full rounded-lg border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-amber-400/40"
                            value={selected.type}
                            onChange={(e) => {
                              updateSelected({
                                type: e.target.value as SkillType,
                              });
                              if (
                                !DETAIL_TYPES.has(
                                  e.target.value as SkillType
                                )
                              ) {
                                setShowDetails(false);
                              }
                            }}
                          >
                            {TYPE_ITEMS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                          {DETAIL_TYPES.has(selected.type) && (
                            <Button
                              variant="secondary"
                              size="sm"
                              type="button"
                              onClick={() =>
                                setShowDetails((s) => !s)
                              }
                            >
                              Type details…
                            </Button>
                          )}
                        </div>
                      </FormField>

                      <FormField
                        label="Tier"
                        htmlFor="skill-tier"
                        description="Power band or unlock step."
                      >
                        <select
                          id="skill-tier"
                          className="w-full rounded-lg border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-amber-400/40"
                          value={tierToText(selected.tier)}
                          onChange={(e) =>
                            updateSelected({
                              tier: textToTier(e.target.value as TierText),
                            })
                          }
                        >
                          {TIER_ITEMS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </FormField>

                      <FormField
                        label="Primary Attribute"
                        htmlFor="primary-attr"
                        description="The main stat used for checks."
                      >
                        <select
                          id="primary-attr"
                          className="w-full rounded-lg border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-amber-400/40"
                          value={selected.primary_attribute}
                          onChange={(e) =>
                            updateSelected({
                              primary_attribute: e.target.value as Attr,
                            })
                          }
                        >
                          {ATTR_ITEMS.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      </FormField>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <FormField
                        label="Secondary Attribute"
                        htmlFor="secondary-attr"
                        description="Optional secondary stat."
                      >
                        <select
                          id="secondary-attr"
                          className="w-full rounded-lg border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-amber-400/40"
                          value={selected.secondary_attribute}
                          onChange={(e) =>
                            updateSelected({
                              secondary_attribute:
                                e.target.value as Attr,
                            })
                          }
                        >
                          {ATTR_ITEMS.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      </FormField>
                    </div>

                    <FormField
                      label="Definition / Table Text"
                      htmlFor="skill-definition"
                      description="What this skill does at the table, how it’s rolled, and any key quirks."
                    >
                      <textarea
                        id="skill-definition"
                        value={selected.definition ?? ""}
                        onChange={(e) =>
                          updateSelected({
                            definition: e.target.value,
                          })
                        }
                        className="w-full min-h-[200px] rounded-lg border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-zinc-100"
                      />
                    </FormField>

                    {showMagicBuilder && selected && (
                      <MagicBuilder
                        seedSkill={selected}
                        allSkills={skills}
                        onClose={() => setShowDetails(false)}
                      />
                    )}
                    {showSpecialDetails && selected && (
                      <SpecialAbilityDetails
                        seedSkill={selected}
                        onClose={() => setShowDetails(false)}
                      />
                    )}
                  </div>
                )}

                {/* PARENTS */}
                {activeTab === "parents" && (
                  <div className="space-y-4">
                    <p className="text-xs text-zinc-400">
                      Parents represent prerequisite paths or the
                      foundation this skill grows out of. Rules:
                      parent tier must equal child tier − 1; share at
                      least one non-NA attribute; cannot select self.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {(["parent_id", "parent2_id", "parent3_id"] as const).map(
                        (key, idx) => {
                          const currentValue = (selected as any)[key] ?? "";
                          const id = `parent-${idx + 1}`;
                          return (
                            <FormField
                              key={key}
                              label={`Parent ${idx + 1}`}
                              htmlFor={id}
                              description={
                                idx === 0
                                  ? "Primary parent"
                                  : "Optional additional parent"
                              }
                            >
                              <select
                                id={id}
                                className="w-full rounded-lg border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-amber-400/40"
                                value={String(currentValue ?? "")}
                                onChange={(e) => {
                                  const ids: (string | number | null)[] = [
                                    selected.parent_id ?? null,
                                    selected.parent2_id ?? null,
                                    selected.parent3_id ?? null,
                                  ];
                                  ids[idx] = e.target.value || null;
                                  setParentsOrdered(ids);
                                }}
                              >
                                <option value="">(none)</option>
                                {candidateParents.map((p) => (
                                  <option
                                    key={String(p.id)}
                                    value={String(p.id)}
                                  >
                                    {p.name || "(unnamed)"} — T
                                    {p.tier ?? "N/A"} /{" "}
                                    {p.primary_attribute}
                                    {p.secondary_attribute !== "NA"
                                      ? `/${p.secondary_attribute}`
                                      : ""}
                                  </option>
                                ))}
                              </select>
                            </FormField>
                          );
                        }
                      )}
                    </div>

                    <Card
                      variant="subtle"
                      padded={false}
                      className="rounded-2xl border border-amber-300/30 bg-amber-300/5 p-3"
                    >
                      <p className="text-xs text-amber-100">
                        Advanced logic (tier steps, attribute overlap,
                        magic builders, special ability scaling) plugs
                        in here. For now, you&apos;re capturing the
                        conceptual chain that other tools will honor.
                      </p>
                    </Card>
                  </div>
                )}

                {/* PREVIEW */}
                {activeTab === "preview" && (
                  <div>
                    <FormField
                      label="Preview"
                      htmlFor="skill-preview"
                      description="Rough writeup that other tools (like race builder) can reference."
                    >
                      <textarea
                        id="skill-preview"
                        readOnly
                        value={previewText}
                        className="w-full h-[400px] rounded-lg border border-white/10 bg-neutral-950/70 px-3 py-2 text-xs text-zinc-200 font-mono"
                      />
                    </FormField>

                    <div className="mt-2 text-[11px] text-zinc-500">
                      DB fields shown above mirror the old app
                      (primary/secondary attributes, parents, tier).
                      Type-specific details will be stored via the
                      magic-builds and special-abilities tables.
                    </div>
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
