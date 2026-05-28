import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProjectDetailClient from "./ProjectDetailClient";

export const dynamic = "force-dynamic";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

async function getProject(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      phases: { orderBy: { order: "asc" } },
      tasks: {
        include: {
          subtasks: {
            select: { id: true, completed: true },
            orderBy: { order: "asc" },
          },
          _count: { select: { comments: true } },
        },
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      },
      notes: { orderBy: { updatedAt: "desc" } },
    },
  });

  if (!project) return null;

  return {
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    phases: project.phases.map((p) => ({
      ...p,
      startDate: p.startDate?.toISOString() || null,
      endDate: p.endDate?.toISOString() || null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
    tasks: project.tasks.map((t) => ({
      ...t,
      startDate: t.startDate?.toISOString() || null,
      endDate: t.endDate?.toISOString() || null,
      dueDate: t.dueDate?.toISOString() || null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      subtasks: t.subtasks,
      _count: t._count,
    })),
    notes: project.notes.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    })),
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();
  return <ProjectDetailClient project={project} />;
}
