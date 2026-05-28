import { getCalendarEvents } from "@/app/api/calendar/route";
import CalendarClient from "./CalendarClient";

export const revalidate = 300;

export default async function CalendarPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const events = await getCalendarEvents(month, year);

  return <CalendarClient initialEvents={events} initialMonth={month} initialYear={year} />;
}
