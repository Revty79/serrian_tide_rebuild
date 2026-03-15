"use client";

import { useEffect, useRef, useState } from "react";
import {
  AXIS_Y,
  ERA_Y,
  LANE_HEIGHT,
  TIMELINE_LEFT_PADDING,
  TIMELINE_RIGHT_PADDING,
  computeSettingY,
  yearToX,
} from "@/lib/galaxy/timeline";
import { EraModel, MarkerModel, SettingModel } from "@/lib/galaxy/types";
import { clamp, normalizeHexColor, normalizeRange } from "@/components/galaxy/galaxy-utils";

interface EraWithRange {
  era: EraModel;
  startYear: number;
  endYear: number;
}

interface MarkerAtYear {
  marker: MarkerModel;
  setting?: SettingModel;
  era?: EraModel;
}

interface PackedSettingView {
  setting: SettingModel;
  laneIndex: number;
}

interface AnchorView {
  marker: MarkerModel;
  year: number;
  x: number;
  y: number;
  target: "setting" | "era" | "axis";
}

export interface TimelineViewData {
  viewport: { minYear: number; maxYear: number; selectedYear: number };
  selectedYear: number;
  packedSettings: PackedSettingView[];
  width: number;
  height: number;
  erasWithRange: EraWithRange[];
  anchors: AnchorView[];
  ticks: number[];
  activeEras: EraModel[];
  activeSettings: PackedSettingView[];
  markersAtYear: MarkerAtYear[];
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 12;
const ZOOM_STEP = 0.25;

export function TimelineView({
  data,
  pxPerYear,
  focusRequest,
  onSelectedYearChange,
  onZoomChange,
  onEditEra,
  onEditSetting,
  onEditMarker,
}: {
  data: TimelineViewData;
  pxPerYear: number;
  focusRequest?: { year: number; token: number } | null;
  onSelectedYearChange: (year: number) => void;
  onZoomChange: (next: number) => void;
  onEditEra: (era: EraModel) => void;
  onEditSetting: (setting: SettingModel) => void;
  onEditMarker: (marker: MarkerModel) => void;
}) {
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const lastHandledFocusTokenRef = useRef<number | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStateRef = useRef<{ active: boolean; startX: number; startScrollLeft: number; moved: boolean }>({
    active: false,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
  });
  useEffect(() => {
    if (!focusRequest) {
      return;
    }
    if (lastHandledFocusTokenRef.current === focusRequest.token) {
      return;
    }
    lastHandledFocusTokenRef.current = focusRequest.token;
    const scroller = timelineScrollRef.current;
    if (!scroller) {
      return;
    }
    const x = yearToX(focusRequest.year, data.viewport, pxPerYear);
    const maxLeft = Math.max(0, data.width - scroller.clientWidth);
    const nextLeft = clamp(Math.round(x - scroller.clientWidth / 2), 0, maxLeft);
    scroller.scrollTo({ left: nextLeft, behavior: "smooth" });
  }, [focusRequest, data.viewport, data.width, pxPerYear]);

  const handleTimelinePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest("[data-no-pan='true']")) {
      return;
    }
    const scroller = timelineScrollRef.current;
    if (!scroller) {
      return;
    }
    panStateRef.current = {
      active: true,
      startX: event.clientX,
      startScrollLeft: scroller.scrollLeft,
      moved: false,
    };
    setIsPanning(true);
    event.preventDefault();
    scroller.setPointerCapture(event.pointerId);
  };

  const handleTimelinePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panStateRef.current.active) {
      return;
    }
    const scroller = timelineScrollRef.current;
    if (!scroller) {
      return;
    }
    const deltaX = event.clientX - panStateRef.current.startX;
    if (!panStateRef.current.moved && Math.abs(deltaX) > 2) {
      panStateRef.current.moved = true;
    }
    scroller.scrollLeft = panStateRef.current.startScrollLeft - deltaX;
  };

  const handleTimelinePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panStateRef.current.active) {
      return;
    }
    panStateRef.current.active = false;
    setIsPanning(false);
    const scroller = timelineScrollRef.current;
    if (scroller?.hasPointerCapture(event.pointerId)) {
      scroller.releasePointerCapture(event.pointerId);
    }
  };

  const handleTimelineClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineScrollRef.current) {
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest("[data-no-year-pick='true']")) {
      return;
    }
    if (panStateRef.current.moved) {
      panStateRef.current.moved = false;
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left + timelineScrollRef.current.scrollLeft;
    const year = Math.round((x - TIMELINE_LEFT_PADDING) / pxPerYear + data.viewport.minYear);
    onSelectedYearChange(clamp(year, data.viewport.minYear, data.viewport.maxYear));
  };
  const settingLaneIndices = Array.from(new Set(data.packedSettings.map((packed) => packed.laneIndex))).sort((a, b) => a - b);

  return (
    <>
      <div className="shadow-soft rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onZoomChange(
                clamp(Number((pxPerYear - ZOOM_STEP).toFixed(2)), MIN_ZOOM, MAX_ZOOM),
              )
            }
            className="rounded-md border border-white/15 bg-black/25 px-2 py-1 text-sm text-zinc-100 hover:bg-white/10"
          >
            Zoom -
          </button>
          <span className="rounded-md bg-black/35 px-2 py-1 text-xs text-zinc-200">
            {pxPerYear.toFixed(1)} px/year
          </span>
          <button
            type="button"
            onClick={() =>
              onZoomChange(
                clamp(Number((pxPerYear + ZOOM_STEP).toFixed(2)), MIN_ZOOM, MAX_ZOOM),
              )
            }
            className="rounded-md border border-white/15 bg-black/25 px-2 py-1 text-sm text-zinc-100 hover:bg-white/10"
          >
            Zoom +
          </button>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={ZOOM_STEP}
            value={pxPerYear}
            onChange={(event) => onZoomChange(Number.parseFloat(event.target.value))}
            className="min-w-[140px] w-40"
          />
          <button
            type="button"
            onClick={() => onSelectedYearChange(clamp(data.selectedYear - 1, data.viewport.minYear, data.viewport.maxYear))}
            className="rounded-md border border-white/15 bg-black/25 px-2 py-1 text-sm text-zinc-100 hover:bg-white/10"
          >
            -1
          </button>
          <input
            value={data.selectedYear}
            onChange={(event) => {
              const parsed = Number.parseInt(event.target.value, 10);
              if (!Number.isNaN(parsed)) {
                onSelectedYearChange(clamp(parsed, data.viewport.minYear, data.viewport.maxYear));
              }
            }}
            className="w-28 rounded-md border border-white/15 bg-black/30 px-2 py-1 text-sm text-zinc-100"
          />
          <button
            type="button"
            onClick={() => onSelectedYearChange(clamp(data.selectedYear + 1, data.viewport.minYear, data.viewport.maxYear))}
            className="rounded-md border border-white/15 bg-black/25 px-2 py-1 text-sm text-zinc-100 hover:bg-white/10"
          >
            +1
          </button>
          <input
            type="range"
            min={data.viewport.minYear}
            max={data.viewport.maxYear}
            value={data.selectedYear}
            onChange={(event) => onSelectedYearChange(Number.parseInt(event.target.value, 10))}
            className="min-w-[220px] flex-1"
          />
          <span className="rounded-md bg-black/35 px-2 py-1 text-xs text-zinc-400">
            Click timeline to set year. Drag background to pan. Min zoom: {MIN_ZOOM} px/year.
          </span>
        </div>
      </div>

      <div className="shadow-soft min-w-0 rounded-xl border border-white/10 bg-white/5 backdrop-blur p-3">
        <div
          ref={timelineScrollRef}
          className={`gf-scrollbar w-full select-none overflow-x-auto overflow-y-hidden rounded-lg border border-white/10 bg-slate-950/70 touch-pan-y ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
          onPointerDown={handleTimelinePointerDown}
          onPointerMove={handleTimelinePointerMove}
          onPointerUp={handleTimelinePointerEnd}
          onPointerCancel={handleTimelinePointerEnd}
        >
          <div
            className="relative"
            style={{ width: `${data.width}px`, height: `${data.height}px` }}
            onClick={handleTimelineClick}
          >
            <div className="absolute left-3 top-[34px] text-xs font-semibold text-zinc-400">Events</div>
            <div className="absolute left-3 top-[92px] text-xs font-semibold text-zinc-400">Eras</div>
            <div className="absolute left-3 text-xs font-semibold text-zinc-400" style={{ top: `${computeSettingY(0) - 10}px` }}>
              Settings
            </div>

            <div
              className="absolute border-b border-white/20"
              style={{ left: `${TIMELINE_LEFT_PADDING}px`, right: `${TIMELINE_RIGHT_PADDING}px`, top: `${AXIS_Y}px` }}
            />

            {data.ticks.map((tick) => {
              const x = yearToX(tick, data.viewport, pxPerYear);
              return (
                <div key={tick}>
                  <div className="absolute h-3 border-l border-white/20" style={{ left: `${x}px`, top: `${AXIS_Y - 6}px` }} />
                  <div className="absolute -translate-x-1/2 text-[10px] text-zinc-500" style={{ left: `${x}px`, top: `${AXIS_Y - 24}px` }}>
                    {tick}
                  </div>
                </div>
              );
            })}

            <div
              className="absolute border-l-2 border-amber-300/90"
              style={{
                left: `${yearToX(data.selectedYear, data.viewport, pxPerYear)}px`,
                top: `${AXIS_Y + 8}px`,
                bottom: "16px",
              }}
            />

            {data.erasWithRange.map(({ era, startYear, endYear }) => {
              const left = yearToX(startYear, data.viewport, pxPerYear);
              const right = yearToX(endYear, data.viewport, pxPerYear);
              const active = startYear <= data.selectedYear && data.selectedYear <= endYear;
              const color = normalizeHexColor(era.colorHex) ?? "#97C2D8";
              return (
                <button
                  key={era.id}
                  type="button"
                  data-no-pan="true"
                  data-no-year-pick="true"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEditEra(era);
                  }}
                  className="absolute rounded-md border text-left"
                  style={{
                    left: `${left}px`,
                    top: `${ERA_Y}px`,
                    width: `${Math.max(8, right - left)}px`,
                    height: `${LANE_HEIGHT}px`,
                    backgroundColor: color,
                    borderColor: active ? "#FBBF24" : "rgba(255, 255, 255, 0.2)",
                    opacity: active ? 0.95 : 0.55,
                  }}
                >
                  <span className="block truncate px-2 text-xs font-medium text-slate-900">{era.name}</span>
                </button>
              );
            })}

            {settingLaneIndices.map((laneIndex) => {
              const laneYCenter = computeSettingY(laneIndex);
              const laneTop = laneYCenter - LANE_HEIGHT / 2;
              return (
                <div
                  key={`setting-lane-${laneIndex}`}
                  className="absolute border border-dashed border-white/15 bg-slate-900/70"
                  style={{ left: `${TIMELINE_LEFT_PADDING}px`, top: `${laneTop}px`, right: `${TIMELINE_RIGHT_PADDING}px`, height: `${LANE_HEIGHT}px` }}
                />
              );
            })}

            {data.packedSettings.map((packed) => {
              const laneYCenter = computeSettingY(packed.laneIndex);
              const laneTop = laneYCenter - LANE_HEIGHT / 2;
              const rangeColor = normalizeHexColor(packed.setting.colorHex) ?? "#8EBB99";
              const hasRange = typeof packed.setting.startYear === "number" && typeof packed.setting.endYear === "number";
              const range = hasRange ? normalizeRange(packed.setting.startYear!, packed.setting.endYear!) : null;

              return (
                <div key={packed.setting.id}>
                  {!hasRange && (
                    <button
                      type="button"
                      data-no-pan="true"
                      data-no-year-pick="true"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEditSetting(packed.setting);
                      }}
                      className="absolute left-2 rounded bg-white/15 px-2 py-0.5 text-xs font-medium text-zinc-100"
                      style={{ top: `${laneTop + 3}px` }}
                    >
                      {packed.setting.name}
                    </button>
                  )}
                  {hasRange && (
                    <button
                      type="button"
                      data-no-pan="true"
                      data-no-year-pick="true"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEditSetting(packed.setting);
                      }}
                      className="absolute z-[1] rounded-md border text-left"
                      style={{
                        left: `${yearToX(range![0], data.viewport, pxPerYear)}px`,
                        top: `${laneTop}px`,
                        width: `${Math.max(8, yearToX(range![1], data.viewport, pxPerYear) - yearToX(range![0], data.viewport, pxPerYear))}px`,
                        height: `${LANE_HEIGHT}px`,
                        backgroundColor: rangeColor,
                        borderColor: "rgba(255, 255, 255, 0.2)",
                        opacity: 0.75,
                      }}
                    >
                      <span className="block truncate px-2 text-xs font-medium text-slate-900">{packed.setting.name}</span>
                    </button>
                  )}
                </div>
              );
            })}

            {data.anchors.map((anchor) => {
              const selected = anchor.year === data.selectedYear;
              const markerColor =
                anchor.marker.visibility === "secret"
                  ? "#7A3E9D"
                  : anchor.marker.visibility === "rumor"
                    ? "#D97925"
                    : "#1F7A72";

              if (anchor.target === "axis") {
                return (
                  <button
                    key={anchor.marker.id}
                    type="button"
                    data-no-pan="true"
                    data-no-year-pick="true"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEditMarker(anchor.marker);
                    }}
                    className="absolute rounded-full"
                    style={{
                      left: `${anchor.x - (selected ? 5 : 4)}px`,
                      top: `${anchor.y - (selected ? 5 : 4)}px`,
                      width: `${selected ? 10 : 8}px`,
                      height: `${selected ? 10 : 8}px`,
                      backgroundColor: markerColor,
                    }}
                  />
                );
              }

              const size = selected ? 12 : 10;
              return (
                <button
                  key={anchor.marker.id}
                  type="button"
                  data-no-pan="true"
                  data-no-year-pick="true"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEditMarker(anchor.marker);
                  }}
                  className="absolute rotate-45 rounded-sm"
                  style={{
                    left: `${anchor.x - size / 2}px`,
                    top: `${anchor.y - size / 2}px`,
                    width: `${size}px`,
                    height: `${size}px`,
                    backgroundColor: markerColor,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
