"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";

import { GradientText } from "@/components/GradientText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { Input } from "@/components/Input";
import { Tabs } from "@/components/Tabs";
import { WBNav } from "@/components/worldbuilder/WBNav";

/* ---------- types & helpers ---------- */

type CalendarTabKey = "time" | "structure" | "seasons" | "astronomical" | "festivals" | "preview";

// Week structure within a month
type WeekStructure = {
  id: string;
  weekNumber: number;
  daysInWeek: number;
  repeatPattern?: boolean; // If true, this becomes the pattern for all subsequent weeks
};

type WeekdayDef = {
  id: string;
  name: string;
  order: number;
};

// Month with flexible week structure
type MonthDef = {
  id: string;
  name: string;
  weekStructure: WeekStructure[];
  seasonTag?: string | null;
};

type SeasonDef = {
  id: string;
  name: string;
  startDayOfYear: number;
  description?: string | null;
  // Optional: Override daylight hours for this season
  daylightHours?: number | null;
  dawnDuskHours?: number | null;
  nightHours?: number | null;
};

type FestivalDef = {
  id: string;
  name: string;
  dayRule: string;
  description?: string | null;
};

type AstronomicalEventDef = {
  id: string;
  name: string;
  dayOfYear: number;
  eventType: string; // e.g., 'solstice', 'equinox', 'eclipse', 'alignment'
  celestialBody?: string | null; // e.g., 'First Sun', 'Blue Moon', 'Red Moon'
  description?: string | null;
};

type CalendarRow = {
  id: string;
  name: string;
  description?: string | null;
  
  // Time & Day/Night Cycle
  hoursPerDay: number;
  minutesPerHour: number;
  daylightHours: number;
  nightHours: number;
  dawnDuskHours: number;
  
  // Year structure
  daysPerYear: number;
  
  // Leap year rules
  hasLeapYear: boolean;
  leapYearFrequency?: number | null; // e.g., every 4 years
  leapYearExceptions?: string | null; // e.g., "except every 100 years, unless divisible by 400"
  leapDaysAdded?: number | null; // how many days are added
  
  // Weekdays
  weekdays: WeekdayDef[];
  
  // Months
  months: MonthDef[];
  
  // Seasons
  seasons: SeasonDef[];
  
  // Astronomical Events
  astronomicalEvents: AstronomicalEventDef[];
  
  // Festivals
  festivals: FestivalDef[];
};

const CAL_TABS: { id: CalendarTabKey; label: string }[] = [
  { id: "time", label: "Time & Day/Night" },
  { id: "structure", label: "Month Structure" },
  { id: "seasons", label: "Seasons" },
  { id: "astronomical", label: "Astronomical Events" },
  { id: "festivals", label: "Festivals" },
  { id: "preview", label: "Preview" },
];

const uid = () => Math.random().toString(36).slice(2, 10);

// Calculate total days in a month from week structures
const calculateMonthDays = (weekStructures: WeekStructure[]): number => {
  if (weekStructures.length === 0) return 0;
  
  let total = 0;
  weekStructures.forEach((ws) => {
    total += ws.daysInWeek;
  });
  
  return total;
};

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

/* ---------- main page ---------- */

