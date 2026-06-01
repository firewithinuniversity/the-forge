import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ValidationError, validateEnum } from "@/lib/validate";

/* ── Supported versions ────────────────────────────────────────────────────── */
const SUPPORTED_VERSIONS = ["1.0", "2.0", "2.1"] as const;

/* ── Types for the import payload ──────────────────────────────────────────── */
interface ImportPayload {
  version: string;
  data: {
    projects?: unknown[];
    phases?: unknown[];
    tasks?: unknown[];
    subtasks?: unknown[];
    comments?: unknown[];
    notes?: unknown[];
    transactions?: unknown[];
    categories?: unknown[];
    budgets?: unknown[];
    taxConfig?: unknown | null;
    taxPayments?: unknown[];
    recurringExpenses?: unknown[];
    recurringIncome?: unknown[];
    distributions?: unknown[];
    notifications?: unknown[];
    reminders?: unknown[];
    projectTemplates?: unknown[];
    auditLogs?: unknown[];
    calendarEvents?: unknown[];
  };
}

/* ── Helpers: coerce date strings → Date objects ───────────────────────────── */
function toDate(v: unknown): Date | undefined {
  if (v === null || v === undefined) return undefined;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? undefined : d;
}

function requireDateField(v: unknown): Date {
  const d = new Date(v as string);
  if (isNaN(d.getTime())) throw new Error("Invalid date");
  return d;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/* ── POST /api/import ──────────────────────────────────────────────────────── */
export async function POST(request: NextRequest) {
  try {
    /* ── Parse mode query param ───────────────────────────────────────────── */
    const url = new URL(request.url);
    const modeRaw = url.searchParams.get("mode") || "replace";
    const mode = validateEnum(modeRaw, ["replace", "merge"] as const, "mode");

    /* ── Parse body ───────────────────────────────────────────────────────── */
    let body: ImportPayload;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON" },
        { status: 400 },
      );
    }

    /* ── Validate structure ───────────────────────────────────────────────── */
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body must be a JSON object" },
        { status: 400 },
      );
    }

    if (!body.version) {
      return NextResponse.json(
        { error: 'Missing required field: "version"' },
        { status: 400 },
      );
    }

    if (!SUPPORTED_VERSIONS.includes(body.version as any)) {
      return NextResponse.json(
        {
          error: `Unsupported backup version "${body.version}". Supported: ${SUPPORTED_VERSIONS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    if (!body.data || typeof body.data !== "object") {
      return NextResponse.json(
        { error: 'Missing required field: "data" (must be an object)' },
        { status: 400 },
      );
    }

    const { data } = body;

    /* ── Build the summary counters ───────────────────────────────────────── */
    const imported: Record<string, number> = {
      projects: 0,
      phases: 0,
      tasks: 0,
      subtasks: 0,
      comments: 0,
      notes: 0,
      transactions: 0,
      categories: 0,
      budgets: 0,
      taxConfig: 0,
      taxPayments: 0,
      recurringExpenses: 0,
      recurringIncome: 0,
      distributions: 0,
      notifications: 0,
      reminders: 0,
      projectTemplates: 0,
      auditLogs: 0,
      calendarEvents: 0,
    };

    /* ── REPLACE mode ─────────────────────────────────────────────────────── */
    if (mode === "replace") {
      await prisma.$transaction(async (tx) => {
        // Delete in reverse-dependency order (children first)
        await tx.calendarEvent.deleteMany();
        await tx.auditLog.deleteMany();
        await tx.projectTemplate.deleteMany();
        await tx.reminder.deleteMany();
        await tx.notification.deleteMany();
        await tx.comment.deleteMany();
        await tx.subtask.deleteMany();
        await tx.note.deleteMany();
        await tx.task.deleteMany();
        await tx.phase.deleteMany();
        await tx.budget.deleteMany();
        await tx.distribution.deleteMany();
        await tx.recurringExpense.deleteMany();
        await tx.recurringIncome.deleteMany();
        await tx.taxPayment.deleteMany();
        await tx.taxConfig.deleteMany();
        await tx.transaction.deleteMany();
        await tx.category.deleteMany();
        await tx.project.deleteMany();

        // Insert in dependency order (parents first)

        // Projects
        if (Array.isArray(data.projects)) {
          for (const p of data.projects as any[]) {
            await tx.project.create({
              data: {
                id: p.id,
                name: p.name,
                description: p.description ?? null,
                color: p.color ?? "#E8A020",
                archived: p.archived ?? false,
                createdAt: requireDateField(p.createdAt),
                updatedAt: requireDateField(p.updatedAt),
              },
            });
            imported.projects++;
          }
        }

        // Categories
        if (Array.isArray(data.categories)) {
          for (const c of data.categories as any[]) {
            await tx.category.create({
              data: {
                id: c.id,
                name: c.name,
                type: c.type,
                color: c.color ?? "#9090A0",
                icon: c.icon ?? null,
              },
            });
            imported.categories++;
          }
        }

        // Phases (depends on Project)
        if (Array.isArray(data.phases)) {
          for (const p of data.phases as any[]) {
            await tx.phase.create({
              data: {
                id: p.id,
                name: p.name,
                order: p.order ?? 0,
                status: p.status ?? "active",
                startDate: toDate(p.startDate),
                endDate: toDate(p.endDate),
                projectId: p.projectId,
                createdAt: requireDateField(p.createdAt),
                updatedAt: requireDateField(p.updatedAt),
              },
            });
            imported.phases++;
          }
        }

        // Transactions (depends on Project)
        if (Array.isArray(data.transactions)) {
          for (const t of data.transactions as any[]) {
            await tx.transaction.create({
              data: {
                id: t.id,
                type: t.type,
                amount: t.amount,
                description: t.description,
                category: t.category,
                date: requireDateField(t.date),
                projectId: t.projectId ?? null,
                recurring: t.recurring ?? false,
                notes: t.notes ?? null,
                receiptSaved: t.receiptSaved ?? false,
                receiptData: t.receiptData ?? null,
                receiptName: t.receiptName ?? null,
                receiptType: t.receiptType ?? null,
                taxDeductible: t.taxDeductible ?? "unknown",
                createdAt: requireDateField(t.createdAt),
                updatedAt: requireDateField(t.updatedAt),
              },
            });
            imported.transactions++;
          }
        }

        // Tasks (depends on Project, Phase)
        if (Array.isArray(data.tasks)) {
          for (const t of data.tasks as any[]) {
            await tx.task.create({
              data: {
                id: t.id,
                title: t.title,
                description: t.description ?? null,
                status: t.status ?? "todo",
                priority: t.priority ?? "medium",
                order: t.order ?? 0,
                startDate: toDate(t.startDate),
                endDate: toDate(t.endDate),
                dueDate: toDate(t.dueDate),
                projectId: t.projectId,
                phaseId: t.phaseId ?? null,
                assignee: t.assignee ?? null,
                createdAt: requireDateField(t.createdAt),
                updatedAt: requireDateField(t.updatedAt),
              },
            });
            imported.tasks++;
          }
        }

        // Notes (depends on Project, Transaction)
        if (Array.isArray(data.notes)) {
          for (const n of data.notes as any[]) {
            await tx.note.create({
              data: {
                id: n.id,
                title: n.title ?? "",
                content: n.content,
                projectId: n.projectId ?? null,
                transactionId: n.transactionId ?? null,
                pinned: n.pinned ?? false,
                category: n.category ?? "General",
                createdAt: requireDateField(n.createdAt),
                updatedAt: requireDateField(n.updatedAt),
              },
            });
            imported.notes++;
          }
        }

        // Budgets
        if (Array.isArray(data.budgets)) {
          for (const b of data.budgets as any[]) {
            await tx.budget.create({
              data: {
                id: b.id,
                categoryId: b.categoryId,
                amount: b.amount,
                month: b.month,
                year: b.year,
                createdAt: requireDateField(b.createdAt),
              },
            });
            imported.budgets++;
          }
        }

        // TaxConfig (single record)
        if (data.taxConfig && typeof data.taxConfig === "object") {
          const tc = data.taxConfig as any;
          await tx.taxConfig.create({
            data: {
              id: tc.id,
              federalTaxRate: tc.federalTaxRate ?? 0.12,
              selfEmploymentRate: tc.selfEmploymentRate ?? 0.153,
              seDeduction: tc.seDeduction ?? 0.5,
              stateTaxRate: tc.stateTaxRate ?? 0.0465,
              stateName: tc.stateName ?? "Wisconsin",
              ownershipSplit: tc.ownershipSplit ?? 0.5,
              qbiDeductionRate: tc.qbiDeductionRate ?? 0.2,
              taxReserveRate: tc.taxReserveRate ?? 0.3,
              partner1Name: tc.partner1Name ?? "Brett Breunig",
              partner2Name: tc.partner2Name ?? "Jude Begay",
              burnRateThreshold: tc.burnRateThreshold ?? 5000,
              createdAt: requireDateField(tc.createdAt),
              updatedAt: requireDateField(tc.updatedAt),
            },
          });
          imported.taxConfig = 1;
        }

        // Tax Payments
        if (Array.isArray(data.taxPayments)) {
          for (const tp of data.taxPayments as any[]) {
            await tx.taxPayment.create({
              data: {
                id: tp.id,
                year: tp.year,
                quarter: tp.quarter,
                type: tp.type,
                amount: tp.amount,
                dueDate: requireDateField(tp.dueDate),
                paidDate: toDate(tp.paidDate),
                paid: tp.paid ?? false,
                notes: tp.notes ?? null,
                createdAt: requireDateField(tp.createdAt),
                updatedAt: requireDateField(tp.updatedAt),
              },
            });
            imported.taxPayments++;
          }
        }

        // Recurring Expenses
        if (Array.isArray(data.recurringExpenses)) {
          for (const re of data.recurringExpenses as any[]) {
            await tx.recurringExpense.create({
              data: {
                id: re.id,
                service: re.service,
                category: re.category,
                monthlyCost: re.monthlyCost,
                annualCost: re.annualCost ?? null,
                billingCycle: re.billingCycle ?? "monthly",
                nextDueDate: toDate(re.nextDueDate),
                active: re.active ?? true,
                notes: re.notes ?? null,
                createdAt: requireDateField(re.createdAt),
                updatedAt: requireDateField(re.updatedAt),
              },
            });
            imported.recurringExpenses++;
          }
        }

        // Distributions
        if (Array.isArray(data.distributions)) {
          for (const d of data.distributions as any[]) {
            await tx.distribution.create({
              data: {
                id: d.id,
                date: requireDateField(d.date),
                type: d.type ?? "quarterly",
                llcNetProfit: d.llcNetProfit,
                partner1Share: d.partner1Share,
                partner2Share: d.partner2Share,
                method: d.method ?? null,
                approvedBy: d.approvedBy ?? null,
                notes: d.notes ?? null,
                createdAt: requireDateField(d.createdAt),
                updatedAt: requireDateField(d.updatedAt),
              },
            });
            imported.distributions++;
          }
        }

        // Notifications
        if (Array.isArray(data.notifications)) {
          for (const n of data.notifications as any[]) {
            await tx.notification.create({
              data: {
                id: n.id,
                type: n.type,
                title: n.title,
                message: n.message,
                read: n.read ?? false,
                dismissed: n.dismissed ?? false,
                link: n.link ?? null,
                createdAt: requireDateField(n.createdAt),
              },
            });
            imported.notifications++;
          }
        }

        // Project Templates
        if (Array.isArray(data.projectTemplates)) {
          for (const pt of data.projectTemplates as any[]) {
            await tx.projectTemplate.create({
              data: {
                id: pt.id,
                name: pt.name,
                description: pt.description ?? null,
                color: pt.color ?? "#E8501A",
                phases: pt.phases ?? "[]",
                tasks: pt.tasks ?? "[]",
                createdAt: requireDateField(pt.createdAt),
                updatedAt: requireDateField(pt.updatedAt),
              },
            });
            imported.projectTemplates++;
          }
        }

        // Audit Logs
        if (Array.isArray(data.auditLogs)) {
          for (const al of data.auditLogs as any[]) {
            await tx.auditLog.create({
              data: {
                id: al.id,
                entityType: al.entityType,
                entityId: al.entityId,
                action: al.action,
                changes: al.changes ?? "{}",
                performedBy: al.performedBy ?? null,
                createdAt: requireDateField(al.createdAt),
              },
            });
            imported.auditLogs++;
          }
        }

        // Calendar Events
        if (Array.isArray(data.calendarEvents)) {
          for (const ce of data.calendarEvents as any[]) {
            await tx.calendarEvent.create({
              data: {
                id: ce.id,
                title: ce.title,
                description: ce.description ?? null,
                type: ce.type ?? "other",
                date: requireDateField(ce.date),
                endDate: toDate(ce.endDate),
                allDay: ce.allDay ?? false,
                color: ce.color ?? "#E8501A",
                recurrence: ce.recurrence ?? null,
                projectId: ce.projectId ?? null,
                createdAt: requireDateField(ce.createdAt),
                updatedAt: requireDateField(ce.updatedAt),
              },
            });
            imported.calendarEvents++;
          }
        }

        // Recurring Income
        if (Array.isArray(data.recurringIncome)) {
          for (const ri of data.recurringIncome as any[]) {
            await tx.recurringIncome.create({
              data: {
                id: ri.id,
                source: ri.source,
                category: ri.category,
                amount: ri.amount,
                frequency: ri.frequency ?? "monthly",
                nextDueDate: toDate(ri.nextDueDate),
                active: ri.active ?? true,
                notes: ri.notes ?? null,
                createdAt: requireDateField(ri.createdAt),
                updatedAt: requireDateField(ri.updatedAt),
              },
            });
            imported.recurringIncome++;
          }
        }

        // Subtasks (depends on Task)
        if (Array.isArray(data.subtasks)) {
          for (const s of data.subtasks as any[]) {
            await tx.subtask.create({
              data: {
                id: s.id,
                title: s.title,
                completed: s.completed ?? false,
                order: s.order ?? 0,
                taskId: s.taskId,
                createdAt: requireDateField(s.createdAt),
              },
            });
            imported.subtasks++;
          }
        }

        // Comments (depends on Task)
        if (Array.isArray(data.comments)) {
          for (const c of data.comments as any[]) {
            await tx.comment.create({
              data: {
                id: c.id,
                content: c.content,
                author: c.author ?? "Brett",
                taskId: c.taskId,
                createdAt: requireDateField(c.createdAt),
              },
            });
            imported.comments++;
          }
        }

        // Reminders
        if (Array.isArray(data.reminders)) {
          for (const r of data.reminders as any[]) {
            await tx.reminder.create({
              data: {
                id: r.id,
                title: r.title,
                message: r.message ?? "",
                remindAt: requireDateField(r.remindAt),
                entityType: r.entityType ?? null,
                entityId: r.entityId ?? null,
                link: r.link ?? null,
                fired: r.fired ?? false,
                createdAt: requireDateField(r.createdAt),
              },
            });
            imported.reminders++;
          }
        }
      });
    }

    /* ── MERGE mode ───────────────────────────────────────────────────────── */
    if (mode === "merge") {
      // Projects
      if (Array.isArray(data.projects)) {
        for (const p of data.projects as any[]) {
          await prisma.project.upsert({
            where: { id: p.id },
            create: { id: p.id, name: p.name, description: p.description ?? null, color: p.color ?? "#E8A020", archived: p.archived ?? false, createdAt: requireDateField(p.createdAt), updatedAt: requireDateField(p.updatedAt) },
            update: {},
          });
          imported.projects++;
        }
      }

      // Categories
      if (Array.isArray(data.categories)) {
        for (const c of data.categories as any[]) {
          await prisma.category.upsert({
            where: { id: c.id },
            create: { id: c.id, name: c.name, type: c.type, color: c.color ?? "#9090A0", icon: c.icon ?? null },
            update: {},
          });
          imported.categories++;
        }
      }

      // Phases
      if (Array.isArray(data.phases)) {
        for (const p of data.phases as any[]) {
          await prisma.phase.upsert({
            where: { id: p.id },
            create: { id: p.id, name: p.name, order: p.order ?? 0, status: p.status ?? "active", startDate: toDate(p.startDate), endDate: toDate(p.endDate), projectId: p.projectId, createdAt: requireDateField(p.createdAt), updatedAt: requireDateField(p.updatedAt) },
            update: {},
          });
          imported.phases++;
        }
      }

      // Transactions
      if (Array.isArray(data.transactions)) {
        for (const t of data.transactions as any[]) {
          await prisma.transaction.upsert({
            where: { id: t.id },
            create: { id: t.id, type: t.type, amount: t.amount, description: t.description, category: t.category, date: requireDateField(t.date), projectId: t.projectId ?? null, recurring: t.recurring ?? false, notes: t.notes ?? null, receiptSaved: t.receiptSaved ?? false, taxDeductible: t.taxDeductible ?? "unknown", createdAt: requireDateField(t.createdAt), updatedAt: requireDateField(t.updatedAt) },
            update: {},
          });
          imported.transactions++;
        }
      }

      // Tasks
      if (Array.isArray(data.tasks)) {
        for (const t of data.tasks as any[]) {
          await prisma.task.upsert({
            where: { id: t.id },
            create: { id: t.id, title: t.title, description: t.description ?? null, status: t.status ?? "todo", priority: t.priority ?? "medium", order: t.order ?? 0, startDate: toDate(t.startDate), endDate: toDate(t.endDate), dueDate: toDate(t.dueDate), projectId: t.projectId, phaseId: t.phaseId ?? null, assignee: t.assignee ?? null, createdAt: requireDateField(t.createdAt), updatedAt: requireDateField(t.updatedAt) },
            update: {},
          });
          imported.tasks++;
        }
      }

      // Notes
      if (Array.isArray(data.notes)) {
        for (const n of data.notes as any[]) {
          await prisma.note.upsert({
            where: { id: n.id },
            create: { id: n.id, title: n.title ?? "", content: n.content, projectId: n.projectId ?? null, transactionId: n.transactionId ?? null, pinned: n.pinned ?? false, category: n.category ?? "General", createdAt: requireDateField(n.createdAt), updatedAt: requireDateField(n.updatedAt) },
            update: {},
          });
          imported.notes++;
        }
      }

      // Budgets
      if (Array.isArray(data.budgets)) {
        for (const b of data.budgets as any[]) {
          await prisma.budget.upsert({
            where: { id: b.id },
            create: { id: b.id, categoryId: b.categoryId, amount: b.amount, month: b.month, year: b.year, createdAt: requireDateField(b.createdAt) },
            update: {},
          });
          imported.budgets++;
        }
      }

      // TaxConfig
      if (data.taxConfig && typeof data.taxConfig === "object") {
        const tc = data.taxConfig as any;
        await prisma.taxConfig.upsert({
          where: { id: tc.id },
          create: { id: tc.id, federalTaxRate: tc.federalTaxRate ?? 0.12, selfEmploymentRate: tc.selfEmploymentRate ?? 0.153, seDeduction: tc.seDeduction ?? 0.5, stateTaxRate: tc.stateTaxRate ?? 0.0465, stateName: tc.stateName ?? "Wisconsin", ownershipSplit: tc.ownershipSplit ?? 0.5, qbiDeductionRate: tc.qbiDeductionRate ?? 0.2, taxReserveRate: tc.taxReserveRate ?? 0.3, partner1Name: tc.partner1Name ?? "Brett Breunig", partner2Name: tc.partner2Name ?? "Jude Begay", burnRateThreshold: tc.burnRateThreshold ?? 5000, createdAt: requireDateField(tc.createdAt), updatedAt: requireDateField(tc.updatedAt) },
          update: {},
        });
        imported.taxConfig = 1;
      }

      // Tax Payments
      if (Array.isArray(data.taxPayments)) {
        for (const tp of data.taxPayments as any[]) {
          await prisma.taxPayment.upsert({
            where: { id: tp.id },
            create: { id: tp.id, year: tp.year, quarter: tp.quarter, type: tp.type, amount: tp.amount, dueDate: requireDateField(tp.dueDate), paidDate: toDate(tp.paidDate), paid: tp.paid ?? false, notes: tp.notes ?? null, createdAt: requireDateField(tp.createdAt), updatedAt: requireDateField(tp.updatedAt) },
            update: {},
          });
          imported.taxPayments++;
        }
      }

      // Recurring Expenses
      if (Array.isArray(data.recurringExpenses)) {
        for (const re of data.recurringExpenses as any[]) {
          await prisma.recurringExpense.upsert({
            where: { id: re.id },
            create: { id: re.id, service: re.service, category: re.category, monthlyCost: re.monthlyCost, annualCost: re.annualCost ?? null, billingCycle: re.billingCycle ?? "monthly", nextDueDate: toDate(re.nextDueDate), active: re.active ?? true, notes: re.notes ?? null, createdAt: requireDateField(re.createdAt), updatedAt: requireDateField(re.updatedAt) },
            update: {},
          });
          imported.recurringExpenses++;
        }
      }

      // Distributions
      if (Array.isArray(data.distributions)) {
        for (const d of data.distributions as any[]) {
          await prisma.distribution.upsert({
            where: { id: d.id },
            create: { id: d.id, date: requireDateField(d.date), type: d.type ?? "quarterly", llcNetProfit: d.llcNetProfit, partner1Share: d.partner1Share, partner2Share: d.partner2Share, method: d.method ?? null, approvedBy: d.approvedBy ?? null, notes: d.notes ?? null, createdAt: requireDateField(d.createdAt), updatedAt: requireDateField(d.updatedAt) },
            update: {},
          });
          imported.distributions++;
        }
      }

      // Notifications
      if (Array.isArray(data.notifications)) {
        for (const n of data.notifications as any[]) {
          await prisma.notification.upsert({
            where: { id: n.id },
            create: { id: n.id, type: n.type, title: n.title, message: n.message, read: n.read ?? false, dismissed: n.dismissed ?? false, link: n.link ?? null, createdAt: requireDateField(n.createdAt) },
            update: {},
          });
          imported.notifications++;
        }
      }

      // Project Templates
      if (Array.isArray(data.projectTemplates)) {
        for (const pt of data.projectTemplates as any[]) {
          await prisma.projectTemplate.upsert({
            where: { id: pt.id },
            create: { id: pt.id, name: pt.name, description: pt.description ?? null, color: pt.color ?? "#E8501A", phases: pt.phases ?? "[]", tasks: pt.tasks ?? "[]", createdAt: requireDateField(pt.createdAt), updatedAt: requireDateField(pt.updatedAt) },
            update: {},
          });
          imported.projectTemplates++;
        }
      }

      // Audit Logs
      if (Array.isArray(data.auditLogs)) {
        for (const al of data.auditLogs as any[]) {
          await prisma.auditLog.upsert({
            where: { id: al.id },
            create: { id: al.id, entityType: al.entityType, entityId: al.entityId, action: al.action, changes: al.changes ?? "{}", performedBy: al.performedBy ?? null, createdAt: requireDateField(al.createdAt) },
            update: {},
          });
          imported.auditLogs++;
        }
      }

      // Calendar Events
      if (Array.isArray(data.calendarEvents)) {
        for (const ce of data.calendarEvents as any[]) {
          await prisma.calendarEvent.upsert({
            where: { id: ce.id },
            create: { id: ce.id, title: ce.title, description: ce.description ?? null, type: ce.type ?? "other", date: requireDateField(ce.date), endDate: toDate(ce.endDate), allDay: ce.allDay ?? false, color: ce.color ?? "#E8501A", recurrence: ce.recurrence ?? null, projectId: ce.projectId ?? null, createdAt: requireDateField(ce.createdAt), updatedAt: requireDateField(ce.updatedAt) },
            update: {},
          });
          imported.calendarEvents++;
        }
      }

      // Recurring Income
      if (Array.isArray(data.recurringIncome)) {
        for (const ri of data.recurringIncome as any[]) {
          await prisma.recurringIncome.upsert({
            where: { id: ri.id },
            create: { id: ri.id, source: ri.source, category: ri.category, amount: ri.amount, frequency: ri.frequency ?? "monthly", nextDueDate: toDate(ri.nextDueDate), active: ri.active ?? true, notes: ri.notes ?? null, createdAt: requireDateField(ri.createdAt), updatedAt: requireDateField(ri.updatedAt) },
            update: {},
          });
          imported.recurringIncome++;
        }
      }

      // Subtasks (depends on Task)
      if (Array.isArray(data.subtasks)) {
        for (const s of data.subtasks as any[]) {
          await prisma.subtask.upsert({
            where: { id: s.id },
            create: { id: s.id, title: s.title, completed: s.completed ?? false, order: s.order ?? 0, taskId: s.taskId, createdAt: requireDateField(s.createdAt) },
            update: {},
          });
          imported.subtasks++;
        }
      }

      // Comments (depends on Task)
      if (Array.isArray(data.comments)) {
        for (const c of data.comments as any[]) {
          await prisma.comment.upsert({
            where: { id: c.id },
            create: { id: c.id, content: c.content, author: c.author ?? "Brett", taskId: c.taskId, createdAt: requireDateField(c.createdAt) },
            update: {},
          });
          imported.comments++;
        }
      }

      // Reminders
      if (Array.isArray(data.reminders)) {
        for (const r of data.reminders as any[]) {
          await prisma.reminder.upsert({
            where: { id: r.id },
            create: { id: r.id, title: r.title, message: r.message ?? "", remindAt: requireDateField(r.remindAt), entityType: r.entityType ?? null, entityId: r.entityId ?? null, link: r.link ?? null, fired: r.fired ?? false, createdAt: requireDateField(r.createdAt) },
            update: {},
          });
          imported.reminders++;
        }
      }
    }

    return NextResponse.json({ success: true, mode, imported });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("POST /api/import error:", error);
    return NextResponse.json(
      { error: "Import failed. Check that your backup file is valid." },
      { status: 500 },
    );
  }
}
