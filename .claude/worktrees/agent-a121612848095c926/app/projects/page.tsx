import { prisma } from "@/lib/prisma";
import ProjectsListClient from "./ProjectsListClient";

export const revalidate = 300;

async function getProjects() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      tasks: { select: { id: true, status: true } },
      phases: { select: { id: true, name: true, status: true }, orderBy: { order: "asc" } },
    },
  });

  return projects.map((p) => {
    const statusCounts = { todo: 0, in_progress: 0, review: 0, done: 0 };
    for (const t of p.tasks) {
      const s = t.status as keyof typeof statusCounts;
      if (s in statusCounts) statusCounts[s]++;
    }
    const total = p.tasks.length;
    const done = statusCounts.done;
    const activePhase = p.phases.find((ph) => ph.status === "active");
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      color: p.color,
      archived: p.archived,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      statusCounts,
      totalTasks: total,
      progress: total > 0 ? Math.round((done / total) * 100) : 0,
      phaseName: activePhase?.name || null,
      assignees: [] as string[],
    };
  });
}

export default async function ProjectsPage() {
  const projects = await getProjects();
  return <ProjectsListClient projects={projects} />;
}
