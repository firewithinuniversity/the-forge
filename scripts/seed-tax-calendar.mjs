import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env");
const envContent = readFileSync(envPath, "utf8");
const pwMatch = envContent.match(/FORGE_PASSWORD="?([^"\n]+)"?/);
const password = pwMatch?.[1] ?? "forge2024";

const BASE = process.env.SEED_URL || "https://the-forge-sooty-five.vercel.app";
const YEAR = 2026;

const TAX_EVENTS = [
  {
    title: "Q4 Estimated Tax Payment (Prior Year)",
    description: "Quarterly estimated tax — federal (IRS) + Wisconsin DOR. Both partners pay individually.",
    date: `${YEAR}-01-15T00:00:00.000Z`,
    color: "#DC2626",
  },
  {
    title: "Form 1065 + K-1s + WI Form 3 Due",
    description: "Partnership return (Form 1065), K-1s to each partner, and Wisconsin Form 3. CPA handles filing. $220/partner/month penalty if late.",
    date: `${YEAR}-03-15T00:00:00.000Z`,
    color: "#DC2626",
  },
  {
    title: "Form 1040 + WI Form 1 + Q1 Estimated Tax",
    description: "Personal federal return (Form 1040) + Wisconsin Form 1 + Q1 estimated payment. Both partners file personally.",
    date: `${YEAR}-04-15T00:00:00.000Z`,
    color: "#DC2626",
  },
  {
    title: "Q2 Estimated Tax Payment",
    description: "Quarterly estimated tax — federal (IRS) + Wisconsin DOR. Both partners pay individually.",
    date: `${YEAR}-06-15T00:00:00.000Z`,
    color: "#DC2626",
  },
  {
    title: "Wisconsin LLC Annual Report + $25 Fee",
    description: "Annual filing at apps.dfi.wi.gov to keep LLC in good standing. Due by end of quarter LLC was formed.",
    date: `${YEAR}-06-30T00:00:00.000Z`,
    color: "#F59E0B",
  },
  {
    title: "Q3 Estimated Tax Payment",
    description: "Quarterly estimated tax — federal (IRS) + Wisconsin DOR. Both partners pay individually.",
    date: `${YEAR}-09-15T00:00:00.000Z`,
    color: "#DC2626",
  },
  {
    title: "End of Tax Year — Finalize Books",
    description: "Finalize books, review all expenses, ensure receipts saved. Prepare for CPA.",
    date: `${YEAR}-12-31T00:00:00.000Z`,
    color: "#F59E0B",
  },
];

function twoWeeksBefore(isoDate) {
  const d = new Date(isoDate);
  d.setUTCDate(d.getUTCDate() - 14);
  return d.toISOString();
}

async function main() {
  // Step 1: Login
  console.log("Logging in...");
  const loginResp = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!loginResp.ok) {
    throw new Error(`Login failed: ${loginResp.status}`);
  }
  const cookie = loginResp.headers.getSetCookie?.()?.find(c => c.startsWith("forge-auth="))
    || loginResp.headers.get("set-cookie")?.split(",").find(c => c.trim().startsWith("forge-auth="));
  if (!cookie) throw new Error("No auth cookie returned");
  const cookieVal = cookie.split(";")[0];
  console.log("Logged in.\n");

  const headers = {
    "Content-Type": "application/json",
    Cookie: cookieVal,
  };

  // Step 2: Create calendar events
  console.log("Creating calendar events...\n");
  for (const evt of TAX_EVENTS) {
    const resp = await fetch(`${BASE}/api/calendar-events`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: evt.title,
        description: evt.description,
        type: "deadline",
        date: evt.date,
        allDay: true,
        color: evt.color,
        recurrence: "yearly",
      }),
    });
    if (!resp.ok) {
      const err = await resp.text();
      console.error(`  ✗ Calendar event failed: ${evt.title} — ${err}`);
      continue;
    }
    console.log(`  ✓ Calendar: ${evt.title} (${evt.date.slice(0, 10)})`);
  }

  // Step 3: Create reminders (2 weeks before each deadline)
  console.log("\nCreating reminders...\n");
  const now = new Date();
  for (const evt of TAX_EVENTS) {
    const reminderDate = twoWeeksBefore(evt.date);
    if (new Date(reminderDate) <= now) {
      console.log(`  ⏭ Skipped (past): ${evt.title}`);
      continue;
    }

    const displayDate = new Date(evt.date).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
    });

    const resp = await fetch(`${BASE}/api/reminders`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: `Tax Deadline: ${evt.title}`,
        message: `Due in 2 weeks on ${displayDate}. ${evt.description}`,
        remindAt: reminderDate,
        entityType: "tax",
        link: "/finance/tax",
      }),
    });
    if (!resp.ok) {
      const err = await resp.text();
      console.error(`  ✗ Reminder failed: ${evt.title} — ${err}`);
      continue;
    }
    console.log(`  ✓ Reminder: ${evt.title} → fires ${reminderDate.slice(0, 10)}`);
  }

  console.log("\nDone!");
}

main().catch(e => { console.error(e); process.exit(1); });
