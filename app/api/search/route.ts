import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // Search across all major entities in parallel
    const [projects, tasks, transactions, notes] = await Promise.all([
      prisma.project.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { description: { contains: q } },
          ],
          archived: false,
        },
        select: { id: true, name: true, description: true, color: true },
        take: 5,
      }),
      prisma.task.findMany({
        where: {
          OR: [
            { title: { contains: q } },
            { description: { contains: q } },
          ],
        },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          projectId: true,
          project: { select: { name: true, color: true } },
        },
        take: 5,
      }),
      prisma.transaction.findMany({
        where: {
          OR: [
            { description: { contains: q } },
            { category: { contains: q } },
            { notes: { contains: q } },
          ],
        },
        select: {
          id: true,
          type: true,
          amount: true,
          description: true,
          category: true,
          date: true,
        },
        orderBy: { date: "desc" },
        take: 5,
      }),
      prisma.note.findMany({
        where: {
          OR: [
            { title: { contains: q } },
            { content: { contains: q } },
          ],
        },
        select: {
          id: true,
          title: true,
          category: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

    type ResultItem = {
      type: "project" | "task" | "transaction" | "note";
      id: string;
      title: string;
      subtitle: string;
      href: string;
      color?: string;
    };

    const results: ResultItem[] = [];

    for (const p of projects) {
      results.push({
        type: "project",
        id: p.id,
        title: p.name,
        subtitle: p.description || "Project",
        href: `/projects/${p.id}`,
        color: p.color,
      });
    }

    for (const t of tasks) {
      results.push({
        type: "task",
        id: t.id,
        title: t.title,
        subtitle: `${t.project.name} · ${t.status.replace(/_/g, " ")}`,
        href: `/projects/${t.projectId}`,
        color: t.project.color,
      });
    }

    for (const tx of transactions) {
      const amt = tx.amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      results.push({
        type: "transaction",
        id: tx.id,
        title: tx.description,
        subtitle: `${tx.type === "income" ? "+" : "-"}$${amt} · ${tx.category}`,
        href: "/finance",
        color: tx.type === "income" ? "#22C55E" : "#EF4444",
      });
    }

    for (const n of notes) {
      results.push({
        type: "note",
        id: n.id,
        title: n.title || "Untitled Note",
        subtitle: n.category,
        href: "/notes",
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("GET /api/search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
