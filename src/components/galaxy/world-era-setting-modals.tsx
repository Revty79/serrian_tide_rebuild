"use client";

import { FormEvent, useState } from "react";
import { UpsertEraInput, UpsertSettingInput, UpsertWorldInput } from "@/lib/galaxy/service";
import { EraModel, SettingModel, WorldSummary } from "@/lib/galaxy/types";
import {
  parseOptionalInteger,
  readErrorMessage,
  toInputNumber,
  normalizeHexColor,
} from "@/components/galaxy/galaxy-utils";
import { ColorPickerField, ModalShell } from "@/components/galaxy/modal-primitives";

const inputStyle =
  "w-full rounded-md border border-white/15 bg-black/25 px-3 py-2 text-zinc-100 placeholder:text-zinc-500";

export function WorldFormModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: WorldSummary;
  onClose: () => void;
  onSave: (input: UpsertWorldInput) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isFree, setIsFree] = useState(initial?.isFree ?? true);
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("World name is required.");
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      await onSave({
        id: initial?.id,
        name,
        description,
        isFree,
        isPublished,
      });
    } catch (nextError) {
      setError(readErrorMessage(nextError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalShell title={initial ? "Edit World" : "Create World"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-zinc-100">Name *</span>
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputStyle}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-zinc-100">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className={`${inputStyle} min-h-[88px]`}
          />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-md border border-white/15 bg-black/25 px-3 py-2 text-sm text-zinc-200">
            <input
              type="checkbox"
              checked={isFree}
              onChange={(event) => setIsFree(event.target.checked)}
            />
            Free visibility
          </label>
          <label className="flex items-center gap-2 rounded-md border border-white/15 bg-black/25 px-3 py-2 text-sm text-zinc-200">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(event) => setIsPublished(event.target.checked)}
            />
            Published
          </label>
        </div>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/15 bg-black/25 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-amber-400/80 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-amber-300/90 disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function EraFormModal({
  worldId,
  initial,
  onClose,
  onSave,
}: {
  worldId: string;
  initial?: EraModel;
  onClose: () => void;
  onSave: (input: UpsertEraInput) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [startYear, setStartYear] = useState(toInputNumber(initial?.startYear));
  const [endYear, setEndYear] = useState(toInputNumber(initial?.endYear));
  const [colorHex, setColorHex] = useState<string | undefined>(normalizeHexColor(initial?.colorHex));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Era name is required.");
      return;
    }
    const parsedStartYear = parseOptionalInteger(startYear);
    const parsedEndYear = parseOptionalInteger(endYear);
    if (parsedStartYear === null || parsedEndYear === null) {
      setError("Year values must be integers.");
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      await onSave({
        id: initial?.id,
        worldId,
        name,
        description,
        startYear: parsedStartYear,
        endYear: parsedEndYear,
        colorHex,
      });
    } catch (nextError) {
      setError(readErrorMessage(nextError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalShell title={initial ? "Edit Era" : "Create Era"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-zinc-100">Name *</span>
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputStyle}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-zinc-100">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            className={`${inputStyle} min-h-[72px]`}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-100">Start year</span>
            <input
              value={startYear}
              onChange={(event) => setStartYear(event.target.value)}
              className={inputStyle}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-100">End year</span>
            <input
              value={endYear}
              onChange={(event) => setEndYear(event.target.value)}
              className={inputStyle}
            />
          </label>
        </div>
        <ColorPickerField label="Color" value={colorHex} onChange={setColorHex} />
        {error && <p className="text-sm text-red-300">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/15 bg-black/25 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-amber-400/80 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-amber-300/90 disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function SettingFormModal({
  worldId,
  eras,
  initial,
  onClose,
  onSave,
}: {
  worldId: string;
  eras: EraModel[];
  initial?: SettingModel;
  onClose: () => void;
  onSave: (input: UpsertSettingInput) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [startYear, setStartYear] = useState(toInputNumber(initial?.startYear));
  const [endYear, setEndYear] = useState(toInputNumber(initial?.endYear));
  const [eraId, setEraId] = useState(initial?.eraId ?? "");
  const [colorHex, setColorHex] = useState<string | undefined>(normalizeHexColor(initial?.colorHex));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Setting name is required.");
      return;
    }
    const parsedStartYear = parseOptionalInteger(startYear);
    const parsedEndYear = parseOptionalInteger(endYear);
    if (parsedStartYear === null || parsedEndYear === null) {
      setError("Year values must be integers.");
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      await onSave({
        id: initial?.id,
        worldId,
        eraId: eraId || undefined,
        name,
        description,
        startYear: parsedStartYear,
        endYear: parsedEndYear,
        colorHex,
      });
    } catch (nextError) {
      setError(readErrorMessage(nextError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalShell title={initial ? "Edit Setting" : "Create Setting"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-zinc-100">Name *</span>
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputStyle}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-zinc-100">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            className={`${inputStyle} min-h-[72px]`}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-100">Start year</span>
            <input
              value={startYear}
              onChange={(event) => setStartYear(event.target.value)}
              className={inputStyle}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-100">End year</span>
            <input
              value={endYear}
              onChange={(event) => setEndYear(event.target.value)}
              className={inputStyle}
            />
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-zinc-100">Era</span>
          <select
            value={eraId}
            onChange={(event) => setEraId(event.target.value)}
            className={inputStyle}
          >
            <option value="">Unassigned</option>
            {eras.map((era) => (
              <option key={era.id} value={era.id}>
                {era.name}
              </option>
            ))}
          </select>
        </label>
        <ColorPickerField label="Color" value={colorHex} onChange={setColorHex} />
        {error && <p className="text-sm text-red-300">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/15 bg-black/25 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-amber-400/80 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-amber-300/90 disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
