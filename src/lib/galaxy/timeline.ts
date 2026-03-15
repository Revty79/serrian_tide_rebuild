import { EraModel, MarkerModel, SettingModel, WorldAggregate } from "@/lib/galaxy/types";

export interface TimelineViewport {
  minYear: number;
  maxYear: number;
  selectedYear: number;
}

export interface PackedSetting {
  setting: SettingModel;
  laneIndex: number;
}

export type EventAnchorTarget = "setting" | "era" | "axis";

export interface EventAnchor {
  marker: MarkerModel;
  year: number;
  x: number;
  y: number;
  target: EventAnchorTarget;
}

export const TIMELINE_LEFT_PADDING = 130;
export const TIMELINE_RIGHT_PADDING = 60;
export const AXIS_Y = 42;
export const ERA_Y = 88;
export const LANE_HEIGHT = 30;
export const SETTING_LANE_GAP = 14;
export const AXIS_EVENT_OFFSET_Y = 22;

export const yearToX = (year: number, viewport: TimelineViewport, pxPerYear: number): number =>
  TIMELINE_LEFT_PADDING + (year - viewport.minYear) * pxPerYear;

export const computeViewport = (world: WorldAggregate): TimelineViewport => {
  const years: number[] = [];
  for (const era of world.eras) {
    if (typeof era.startYear === "number") {
      years.push(era.startYear);
    }
    if (typeof era.endYear === "number") {
      years.push(era.endYear);
    }
  }
  for (const setting of world.settings) {
    if (typeof setting.startYear === "number") {
      years.push(setting.startYear);
    }
    if (typeof setting.endYear === "number") {
      years.push(setting.endYear);
    }
  }
  for (const marker of world.markers) {
    if (typeof marker.year === "number") {
      years.push(marker.year);
    }
  }

  let minYear = -100;
  let maxYear = 100;
  if (years.length > 0) {
    minYear = Math.min(...years);
    maxYear = Math.max(...years);
  }
  if (minYear === maxYear) {
    minYear -= 10;
    maxYear += 10;
  }
  const span = maxYear - minYear;
  const padding = Math.max(25, Math.ceil(span * 0.1));
  minYear -= padding;
  maxYear += padding;

  const eventYears = world.markers
    .map((marker) => marker.year)
    .filter((year): year is number => typeof year === "number")
    .sort((a, b) => a - b);

  const selectedYear =
    eventYears[0] ??
    (minYear <= 0 && maxYear >= 0 ? 0 : minYear);

  return {
    minYear,
    maxYear,
    selectedYear: Math.min(maxYear, Math.max(minYear, selectedYear)),
  };
};

const normalizeRange = (startYear: number, endYear: number): [number, number] =>
  startYear <= endYear ? [startYear, endYear] : [endYear, startYear];

const settingSortRangeStart = (setting: SettingModel): number => {
  if (typeof setting.startYear === "number" && typeof setting.endYear === "number") {
    return Math.min(setting.startYear, setting.endYear);
  }
  return Number.MIN_SAFE_INTEGER;
};

export const packSettings = (settings: SettingModel[]): PackedSetting[] => {
  const sorted = [...settings].sort((a, b) => {
    const startCompare = settingSortRangeStart(a) - settingSortRangeStart(b);
    if (startCompare !== 0) {
      return startCompare;
    }
    return a.name.localeCompare(b.name);
  });

  const laneLastEnd: number[] = [];
  const packed: PackedSetting[] = [];

  for (const setting of sorted) {
    const hasRange = typeof setting.startYear === "number" && typeof setting.endYear === "number";
    if (!hasRange) {
      packed.push({ setting, laneIndex: laneLastEnd.length });
      laneLastEnd.push(Number.MAX_SAFE_INTEGER);
      continue;
    }

    const [startYear, endYear] = normalizeRange(setting.startYear!, setting.endYear!);
    let laneIndex = -1;
    for (let i = 0; i < laneLastEnd.length; i += 1) {
      const laneEnd = laneLastEnd[i];
      if (laneEnd !== undefined && startYear >= laneEnd) {
        laneIndex = i;
        break;
      }
    }
    if (laneIndex === -1) {
      laneIndex = laneLastEnd.length;
      laneLastEnd.push(endYear);
    } else {
      laneLastEnd[laneIndex] = endYear;
    }

    packed.push({ setting, laneIndex });
  }

  return packed;
};

export const computeSettingY = (laneIndex: number): number =>
  ERA_Y + LANE_HEIGHT + 40 + laneIndex * (LANE_HEIGHT + SETTING_LANE_GAP) + LANE_HEIGHT / 2;

export const computeTimelineHeight = (laneCount: number): number =>
  ERA_Y + LANE_HEIGHT + 40 + Math.max(1, laneCount) * (LANE_HEIGHT + SETTING_LANE_GAP) + 80;

const clamp = (value: number, minValue: number, maxValue: number): number =>
  Math.min(maxValue, Math.max(minValue, value));

export const computeEventAnchors = ({
  markers,
  eras,
  packedSettings,
  viewport,
  pxPerYear,
}: {
  markers: MarkerModel[];
  eras: EraModel[];
  packedSettings: PackedSetting[];
  viewport: TimelineViewport;
  pxPerYear: number;
}): EventAnchor[] => {
  const eraMap = new Map<string, EraModel>(eras.map((item) => [item.id, item]));
  const settingMap = new Map<string, PackedSetting>(packedSettings.map((item) => [item.setting.id, item]));

  return markers
    .filter((marker) => typeof marker.year === "number")
    .map((marker) => {
      const year = marker.year!;
      const setting = marker.settingId ? settingMap.get(marker.settingId) : undefined;
      if (setting) {
        let x = yearToX(year, viewport, pxPerYear);
        if (typeof setting.setting.startYear === "number" && typeof setting.setting.endYear === "number") {
          const [startYear, endYear] = normalizeRange(setting.setting.startYear, setting.setting.endYear);
          const clampedYear = clamp(year, startYear, endYear);
          x = yearToX(clampedYear, viewport, pxPerYear);
        }
        return {
          marker,
          year,
          x,
          y: computeSettingY(setting.laneIndex),
          target: "setting" as const,
        };
      }

      const era = marker.eraId ? eraMap.get(marker.eraId) : undefined;
      if (era) {
        return {
          marker,
          year,
          x: yearToX(year, viewport, pxPerYear),
          y: ERA_Y + LANE_HEIGHT / 2,
          target: "era" as const,
        };
      }

      return {
        marker,
        year,
        x: yearToX(year, viewport, pxPerYear),
        y: AXIS_Y + AXIS_EVENT_OFFSET_Y,
        target: "axis" as const,
      };
    });
};

export const pickTickStep = (pxPerYear: number): number => {
  const candidates = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
  let best = candidates[0] ?? 1;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const step of candidates) {
    const spacing = step * pxPerYear;
    const inRange = spacing >= 60 && spacing <= 120;
    const score = inRange
      ? Math.abs(spacing - 90)
      : 1000 + (spacing < 60 ? 60 - spacing : spacing - 120);
    if (score < bestScore) {
      best = step;
      bestScore = score;
    }
  }
  return best;
};

export const floorToStep = (value: number, step: number): number => value - (value % step);
