import * as React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
}

// tiny helper to join class names
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  fullWidth,
  loading,
  className,
  children,
  disabled,
  ...props
}) => {
  const base =
    "inline-flex items-center justify-center font-medium rounded-2xl transition-all " +
    "backdrop-blur border focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
    "focus-visible:ring-amber-300 disabled:opacity-60 disabled:cursor-not-allowed " +
    "active:scale-95 touch-manipulation select-none";

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      "bg-amber-400/80 text-slate-900 border-amber-200/60 shadow-lg shadow-amber-500/40 hover:bg-amber-300/90",
    secondary:
      "bg-slate-800/60 text-slate-100 border-slate-500/60 hover:bg-slate-700/70",
    ghost:
      "bg-transparent text-amber-200 border-transparent hover:bg-amber-200/10",
    danger:
      "bg-red-500/80 text-white border-red-300/70 hover:bg-red-400/90 shadow-md shadow-red-500/40",
  };

  const sizeClasses: Record<ButtonSize, string> = {
    sm: "text-sm px-4 py-2.5 min-h-[44px]",
    md: "text-base px-5 py-3 min-h-[48px]",
    lg: "text-lg px-7 py-4 min-h-[52px]",
  };

  return (
    <button
      className={cn(
        base,
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "..." : children}
    </button>
  );
};
