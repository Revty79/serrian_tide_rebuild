export type MarkerVisibility = "canon" | "secret" | "rumor";

export interface WorldSummary {
  id: string;
  name: string;
  description?: string;
  isFree: boolean;
  isPublished: boolean;
  canEdit: boolean;
  createdAt: number;
}

export interface EraModel {
  id: string;
  worldId: string;
  name: string;
  description?: string;
  startYear?: number;
  endYear?: number;
  colorHex?: string;
  orderIndex: number;
  canEdit?: boolean;
}

export interface SettingModel {
  id: string;
  worldId: string;
  eraId?: string;
  name: string;
  description?: string;
  startYear?: number;
  endYear?: number;
  colorHex?: string;
  canEdit?: boolean;
}

export interface MarkerModel {
  id: string;
  worldId: string;
  eraId?: string;
  settingId?: string;
  name: string;
  description?: string;
  year?: number;
  category?: string;
  visibility: MarkerVisibility;
  canEdit?: boolean;
}

export interface WorldAggregate extends WorldSummary {
  eras: EraModel[];
  settings: SettingModel[];
  markers: MarkerModel[];
}

export interface GalaxyStore {
  worlds: WorldSummary[];
  eras: EraModel[];
  settings: SettingModel[];
  markers: MarkerModel[];
}
