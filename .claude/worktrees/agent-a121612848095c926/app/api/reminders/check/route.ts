import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST — fire any due reminders: create notifications + mark as fired
export async function POST() {
  try {
    const now = new Date();

    const dueReminders = await prisma.reminder.findMany({
      where: { fired: false, remindAt: { lte: now } },
    });

    if (dueReminders.length === 0) {
      return NextResponse.json({ fired: 0 });
    }

    // Create a notification for each due reminder
    await prisma.notification.createMany({
      data: dueReminders.map((r) => ({
        type: "reminder",
        title: `⏰ ${r.title}`,
        message: r.message || `Reminder: ${r.title}`,
        link: r.link,
      })),
    });

    // Mark all as fired
    await prisma.reminder.updateMany({
      where: { id: { in: dueReminders.map((r) => r.id) } },
      data: { fired: true },
    });

    return NextResponse.json({
      fired: dueReminders.length,
      titles: dueReminders.map((r) => r.title),
    });
  } catch (error) {
    console.error("POST /api/reminders/check error:", error);
    return NextResponse.json({ error: "Failed to check reminders" }, { status: 500 });
  }
}
