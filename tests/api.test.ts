import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted so the mock object is available when vi.mock is hoisted
const mockPrisma = vi.hoisted(() => ({
  project: { findMany: vi.fn() },
  phase: { findMany: vi.fn() },
  task: { findMany: vi.fn() },
  note: { findMany: vi.fn() },
  transaction: { findMany: vi.fn() },
  category: { findMany: vi.fn() },
  budget: { findMany: vi.fn() },
  taxConfig: { findFirst: vi.fn() },
  taxPayment: { findMany: vi.fn() },
  recurringExpense: { findMany: vi.fn() },
  distribution: { findMany: vi.fn() },
  notification: { findMany: vi.fn() },
  reminder: { findMany: vi.fn() },
  projectTemplate: { findMany: vi.fn() },
  auditLog: { findMany: vi.fn() },
  calendarEvent: { findMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { GET } from "@/app/api/export-all/route";

describe("GET /api/export-all", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: every model returns an empty array (or null for findFirst)
    mockPrisma.project.findMany.mockResolvedValue([]);
    mockPrisma.phase.findMany.mockResolvedValue([]);
    mockPrisma.task.findMany.mockResolvedValue([]);
    mockPrisma.note.findMany.mockResolvedValue([]);
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    mockPrisma.category.findMany.mockResolvedValue([]);
    mockPrisma.budget.findMany.mockResolvedValue([]);
    mockPrisma.taxConfig.findFirst.mockResolvedValue(null);
    mockPrisma.taxPayment.findMany.mockResolvedValue([]);
    mockPrisma.recurringExpense.findMany.mockResolvedValue([]);
    mockPrisma.distribution.findMany.mockResolvedValue([]);
    mockPrisma.notification.findMany.mockResolvedValue([]);
    mockPrisma.reminder.findMany.mockResolvedValue([]);
    mockPrisma.projectTemplate.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.calendarEvent.findMany.mockResolvedValue([]);
  });

  it("returns a JSON response with Content-Type header", async () => {
    const response = await GET();
    expect(response.headers.get("Content-Type")).toBe("application/json");
  });

  it("includes Content-Disposition attachment header", async () => {
    const response = await GET();
    const disposition = response.headers.get("Content-Disposition");
    expect(disposition).toContain("attachment");
    expect(disposition).toContain("the-forge-backup-");
    expect(disposition).toContain(".json");
  });

  it("returns export structure with version and summary", async () => {
    const response = await GET();
    const body = await response.json();

    expect(body).toHaveProperty("exportedAt");
    expect(body).toHaveProperty("version", "2.1");
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("summary");
  });

  it("returns correct summary counts for empty database", async () => {
    const response = await GET();
    const body = await response.json();

    expect(body.summary).toEqual({
      projects: 0,
      phases: 0,
      tasks: 0,
      notes: 0,
      transactions: 0,
      categories: 0,
      budgets: 0,
      taxPayments: 0,
      recurringExpenses: 0,
      distributions: 0,
      notifications: 0,
      reminders: 0,
      projectTemplates: 0,
      auditLogs: 0,
      calendarEvents: 0,
    });
  });

  it("includes data from all models", async () => {
    const fakeProject = { id: "1", name: "Test", createdAt: new Date() };
    mockPrisma.project.findMany.mockResolvedValue([fakeProject]);

    const response = await GET();
    const body = await response.json();

    expect(body.summary.projects).toBe(1);
    expect(body.data.projects).toHaveLength(1);
  });

  it("returns 500 when prisma throws", async () => {
    mockPrisma.project.findMany.mockRejectedValue(new Error("DB error"));

    const response = await GET();
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body).toHaveProperty("error", "Failed to export data");
  });
});
