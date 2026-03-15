import { ReactNode } from "react";
import { COLOR_PRESETS, normalizeHexColor } from "@/components/galaxy/galaxy-utils";

export function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="shadow-soft w-full max-w-xl rounded-2xl border border-white/15 bg-slate-950/95 backdrop-blur">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-zinc-300 hover:bg-white/10"
          >
            Close
          </button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ColorPickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (value?: string) => void;
}) {
  const selected = normalizeHexColor(value);
  const customColor = selected ?? "#4E8DB4";

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-zinc-100">{label}</div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className={`rounded-md border px-2 py-1 text-xs ${
            !selected
              ? "border-amber-300/60 bg-amber-400/20 text-amber-100"
              : "border-white/15 bg-black/25 text-zinc-300"
          }`}
        >
          None
        </button>
        {COLOR_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className={`h-7 w-7 rounded-full border-2 ${
              selected === preset ? "border-amber-300" : "border-transparent"
            }`}
            style={{ backgroundColor: preset }}
            title={preset}
          />
        ))}
        <label className="ml-1 inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/15 bg-black/25 px-2 py-1 text-xs text-zinc-200">
          Custom
          <input
            type="color"
            value={customColor}
            onChange={(event) => onChange(normalizeHexColor(event.target.value))}
            className="h-5 w-7 cursor-pointer border-none bg-transparent p-0"
          />
        </label>
      </div>
      <div className="text-xs text-zinc-400">{selected ?? "No explicit color selected"}</div>
    </div>
  );
}
