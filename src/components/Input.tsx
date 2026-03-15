import * as React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

// tiny helper to join class names
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const Input: React.FC<InputProps> = ({
  hasError,
  className,
  ...props
}) => {
  const base =
    "w-full rounded-2xl border bg-slate-900/40 text-slate-100 " +
    "px-4 py-3 min-h-[48px] text-base shadow-inner backdrop-blur " +
    "placeholder:text-slate-500 " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 " +
    "touch-manipulation";

  const normalBorder = "border-slate-700/70";
  const errorBorder =
    "border-red-500/70 focus-visible:ring-red-400 focus-visible:ring-2";

  return (
    <input
      className={cn(base, hasError ? errorBorder : normalBorder, className)}
      {...props}
    />
  );
};
