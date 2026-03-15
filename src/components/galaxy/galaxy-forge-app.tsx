"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { GradientText } from "@/components/GradientText";
import { MarkerFormModal } from "@/components/galaxy/marker-modal";
import { TimelineView, TimelineViewData } from "@/components/galaxy/timeline-view";
import { EraFormModal, SettingFormModal, WorldFormModal } from "@/components/galaxy/world-era-setting-modals";
import {
  clamp,
  eraRangeLabel,
  markerYearLabel,
  normalizeRange,
  readErrorMessage,
  settingRangeLabel,
} from "@/components/galaxy/galaxy-utils";
import { ApiGalaxyRepository } from "@/lib/galaxy/repository";
import {
  GalaxyService,
  UpsertEraInput,
  UpsertMarkerInput,
  UpsertSettingInput,
  UpsertWorldInput,
} from "@/lib/galaxy/service";
import {
  computeEventAnchors,
  computeTimelineHeight,
  computeViewport,
  floorToStep,
  packSettings,
  pickTickStep,
} from "@/lib/galaxy/timeline";
import { EraModel, MarkerModel, SettingModel, WorldAggregate, WorldSummary } from "@/lib/galaxy/types";

type GalaxyForgeAppProps = {
  user: {
    id: string;
    username: string;
    role: string;
  };
};

