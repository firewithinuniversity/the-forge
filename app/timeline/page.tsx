import { prisma } from "@/lib/prisma";
import TimelineClient from "./TimelineClient";

export const dynamic = "force-dynamic";

async function getTimelineData() {
  const projects = await prisma.project.findMany({
    where: { archived: false },
    orderBy: { name: "asc" },
    include: {
      phases: { orderBy: { order: "asc" } },
      tasks: {
        orderBy: [{ order: "asc" }],
        select: {
          id: true, title: true, status: true, startDate: true, endDate: true, dueDate: true, phaseId: true, assignee: true,
        },
      },
    },
  });

  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    phases: p.phases.map((ph) => ({
      id: ph.id,
      name: ph.name,
      startDate: ph.startDate?.toISOString() || null,
      endDate: ph.endDate?.toISOString() || null,
    })),
    tasks: p.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      startDate: t.startDate?.toISOString() || null,
      endDate: t.endDate?.toISOString() || t.dueDate?.toISOString() || null,
      phaseId: t.phaseId,
      assignee: t.assignee,
    })),
  }));
}

export default async function TimelinePage() {
  const projects = await getTimelineData();
  return <TimelineClient projects={projects} />;
}
