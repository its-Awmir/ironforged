import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const fieldId = id || props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={fieldId} className="text-xs font-medium text-slate-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={fieldId}
          className={cn(
            "rounded-lg border bg-slate-panel px-3 py-2.5 text-sm text-slate-primary",
            "placeholder:text-slate-muted/60 focus:outline-none focus:ring-2",
            error
              ? "border-red-500/60 focus:ring-red-500/40"
              : "border-slate-muted/40 focus:border-verdigris focus:ring-verdigris/30",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className, id, children, ...props }, ref) => {
    const fieldId = id || props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={fieldId} className="text-xs font-medium text-slate-muted">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={fieldId}
          className={cn(
            "appearance-none rounded-lg border bg-slate-panel px-3 py-2.5 text-sm text-slate-primary",
            "focus:outline-none focus:ring-2",
            error
              ? "border-red-500/60 focus:ring-red-500/40"
              : "border-slate-muted/40 focus:border-verdigris focus:ring-verdigris/30",
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";