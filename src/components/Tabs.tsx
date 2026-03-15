import * as React from "react";

type TabItem = {
  id: string;
  label: string;
  badgeCount?: number;
};

interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  fullWidth?: boolean;
  className?: string;
}

// tiny helper to join class names
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeId,
  onChange,
  fullWidth,
  className,
}) => {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        className={cn(
          "inline-flex rounded-2xl bg-slate-900/40 border border-slate-700/70 p-1 backdrop-blur",
          fullWidth && "w-full"
        )}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative flex items-center justify-center gap-2 px-4 py-1.5 text-xs md:text-sm rounded-2xl transition-all",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300",
                isActive
                  ? "bg-amber-400/80 text-slate-900 shadow-md shadow-amber-500/40"
                  : "text-slate-200 hover:bg-slate-800/70"
              )}
            >
              <span>{tab.label}</span>
              {typeof tab.badgeCount === "number" && tab.badgeCount > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-slate-900/80 px-1.5 text-[0.65rem]">
                  {tab.badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