export function GalaxyForgeApp({ user }: GalaxyForgeAppProps) {
  const service = useMemo(() => new GalaxyService(new ApiGalaxyRepository()), []);
  const [worlds, setWorlds] = useState<WorldSummary[]>([]);
  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null);
  const [activeWorld, setActiveWorld] = useState<WorldAggregate | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [pxPerYear, setPxPerYear] = useState(3.5);
  const [isLoadingWorlds, setIsLoadingWorlds] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [worldModal, setWorldModal] = useState<{ world?: WorldSummary } | null>(null);
  const [eraModal, setEraModal] = useState<{ era?: EraModel } | null>(null);
  const [settingModal, setSettingModal] = useState<{ setting?: SettingModel } | null>(null);
  const [markerModal, setMarkerModal] = useState<{ marker?: MarkerModel } | null>(null);

  const latestWorldRequestRef = useRef(0);
  const timelineFocusTokenRef = useRef(0);
  const [timelineFocusRequest, setTimelineFocusRequest] = useState<{ year: number; token: number } | null>(null);

  const loadWorlds = useCallback(
    async (preferredWorldId?: string | null) => {
      setIsLoadingWorlds(true);
      try {
        const list = await service.listWorlds();
        setWorlds(list);
        setSelectedWorldId((currentWorldId) => {
          const candidate = preferredWorldId ?? currentWorldId;
          if (candidate && list.some((world) => world.id === candidate)) {
            return candidate;
          }
          return list[0]?.id ?? null;
        });
      } catch (nextError) {
        setError(readErrorMessage(nextError));
      } finally {
        setIsLoadingWorlds(false);
      }
    },
    [service],
  );

  const loadWorld = useCallback(
    async (worldId: string | null) => {
      if (!worldId) {
        setActiveWorld(null);
        return;
      }

      const requestId = latestWorldRequestRef.current + 1;
      latestWorldRequestRef.current = requestId;

      try {
        const world = await service.getWorld(worldId);
        if (latestWorldRequestRef.current !== requestId) {
          return;
        }
        setActiveWorld(world);
      } catch (nextError) {
        if (latestWorldRequestRef.current !== requestId) {
          return;
        }
        setError(readErrorMessage(nextError));
      }
    },
    [service],
  );

  useEffect(() => {
    void loadWorlds();
  }, [loadWorlds]);

  useEffect(() => {
    void loadWorld(selectedWorldId);
  }, [selectedWorldId, loadWorld]);

  const selectedWorldSummary = useMemo(
    () => worlds.find((world) => world.id === selectedWorldId) ?? null,
    [worlds, selectedWorldId],
  );

  const canEditActiveWorld = (activeWorld?.canEdit ?? selectedWorldSummary?.canEdit) ?? false;

  const timelineData = useMemo<TimelineViewData | null>(() => {
    if (!activeWorld) {
      return null;
    }

    const viewport = computeViewport(activeWorld);
    const year = clamp(selectedYear ?? viewport.selectedYear, viewport.minYear, viewport.maxYear);
    const packedSettings = packSettings(activeWorld.settings);
    const laneCount = Math.max(1, packedSettings.length);
    const height = computeTimelineHeight(laneCount);
    const width = Math.max(980, (viewport.maxYear - viewport.minYear) * pxPerYear + 130 + 60);

    const erasWithRange = activeWorld.eras
      .filter((era) => typeof era.startYear === "number" && typeof era.endYear === "number")
      .map((era) => {
        const [startYear, endYear] = normalizeRange(era.startYear!, era.endYear!);
        return { era, startYear, endYear };
      });

    const anchors = computeEventAnchors({
      markers: activeWorld.markers,
      eras: activeWorld.eras,
      packedSettings,
      viewport,
      pxPerYear,
    });

    const tickStep = pickTickStep(pxPerYear);
    const ticks: number[] = [];
    for (
      let yearValue = floorToStep(viewport.minYear, tickStep);
      yearValue <= viewport.maxYear;
      yearValue += tickStep
    ) {
      ticks.push(yearValue);
    }

    const eraMap = new Map(activeWorld.eras.map((era) => [era.id, era]));
    const settingMap = new Map(activeWorld.settings.map((setting) => [setting.id, setting]));
    const activeEras = erasWithRange
      .filter((item) => item.startYear <= year && year <= item.endYear)
      .map((item) => item.era);
    const activeSettings = packedSettings.filter((item) => {
      if (typeof item.setting.startYear !== "number" || typeof item.setting.endYear !== "number") {
        return false;
      }
      const [startYear, endYear] = normalizeRange(item.setting.startYear, item.setting.endYear);
      return startYear <= year && year <= endYear;
    });
    const markersAtYear = activeWorld.markers
      .filter((marker) => marker.year === year)
      .map((marker) => ({
        marker,
        setting: marker.settingId ? settingMap.get(marker.settingId) : undefined,
        era: marker.eraId ? eraMap.get(marker.eraId) : undefined,
      }));

    return {
      viewport,
      selectedYear: year,
      packedSettings,
      width,
      height,
      erasWithRange,
      anchors,
      ticks,
      activeEras,
      activeSettings,
      markersAtYear,
    };
  }, [activeWorld, pxPerYear, selectedYear]);

  useEffect(() => {
    if (!timelineData) {
      setSelectedYear(null);
      setTimelineFocusRequest(null);
      return;
    }
    setSelectedYear((current) =>
      clamp(
        current ?? timelineData.viewport.selectedYear,
        timelineData.viewport.minYear,
        timelineData.viewport.maxYear,
      ),
    );
  }, [timelineData]);

  const getEraJumpYear = useCallback((era: EraModel): number | null => {
    const hasStart = typeof era.startYear === "number";
    const hasEnd = typeof era.endYear === "number";
    if (hasStart && hasEnd) {
      const [start, end] = normalizeRange(era.startYear!, era.endYear!);
      return Math.round((start + end) / 2);
    }
    if (hasStart) {
      return era.startYear!;
    }
    if (hasEnd) {
      return era.endYear!;
    }
    return null;
  }, []);

  const getSettingJumpYear = useCallback((setting: SettingModel): number | null => {
    const hasStart = typeof setting.startYear === "number";
    const hasEnd = typeof setting.endYear === "number";
    if (hasStart && hasEnd) {
      const [start, end] = normalizeRange(setting.startYear!, setting.endYear!);
      return Math.round((start + end) / 2);
    }
    if (hasStart) {
      return setting.startYear!;
    }
    if (hasEnd) {
      return setting.endYear!;
    }
    return null;
  }, []);

  const getMarkerJumpYear = useCallback(
    (marker: MarkerModel): number | null => (typeof marker.year === "number" ? marker.year : null),
    [],
  );

  const focusTimelineYear = useCallback(
    (year: number | null) => {
      if (year === null || !timelineData) {
        return;
      }
      const clampedYear = clamp(year, timelineData.viewport.minYear, timelineData.viewport.maxYear);
      setSelectedYear(clampedYear);
      timelineFocusTokenRef.current += 1;
      setTimelineFocusRequest({ year: clampedYear, token: timelineFocusTokenRef.current });
    },
    [timelineData],
  );

  const refreshActiveWorld = useCallback(async () => {
    if (!selectedWorldId) {
      return;
    }
    await loadWorld(selectedWorldId);
  }, [selectedWorldId, loadWorld]);

  const handleSaveWorld = useCallback(
    async (input: UpsertWorldInput) => {
      const saved = await service.upsertWorld(input);
      setWorldModal(null);
      setNotice(input.id ? "World updated." : "World created.");
      setError(null);
      await loadWorlds(saved.id);
    },
    [service, loadWorlds],
  );

  const handleDeleteWorld = useCallback(
    async (world: WorldSummary) => {
      if (!window.confirm(`Delete "${world.name}" and all of its eras, settings, and events?`)) {
        return;
      }
      try {
        await service.deleteWorld(world.id);
        setNotice("World deleted.");
        setError(null);
        await loadWorlds(selectedWorldId === world.id ? null : selectedWorldId);
      } catch (nextError) {
        setError(readErrorMessage(nextError));
      }
    },
    [service, loadWorlds, selectedWorldId],
  );

  const handleSaveEra = useCallback(
    async (input: UpsertEraInput) => {
      await service.upsertEra(input);
      setEraModal(null);
      setNotice(input.id ? "Era updated." : "Era created.");
      setError(null);
      await refreshActiveWorld();
    },
    [service, refreshActiveWorld],
  );

  const handleDeleteEra = useCallback(
    async (era: EraModel) => {
      if (!window.confirm(`Delete era "${era.name}"?`)) {
        return;
      }
      try {
        await service.deleteEra(era.id);
        setNotice("Era deleted.");
        setError(null);
        await refreshActiveWorld();
      } catch (nextError) {
        setError(readErrorMessage(nextError));
      }
    },
    [service, refreshActiveWorld],
  );

  const handleSaveSetting = useCallback(
    async (input: UpsertSettingInput) => {
      await service.upsertSetting(input);
      setSettingModal(null);
      setNotice(input.id ? "Setting updated." : "Setting created.");
      setError(null);
      await refreshActiveWorld();
    },
    [service, refreshActiveWorld],
  );

  const handleDeleteSetting = useCallback(
    async (setting: SettingModel) => {
      if (!window.confirm(`Delete setting "${setting.name}"?`)) {
        return;
      }
      try {
        await service.deleteSetting(setting.id);
        setNotice("Setting deleted.");
        setError(null);
        await refreshActiveWorld();
      } catch (nextError) {
        setError(readErrorMessage(nextError));
      }
    },
    [service, refreshActiveWorld],
  );

  const handleSaveMarker = useCallback(
    async (input: UpsertMarkerInput) => {
      await service.upsertMarker(input);
      setMarkerModal(null);
      setNotice(input.id ? "Event updated." : "Event created.");
      setError(null);
      await refreshActiveWorld();
    },
    [service, refreshActiveWorld],
  );

  const handleDeleteMarker = useCallback(
    async (marker: MarkerModel) => {
      if (!window.confirm(`Delete event "${marker.name}"?`)) {
        return;
      }
      try {
        await service.deleteMarker(marker.id);
        setNotice("Event deleted.");
        setError(null);
        await refreshActiveWorld();
      } catch (nextError) {
        setError(readErrorMessage(nextError));
      }
    },
    [service, refreshActiveWorld],
  );

  const worldSettingMap = useMemo(
    () => new Map((activeWorld?.settings ?? []).map((setting) => [setting.id, setting])),
    [activeWorld?.settings],
  );
  const worldEraMap = useMemo(
    () => new Map((activeWorld?.eras ?? []).map((era) => [era.id, era])),
    [activeWorld?.eras],
  );

  return (
    <main className="min-h-screen px-3 sm:px-6 py-6 sm:py-10">
      <header className="max-w-[1700px] mx-auto mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <GradientText
            as="h1"
            variant="title"
            glow
            className="font-evanescent text-3xl sm:text-4xl md:text-5xl tracking-tight"
          >
            Galaxy Forge
          </GradientText>
          <p className="mt-1 text-sm text-zinc-300/90">
            Timeline-first worldbuilding inside Source Forge. Logged in as {user.username} ({user.role}).
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/source-forge">
            <Button variant="secondary" size="sm">
              Back to Source Forge
            </Button>
          </Link>
          <Link href="/worldbuilder/toolbox">
            <Button variant="primary" size="sm">
              Open Toolbox
            </Button>
          </Link>
        </div>
      </header>

      <section className="max-w-[1700px] mx-auto grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-4">
        <Card
          padded={false}
          className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 shadow-2xl h-fit"
        >
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
            <p className="text-sm font-semibold text-zinc-100">World Registry</p>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setWorldModal({})}
            >
              New World
            </Button>
          </div>
          <div className="mt-3">
            {isLoadingWorlds && worlds.length === 0 ? (
              <p className="text-sm text-zinc-400">Loading worlds...</p>
            ) : worlds.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/20 bg-black/20 p-4 text-sm text-zinc-400">
                No worlds yet. Create one to begin.
              </div>
            ) : (
              <ul className="space-y-2">
                {worlds.map((world) => (
                  <li
                    key={world.id}
                    className={[
                      "rounded-xl border px-3 py-2 transition",
                      world.id === selectedWorldId
                        ? "border-violet-400/50 bg-violet-500/10"
                        : "border-white/10 bg-black/20",
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedWorldId(world.id)}
                      className="block w-full text-left"
                    >
                      <div className="truncate text-sm font-semibold text-zinc-100">{world.name}</div>
                      <div className="truncate text-xs text-zinc-400">{world.description || "No description"}</div>
                    </button>
                    <div className="mt-2 flex justify-end gap-2 text-xs">
                      <button
                        type="button"
                        disabled={!world.canEdit}
                        onClick={() => setWorldModal({ world })}
                        className="rounded border border-white/15 bg-white/10 px-2 py-1 text-zinc-200 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={!world.canEdit}
                        onClick={() => void handleDeleteWorld(world)}
                        className="rounded border border-red-400/40 bg-red-500/20 px-2 py-1 text-red-200 hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <section className="min-w-0 space-y-4">
          {error && (
            <Card variant="danger" className="rounded-xl border border-red-400/50 bg-red-500/15 p-3">
              <p className="text-sm text-red-100">{error}</p>
            </Card>
          )}
          {notice && (
            <Card className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 p-3">
              <p className="text-sm text-emerald-100">{notice}</p>
            </Card>
          )}

          {!activeWorld || !timelineData ? (
            <Card className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-semibold text-zinc-100">No world selected</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Pick a world from the left panel, or create a new one.
              </p>
            </Card>
          ) : (
            <>
              <Card className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h2 className="text-2xl font-semibold text-zinc-100">{activeWorld.name}</h2>
                <p className="mt-1 text-sm text-zinc-300/80">
                  {activeWorld.description || "No description"}
                </p>
                <p className="mt-2 text-xs text-zinc-400">
                  Visibility: {activeWorld.isFree ? "Free" : "Private"} | {activeWorld.isPublished ? "Published" : "Draft"}
                </p>
                {!canEditActiveWorld && (
                  <p className="mt-2 text-xs text-amber-300/90">
                    Read-only world. You can view this world, but only the owner or an admin can edit it.
                  </p>
                )}
              </Card>

              <TimelineView
                data={timelineData}
                pxPerYear={pxPerYear}
                focusRequest={timelineFocusRequest}
                onZoomChange={setPxPerYear}
                onSelectedYearChange={setSelectedYear}
                onEditEra={(era) => {
                  if (!canEditActiveWorld || era.canEdit === false) return;
                  setEraModal({ era });
                }}
                onEditSetting={(setting) => {
                  if (!canEditActiveWorld || setting.canEdit === false) return;
                  setSettingModal({ setting });
                }}
                onEditMarker={(marker) => {
                  if (!canEditActiveWorld || marker.canEdit === false) return;
                  setMarkerModal({ marker });
                }}
              />

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                <div className="space-y-4">
                  <Card className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-zinc-100">Eras</h3>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setEraModal({})}
                        disabled={!canEditActiveWorld}
                      >
                        Add Era
                      </Button>
                    </div>
                    {activeWorld.eras.length === 0 ? (
                      <p className="text-sm text-zinc-400">No eras yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {activeWorld.eras.map((era) => {
                          const jumpYear = getEraJumpYear(era);
                          return (
                            <li key={era.id} className="rounded-lg border border-white/10 bg-black/20 p-2">
                              <div className="flex items-center justify-between gap-3">
                                <button
                                  type="button"
                                  onClick={() => focusTimelineYear(jumpYear)}
                                  disabled={jumpYear === null}
                                  className="min-w-0 flex-1 text-left disabled:cursor-not-allowed disabled:opacity-55"
                                  title={jumpYear === null ? "No timeline year set for this era." : `Jump to year ${jumpYear}`}
                                >
                                  <div className="truncate text-sm font-semibold text-zinc-100 hover:text-emerald-200">{era.name}</div>
                                  <div className="text-xs text-zinc-400">{eraRangeLabel(era)}</div>
                                </button>
                                <div className="flex gap-2 text-xs">
                                  <button
                                    type="button"
                                    disabled={!canEditActiveWorld || era.canEdit === false}
                                    onClick={() => setEraModal({ era })}
                                    className="rounded border border-white/15 bg-white/10 px-2 py-1 text-zinc-200 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!canEditActiveWorld || era.canEdit === false}
                                    onClick={() => void handleDeleteEra(era)}
                                    className="rounded border border-red-400/40 bg-red-500/20 px-2 py-1 text-red-200 hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </Card>

                  <Card className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-zinc-100">Settings</h3>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSettingModal({})}
                        disabled={!canEditActiveWorld}
                      >
                        Add Setting
                      </Button>
                    </div>
                    {activeWorld.settings.length === 0 ? (
                      <p className="text-sm text-zinc-400">No settings yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {activeWorld.settings.map((setting) => {
                          const jumpYear = getSettingJumpYear(setting);
                          return (
                            <li key={setting.id} className="rounded-lg border border-white/10 bg-black/20 p-2">
                              <div className="flex items-center justify-between gap-3">
                                <button
                                  type="button"
                                  onClick={() => focusTimelineYear(jumpYear)}
                                  disabled={jumpYear === null}
                                  className="min-w-0 flex-1 text-left disabled:cursor-not-allowed disabled:opacity-55"
                                  title={jumpYear === null ? "No timeline year set for this setting." : `Jump to year ${jumpYear}`}
                                >
                                  <div className="truncate text-sm font-semibold text-zinc-100 hover:text-emerald-200">{setting.name}</div>
                                  <div className="truncate text-xs text-zinc-400">
                                    {settingRangeLabel(setting)}
                                    {setting.eraId
                                      ? ` - ${worldEraMap.get(setting.eraId)?.name ?? "Unknown era"}`
                                      : ""}
                                  </div>
                                </button>
                                <div className="flex gap-2 text-xs">
                                  <button
                                    type="button"
                                    disabled={!canEditActiveWorld || setting.canEdit === false}
                                    onClick={() => setSettingModal({ setting })}
                                    className="rounded border border-white/15 bg-white/10 px-2 py-1 text-zinc-200 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!canEditActiveWorld || setting.canEdit === false}
                                    onClick={() => void handleDeleteSetting(setting)}
                                    className="rounded border border-red-400/40 bg-red-500/20 px-2 py-1 text-red-200 hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </Card>
                </div>

                <div className="space-y-4">
                  <Card className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-zinc-100">Events</h3>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setMarkerModal({})}
                        disabled={!canEditActiveWorld}
                      >
                        Add Event
                      </Button>
                    </div>
                    {activeWorld.markers.length === 0 ? (
                      <p className="text-sm text-zinc-400">No events yet.</p>
                    ) : (
                      <ul className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                        {activeWorld.markers.map((marker) => {
                          const jumpYear = getMarkerJumpYear(marker);
                          return (
                            <li key={marker.id} className="rounded-lg border border-white/10 bg-black/20 p-2">
                              <div className="flex items-center justify-between gap-3">
                                <button
                                  type="button"
                                  onClick={() => focusTimelineYear(jumpYear)}
                                  disabled={jumpYear === null}
                                  className="min-w-0 flex-1 text-left disabled:cursor-not-allowed disabled:opacity-55"
                                  title={jumpYear === null ? "No timeline year set for this event." : `Jump to year ${jumpYear}`}
                                >
                                  <div className="truncate text-sm font-semibold text-zinc-100 hover:text-emerald-200">{marker.name}</div>
                                  <div className="truncate text-xs text-zinc-400">
                                    {markerYearLabel(marker)}
                                    {marker.settingId
                                      ? ` - setting: ${worldSettingMap.get(marker.settingId)?.name ?? "Unknown"}`
                                      : marker.eraId
                                        ? ` - era: ${worldEraMap.get(marker.eraId)?.name ?? "Unknown"}`
                                        : " - unassigned"}
                                  </div>
                                </button>
                                <div className="flex gap-2 text-xs">
                                  <button
                                    type="button"
                                    disabled={!canEditActiveWorld || marker.canEdit === false}
                                    onClick={() => setMarkerModal({ marker })}
                                    className="rounded border border-white/15 bg-white/10 px-2 py-1 text-zinc-200 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!canEditActiveWorld || marker.canEdit === false}
                                    onClick={() => void handleDeleteMarker(marker)}
                                    className="rounded border border-red-400/40 bg-red-500/20 px-2 py-1 text-red-200 hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </Card>

                  <Card className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h3 className="text-lg font-semibold text-zinc-100">At Year {timelineData.selectedYear}</h3>
                    <div className="mt-3 space-y-3 text-sm">
                      <div>
                        <div className="font-medium text-zinc-100">Active eras</div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {timelineData.activeEras.length > 0
                            ? timelineData.activeEras.map((era) => {
                                const jumpYear = getEraJumpYear(era);
                                return (
                                  <button
                                    key={era.id}
                                    type="button"
                                    onClick={() => focusTimelineYear(jumpYear)}
                                    disabled={jumpYear === null}
                                    className="rounded border border-white/15 bg-white/10 px-2 py-0.5 text-xs text-zinc-200 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-55"
                                    title={jumpYear === null ? "No timeline year set for this era." : `Jump to year ${jumpYear}`}
                                  >
                                    {era.name}
                                  </button>
                                );
                              })
                            : <span className="text-zinc-400">None</span>}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-zinc-100">Active settings</div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {timelineData.activeSettings.length > 0
                            ? timelineData.activeSettings.map((packed) => {
                                const jumpYear = getSettingJumpYear(packed.setting);
                                return (
                                  <button
                                    key={packed.setting.id}
                                    type="button"
                                    onClick={() => focusTimelineYear(jumpYear)}
                                    disabled={jumpYear === null}
                                    className="rounded border border-white/15 bg-white/10 px-2 py-0.5 text-xs text-zinc-200 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-55"
                                    title={jumpYear === null ? "No timeline year set for this setting." : `Jump to year ${jumpYear}`}
                                  >
                                    {packed.setting.name}
                                  </button>
                                );
                              })
                            : <span className="text-zinc-400">None</span>}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-zinc-100">Events at year</div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {timelineData.markersAtYear.length > 0
                            ? timelineData.markersAtYear.map(({ marker, setting, era }) => {
                                const jumpYear = getMarkerJumpYear(marker);
                                const contextLabel = setting ? setting.name : era ? era.name : "unassigned";
                                return (
                                  <button
                                    key={marker.id}
                                    type="button"
                                    onClick={() => focusTimelineYear(jumpYear)}
                                    disabled={jumpYear === null}
                                    className="rounded border border-white/15 bg-white/10 px-2 py-0.5 text-xs text-zinc-200 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-55"
                                    title={jumpYear === null ? "No timeline year set for this event." : `Jump to year ${jumpYear}`}
                                  >
                                    {marker.name} [{contextLabel}]
                                  </button>
                                );
                              })
                            : <span className="text-zinc-400">None</span>}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </>
          )}
        </section>
      </section>

      {worldModal && (
        <WorldFormModal initial={worldModal.world} onClose={() => setWorldModal(null)} onSave={handleSaveWorld} />
      )}

      {eraModal && activeWorld && (
        <EraFormModal
          worldId={activeWorld.id}
          initial={eraModal.era}
          onClose={() => setEraModal(null)}
          onSave={handleSaveEra}
        />
      )}

      {settingModal && activeWorld && (
        <SettingFormModal
          worldId={activeWorld.id}
          eras={activeWorld.eras}
          initial={settingModal.setting}
          onClose={() => setSettingModal(null)}
          onSave={handleSaveSetting}
        />
      )}

      {markerModal && activeWorld && (
        <MarkerFormModal
          worldId={activeWorld.id}
          eras={activeWorld.eras}
          settings={activeWorld.settings}
          initial={markerModal.marker}
          onClose={() => setMarkerModal(null)}
          onSave={handleSaveMarker}
        />
      )}
    </main>
  );
}
