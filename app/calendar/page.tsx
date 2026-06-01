import { getCalendarEvents } from "@/app/api/calendar/route";
import CalendarClient from "./CalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  let events: Awaited<ReturnType<typeof getCalendarEvents>>;
  try {
    events = await getCalendarEvents(month, year);
  } catch (err) {
    console.error("Calendar page error:", err);
    events = [];
  }

  return <CalendarClient initialEvents={events} initialMonth={month} initialYear={year} />;
}
