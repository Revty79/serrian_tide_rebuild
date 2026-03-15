import { GalaxyRepository } from "@/lib/galaxy/repository";
import { EraModel, MarkerModel, SettingModel, WorldAggregate, WorldSummary } from "@/lib/galaxy/types";

export interface UpsertWorldInput {
  id?: string;
  name: string;
  description?: string;
  isFree?: boolean;
  isPublished?: boolean;
}

export interface UpsertEraInput {
  id?: string;
  worldId: string;
  name: string;
  description?: string;
  startYear?: number;
  endYear?: number;
  colorHex?: string;
}

export interface UpsertSettingInput {
  id?: string;
  worldId: string;
  eraId?: string;
  name: string;
  description?: string;
  startYear?: number;
  endYear?: number;
  colorHex?: string;
}

export interface UpsertMarkerInput {
  id?: string;
  worldId: string;
  eraId?: string;
  settingId?: string;
  name: string;
  description?: string;
  year?: number;
  category?: string;
  visibility: MarkerModel["visibility"];
}

const normalizeRange = (startYear?: number, endYear?: number): [number | undefined, number | undefined] => {
  if (startYear === undefined || endYear === undefined) {
    return [startYear, endYear];
  }
  if (startYear <= endYear) {
    return [startYear, endYear];
  }
  return [endYear, startYear];
};

const cleanColor = (value?: string): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  const normalized = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  const valid = /^#([0-9A-Fa-f]{6})$/.test(normalized);
  return valid ? normalized.toUpperCase() : undefined;
};

export class GalaxyService {
  constructor(private readonly repository: GalaxyRepository) {}

  listWorlds(): Promise<WorldSummary[]> {
    return this.repository.listWorlds();
  }

  getWorld(worldId: string): Promise<WorldAggregate | null> {
    return this.repository.getWorld(worldId);
  }

  async upsertWorld(input: UpsertWorldInput): Promise<WorldSummary> {
    const name = input.name.trim();
    if (!name) {
      throw new Error("World name is required.");
    }

    if (!input.id) {
      return this.repository.createWorld(name, input.description, input.isFree, input.isPublished);
    }

    const current = await this.repository.getWorld(input.id);
    if (!current) {
      throw new Error("World not found.");
    }
    const updated: WorldSummary = {
      ...current,
      name,
      description: input.description?.trim() || undefined,
      isFree: input.isFree ?? current.isFree,
      isPublished: input.isPublished ?? current.isPublished,
    };
    await this.repository.updateWorld(updated);
    return updated;
  }

  deleteWorld(worldId: string): Promise<void> {
    return this.repository.deleteWorld(worldId);
  }

  async upsertEra(input: UpsertEraInput): Promise<EraModel> {
    const name = input.name.trim();
    if (!name) {
      throw new Error("Era name is required.");
    }

    const [startYear, endYear] = normalizeRange(input.startYear, input.endYear);
    const existing = input.id ? await this.findEra(input.worldId, input.id) : null;
    const era: EraModel = {
      id: input.id ?? "",
      worldId: input.worldId,
      name,
      description: input.description?.trim() || undefined,
      startYear,
      endYear,
      colorHex: cleanColor(input.colorHex),
      orderIndex: existing?.orderIndex ?? (await this.repository.listEras(input.worldId)).length,
    };
    return this.repository.upsertEra(era);
  }

  deleteEra(eraId: string): Promise<void> {
    return this.repository.deleteEra(eraId);
  }

  async upsertSetting(input: UpsertSettingInput): Promise<SettingModel> {
    const name = input.name.trim();
    if (!name) {
      throw new Error("Setting name is required.");
    }
    const [startYear, endYear] = normalizeRange(input.startYear, input.endYear);
    const setting: SettingModel = {
      id: input.id ?? "",
      worldId: input.worldId,
      eraId: input.eraId || undefined,
      name,
      description: input.description?.trim() || undefined,
      startYear,
      endYear,
      colorHex: cleanColor(input.colorHex),
    };
    return this.repository.upsertSetting(setting);
  }

  deleteSetting(settingId: string): Promise<void> {
    return this.repository.deleteSetting(settingId);
  }

  async upsertMarker(input: UpsertMarkerInput): Promise<MarkerModel> {
    const name = input.name.trim();
    if (!name) {
      throw new Error("Event name is required.");
    }

    const marker: MarkerModel = {
      id: input.id ?? "",
      worldId: input.worldId,
      eraId: input.eraId || undefined,
      settingId: input.settingId || undefined,
      name,
      description: input.description?.trim() || undefined,
      year: input.year,
      category: input.category?.trim() || undefined,
      visibility: input.visibility,
    };
    return this.repository.upsertMarker(marker);
  }

  deleteMarker(markerId: string): Promise<void> {
    return this.repository.deleteMarker(markerId);
  }

  private async findEra(worldId: string, eraId: string): Promise<EraModel | null> {
    const eras = await this.repository.listEras(worldId);
    return eras.find((item) => item.id === eraId) ?? null;
  }
}
