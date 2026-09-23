import { forwardRef, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "./utils";

type FieldProps = { label: string; error?: string; hint?: string };

function Field({
  id,
  label,
  error,
  hint,
  children,
}: FieldProps & { id: string; children: React.ReactNode }) {
  const descriptionId = error || hint ? `${id}-description` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id}>{label}</label>
      {children}
      {descriptionId ? (
        <p id={descriptionId} className={cn("text-xs", error ? "text-valere-danger" : "text-valere-muted")}>
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldProps>(
  function Input({ id, label, error, hint, className, ...props }, ref) {
    if (!id) throw new Error("Input requires an id");
    return (
      <Field id={id} label={label} error={error} hint={hint}>
        <input
          ref={ref}
          id={id}
          className={cn("w-full", error && "border-valere-danger", className)}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? `${id}-description` : undefined}
          {...props}
        />
      </Field>
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & FieldProps>(
  function Select({ id, label, error, hint, className, children, ...props }, ref) {
    if (!id) throw new Error("Select requires an id");
    return (
      <Field id={id} label={label} error={error} hint={hint}>
        <select
          ref={ref}
          id={id}
          className={cn("w-full", error && "border-valere-danger", className)}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? `${id}-description` : undefined}
          {...props}
        >
          {children}
        </select>
      </Field>
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps>(
  function Textarea({ id, label, error, hint, className, ...props }, ref) {
    if (!id) throw new Error("Textarea requires an id");
    return (
      <Field id={id} label={label} error={error} hint={hint}>
        <textarea
          ref={ref}
          id={id}
          className={cn("min-h-24 w-full resize-y", error && "border-valere-danger", className)}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? `${id}-description` : undefined}
          {...props}
        />
      </Field>
    );
  },
);
