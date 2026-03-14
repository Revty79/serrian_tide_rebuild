import * as React from "react";

type GradientVariant = "title" | "card-title";

export interface GradientTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: GradientVariant;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
  glow?: boolean;
}

// tiny helper to join class names
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * GradientText component for consistent text gradients across the app.
 * 
 * Variants:
 * - "title": Purple → Amber → Purple (for main page titles)
 * - "card-title": Amber → Purple → Amber (for card/section headers)
 * 
 * @example
 * <GradientText variant="title" as="h1" glow>
 *   Serrian Tide
 * </GradientText>
 */
export const GradientText: React.FC<GradientTextProps> = ({
  variant = "title",
  as: Component = "span",
  glow = false,
  className,
  children,
  ...props
}) => {
  const variantClasses: Record<GradientVariant, string> = {
    title: "st-title-gradient",
    "card-title": "st-card-title-gradient",
  };

  return (
    <Component
      className={cn(
        variantClasses[variant],
        glow && "st-glow",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
};
