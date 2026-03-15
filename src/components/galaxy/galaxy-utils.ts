import { EraModel, MarkerModel, SettingModel } from "@/lib/galaxy/types";

export const COLOR_PRESETS = [
  "#C62828",
  "#D84315",
  "#EF6C00",
  "#F9A825",
  "#9E9D24",
  "#558B2F",
  "#2E7D32",
  "#00897B",
  "#00838F",
  "#0277BD",
  "#1565C0",
  "#283593",
  "#4527A0",
  "#6A1B9A",
  "#AD1457",
  "#6D4C41",
  "#455A64",
  "#1E88E5",
  "#43A047",
  "#E53935",
] as const;

export const clamp = (value: number, minValue: number, maxValue: number): number =>
  Math.min(maxValue, Math.max(minValue, value));

export const normalizeRange = (startYear: number, endYear: number): [number, number] =>
  startYear <= endYear ? [startYear, endYear] : [endYear, startYear];

export const parseOptionalInteger = (raw: string): number | undefined | null => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  if (!/^-?\d+$/.test(trimmed)) {
    return null;
  }
  return Number.parseInt(trimmed, 10);
};

export const toInputNumber = (value?: number): string => (typeof value === "number" ? `${value}` : "");

export const normalizeHexColor = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const normalized = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
    return undefined;
  }
  return normalized.toUpperCase();
};

export const readErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unexpected error.";
};

export const eraRangeLabel = (era: EraModel): string => {
  if (typeof era.startYear === "number" && typeof era.endYear === "number") {
    const [startYear, endYear] = normalizeRange(era.startYear, era.endYear);
    return `${startYear} - ${endYear}`;
  }
  return "No timeline range";
};

export const settingRangeLabel = (setting: SettingModel): string => {
  if (typeof setting.startYear === "number" && typeof setting.endYear === "number") {
    const [startYear, endYear] = normalizeRange(setting.startYear, setting.endYear);
    return `${startYear} - ${endYear}`;
  }
  return "No timeline range";
};

export const markerYearLabel = (marker: MarkerModel): string =>
  typeof marker.year === "number" ? `${marker.year}` : "No year";
