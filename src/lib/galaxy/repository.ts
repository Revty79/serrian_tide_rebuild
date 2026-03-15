import {
  EraModel,
  MarkerModel,
  SettingModel,
  WorldAggregate,
  WorldSummary,
} from "@/lib/galaxy/types";

type ApiEnvelope = {
  ok?: boolean;
  error?: string;
  [key: string]: unknown;
};

async function readApiPayload(response: Response): Promise<ApiEnvelope | null> {
  return (await response.json().catch(() => null)) as ApiEnvelope | null;
}

function readApiError(response: Response, payload: ApiEnvelope | null): string {
  if (typeof payload?.error === "string" && payload.error) {
    return payload.error;
  }
  return `Request failed (${response.status})`;
}

function withWorldDefaults(world: Partial<WorldSummary>): WorldSummary {
  return {
    id: world.id ?? "",
    name: world.name ?? "",
    description: world.description,
    isFree: world.isFree ?? true,
    isPublished: world.isPublished ?? false,
    canEdit: world.canEdit ?? true,
    createdAt: world.createdAt ?? 0,
  };
}

export interface GalaxyRepository {
  listWorlds(): Promise<WorldSummary[]>;
  getWorld(worldId: string): Promise<WorldAggregate | null>;
  createWorld(name: string, description?: string, isFree?: boolean, isPublished?: boolean): Promise<WorldSummary>;
  updateWorld(world: WorldSummary): Promise<void>;
  deleteWorld(worldId: string): Promise<void>;

  listEras(worldId: string): Promise<EraModel[]>;
  upsertEra(era: EraModel): Promise<EraModel>;
  deleteEra(eraId: string): Promise<void>;

  listSettings(worldId: string): Promise<SettingModel[]>;
  upsertSetting(setting: SettingModel): Promise<SettingModel>;
  deleteSetting(settingId: string): Promise<void>;

  listMarkers(worldId: string): Promise<MarkerModel[]>;
  upsertMarker(marker: MarkerModel): Promise<MarkerModel>;
  deleteMarker(markerId: string): Promise<void>;
}

export class ApiGalaxyRepository implements GalaxyRepository {
  async listWorlds(): Promise<WorldSummary[]> {
    const response = await fetch("/api/worldbuilder/galaxy/worlds", { cache: "no-store" });
    const payload = await readApiPayload(response);

    if (!response.ok || !payload?.ok) {
      throw new Error(readApiError(response, payload));
    }

    const worlds = payload.worlds;
    return Array.isArray(worlds) ? worlds.map((entry) => withWorldDefaults(entry as Partial<WorldSummary>)) : [];
  }

  async getWorld(worldId: string): Promise<WorldAggregate | null> {
    const response = await fetch(`/api/worldbuilder/galaxy/worlds/${encodeURIComponent(worldId)}`, {
      cache: "no-store",
    });
    const payload = await readApiPayload(response);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok || !payload?.ok) {
      throw new Error(readApiError(response, payload));
    }

