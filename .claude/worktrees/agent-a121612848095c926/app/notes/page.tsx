import { prisma } from "@/lib/prisma";
import NotesClient from "./NotesClient";

export const revalidate = 300;

async function getNotesData() {
  const [notes, projects, recentTransactions] = await Promise.all([
    prisma.note.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        project: { select: { id: true, name: true, color: true } },
        transaction: { select: { id: true, description: true, amount: true, type: true, date: true } },
      },
    }),
    prisma.project.findMany({
      where: { archived: false },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.transaction.findMany({
      orderBy: { date: "desc" },
      take: 50,
      select: { id: true, description: true, amount: true, type: true, date: true },
    }),
  ]);

  return {
    notes: notes.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
      transaction: n.transaction ? { ...n.transaction, date: n.transaction.date.toISOString() } : null,
    })),
    projects,
    transactions: recentTransactions.map((t) => ({ ...t, date: t.date.toISOString() })),
  };
}

export default async function NotesPage() {
  const data = await getNotesData();
  return <NotesClient notes={data.notes} projects={data.projects} transactions={data.transactions} />;
}
