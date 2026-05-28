/**
 * Shared input-validation helpers for API route handlers.
 *
 * These throw a ValidationError when a check fails. Callers should catch it
 * and return a 400 response with `error.message`.
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// ── Required-field helpers ──────────────────────────────────────────────────

/** Require a non-empty string. Returns the trimmed value. */
export function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${fieldName} is required and must be a non-empty string`);
  }
  return value.trim();
}

/** Require a finite positive number. Accepts number or numeric string. */
export function requireNumber(
  value: unknown,
  fieldName: string,
  opts: { min?: number; max?: number; allowZero?: boolean } = {}
): number {
  const num = typeof value === "string" ? Number(value) : value;
  if (typeof num !== "number" || !Number.isFinite(num)) {
    throw new ValidationError(`${fieldName} must be a valid number`);
  }
  const { min, max, allowZero = false } = opts;
  if (!allowZero && num <= 0) {
    throw new ValidationError(`${fieldName} must be a positive number`);
  }
  if (allowZero && num < 0) {
    throw new ValidationError(`${fieldName} must be zero or a positive number`);
  }
  if (min !== undefined && num < min) {
    throw new ValidationError(`${fieldName} must be at least ${min}`);
  }
  if (max !== undefined && num > max) {
    throw new ValidationError(`${fieldName} must be at most ${max}`);
  }
  return num;
}

/** Require a valid ISO date string. Returns a Date object. */
export function requireDate(value: unknown, fieldName: string): Date {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${fieldName} is required and must be a date string`);
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    throw new ValidationError(`${fieldName} is not a valid date`);
  }
  return d;
}

/** Require a boolean value. */
export function requireBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== "boolean") {
    throw new ValidationError(`${fieldName} must be a boolean`);
  }
  return value;
}

// ── Optional-field helpers ──────────────────────────────────────────────────

/** Return trimmed string or undefined if absent/null. Throws if present but not a string. */
export function optionalString(value: unknown, fieldName?: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new ValidationError(
      `${fieldName ?? "Field"} must be a string if provided`
    );
  }
  return value.trim();
}

/** Return parsed number or undefined if absent/null. Throws if present but not numeric. */
export function optionalNumber(
  value: unknown,
  fieldName?: string,
  opts: { min?: number; max?: number; allowZero?: boolean } = {}
): number | undefined {
  if (value === undefined || value === null) return undefined;
  const num = typeof value === "string" ? Number(value) : value;
  if (typeof num !== "number" || !Number.isFinite(num)) {
    throw new ValidationError(`${fieldName ?? "Field"} must be a valid number if provided`);
  }
  const { min, max } = opts;
  if (min !== undefined && num < min) {
    throw new ValidationError(`${fieldName ?? "Field"} must be at least ${min}`);
  }
  if (max !== undefined && num > max) {
    throw new ValidationError(`${fieldName ?? "Field"} must be at most ${max}`);
  }
  return num;
}

/** Return Date or undefined if absent/null. Throws if present but invalid. */
export function optionalDate(value: unknown, fieldName?: string): Date | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName ?? "Field"} must be a date string if provided`);
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    throw new ValidationError(`${fieldName ?? "Field"} is not a valid date`);
  }
  return d;
}

/** Return boolean or undefined if absent/null. Throws if present but not boolean. */
export function optionalBoolean(value: unknown, fieldName?: string): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") {
    throw new ValidationError(`${fieldName ?? "Field"} must be a boolean if provided`);
  }
  return value;
}

// ── Enum / allow-list helper ────────────────────────────────────────────────

/** Require the value to be one of the allowed strings. */
export function validateEnum(
  value: unknown,
  allowed: readonly string[],
  fieldName: string
): string {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowed.join(", ")}`
    );
  }
  return value;
}

/** Optional enum: undefined/null passes, otherwise must be in allowed list. */
export function optionalEnum(
  value: unknown,
  allowed: readonly string[],
  fieldName: string
): string | undefined {
  if (value === undefined || value === null) return undefined;
  return validateEnum(value, allowed, fieldName);
}

// ── Composite helper ────────────────────────────────────────────────────────

/** Require an array of non-empty strings. */
export function requireStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ValidationError(`${fieldName} must be a non-empty array`);
  }
  for (let i = 0; i < value.length; i++) {
    if (typeof value[i] !== "string" || (value[i] as string).trim().length === 0) {
      throw new ValidationError(`${fieldName}[${i}] must be a non-empty string`);
    }
  }
  return value as string[];
}

// ── Length guard ─────────────────────────────────────────────────────────────

/** Ensure a string does not exceed a maximum length. */
export function maxLength(value: string, max: number, fieldName: string): string {
  if (value.length > max) {
    throw new ValidationError(`${fieldName} must be at most ${max} characters`);
  }
  return value;
}
