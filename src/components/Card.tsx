import * as React from "react";

type CardVariant = "default" | "subtle" | "danger";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padded?: boolean; // turn padding on/off
}

// tiny helper to join class names
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const Card: React.FC<CardProps> = ({
  variant = "default",
  padded = true,
  className,
  children,
  ...props
}) => {
  const base =
    "rounded-2xl border backdrop-blur shadow-xl bg-slate-900/40 border-slate-700/70";

  const variantClasses: Record<CardVariant, string> = {
    default: "bg-slate-900/40 border-slate-700/70",
    subtle: "bg-slate-900/20 border-slate-700/40",
    danger: "bg-red-900/30 border-red-500/60",
  };

  const padding = padded ? "p-3 sm:p-4 md:p-6" : "";

  return (
    <div
      className={cn(base, variantClasses[variant], padding, className)}
      {...props}
    >
      {children}
    </div>
  );
};
