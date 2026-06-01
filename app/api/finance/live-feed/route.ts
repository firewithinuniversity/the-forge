import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Live data feed for Excel "Get Data from Web"
 *
 * Usage: GET /api/finance/live-feed?token=YOUR_FORGE_PASSWORD&sheet=transactions
 *
 * Auth: uses FORGE_PASSWORD as the access token (no cookie needed — Excel can't do cookies)
 *
 * Sheets:
 *   - transactions (default) — all transactions
 *   - summary — monthly income/expense/net summary
 *   - recurring — recurring expenses
 *   - income — recurring income
 *   - distributions — all distributions
 *   - tax — tax payments
 *
 * Optional params:
 *   - year=2026 — filter to specific year (default: current year)
 *   - format=csv|json (default: csv)
 */

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
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export async function GET(request: Request) {
  try {
    // Token-based auth for Excel (can't use cookies)
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const expected = process.env.FORGE_PASSWORD ?? "forge2024";

    if (token !== expected) {
      return new NextResponse("Unauthorized. Add ?token=YOUR_PASSWORD to the URL.", { status: 401 });
    }

    const sheet = searchParams.get("sheet") || "transactions";
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const format = searchParams.get("format") || "csv";
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);

    let csv = "";
    let jsonData: unknown = null;

    switch (sheet) {
      case "transactions": {
        const transactions = await prisma.transaction.findMany({
          where: { date: { gte: yearStart, lte: yearEnd } },
          orderBy: { date: "asc" },
          include: { project: { select: { name: true } } },
        });

        if (format === "json") {
          jsonData = transactions.map(t => ({
            date: fmtDate(new Date(t.date)),
            type: t.type,
            description: t.description,
            category: t.category,
            amount: t.type === "income" ? t.amount : -t.amount,
            project: t.project?.name || "",
            taxDeductible: t.taxDeductible,
            receiptSaved: t.receiptSaved,
            notes: t.notes || "",
          }));
        } else {
          const lines = [csvRow("Date", "Type", "Description", "Category", "Amount", "Project", "Tax Deductible", "Receipt Saved", "Notes")];
          for (const t of transactions) {
            lines.push(csvRow(
              fmtDate(new Date(t.date)),
              t.type === "income" ? "Income" : "Expense",
              t.description,
              t.category,
              Math.round((t.type === "income" ? t.amount : -t.amount) * 100) / 100,
              t.project?.name || "",
              t.taxDeductible === "yes" ? "Yes" : t.taxDeductible === "partial" ? "Partial" : t.taxDeductible === "no" ? "No" : "",
              t.receiptSaved ? "Yes" : "No",
              t.notes || "",
            ));
          }
          csv = lines.join("\n");
        }
        break;
      }

      case "summary": {
        const transactions = await prisma.transaction.findMany({
          where: { date: { gte: yearStart, lte: yearEnd } },
          orderBy: { date: "asc" },
        });

        const monthlyData = MONTHS.map((name, i) => {
          const monthTx = transactions.filter(t => new Date(t.date).getUTCMonth() === i);
          const inc = monthTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
          const exp = monthTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
          return { month: name, income: Math.round(inc * 100) / 100, expenses: Math.round(exp * 100) / 100, net: Math.round((inc - exp) * 100) / 100 };
        });

        if (format === "json") {
          jsonData = monthlyData;
        } else {
          const lines = [csvRow("Month", "Income", "Expenses", "Net Profit")];
          for (const m of monthlyData) {
            lines.push(csvRow(m.month, m.income, m.expenses, m.net));
          }
          const totalInc = monthlyData.reduce((s, m) => s + m.income, 0);
          const totalExp = monthlyData.reduce((s, m) => s + m.expenses, 0);
          lines.push(csvRow("TOTAL", Math.round(totalInc * 100) / 100, Math.round(totalExp * 100) / 100, Math.round((totalInc - totalExp) * 100) / 100));
          csv = lines.join("\n");
        }
        break;
      }

      case "recurring": {
        const expenses = await prisma.recurringExpense.findMany({ orderBy: { service: "asc" } });

        if (format === "json") {
          jsonData = expenses.map(r => ({
            service: r.service, category: r.category,
            monthlyCost: r.monthlyCost, annualCost: r.annualCost || r.monthlyCost * 12,
            billingCycle: r.billingCycle, active: r.active, notes: r.notes || "",
          }));
        } else {
          const lines = [csvRow("Service", "Category", "Monthly Cost", "Annual Cost", "Billing Cycle", "Active", "Notes")];
          for (const r of expenses) {
            lines.push(csvRow(r.service, r.category, Math.round(r.monthlyCost * 100) / 100,
              Math.round((r.annualCost || r.monthlyCost * 12) * 100) / 100, r.billingCycle, r.active ? "Yes" : "No", r.notes || ""));
          }
          csv = lines.join("\n");
        }
        break;
      }

      case "income": {
        const incomes = await prisma.recurringIncome.findMany({ orderBy: { source: "asc" } });

        if (format === "json") {
          jsonData = incomes.map(r => ({
            source: r.source, category: r.category, amount: r.amount,
            frequency: r.frequency, active: r.active, notes: r.notes || "",
          }));
        } else {
          const lines = [csvRow("Source", "Category", "Amount", "Frequency", "Active", "Notes")];
          for (const r of incomes) {
            lines.push(csvRow(r.source, r.category, Math.round(r.amount * 100) / 100, r.frequency, r.active ? "Yes" : "No", r.notes || ""));
          }
          csv = lines.join("\n");
        }
        break;
      }

      case "distributions": {
        const config = await prisma.taxConfig.findFirst();
        const distributions = await prisma.distribution.findMany({
          where: { date: { gte: yearStart, lte: yearEnd } },
          orderBy: { date: "asc" },
        });

        if (format === "json") {
          jsonData = distributions.map(d => ({
            date: fmtDate(new Date(d.date)), type: d.type,
            llcNetProfit: d.llcNetProfit, partner1Share: d.partner1Share, partner2Share: d.partner2Share,
            method: d.method || "", notes: d.notes || "",
          }));
        } else {
          const p1 = config?.partner1Name ?? "Brett";
          const p2 = config?.partner2Name ?? "Jude";
          const lines = [csvRow("Date", "Type", "LLC Net Profit", `${p1} Share`, `${p2} Share`, "Method", "Notes")];
          for (const d of distributions) {
            lines.push(csvRow(fmtDate(new Date(d.date)), d.type, Math.round(d.llcNetProfit * 100) / 100,
              Math.round(d.partner1Share * 100) / 100, Math.round(d.partner2Share * 100) / 100, d.method || "", d.notes || ""));
          }
          csv = lines.join("\n");
        }
        break;
      }

      case "tax": {
        const taxPayments = await prisma.taxPayment.findMany({
          where: { year },
          orderBy: [{ quarter: "asc" }, { type: "asc" }],
        });

        if (format === "json") {
          jsonData = taxPayments.map(tp => ({
            quarter: `Q${tp.quarter}`, type: tp.type, amount: tp.amount,
            dueDate: fmtDate(new Date(tp.dueDate)), paid: tp.paid,
            paidDate: tp.paidDate ? fmtDate(new Date(tp.paidDate)) : "", notes: tp.notes || "",
          }));
        } else {
          const lines = [csvRow("Quarter", "Type", "Amount", "Due Date", "Paid", "Paid Date", "Notes")];
          for (const tp of taxPayments) {
            lines.push(csvRow(`Q${tp.quarter}`, tp.type, Math.round(tp.amount * 100) / 100,
              fmtDate(new Date(tp.dueDate)), tp.paid ? "Yes" : "No",
              tp.paidDate ? fmtDate(new Date(tp.paidDate)) : "", tp.notes || ""));
          }
          csv = lines.join("\n");
        }
        break;
      }

      default:
        return NextResponse.json({ error: "Invalid sheet. Options: transactions, summary, recurring, income, distributions, tax" }, { status: 400 });
    }

    if (format === "json") {
      return NextResponse.json(jsonData, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new NextResponse(BOM + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("GET /api/finance/live-feed error:", error);
    return NextResponse.json({ error: "Failed to generate feed" }, { status: 500 });
  }
}
