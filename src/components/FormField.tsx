import * as React from "react";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

// tiny helper to join class names
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  description,
  error,
  required,
  children,
  className,
}) => {
  return (
    <div className={cn("space-y-1", className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1 text-sm font-medium text-slate-100"
      >
        <span>{label}</span>
        {required && (
          <span className="text-xs text-amber-300 align-middle">*</span>
        )}
      </label>

      {description && (
        <p className="text-xs text-slate-400">{description}</p>
      )}

      <div>{children}</div>

      {error && (
        <p className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};