    const world = payload.world as Partial<WorldAggregate> | undefined;
    if (!world) {
      return null;
    }
    return {
      ...withWorldDefaults(world),
      eras: Array.isArray(world.eras) ? (world.eras as EraModel[]) : [],
      settings: Array.isArray(world.settings) ? (world.settings as SettingModel[]) : [],
      markers: Array.isArray(world.markers) ? (world.markers as MarkerModel[]) : [],
    };
  }

  async createWorld(name: string, description?: string, isFree?: boolean, isPublished?: boolean): Promise<WorldSummary> {
    const response = await fetch("/api/worldbuilder/galaxy/worlds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description ?? null,
        isFree,
        isPublished,
      }),
    });
    const payload = await readApiPayload(response);

    if (!response.ok || !payload?.ok) {
      throw new Error(readApiError(response, payload));
    }

    const world = payload.world as WorldSummary | undefined;
    if (!world) {
      throw new Error("Create world response missing world payload.");
    }
    return world;
  }

  async updateWorld(world: WorldSummary): Promise<void> {
    const response = await fetch(`/api/worldbuilder/galaxy/worlds/${encodeURIComponent(world.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: world.name,
        description: world.description ?? null,
        isFree: world.isFree,
        isPublished: world.isPublished,
      }),
    });
    const payload = await readApiPayload(response);

    if (!response.ok || !payload?.ok) {
      throw new Error(readApiError(response, payload));
    }
  }

  async deleteWorld(worldId: string): Promise<void> {
    const response = await fetch(`/api/worldbuilder/galaxy/worlds/${encodeURIComponent(worldId)}`, {
      method: "DELETE",
    });
    const payload = await readApiPayload(response);

    if (!response.ok || !payload?.ok) {
      throw new Error(readApiError(response, payload));
    }
  }

  async listEras(worldId: string): Promise<EraModel[]> {
    const world = await this.getWorld(worldId);
    return world?.eras ?? [];
  }

  async upsertEra(era: EraModel): Promise<EraModel> {
    const response = await fetch("/api/worldbuilder/galaxy/eras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: era.id || undefined,
        worldId: era.worldId,
        name: era.name,
        description: era.description ?? null,
        startYear: era.startYear ?? null,
        endYear: era.endYear ?? null,
        colorHex: era.colorHex ?? null,
        orderIndex: era.orderIndex,
      }),
    });
    const payload = await readApiPayload(response);

    if (!response.ok || !payload?.ok) {
      throw new Error(readApiError(response, payload));
    }

    const created = payload.era as EraModel | undefined;
    if (!created) {
      throw new Error("Upsert era response missing era payload.");
    }
    return created;
  }

  async deleteEra(eraId: string): Promise<void> {
    const response = await fetch(`/api/worldbuilder/galaxy/eras/${encodeURIComponent(eraId)}`, {
      method: "DELETE",
    });
    const payload = await readApiPayload(response);

    if (!response.ok || !payload?.ok) {
      throw new Error(readApiError(response, payload));
    }
  }

  async listSettings(worldId: string): Promise<SettingModel[]> {
    const world = await this.getWorld(worldId);
    return world?.settings ?? [];
  }

  async upsertSetting(setting: SettingModel): Promise<SettingModel> {
    const response = await fetch("/api/worldbuilder/galaxy/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: setting.id || undefined,
        worldId: setting.worldId,
        eraId: setting.eraId ?? null,
        name: setting.name,
        description: setting.description ?? null,
        startYear: setting.startYear ?? null,
        endYear: setting.endYear ?? null,
        colorHex: setting.colorHex ?? null,
      }),
    });
    const payload = await readApiPayload(response);

    if (!response.ok || !payload?.ok) {
      throw new Error(readApiError(response, payload));
    }

    const created = payload.setting as SettingModel | undefined;
    if (!created) {
      throw new Error("Upsert setting response missing setting payload.");
    }
    return created;
  }

  async deleteSetting(settingId: string): Promise<void> {
    const response = await fetch(`/api/worldbuilder/galaxy/settings/${encodeURIComponent(settingId)}`, {
      method: "DELETE",
    });
    const payload = await readApiPayload(response);

    if (!response.ok || !payload?.ok) {
      throw new Error(readApiError(response, payload));
    }
  }

  async listMarkers(worldId: string): Promise<MarkerModel[]> {
    const world = await this.getWorld(worldId);
    return world?.markers ?? [];
  }

  async upsertMarker(marker: MarkerModel): Promise<MarkerModel> {
    const response = await fetch("/api/worldbuilder/galaxy/markers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: marker.id || undefined,
        worldId: marker.worldId,
        eraId: marker.eraId ?? null,
        settingId: marker.settingId ?? null,
        name: marker.name,
        description: marker.description ?? null,
        year: marker.year ?? null,
        category: marker.category ?? null,
        visibility: marker.visibility,
      }),
    });
    const payload = await readApiPayload(response);

    if (!response.ok || !payload?.ok) {
      throw new Error(readApiError(response, payload));
    }

    const created = payload.marker as MarkerModel | undefined;
    if (!created) {
      throw new Error("Upsert marker response missing marker payload.");
    }
    return created;
  }

  async deleteMarker(markerId: string): Promise<void> {
    const response = await fetch(`/api/worldbuilder/galaxy/markers/${encodeURIComponent(markerId)}`, {
      method: "DELETE",
    });
    const payload = await readApiPayload(response);

    if (!response.ok || !payload?.ok) {
      throw new Error(readApiError(response, payload));
    }
  }
}
