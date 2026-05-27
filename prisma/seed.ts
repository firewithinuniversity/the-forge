import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const adapter = new PrismaLibSql({
  url: `file:${path.join(process.cwd(), "dev.db")}`,
});
const prisma = new PrismaClient({ adapter } as never);

const categories = [
  { name: "Donations (One-Time)", type: "income" as const, color: "#22C55E", icon: "heart" },
  { name: "Donations (Recurring)", type: "income" as const, color: "#16A34A", icon: "heart" },
  { name: "Affiliate — Amazon", type: "income" as const, color: "#F59E0B", icon: "link" },
  { name: "Affiliate — ShareASale", type: "income" as const, color: "#EAB308", icon: "link" },
  { name: "Product Sales", type: "income" as const, color: "#3B82F6", icon: "book" },
  { name: "Speaking / Events", type: "income" as const, color: "#8B5CF6", icon: "mic" },
  { name: "Other Income", type: "income" as const, color: "#6B7280", icon: "plus" },
  { name: "Hosting & Domain", type: "expense" as const, color: "#F97316", icon: "server" },
  { name: "Software & Subscriptions", type: "expense" as const, color: "#EF4444", icon: "code" },
  { name: "Content & Media", type: "expense" as const, color: "#EC4899", icon: "camera" },
  { name: "Marketing & Ads", type: "expense" as const, color: "#A855F7", icon: "megaphone" },
  { name: "Professional Services", type: "expense" as const, color: "#14B8A6", icon: "briefcase" },
  { name: "Office & Equipment", type: "expense" as const, color: "#0EA5E9", icon: "wrench" },
  { name: "Travel & Ministry", type: "expense" as const, color: "#F59E0B", icon: "plane" },
  { name: "Stripe Processing Fees", type: "expense" as const, color: "#E8501A", icon: "credit-card" },
  { name: "Bank Fees", type: "expense" as const, color: "#78716C", icon: "bank" },
  { name: "Other Expense", type: "expense" as const, color: "#6B7280", icon: "minus" },
];

const recurringExpenses = [
  { service: "Cloudflare (DNS + CDN)", category: "Hosting & Domain", monthlyCost: 0, annualCost: 0, billingCycle: "monthly", notes: "Free tier" },
  { service: "Vercel (Hosting)", category: "Hosting & Domain", monthlyCost: 0, annualCost: 0, billingCycle: "monthly", notes: "Free tier — upgrade to Pro at $20/mo when needed" },
  { service: "Sanity CMS", category: "Software & Subscriptions", monthlyCost: 0, annualCost: 0, billingCycle: "monthly", notes: "Free tier" },
  { service: "Google Workspace", category: "Software & Subscriptions", monthlyCost: 7.20, annualCost: 86.40, billingCycle: "monthly", notes: "hello@firewithinuniversity.com" },
  { service: "Mailchimp", category: "Software & Subscriptions", monthlyCost: 0, annualCost: 0, billingCycle: "monthly", notes: "Free tier up to 500 contacts" },
  { service: "Stripe", category: "Software & Subscriptions", monthlyCost: 0, annualCost: 0, billingCycle: "per_transaction", notes: "2.9% + 30¢ per transaction — no monthly fee" },
  { service: "Domain (firewithinuniversity.com)", category: "Hosting & Domain", monthlyCost: 1.00, annualCost: 12.00, billingCycle: "annual", notes: "~$12/year via Cloudflare or Namecheap" },
  { service: "Wave Bookkeeping", category: "Software & Subscriptions", monthlyCost: 0, annualCost: 0, billingCycle: "monthly", notes: "Free" },
  { service: "Google Analytics (GA4)", category: "Software & Subscriptions", monthlyCost: 0, annualCost: 0, billingCycle: "monthly", notes: "Free" },
  { service: "Northwest Registered Agent", category: "Professional Services", monthlyCost: 10.42, annualCost: 125.04, billingCycle: "annual", notes: "$125/year — switch when ready" },
  { service: "WI Annual Report", category: "Professional Services", monthlyCost: 2.08, annualCost: 24.96, billingCycle: "annual", notes: "$25/year due June 30" },
];

async function main() {
  console.log("Seeding categories...");
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: { type: cat.type, color: cat.color, icon: cat.icon },
      create: cat,
    });
  }
  console.log(`Seeded ${categories.length} categories.`);

  console.log("Seeding tax config...");
  const existing = await prisma.taxConfig.findFirst();
  if (!existing) {
    await prisma.taxConfig.create({
      data: {
        federalTaxRate: 0.12,
        selfEmploymentRate: 0.153,
        seDeduction: 0.5,
        stateTaxRate: 0.0465,
        stateName: "Wisconsin",
        ownershipSplit: 0.5,
        qbiDeductionRate: 0.2,
        taxReserveRate: 0.30,
        partner1Name: "Brett Breunig",
        partner2Name: "Jude Begay",
      },
    });
    console.log("Created default tax config.");
  } else {
    console.log("Tax config already exists, skipping.");
  }

  console.log("Seeding recurring expenses...");
  for (const exp of recurringExpenses) {
    const exists = await prisma.recurringExpense.findFirst({ where: { service: exp.service } });
    if (!exists) {
      await prisma.recurringExpense.create({ data: exp });
    }
  }
  console.log(`Seeded ${recurringExpenses.length} recurring expenses.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
