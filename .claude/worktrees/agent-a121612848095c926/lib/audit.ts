import { prisma } from "@/lib/prisma";

/**
 * Log an audit trail entry. Fire-and-forget safe — errors are caught internally.
 */
export function logAudit(
  entityType: string,
  entityId: string,
  action: "create" | "update" | "delete",
  changes?: Record<string, unknown>,
  performedBy?: string
): void {
  prisma.auditLog
    .create({
      data: {
        entityType,
        entityId,
        action,
        changes: JSON.stringify(changes ?? {}),
        performedBy: performedBy ?? null,
      },
    })
    .catch((err) => {
      console.error("Audit log write failed:", err);
    });
}

/**
 * Compare two objects for a given set of fields and return a diff.
 * Only changed fields are included.
 *
 * Returns: { fieldName: { old: value, new: value } }
 */
export function diffChanges(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  fields: string[]
): Record<string, { old: unknown; new: unknown }> {
  const diff: Record<string, { old: unknown; new: unknown }> = {};

  for (const field of fields) {
    const oldVal = oldObj[field];
    const newVal = newObj[field];

    // Normalize dates to ISO strings for comparison
    const normalizeVal = (v: unknown): unknown => {
      if (v instanceof Date) return v.toISOString();
      return v;
    };

    const a = normalizeVal(oldVal);
    const b = normalizeVal(newVal);

    if (JSON.stringify(a) !== JSON.stringify(b)) {
      diff[field] = { old: a, new: b };
    }
  }

  return diff;
}
