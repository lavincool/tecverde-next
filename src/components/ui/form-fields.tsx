import { useId } from "react";

import type { ReactNode } from "react";

/** Labeled native select with an optional hint and error, styled like the report form. */
export function SelectField({
  label,
  name,
  options,
  placeholder,
  invalid,
  error,
  defaultValue = "",
  required = true,
}: {
  label: string;
  name: string;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
  invalid?: boolean | undefined;
  error?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <label className="report-field" htmlFor={id}>
        {label}
      </label>
      <select
        aria-describedby={invalid ? `${id}-error` : undefined}
        aria-invalid={invalid ? true : undefined}
        className="report-input"
        defaultValue={defaultValue}
        id={id}
        name={name}
        required={required}
      >
        {placeholder !== undefined && (
          <option disabled={required} value="">
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {invalid && error && (
        <p className="report-error text-sm" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

/** Labeled text input or textarea with hint and error wiring. */
export function TextField({
  label,
  name,
  hint,
  invalid,
  error,
  multiline = false,
  required = false,
  maxLength,
  minLength,
  type = "text",
  autoComplete,
  inputMode,
}: {
  label: string;
  name: string;
  hint?: ReactNode;
  invalid?: boolean | undefined;
  error?: string;
  multiline?: boolean;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  type?: "text" | "email" | "tel";
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "numeric";
}) {
  const id = useId();
  const describedBy =
    [hint ? `${id}-hint` : undefined, invalid && error ? `${id}-error` : undefined]
      .filter(Boolean)
      .join(" ") || undefined;
  const shared = {
    "aria-describedby": describedBy,
    "aria-invalid": invalid ? true : undefined,
    className: "report-input",
    id,
    name,
    required,
    ...(maxLength === undefined ? {} : { maxLength }),
    ...(minLength === undefined ? {} : { minLength }),
  } as const;
  return (
    <div className="grid gap-1.5">
      <label className="report-field" htmlFor={id}>
        {label}
      </label>
      {multiline ? (
        <textarea rows={4} {...shared} />
      ) : (
        <input
          type={type}
          {...shared}
          {...(autoComplete ? { autoComplete } : {})}
          {...(inputMode ? { inputMode } : {})}
        />
      )}
      {hint && (
        <p className="text-sm text-muted" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {invalid && error && (
        <p className="report-error text-sm" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
