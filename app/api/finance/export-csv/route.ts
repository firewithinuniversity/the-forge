import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/* ── Helpers ─────────────────────────────────────────────────── */
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmt$(n: number): string {
  return `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function raw$(n: number): string {
  return Math.round(n * 100) / 100 + "";
}
function fmtDate(d: Date): string {
  return `${String(d.getUTCMonth() + 1).padStart(2, "0")}/${String(d.getUTCDate()).padStart(2, "0")}/${d.getUTCFullYear()}`;
}
function esc(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
function csvRow(...vals: (string | number | null | undefined)[]): string {
  return vals.map(esc).join(",");
}
const BOM = "﻿";

/* ── Data loader ─────────────────────────────────────────────── */
async function loadData(year: number) {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);

  const [transactions, taxConfig, recurringExpenses, recurringIncome, distributions, taxPayments] = await Promise.all([
    prisma.transaction.findMany({
      where: { date: { gte: yearStart, lte: yearEnd } },
      orderBy: { date: "asc" },
      include: { project: { select: { name: true } } },
    }),
    prisma.taxConfig.findFirst(),
    prisma.recurringExpense.findMany({ orderBy: { service: "asc" } }),
    prisma.recurringIncome.findMany({ orderBy: { source: "asc" } }),
    prisma.distribution.findMany({
      where: { date: { gte: yearStart, lte: yearEnd } },
      orderBy: { date: "asc" },
    }),
    prisma.taxPayment.findMany({
      where: { year },
      orderBy: [{ quarter: "asc" }, { type: "asc" }],
    }),
  ]);

  const config = taxConfig || {
    federalTaxRate: 0.12, selfEmploymentRate: 0.153, seDeduction: 0.5,
    stateTaxRate: 0.0465, ownershipSplit: 0.5, qbiDeductionRate: 0.2,
    taxReserveRate: 0.30, partner1Name: "Brett Breunig", partner2Name: "Jude Begay",
    stateName: "Wisconsin", burnRateThreshold: 5000,
  };

  return { transactions, config, recurringExpenses, recurringIncome, distributions, taxPayments };
}

/* ── Transaction rows helper ─────────────────────────────────── */
interface TxWithProject {
  date: Date; type: string; description: string; category: string;
  amount: number; taxDeductible: string; receiptSaved: boolean;
  notes: string | null; project?: { name: string } | null;
}

function transactionsCsv(txs: TxWithProject[]): string {
  const lines: string[] = [];
  lines.push(csvRow("Date", "Type", "Description", "Category", "Amount", "Receipt Saved", "Tax Deductible", "Notes"));
  for (const t of txs) {
    lines.push(csvRow(
      fmtDate(new Date(t.date)),
      t.type === "income" ? "Income" : "Expense",
      t.description,
      t.category,
      raw$(t.type === "income" ? t.amount : -t.amount),
      t.receiptSaved ? "Yes" : "No",
      t.taxDeductible === "yes" ? "Yes" : t.taxDeductible === "partial" ? "Partial" : t.taxDeductible === "no" ? "No" : "",
      t.notes || "",
    ));
  }
  return lines.join("\n");
}

/* ═══════════════════════════════════════════════════════════════ */
/*  MONTHLY REPORT                                                 */
/* ═══════════════════════════════════════════════════════════════ */
function generateMonthly(
  month: number, year: number,
  data: Awaited<ReturnType<typeof loadData>>
): string {
  const { transactions, config } = data;
  const monthTx = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getUTCMonth() === month && d.getUTCFullYear() === year;
  });

  const income = monthTx.filter(t => t.type === "income");
  const expenses = monthTx.filter(t => t.type === "expense");
  const totalIncome = income.reduce((s, t) => s + t.amount, 0);
  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);
  const netProfit = totalIncome - totalExpenses;
  const taxReserve = netProfit > 0 ? netProfit * (config.taxReserveRate ?? 0.3) : 0;

  // Income by category
  const incomeByCat: Record<string, number> = {};
  for (const t of income) incomeByCat[t.category] = (incomeByCat[t.category] || 0) + t.amount;

  // Expenses by category
  const expByCat: Record<string, number> = {};
  for (const t of expenses) expByCat[t.category] = (expByCat[t.category] || 0) + t.amount;

  const lines: string[] = [];
  lines.push("FIRE WITHIN UNIVERSITY — MONTHLY FINANCIAL REPORT");
  lines.push(`Month: ${MONTHS[month]} ${year}`);
  lines.push(`Generated: ${fmtDate(new Date())}`);
  lines.push("");
  lines.push("SUMMARY");
  lines.push(csvRow("Total Income", fmt$(totalIncome)));
  lines.push(csvRow("Total Expenses", fmt$(totalExpenses)));
  lines.push(csvRow("Net Profit", fmt$(netProfit)));
  lines.push(csvRow("Tax Reserve (30%)", fmt$(taxReserve)));
  lines.push(csvRow("Available After Tax Reserve", fmt$(netProfit - taxReserve)));
  lines.push("");

  lines.push("INCOME BY CATEGORY");
  for (const [cat, amt] of Object.entries(incomeByCat).sort(([,a],[,b]) => b - a)) {
    lines.push(csvRow(cat, fmt$(amt)));
  }
  if (Object.keys(incomeByCat).length === 0) lines.push(csvRow("(none)", fmt$(0)));
  lines.push("");

  lines.push("EXPENSES BY CATEGORY");
  for (const [cat, amt] of Object.entries(expByCat).sort(([,a],[,b]) => b - a)) {
    lines.push(csvRow(cat, fmt$(amt)));
  }
  if (Object.keys(expByCat).length === 0) lines.push(csvRow("(none)", fmt$(0)));
  lines.push("");

  lines.push("TRANSACTIONS");
  lines.push(transactionsCsv(monthTx));

  return BOM + lines.join("\n");
}

/* ═══════════════════════════════════════════════════════════════ */
/*  QUARTERLY REPORT                                               */
/* ═══════════════════════════════════════════════════════════════ */
function generateQuarterly(
  quarter: number, year: number,
  data: Awaited<ReturnType<typeof loadData>>
): string {
  const { transactions, config, taxPayments } = data;
  const startMonth = (quarter - 1) * 3;
  const endMonth = startMonth + 2;
  const periodNames = ["January – March", "April – June", "July – September", "October – December"];

  const qTx = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getUTCMonth() >= startMonth && d.getUTCMonth() <= endMonth && d.getUTCFullYear() === year;
  });

  const totalIncome = qTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = qTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const netProfit = totalIncome - totalExpenses;
  const split = config.ownershipSplit ?? 0.5;
  const yourShare = netProfit * split;

  // Tax calc per partner
  const seTax = yourShare > 0 ? yourShare * (config.selfEmploymentRate ?? 0.153) : 0;
  const seDeduction = seTax * (config.seDeduction ?? 0.5);
  const qbiDeduction = yourShare > 0 ? yourShare * (config.qbiDeductionRate ?? 0.2) : 0;
  const taxableIncome = Math.max(0, yourShare - qbiDeduction - seDeduction);
  const federalTax = taxableIncome * (config.federalTaxRate ?? 0.12);
  const stateTax = taxableIncome * (config.stateTaxRate ?? 0.0465);
  const totalTax = federalTax + seTax + stateTax;

  // Tax payment status for this quarter
  const qPayments = taxPayments.filter(tp => tp.quarter === quarter);
  const paymentStatus = qPayments.length > 0
    ? (qPayments.every(p => p.paid) ? "Paid" : "Unpaid")
    : (totalTax > 0 ? "Unpaid" : "N/A");
  const paidDate = qPayments.find(p => p.paid && p.paidDate)
    ? fmtDate(new Date(qPayments.find(p => p.paid && p.paidDate)!.paidDate!))
    : "";

  const dueDates = ["April 15", "June 15", "September 15", "January 15"];

  const lines: string[] = [];
  lines.push("FIRE WITHIN UNIVERSITY — QUARTERLY FINANCIAL REPORT");
  lines.push(`Quarter: Q${quarter} ${year} (${periodNames[quarter - 1]})`);
  lines.push(`Generated: ${fmtDate(new Date())}`);
  lines.push("");

  lines.push("QUARTER SUMMARY");
  lines.push(csvRow("Total Income", fmt$(totalIncome)));
  lines.push(csvRow("Total Expenses", fmt$(totalExpenses)));
  lines.push(csvRow("Net Profit", fmt$(netProfit)));
  lines.push("");

  // Monthly breakdown
  lines.push("MONTHLY BREAKDOWN");
  lines.push(csvRow("Month", "Income", "Expenses", "Net"));
  for (let m = startMonth; m <= endMonth; m++) {
    const mTx = qTx.filter(t => new Date(t.date).getUTCMonth() === m);
    const mInc = mTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const mExp = mTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    lines.push(csvRow(MONTHS[m], fmt$(mInc), fmt$(mExp), fmt$(mInc - mExp)));
  }
  lines.push("");

  lines.push("TAX ESTIMATE — PER PARTNER (50% SHARE)");
  lines.push(csvRow("Your Share of Net Profit", fmt$(yourShare)));
  lines.push(csvRow(`Federal Income Tax (${((config.federalTaxRate ?? 0.12) * 100).toFixed(0)}%)`, fmt$(federalTax)));
  lines.push(csvRow(`Self-Employment Tax (${((config.selfEmploymentRate ?? 0.153) * 100).toFixed(1)}%)`, fmt$(seTax)));
  lines.push(csvRow(`${config.stateName ?? "Wisconsin"} State Tax (${((config.stateTaxRate ?? 0.0465) * 100).toFixed(2)}%)`, fmt$(stateTax)));
  lines.push(csvRow("Total Estimated Tax", fmt$(totalTax)));
  lines.push(csvRow("Quarterly Payment Due", fmt$(totalTax)));
  lines.push(csvRow("Due Date", dueDates[quarter - 1]));
  lines.push(csvRow("Payment Status", paymentStatus));
  if (paidDate) lines.push(csvRow("Date Paid", paidDate));
  lines.push("");

  lines.push("TRANSACTIONS");
  lines.push(transactionsCsv(qTx));

  return BOM + lines.join("\n");
}

/* ═══════════════════════════════════════════════════════════════ */
/*  ANNUAL REPORT                                                  */
/* ═══════════════════════════════════════════════════════════════ */
function generateAnnual(
  year: number,
  data: Awaited<ReturnType<typeof loadData>>
): string {
  const { transactions, config, recurringExpenses, distributions, taxPayments } = data;
  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const netProfit = totalIncome - totalExpenses;
  const taxReserve = netProfit > 0 ? netProfit * (config.taxReserveRate ?? 0.3) : 0;
  const totalDistributions = distributions.reduce((s, d) => s + d.partner1Share + d.partner2Share, 0);

  const lines: string[] = [];
  lines.push("FIRE WITHIN UNIVERSITY — ANNUAL FINANCIAL REPORT");
  lines.push(`Year: ${year}`);
  lines.push(`Generated: ${fmtDate(new Date())}`);
  lines.push("");

  lines.push("ANNUAL SUMMARY");
  lines.push(csvRow("Total Income", fmt$(totalIncome)));
  lines.push(csvRow("Total Expenses", fmt$(totalExpenses)));
  lines.push(csvRow("Net Profit", fmt$(netProfit)));
  lines.push(csvRow("Tax Reserve (30%)", fmt$(taxReserve)));
  lines.push(csvRow("Total Distributions Made", fmt$(totalDistributions)));
  lines.push(csvRow("Undistributed Profit", fmt$(netProfit - totalDistributions)));
  lines.push("");

  // Income by category (monthly grid)
  const incomeCategories = [...new Set(transactions.filter(t => t.type === "income").map(t => t.category))];
  lines.push("INCOME BY CATEGORY");
  lines.push(csvRow("Category", ...SHORT_MONTHS, "Total"));
  for (const cat of incomeCategories) {
    const monthVals = MONTHS.map((_, m) => {
      return transactions
        .filter(t => t.type === "income" && t.category === cat && new Date(t.date).getUTCMonth() === m)
        .reduce((s, t) => s + t.amount, 0);
    });
    lines.push(csvRow(cat, ...monthVals.map(v => fmt$(v)), fmt$(monthVals.reduce((a, b) => a + b, 0))));
  }
  const monthlyIncTotals = MONTHS.map((_, m) =>
    transactions.filter(t => t.type === "income" && new Date(t.date).getUTCMonth() === m).reduce((s, t) => s + t.amount, 0)
  );
  lines.push(csvRow("TOTAL", ...monthlyIncTotals.map(v => fmt$(v)), fmt$(totalIncome)));
  lines.push("");

  // Expenses by category (monthly grid)
  const expenseCategories = [...new Set(transactions.filter(t => t.type === "expense").map(t => t.category))];
  lines.push("EXPENSES BY CATEGORY");
  lines.push(csvRow("Category", ...SHORT_MONTHS, "Total"));
  for (const cat of expenseCategories) {
    const monthVals = MONTHS.map((_, m) => {
      return transactions
        .filter(t => t.type === "expense" && t.category === cat && new Date(t.date).getUTCMonth() === m)
        .reduce((s, t) => s + t.amount, 0);
    });
    lines.push(csvRow(cat, ...monthVals.map(v => fmt$(v)), fmt$(monthVals.reduce((a, b) => a + b, 0))));
  }
  const monthlyExpTotals = MONTHS.map((_, m) =>
    transactions.filter(t => t.type === "expense" && new Date(t.date).getUTCMonth() === m).reduce((s, t) => s + t.amount, 0)
  );
  lines.push(csvRow("TOTAL", ...monthlyExpTotals.map(v => fmt$(v)), fmt$(totalExpenses)));
  lines.push("");

  // Quarterly tax summary
  const split = config.ownershipSplit ?? 0.5;
  const quarterPeriods = ["Jan-Mar", "Apr-Jun", "Jul-Sep", "Oct-Dec"];
  lines.push("QUARTERLY TAX PAYMENTS");
  lines.push(csvRow("Quarter", "Period", "Net Profit", "Your Share (50%)", "Tax Owed", "Paid?", "Date Paid"));
  for (let q = 1; q <= 4; q++) {
    const sm = (q - 1) * 3;
    const qTx = transactions.filter(t => {
      const m = new Date(t.date).getUTCMonth();
      return m >= sm && m < sm + 3;
    });
    const qInc = qTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const qExp = qTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const qNet = qInc - qExp;
    const qShare = qNet * split;
    const qSeTax = qShare > 0 ? qShare * (config.selfEmploymentRate ?? 0.153) : 0;
    const qSeDed = qSeTax * (config.seDeduction ?? 0.5);
    const qQbi = qShare > 0 ? qShare * (config.qbiDeductionRate ?? 0.2) : 0;
    const qTaxable = Math.max(0, qShare - qQbi - qSeDed);
    const qFed = qTaxable * (config.federalTaxRate ?? 0.12);
    const qState = qTaxable * (config.stateTaxRate ?? 0.0465);
    const qTotalTax = qFed + qSeTax + qState;

    const qPayments = taxPayments.filter(tp => tp.quarter === q);
    const paid = qPayments.length > 0 ? (qPayments.every(p => p.paid) ? "Yes" : "No") : (qTotalTax > 0 ? "Unpaid" : "N/A");
    const datePaid = qPayments.find(p => p.paid && p.paidDate) ? fmtDate(new Date(qPayments.find(p => p.paid && p.paidDate)!.paidDate!)) : "";

    lines.push(csvRow(`Q${q}`, quarterPeriods[q - 1], fmt$(qNet), fmt$(qShare), fmt$(qTotalTax), paid, datePaid));
  }
  lines.push("");

  // Distributions
  lines.push("MEMBER DISTRIBUTIONS");
  lines.push(csvRow("Date", "Type", "Total Amount", `${config.partner1Name ?? "Brett"} (50%)`, `${config.partner2Name ?? "Jude"} (50%)`, "Method", "Notes"));
  for (const d of distributions) {
    lines.push(csvRow(
      fmtDate(new Date(d.date)), d.type, fmt$(d.partner1Share + d.partner2Share),
      fmt$(d.partner1Share), fmt$(d.partner2Share), d.method || "", d.notes || ""
    ));
  }
  if (distributions.length > 0) {
    const t1 = distributions.reduce((s, d) => s + d.partner1Share, 0);
    const t2 = distributions.reduce((s, d) => s + d.partner2Share, 0);
    lines.push(csvRow("TOTAL", "", fmt$(t1 + t2), fmt$(t1), fmt$(t2), "", ""));
  }
  lines.push("");

  // Recurring expenses
  const activeRecurring = recurringExpenses.filter(r => r.active);
  lines.push("RECURRING EXPENSES (ACTIVE)");
  lines.push(csvRow("Service", "Category", "Monthly Cost", "Annual Cost", "Billing Cycle", "Status"));
  for (const r of activeRecurring) {
    lines.push(csvRow(r.service, r.category, fmt$(r.monthlyCost), fmt$(r.annualCost || r.monthlyCost * 12), r.billingCycle, "Active"));
  }
  const totalMonthlyCost = activeRecurring.reduce((s, r) => s + r.monthlyCost, 0);
  const totalAnnualCost = activeRecurring.reduce((s, r) => s + (r.annualCost || r.monthlyCost * 12), 0);
  lines.push(csvRow("TOTAL MONTHLY", "", fmt$(totalMonthlyCost), "", "", ""));
  lines.push(csvRow("TOTAL ANNUAL", "", "", fmt$(totalAnnualCost), "", ""));

  return BOM + lines.join("\n");
}

/* ═══════════════════════════════════════════════════════════════ */
/*  CPA PACKAGE — individual CSVs returned as JSON for client ZIP  */
/* ═══════════════════════════════════════════════════════════════ */
function generateCpaFiles(
  year: number,
  data: Awaited<ReturnType<typeof loadData>>
): Record<string, string> {
  const { transactions, config, recurringExpenses, distributions, taxPayments } = data;
  const files: Record<string, string> = {};

  // 1. Annual summary
  files[`FWU-Annual-Summary-${year}.csv`] = generateAnnual(year, data);

  // 2. All transactions
  const txLines: string[] = [
    csvRow("Date", "Type", "Description", "Category", "Project", "Amount", "Tax Deductible", "Receipt Saved", "Notes"),
  ];
  for (const t of transactions) {
    txLines.push(csvRow(
      fmtDate(new Date(t.date)),
      t.type === "income" ? "Income" : "Expense",
      t.description, t.category, t.project?.name || "",
      raw$(t.type === "income" ? t.amount : -t.amount),
      t.taxDeductible === "yes" ? "Yes" : t.taxDeductible === "partial" ? "Partial" : t.taxDeductible === "no" ? "No" : "",
      t.receiptSaved ? "Yes" : "No",
      t.notes || "",
    ));
  }
  files[`FWU-All-Transactions-${year}.csv`] = BOM + txLines.join("\n");

  // 3. Distributions
  const distLines = [csvRow("Date", "Type", "LLC Net Profit", `${config.partner1Name ?? "Brett"} Share`, `${config.partner2Name ?? "Jude"} Share`, "Method", "Approved By", "Notes")];
  for (const d of distributions) {
    distLines.push(csvRow(fmtDate(new Date(d.date)), d.type, raw$(d.llcNetProfit), raw$(d.partner1Share), raw$(d.partner2Share), d.method || "", d.approvedBy || "", d.notes || ""));
  }
  files[`FWU-Distributions-${year}.csv`] = BOM + distLines.join("\n");

  // 4. Tax payments
  const tpLines = [csvRow("Year", "Quarter", "Type", "Amount", "Due Date", "Paid", "Paid Date", "Notes")];
  for (const tp of taxPayments) {
    tpLines.push(csvRow(tp.year, `Q${tp.quarter}`, tp.type, raw$(tp.amount), fmtDate(new Date(tp.dueDate)), tp.paid ? "Yes" : "No", tp.paidDate ? fmtDate(new Date(tp.paidDate)) : "", tp.notes || ""));
  }
  files[`FWU-Tax-Payments-${year}.csv`] = BOM + tpLines.join("\n");

  // 5. Recurring expenses
  const reLines = [csvRow("Service", "Category", "Monthly Cost", "Annual Cost", "Billing Cycle", "Active", "Notes")];
  for (const r of recurringExpenses) {
    reLines.push(csvRow(r.service, r.category, raw$(r.monthlyCost), raw$(r.annualCost || r.monthlyCost * 12), r.billingCycle, r.active ? "Yes" : "No", r.notes || ""));
  }
  files[`FWU-Recurring-Expenses-${year}.csv`] = BOM + reLines.join("\n");

  // 6. Partner summary
  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const netProfit = totalIncome - totalExpenses;
  const split = config.ownershipSplit ?? 0.5;
  const share1 = netProfit * split;
  const share2 = netProfit * (1 - split);
  const dist1 = distributions.reduce((s, d) => s + d.partner1Share, 0);
  const dist2 = distributions.reduce((s, d) => s + d.partner2Share, 0);
  const taxPaid1 = taxPayments.filter(p => p.paid).reduce((s, p) => s + p.amount, 0);

  const ps: string[] = [];
  ps.push("FIRE WITHIN UNIVERSITY — PARTNER SUMMARY");
  ps.push(`Tax Year: ${year}`);
  ps.push("Entity Type: Multi-Member LLC (Partnership)");
  ps.push("Tax Filing: Form 1065 / Schedule K-1");
  ps.push(`State: ${config.stateName ?? "Wisconsin"}`);
  ps.push("Fiscal Year: Calendar Year (Jan 1 – Dec 31)");
  ps.push("Accounting Method: Cash Basis");
  ps.push("");
  ps.push(`PARTNER A — ${config.partner1Name ?? "Brett Breunig"}`);
  ps.push(csvRow("Ownership", `${((split) * 100).toFixed(0)}%`));
  ps.push(csvRow("Share of Net Profit", fmt$(share1)));
  ps.push(csvRow("Total Distributions Received", fmt$(dist1)));
  ps.push(csvRow("Estimated Tax Payments Made", fmt$(taxPaid1)));
  ps.push("");
  ps.push(`PARTNER B — ${config.partner2Name ?? "Jude Begay"}`);
  ps.push(csvRow("Ownership", `${((1 - split) * 100).toFixed(0)}%`));
  ps.push(csvRow("Share of Net Profit", fmt$(share2)));
  ps.push(csvRow("Total Distributions Received", fmt$(dist2)));
  ps.push(csvRow("Estimated Tax Payments Made", fmt$(taxPaid1)));

  files[`FWU-Partner-Summary-${year}.csv`] = BOM + ps.join("\n");

  return files;
}

/* ═══════════════════════════════════════════════════════════════ */
/*  ROUTE HANDLER                                                  */
/* ═══════════════════════════════════════════════════════════════ */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "monthly"; // monthly | quarterly | annual | cpa
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth())); // 0-indexed
    const quarter = parseInt(searchParams.get("quarter") || "1");

    const data = await loadData(year);

    if (type === "monthly") {
      const csv = generateMonthly(month, year, data);
      const filename = `FWU-Monthly-${MONTHS[month]}-${year}.csv`;
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (type === "quarterly") {
      const csv = generateQuarterly(quarter, year, data);
      const filename = `FWU-Quarterly-Q${quarter}-${year}.csv`;
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (type === "annual") {
      const csv = generateAnnual(year, data);
      const filename = `FWU-Annual-${year}.csv`;
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (type === "cpa") {
      // Return JSON with all CSV file contents for client-side ZIP generation
      const files = generateCpaFiles(year, data);
      return NextResponse.json({ files, year });
    }

    return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
  } catch (error) {
    console.error("GET /api/finance/export-csv error:", error);
    return NextResponse.json({ error: "Failed to generate export" }, { status: 500 });
  }
}