export default function CalendarBuilderPage() {
  const [calendars, setCalendars] = useState<CalendarRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [qtext, setQtext] = useState("");
  const [activeTab, setActiveTab] = useState<CalendarTabKey>("time");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load calendars from API
  useEffect(() => {
    async function loadCalendars() {
      try {
        const res = await fetch('/api/worldbuilder/calendars');
        const data = await parseJsonResponse(res);
        if (data.ok) {
          setCalendars(data.calendars);
        }
      } catch (err) {
        console.error('Failed to load calendars:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCalendars();
  }, []);

  const selected: CalendarRow | null = useMemo(
    () => calendars.find((c) => c.id === selectedId) ?? null,
    [calendars, selectedId]
  );

  const filteredCalendars = useMemo(() => {
    const q = qtext.trim().toLowerCase();
    if (!q) return calendars;
    return calendars.filter((c) => {
      const base = [c.name, c.description ?? ""].join(" ").toLowerCase();
      return base.includes(q);
    });
  }, [calendars, qtext]);

  /* ---------- CRUD helpers ---------- */

  async function createCalendar() {
    const id = uid();
    const cal: CalendarRow = {
      id,
      name: "New Calendar",
      description: "",
      hoursPerDay: 24,
      minutesPerHour: 60,
      daylightHours: 12,
      nightHours: 10,
      dawnDuskHours: 2,
      daysPerYear: 365,
      hasLeapYear: false,
      leapYearFrequency: null,
      leapYearExceptions: null,
      leapDaysAdded: null,
      weekdays: [
        { id: uid(), name: "Monday", order: 1 },
        { id: uid(), name: "Tuesday", order: 2 },
        { id: uid(), name: "Wednesday", order: 3 },
        { id: uid(), name: "Thursday", order: 4 },
        { id: uid(), name: "Friday", order: 5 },
        { id: uid(), name: "Saturday", order: 6 },
        { id: uid(), name: "Sunday", order: 7 },
      ],
      months: [],
      seasons: [],
      astronomicalEvents: [],
      festivals: [],
    };

    try {
      setSaving(true);
      const res = await fetch('/api/worldbuilder/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...cal,
          isFree: false,
          isPublished: false,
        }),
      });
      const data = await parseJsonResponse(res);
      if (data.ok) {
        setCalendars((prev) => [{ ...cal, id: data.id }, ...prev]);
        setSelectedId(data.id);
      } else {
        console.error('API error:', data);
        alert(`Failed to create calendar: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Create error:', err);
      alert(`Failed to create calendar: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }

  async function deleteSelected() {
    if (!selected) return;
    if (!confirm("Delete this calendar?")) return;
    
    try {
      setSaving(true);
      const res = await fetch(`/api/worldbuilder/calendars/${selected.id}`, {
        method: 'DELETE',
      });
      const data = await parseJsonResponse(res);
      if (data.ok) {
        setCalendars((prev) => prev.filter((c) => c.id !== selected.id));
        setSelectedId(null);
      } else {
        alert('Failed to delete calendar');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete calendar');
    } finally {
      setSaving(false);
    }
  }

  function renameSelected(newName: string) {
    if (!selected) return;
    setCalendars((prev) =>
      prev.map((c) => (c.id === selected.id ? { ...c, name: newName } : c))
    );
  }

  function patchSelected(patch: Partial<CalendarRow>) {
    if (!selected) return;
    setCalendars((prev) =>
      prev.map((c) => (c.id === selected.id ? { ...c, ...patch } : c))
    );
  }

  // Auto-save when calendar changes
  useEffect(() => {
    if (!selected || saving) return;
    
    const timer = setTimeout(async () => {
      try {
        await fetch(`/api/worldbuilder/calendars/${selected.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(selected),
        });
      } catch (err) {
        console.error('Auto-save error:', err);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [selected, saving]);

  function patchMonths(mod: (months: MonthDef[]) => MonthDef[]) {
    if (!selected) return;
    patchSelected({ months: mod(selected.months) });
  }

  function patchWeekdays(mod: (days: WeekdayDef[]) => WeekdayDef[]) {
    if (!selected) return;
    patchSelected({ weekdays: mod(selected.weekdays) });
  }

  function patchSeasons(mod: (list: SeasonDef[]) => SeasonDef[]) {
    if (!selected) return;
    patchSelected({ seasons: mod(selected.seasons) });
  }

  function patchAstronomicalEvents(mod: (list: AstronomicalEventDef[]) => AstronomicalEventDef[]) {
    if (!selected) return;
    patchSelected({ astronomicalEvents: mod(selected.astronomicalEvents) });
  }

  function patchFestivals(mod: (list: FestivalDef[]) => FestivalDef[]) {
    if (!selected) return;
    patchSelected({ festivals: mod(selected.festivals) });
  }

  function patchMonthWeekStructure(
    monthId: string,
    mod: (weeks: WeekStructure[]) => WeekStructure[]
  ) {
    if (!selected) return;
    patchMonths((months) =>
      months.map((m) =>
        m.id === monthId ? { ...m, weekStructure: mod(m.weekStructure) } : m
      )
    );
  }

  /* ---------- preview text ---------- */

  const previewText = useMemo(() => {
    if (!selected) return "";

    const timeBlock = `Time System:
  Hours per Day: ${selected.hoursPerDay}
  Minutes per Hour: ${selected.minutesPerHour}
  Daylight: ${selected.daylightHours}h | Dawn/Dusk: ${selected.dawnDuskHours}h | Night: ${selected.nightHours}h`;

    const weekdaysBlock =
      selected.weekdays.length === 0
        ? "Weekdays: (none defined)"
        : "Weekdays:\n" +
          selected.weekdays
            .sort((a, b) => a.order - b.order)
            .map((d) => `  ${d.order}. ${d.name}`)
            .join("\n");

    const monthsBlock =
      selected.months.length === 0
        ? "Months: (none defined)"
        : "Months:\n" +
          selected.months
            .map((m, idx) => {
              const totalDays = calculateMonthDays(m.weekStructure);
              const weeksDesc = m.weekStructure
                .map((w) => `Week ${w.weekNumber}: ${w.daysInWeek} days${w.repeatPattern ? " (repeating)" : ""}`)
                .join(", ");
              return `  ${idx + 1}. ${m.name} — ${totalDays} days [${weeksDesc}]`;
            })
            .join("\n");

    const seasonsBlock =
      selected.seasons.length === 0
        ? "Seasons: (none defined)"
        : "Seasons:\n" +
          selected.seasons
            .map((s) => {
              let seasonLine = `  ${s.name} — starts day ${s.startDayOfYear}`;
              if (s.daylightHours != null) {
                seasonLine += ` | Daylight: ${s.daylightHours}h, Dawn/Dusk: ${s.dawnDuskHours ?? 0}h, Night: ${s.nightHours ?? 0}h`;
              }
              if (s.description) {
                seasonLine += ` (${s.description})`;
              }
              return seasonLine;
            })
            .join("\n");

    const festivalsBlock =
      selected.festivals.length === 0
        ? "Festivals: (none defined)"
        : "Festivals:\n" +
          selected.festivals
            .map((f) => `  ${f.name} — ${f.dayRule}${f.description ? ` :: ${f.description}` : ""}`)
            .join("\n");

    const leapYearBlock = selected.hasLeapYear
      ? `Leap Year: Every ${selected.leapYearFrequency ?? "?"}  years, add ${selected.leapDaysAdded ?? "?"}  day(s)${
          selected.leapYearExceptions ? ` (${selected.leapYearExceptions})` : ""
        }`
      : "Leap Year: None";

    return [
      `Calendar: ${selected.name}`,
      selected.description ? `Description: ${selected.description}` : "",
      "",
      timeBlock,
      "",
      `Year Length: ${selected.daysPerYear} days`,
      leapYearBlock,
      "",
      weekdaysBlock,
      "",
      monthsBlock,
      "",
      seasonsBlock,
      "",
      festivalsBlock,
    ].join("\n");
  }, [selected]);

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
              Calendar Builder
            </GradientText>
            <p className="mt-1 text-sm text-zinc-300/90 max-w-2xl">
              Build sophisticated calendars with custom time systems, flexible month structures, and day/night cycles.
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
          <WBNav current="calendars" />
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
              Calendar Library
            </h2>
            <Button
              variant="primary"
              size="sm"
              type="button"
              onClick={createCalendar}
            >
              + New
            </Button>
          </div>

          <div className="space-y-2">
            <Input
              value={qtext}
              onChange={(e) => setQtext(e.target.value)}
              placeholder="Search calendars..."
            />
          </div>

          <div className="mt-2 flex-1 min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
            <div className="flex items-center justify-between px-3 py-2 text-xs text-zinc-400 border-b border-white/10">
              <span>Calendars: {filteredCalendars.length}</span>
            </div>

            <div className="max-h-[420px] overflow-auto">
              {loading ? (
                <div className="px-3 py-6 text-center text-xs text-zinc-500">
                  Loading calendars...
                </div>
              ) : filteredCalendars.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-zinc-500">
                  No calendars yet. Create your first calendar system.
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {filteredCalendars.map((c) => {
                    const isSel = selectedId === c.id;
                    return (
                      <div
                        key={c.id}
                        className={`px-3 py-2 cursor-pointer hover:bg-white/5 transition ${
                          isSel ? "bg-white/10" : ""
                        }`}
                        onClick={() => setSelectedId(c.id)}
                      >
                        <div className="font-medium text-sm text-zinc-100">{c.name}</div>
                        <div className="text-xs text-zinc-400 mt-0.5">
                          {c.hoursPerDay}h days • {c.months.length} months
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-3 py-2 text-xs text-zinc-400 border-t border-white/10">
              <div className="flex items-center gap-2">
                <span>Rename:</span>
                <input
                  className="rounded-md border border-white/15 bg-black/50 px-2 py-1 text-xs text-zinc-100 outline-none"
                  disabled={!selected}
                  value={selected?.name ?? ""}
                  onChange={(e) => renameSelected(e.target.value)}
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                type="button"
                disabled={!selected || saving}
                onClick={deleteSelected}
              >
                {saving ? 'Saving...' : 'Delete'}
              </Button>
            </div>
          </div>
        </Card>

        {/* RIGHT: editor */}
        <Card
          padded={false}
          className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-5 shadow-2xl"
        >
          {!selected ? (
            <div className="space-y-3 text-sm text-zinc-300">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Calendar builder
              </p>
              <p>Create a calendar to get started. You'll be able to define:</p>
              <ul className="list-disc pl-4 text-xs text-zinc-400 space-y-1">
                <li><span className="font-medium">Time & Day/Night</span> — hours, minutes, daylight cycles</li>
                <li><span className="font-medium">Month Structure</span> — flexible week structures within months</li>
                <li><span className="font-medium">Seasons</span> — when seasons begin and end</li>
                <li><span className="font-medium">Festivals</span> — recurring cultural events</li>
              </ul>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div className="flex-1">
                  <Input
                    value={selected.name}
                    onChange={(e) => renameSelected(e.target.value)}
                    placeholder="Calendar name"
                  />
                  <p className="mt-1 text-[11px] text-zinc-400">
                    The name of this calendar system
                  </p>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-2">
                  <Tabs
                    tabs={CAL_TABS}
                    activeId={activeTab}
                    onChange={(id) => setActiveTab(id as CalendarTabKey)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                {/* TIME TAB */}
                {activeTab === "time" && (
                  <div className="space-y-5">
                    <FormField
                      label="Description"
                      htmlFor="cal-desc"
                      description="Brief description of this calendar system"
                    >
                      <textarea
                        id="cal-desc"
                        className="w-full min-h-[80px] rounded-lg border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-zinc-100"
                        value={selected.description ?? ""}
                        onChange={(e) => patchSelected({ description: e.target.value })}
                        placeholder="E.g., 'The standard calendar used across the empire...'"
                      />
                    </FormField>

                    <div className="border-t border-white/10 pt-4">
                      <h3 className="text-sm font-semibold text-zinc-200 mb-3">Time Structure</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormField label="Hours per Day" htmlFor="hours-day">
                          <Input
                            id="hours-day"
                            type="number"
                            value={selected.hoursPerDay}
                            onChange={(e) => patchSelected({ hoursPerDay: Number(e.target.value) || 24 })}
                          />
                        </FormField>
                        <FormField label="Minutes per Hour" htmlFor="minutes-hour">
                          <Input
                            id="minutes-hour"
                            type="number"
                            value={selected.minutesPerHour}
                            onChange={(e) => patchSelected({ minutesPerHour: Number(e.target.value) || 60 })}
                          />
                        </FormField>
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-4">
                      <h3 className="text-sm font-semibold text-zinc-200 mb-3">Day/Night Cycle</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <FormField label="Daylight Hours" htmlFor="daylight">
                          <Input
                            id="daylight"
                            type="number"
                            value={selected.daylightHours}
                            onChange={(e) => patchSelected({ daylightHours: Number(e.target.value) || 0 })}
                          />
                        </FormField>
                        <FormField label="Dawn/Dusk Hours" htmlFor="dawndusk">
                          <Input
                            id="dawndusk"
                            type="number"
                            value={selected.dawnDuskHours}
                            onChange={(e) => patchSelected({ dawnDuskHours: Number(e.target.value) || 0 })}
                          />
                        </FormField>
                        <FormField label="Night Hours" htmlFor="night">
                          <Input
                            id="night"
                            type="number"
                            value={selected.nightHours}
                            onChange={(e) => patchSelected({ nightHours: Number(e.target.value) || 0 })}
                          />
                        </FormField>
                      </div>
                      <p className="text-xs text-zinc-400 mt-2">
                        Total: {selected.daylightHours + selected.dawnDuskHours + selected.nightHours} hours
                        {selected.daylightHours + selected.dawnDuskHours + selected.nightHours !== selected.hoursPerDay && (
                          <span className="text-amber-400"> (should equal {selected.hoursPerDay})</span>
                        )}
                      </p>
                    </div>

                    <div className="border-t border-white/10 pt-4">
                      <h3 className="text-sm font-semibold text-zinc-200 mb-3">Weekday Names</h3>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-zinc-400">
                          These are the names of days in your week cycle
                        </p>
                        <Button
                          variant="secondary"
                          size="sm"
                          type="button"
                          onClick={() => {
                            const nextOrder = selected.weekdays.length === 0
                              ? 1
                              : Math.max(...selected.weekdays.map((d) => d.order)) + 1;
                            patchWeekdays((days) => [
                              ...days,
                              { id: uid(), name: `Day ${nextOrder}`, order: nextOrder },
                            ]);
                          }}
                        >
                          + Add Day
                        </Button>
                      </div>
                      {selected.weekdays.length === 0 ? (
                        <p className="text-xs text-zinc-500 py-4">No weekdays defined</p>
                      ) : (
                        <div className="space-y-2">
                          {selected.weekdays
                            .sort((a, b) => a.order - b.order)
                            .map((d) => (
                              <div
                                key={d.id}
                                className="grid grid-cols-[60px,1fr,auto] gap-2 items-center"
                              >
                                <Input
                                  type="number"
                                  value={d.order}
                                  onChange={(e) =>
                                    patchWeekdays((days) =>
                                      days.map((dd) =>
                                        dd.id === d.id
                                          ? { ...dd, order: Number(e.target.value) || 0 }
                                          : dd
                                      )
                                    )
                                  }
                                  placeholder="#"
                                />
                                <Input
                                  value={d.name}
                                  onChange={(e) =>
                                    patchWeekdays((days) =>
                                      days.map((dd) =>
                                        dd.id === d.id ? { ...dd, name: e.target.value } : dd
                                      )
                                    )
                                  }
                                  placeholder="Day name"
                                />
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  type="button"
                                  onClick={() =>
                                    patchWeekdays((days) => days.filter((dd) => dd.id !== d.id))
                                  }
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-white/10 pt-4">
                      <FormField label="Days per Year" htmlFor="days-year">
                        <Input
                          id="days-year"
                          type="number"
                          value={selected.daysPerYear}
                          onChange={(e) => patchSelected({ daysPerYear: Number(e.target.value) || 365 })}
                        />
                      </FormField>
                    </div>

                    <div className="border-t border-white/10 pt-4">
                      <h3 className="text-sm font-semibold text-zinc-200 mb-3">Leap Year Rules</h3>
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm text-zinc-300">
                          <input
                            type="checkbox"
                            checked={selected.hasLeapYear}
                            onChange={(e) => patchSelected({ hasLeapYear: e.target.checked })}
                            className="rounded border-white/20"
                          />
                          This calendar has leap years
                        </label>

                        {selected.hasLeapYear && (
                          <div className="space-y-3 pl-6 border-l-2 border-white/10">
                            <FormField 
                              label="Leap Year Frequency" 
                              htmlFor="leap-freq"
                              description="How often does a leap year occur? (e.g., every 4 years)"
                            >
                              <Input
                                id="leap-freq"
                                type="number"
                                value={selected.leapYearFrequency ?? ""}
                                onChange={(e) => patchSelected({ leapYearFrequency: Number(e.target.value) || null })}
                                placeholder="e.g., 4"
                              />
                            </FormField>

                            <FormField 
                              label="Days Added" 
                              htmlFor="leap-days"
                              description="How many days are added in a leap year?"
                            >
                              <Input
                                id="leap-days"
                                type="number"
                                value={selected.leapDaysAdded ?? ""}
                                onChange={(e) => patchSelected({ leapDaysAdded: Number(e.target.value) || null })}
                                placeholder="e.g., 1"
                              />
                            </FormField>

                            <FormField 
                              label="Exceptions" 
                              htmlFor="leap-except"
                              description="Any exceptions to the rule? (e.g., 'except every 100 years, unless divisible by 400')"
                            >
                              <Input
                                id="leap-except"
                                value={selected.leapYearExceptions ?? ""}
                                onChange={(e) => patchSelected({ leapYearExceptions: e.target.value || null })}
                                placeholder="Optional exception rules"
                              />
                            </FormField>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* STRUCTURE TAB */}
                {activeTab === "structure" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-200">Months</h3>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Build custom month structures with flexible week patterns
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        type="button"
                        onClick={() =>
                          patchMonths((months) => [
                            ...months,
                            {
                              id: uid(),
                              name: `Month ${months.length + 1}`,
                              weekStructure: [
                                { id: uid(), weekNumber: 1, daysInWeek: 7, repeatPattern: true },
                              ],
                              seasonTag: null,
                            },
                          ])
                        }
                      >
                        + Add Month
                      </Button>
                    </div>

                    {selected.months.length === 0 ? (
                      <div className="text-center py-8 text-zinc-500 text-sm">
                        No months defined yet. Add a month to start building your calendar structure.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {selected.months.map((month) => (
                          <Card
                            key={month.id}
                            padded={false}
                            className="border border-white/10 bg-black/20 p-4 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <Input
                                  value={month.name}
                                  onChange={(e) =>
                                    patchMonths((months) =>
                                      months.map((m) =>
                                        m.id === month.id ? { ...m, name: e.target.value } : m
                                      )
                                    )
                                  }
                                  placeholder="Month name"
                                />
                                <p className="text-xs text-zinc-400 mt-1">
                                  Total days: {calculateMonthDays(month.weekStructure)}
                                </p>
                              </div>
                              <Button
                                variant="secondary"
                                size="sm"
                                type="button"
                                onClick={() =>
                                  patchMonths((months) => months.filter((m) => m.id !== month.id))
                                }
                              >
                                Remove Month
                              </Button>
                            </div>

                            <div className="border-t border-white/10 pt-3">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-semibold text-zinc-300">Week Structure</h4>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  type="button"
                                  onClick={() => {
                                    const nextWeek =
                                      month.weekStructure.length === 0
                                        ? 1
                                        : Math.max(...month.weekStructure.map((w) => w.weekNumber)) + 1;
                                    patchMonthWeekStructure(month.id, (weeks) => [
                                      ...weeks,
                                      {
                                        id: uid(),
                                        weekNumber: nextWeek,
                                        daysInWeek: 7,
                                        repeatPattern: false,
                                      },
                                    ]);
                                  }}
                                >
                                  + Add Week
                                </Button>
                              </div>

                              {month.weekStructure.length === 0 ? (
                                <p className="text-xs text-zinc-500 py-2">No weeks defined</p>
                              ) : (
                                <div className="space-y-2">
                                  {month.weekStructure
                                    .sort((a, b) => a.weekNumber - b.weekNumber)
                                    .map((week) => (
                                      <div
                                        key={week.id}
                                        className="grid grid-cols-[80px,100px,1fr,auto] gap-2 items-center bg-white/5 p-2 rounded"
                                      >
                                        <div className="text-xs text-zinc-400">Week {week.weekNumber}</div>
                                        <Input
                                          type="number"
                                          value={week.daysInWeek}
                                          onChange={(e) =>
                                            patchMonthWeekStructure(month.id, (weeks) =>
                                              weeks.map((w) =>
                                                w.id === week.id
                                                  ? { ...w, daysInWeek: Number(e.target.value) || 7 }
                                                  : w
                                              )
                                            )
                                          }
                                          placeholder="Days"
                                        />
                                        <label className="flex items-center gap-2 text-xs text-zinc-300">
                                          <input
                                            type="checkbox"
                                            checked={week.repeatPattern || false}
                                            onChange={(e) =>
                                              patchMonthWeekStructure(month.id, (weeks) =>
                                                weeks.map((w) =>
                                                  w.id === week.id
                                                    ? { ...w, repeatPattern: e.target.checked }
                                                    : w
                                                )
                                              )
                                            }
                                            className="rounded border-white/20"
                                          />
                                          Repeat this pattern
                                        </label>
                                        <Button
                                          variant="secondary"
                                          size="sm"
                                          type="button"
                                          onClick={() =>
                                            patchMonthWeekStructure(month.id, (weeks) =>
                                              weeks.filter((w) => w.id !== week.id)
                                            )
                                          }
                                        >
                                          ×
                                        </Button>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>

                            <div className="border-t border-white/10 pt-3">
                              <FormField label="Season Tag" htmlFor={`season-${month.id}`}>
                                <Input
                                  id={`season-${month.id}`}
                                  value={month.seasonTag ?? ""}
                                  onChange={(e) =>
                                    patchMonths((months) =>
                                      months.map((m) =>
                                        m.id === month.id
                                          ? { ...m, seasonTag: e.target.value || null }
                                          : m
                                      )
                                    )
                                  }
                                  placeholder="e.g., Spring, Summer..."
                                />
                              </FormField>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* SEASONS TAB */}
                {activeTab === "seasons" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-200">Seasons</h3>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Define when seasons begin and optionally adjust daylight hours per season
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        type="button"
                        onClick={() =>
                          patchSeasons((list) => [
                            ...list,
                            {
                              id: uid(),
                              name: `Season ${list.length + 1}`,
                              startDayOfYear: 1,
                              description: null,
                              daylightHours: null,
                              dawnDuskHours: null,
                              nightHours: null,
                            },
                          ])
                        }
                      >
                        + Add Season
                      </Button>
                    </div>

                    {/* Guidance Card */}
                    <Card className="border border-violet-500/20 bg-violet-950/10 p-3">
                      <h4 className="text-xs font-semibold text-violet-300 mb-2">💡 Building Your Calendar Seasons</h4>
                      <ul className="text-xs text-zinc-300 space-y-1.5 list-disc list-inside">
                        <li><strong>Season Name & Start Day:</strong> Name your season and set which day of the year it begins (e.g., Spring starts on day 1, Summer on day 91)</li>
                        <li><strong>Day/Night Cycles:</strong> View each season's daylight hours. Click "Customize" to override and create longer summer days or shorter winter days</li>
                        <li><strong>Astronomical Events:</strong> Use the Astronomical Events tab to create solstices, equinoxes, eclipses, and other celestial events for your world's moons and suns</li>
                        <li><strong>Validation:</strong> Watch for warnings about overlapping seasons or incorrect hour totals to ensure your calendar is consistent</li>
                        <li><strong>Example:</strong> Create 4 seasons - Spring (day 1, 12h), Summer (day 91, 16h), Autumn (day 182, 12h), Winter (day 274, 8h)</li>
                      </ul>
                    </Card>

                    {selected.seasons.length === 0 ? (
                      <p className="text-xs text-zinc-500 py-4 text-center">No seasons defined</p>
                    ) : (
                      <div className="space-y-3">
                        {selected.seasons.map((s, idx) => {
                          // Check for overlapping seasons
                          const nextSeason = selected.seasons[idx + 1];
                          const hasOverlap = nextSeason && s.startDayOfYear >= nextSeason.startDayOfYear;
                          
                          return (
                            <Card
                              key={s.id}
                              padded={false}
                              className="border border-white/10 bg-black/20 p-4 space-y-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 space-y-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    <FormField label="Season Name" htmlFor={`s-name-${s.id}`}>
                                      <Input
                                        id={`s-name-${s.id}`}
                                        value={s.name}
                                        onChange={(e) =>
                                          patchSeasons((list) =>
                                            list.map((ss) =>
                                              ss.id === s.id ? { ...ss, name: e.target.value } : ss
                                            )
                                          )
                                        }
                                        placeholder="e.g., Spring, Summer, Autumn, Winter"
                                      />
                                    </FormField>
                                    <FormField label="Start Day of Year" htmlFor={`s-start-${s.id}`}>
                                      <Input
                                        id={`s-start-${s.id}`}
                                        type="number"
                                        min="1"
                                        max={selected.daysPerYear}
                                        value={s.startDayOfYear}
                                        onChange={(e) =>
                                          patchSeasons((list) =>
                                            list.map((ss) =>
                                              ss.id === s.id
                                                ? { ...ss, startDayOfYear: Number(e.target.value) || 1 }
                                                : ss
                                            )
                                          )
                                        }
                                        placeholder="Day 1-365"
                                      />
                                    </FormField>
                                  </div>
                                  
                                  <FormField label="Description (Optional)" htmlFor={`s-desc-${s.id}`}>
                                    <Input
                                      id={`s-desc-${s.id}`}
                                      value={s.description ?? ""}
                                      onChange={(e) =>
                                        patchSeasons((list) =>
                                          list.map((ss) =>
                                            ss.id === s.id
                                              ? { ...ss, description: e.target.value || null }
                                              : ss
                                          )
                                        )
                                      }
                                      placeholder="Describe this season (weather, climate, etc.)"
                                    />
                                  </FormField>
                                  
                                  {hasOverlap && (
                                    <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-1">
                                      ⚠️ Warning: This season overlaps with the next season. Each season should start after the previous one ends.
                                    </div>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  type="button"
                                  onClick={() =>
                                    patchSeasons((list) => list.filter((ss) => ss.id !== s.id))
                                  }
                                  className="text-red-400 hover:text-red-300 mt-6"
                                >
                                  Remove
                                </Button>
                              </div>

                              {/* Day/Night Cycle - Always Visible */}
                              <div className="border-t border-white/10 pt-3 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="text-xs font-semibold text-zinc-300">
                                      Day/Night Cycle
                                    </h4>
                                    <p className="text-xs text-zinc-500 mt-0.5">
                                      {s.daylightHours != null 
                                        ? `Custom cycle for this season (${s.daylightHours}h daylight)`
                                        : `Using calendar default (${selected.daylightHours}h daylight)`
                                      }
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    className="text-xs px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-zinc-100 transition-colors"
                                    onClick={() => {
                                      if (s.daylightHours != null) {
                                        // Clear seasonal override
                                        patchSeasons((list) =>
                                          list.map((ss) =>
                                            ss.id === s.id
                                              ? { ...ss, daylightHours: null, dawnDuskHours: null, nightHours: null }
                                              : ss
                                          )
                                        );
                                      } else {
                                        // Set to calendar defaults for editing
                                        patchSeasons((list) =>
                                          list.map((ss) =>
                                            ss.id === s.id
                                              ? {
                                                  ...ss,
                                                  daylightHours: selected.daylightHours,
                                                  dawnDuskHours: selected.dawnDuskHours,
                                                  nightHours: selected.nightHours,
                                                }
                                              : ss
                                          )
                                        );
                                      }
                                    }}
                                  >
                                    {s.daylightHours != null ? "↩ Use Default" : "✏️ Customize"}
                                  </button>
                                </div>

                                {/* Always show current values */}
                                <div className="grid grid-cols-3 gap-3">
                                  <FormField label="Daylight Hours" htmlFor={`s-day-${s.id}`}>
                                    <Input
                                      id={`s-day-${s.id}`}
                                      type="number"
                                      min="0"
                                      max={selected.hoursPerDay}
                                      value={s.daylightHours ?? selected.daylightHours}
                                      onChange={(e) =>
                                        patchSeasons((list) =>
                                          list.map((ss) =>
                                            ss.id === s.id
                                              ? { ...ss, daylightHours: Number(e.target.value) || 0 }
                                              : ss
                                          )
                                        )
                                      }
                                      disabled={s.daylightHours == null}
                                      placeholder="Hours"
                                      className={s.daylightHours == null ? "opacity-60" : ""}
                                    />
                                  </FormField>
                                  <FormField label="Dawn/Dusk Hours" htmlFor={`s-dawn-${s.id}`}>
                                    <Input
                                      id={`s-dawn-${s.id}`}
                                      type="number"
                                      min="0"
                                      max={selected.hoursPerDay}
                                      value={s.dawnDuskHours ?? selected.dawnDuskHours}
                                      onChange={(e) =>
                                        patchSeasons((list) =>
                                          list.map((ss) =>
                                            ss.id === s.id
                                              ? { ...ss, dawnDuskHours: Number(e.target.value) || 0 }
                                              : ss
                                          )
                                        )
                                      }
                                      disabled={s.dawnDuskHours == null}
                                      placeholder="Hours"
                                      className={s.dawnDuskHours == null ? "opacity-60" : ""}
                                    />
                                  </FormField>
                                  <FormField label="Night Hours" htmlFor={`s-night-${s.id}`}>
                                    <Input
                                      id={`s-night-${s.id}`}
                                      type="number"
                                      min="0"
                                      max={selected.hoursPerDay}
                                      value={s.nightHours ?? selected.nightHours}
                                      onChange={(e) =>
                                        patchSeasons((list) =>
                                          list.map((ss) =>
                                            ss.id === s.id
                                              ? { ...ss, nightHours: Number(e.target.value) || 0 }
                                              : ss
                                          )
                                        )
                                      }
                                      disabled={s.nightHours == null}
                                      placeholder="Hours"
                                      className={s.nightHours == null ? "opacity-60" : ""}
                                    />
                                  </FormField>
                                </div>
                                
                                {/* Total hours validation */}
                                <div className="text-xs text-zinc-400">
                                  Total: {(s.daylightHours ?? selected.daylightHours) + (s.dawnDuskHours ?? selected.dawnDuskHours) + (s.nightHours ?? selected.nightHours)}h / {selected.hoursPerDay}h per day
                                  {(s.daylightHours ?? selected.daylightHours) + (s.dawnDuskHours ?? selected.dawnDuskHours) + (s.nightHours ?? selected.nightHours) !== selected.hoursPerDay && (
                                    <span className="text-yellow-400 ml-2">⚠️ Should equal {selected.hoursPerDay}h</span>
                                  )}
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ASTRONOMICAL EVENTS TAB */}
                {activeTab === "astronomical" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-200">Astronomical Events</h3>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Define solstices, equinoxes, eclipses, and celestial alignments for your world's moons and suns
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        type="button"
                        onClick={() =>
                          patchAstronomicalEvents((list) => [
                            ...list,
                            {
                              id: uid(),
                              name: `Event ${list.length + 1}`,
                              dayOfYear: 1,
                              eventType: "solstice",
                              celestialBody: null,
                              description: null,
                            },
                          ])
                        }
                      >
                        + Add Event
                      </Button>
                    </div>

                    {/* Guidance Card */}
                    <Card className="border border-cyan-500/20 bg-cyan-950/10 p-3">
                      <h4 className="text-xs font-semibold text-cyan-300 mb-2">🌙 Creating Astronomical Events</h4>
                      <ul className="text-xs text-zinc-300 space-y-1.5 list-disc list-inside">
                        <li><strong>Event Types:</strong> Create solstices (shortest/longest days), equinoxes (equal day/night), eclipses, planetary alignments, or custom celestial events</li>
                        <li><strong>Multiple Celestial Bodies:</strong> If your world has multiple suns or moons, create separate events for each (e.g., "First Sun Winter Solstice", "Blue Moon Eclipse")</li>
                        <li><strong>Day of Year:</strong> Set which day this event occurs (can match season start days or be independent)</li>
                        <li><strong>Example:</strong> Winter Solstice (day 1, shortest daylight), Spring Equinox (day 91, equal day/night), Red Moon Eclipse (day 200)</li>
                      </ul>
                    </Card>

                    {selected.astronomicalEvents.length === 0 ? (
                      <p className="text-xs text-zinc-500 py-4 text-center">No astronomical events defined</p>
                    ) : (
                      <div className="space-y-3">
                        {selected.astronomicalEvents.map((event) => (
                          <Card
                            key={event.id}
                            padded={false}
                            className="border border-white/10 bg-black/20 p-4 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 space-y-3">
                                <div className="grid grid-cols-3 gap-3">
                                  <FormField label="Event Name" htmlFor={`ae-name-${event.id}`}>
                                    <Input
                                      id={`ae-name-${event.id}`}
                                      value={event.name}
                                      onChange={(e) =>
                                        patchAstronomicalEvents((list) =>
                                          list.map((ae) =>
                                            ae.id === event.id ? { ...ae, name: e.target.value } : ae
                                          )
                                        )
                                      }
                                      placeholder="e.g., Winter Solstice, Spring Equinox"
                                    />
                                  </FormField>
                                  <FormField label="Day of Year" htmlFor={`ae-day-${event.id}`}>
                                    <Input
                                      id={`ae-day-${event.id}`}
                                      type="number"
                                      min="1"
                                      max={selected.daysPerYear}
                                      value={event.dayOfYear}
                                      onChange={(e) =>
                                        patchAstronomicalEvents((list) =>
                                          list.map((ae) =>
                                            ae.id === event.id
                                              ? { ...ae, dayOfYear: Number(e.target.value) || 1 }
                                              : ae
                                          )
                                        )
                                      }
                                      placeholder="1-365"
                                    />
                                  </FormField>
                                  <FormField label="Event Type" htmlFor={`ae-type-${event.id}`}>
                                    <select
                                      id={`ae-type-${event.id}`}
                                      value={event.eventType}
                                      onChange={(e) =>
                                        patchAstronomicalEvents((list) =>
                                          list.map((ae) =>
                                            ae.id === event.id ? { ...ae, eventType: e.target.value } : ae
                                          )
                                        )
                                      }
                                      className="w-full rounded-lg border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-zinc-100"
                                    >
                                      <option value="solstice">Solstice</option>
                                      <option value="equinox">Equinox</option>
                                      <option value="eclipse">Eclipse</option>
                                      <option value="alignment">Planetary Alignment</option>
                                      <option value="conjunction">Conjunction</option>
                                      <option value="opposition">Opposition</option>
                                      <option value="transit">Transit</option>
                                      <option value="other">Other</option>
                                    </select>
                                  </FormField>
                                </div>
                                
                                <FormField label="Celestial Body (Optional)" htmlFor={`ae-body-${event.id}`}>
                                  <Input
                                    id={`ae-body-${event.id}`}
                                    value={event.celestialBody ?? ""}
                                    onChange={(e) =>
                                      patchAstronomicalEvents((list) =>
                                        list.map((ae) =>
                                          ae.id === event.id
                                            ? { ...ae, celestialBody: e.target.value || null }
                                            : ae
                                        )
                                      )
                                    }
                                    placeholder="e.g., First Sun, Blue Moon, Red Giant Star"
                                  />
                                </FormField>
                                
                                <FormField label="Description (Optional)" htmlFor={`ae-desc-${event.id}`}>
                                  <Input
                                    id={`ae-desc-${event.id}`}
                                    value={event.description ?? ""}
                                    onChange={(e) =>
                                      patchAstronomicalEvents((list) =>
                                        list.map((ae) =>
                                          ae.id === event.id
                                            ? { ...ae, description: e.target.value || null }
                                            : ae
                                        )
                                      )
                                    }
                                    placeholder="Describe this event (e.g., shortest day, equal day/night, double moons align)"
                                  />
                                </FormField>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                onClick={() =>
                                  patchAstronomicalEvents((list) => list.filter((ae) => ae.id !== event.id))
                                }
                                className="text-red-400 hover:text-red-300"
                              >
                                Remove
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* FESTIVALS TAB */}
                {activeTab === "festivals" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-zinc-200">Festivals</h3>
                      <Button
                        variant="secondary"
                        size="sm"
                        type="button"
                        onClick={() =>
                          patchFestivals((list) => [
                            ...list,
                            {
                              id: uid(),
                              name: `Festival ${list.length + 1}`,
                              dayRule: "",
                              description: null,
                            },
                          ])
                        }
                      >
                        + Add Festival
                      </Button>
                    </div>
                    {selected.festivals.length === 0 ? (
                      <p className="text-xs text-zinc-500 py-4 text-center">No festivals defined</p>
                    ) : (
                      <div className="space-y-2">
                        {selected.festivals.map((f) => (
                          <div
                            key={f.id}
                            className="grid grid-cols-1 gap-2 p-3 rounded-lg border border-white/10 bg-black/20"
                          >
                            <div className="grid grid-cols-[2fr,2fr,auto] gap-2">
                              <Input
                                value={f.name}
                                onChange={(e) =>
                                  patchFestivals((list) =>
                                    list.map((ff) =>
                                      ff.id === f.id ? { ...ff, name: e.target.value } : ff
                                    )
                                  )
                                }
                                placeholder="Festival name"
                              />
                              <Input
                                value={f.dayRule}
                                onChange={(e) =>
                                  patchFestivals((list) =>
                                    list.map((ff) =>
                                      ff.id === f.id ? { ...ff, dayRule: e.target.value } : ff
                                    )
                                  )
                                }
                                placeholder="e.g., '1st of Spring', 'Day 100'"
                              />
                              <Button
                                variant="secondary"
                                size="sm"
                                type="button"
                                onClick={() =>
                                  patchFestivals((list) => list.filter((ff) => ff.id !== f.id))
                                }
                              >
                                Remove
                              </Button>
                            </div>
                            <Input
                              value={f.description ?? ""}
                              onChange={(e) =>
                                patchFestivals((list) =>
                                  list.map((ff) =>
                                    ff.id === f.id
                                      ? { ...ff, description: e.target.value || null }
                                      : ff
                                  )
                                )
                              }
                              placeholder="Description (optional)"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* PREVIEW TAB */}
                {activeTab === "preview" && (
                  <div className="space-y-3">
                    <FormField
                      label="Calendar Preview"
                      htmlFor="cal-preview"
                      description="A plain text summary of your calendar system"
                    >
                      <textarea
                        id="cal-preview"
                        className="w-full min-h-[500px] rounded-lg border border-white/10 bg-neutral-950/50 px-3 py-2 text-xs text-zinc-100 font-mono"
                        readOnly
                        value={previewText}
                      />
                    </FormField>
                    <Button
                      variant="primary"
                      size="sm"
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(previewText);
                        alert("Calendar preview copied to clipboard!");
                      }}
                    >
                      Copy to Clipboard
                    </Button>
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
