import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function fmt$(n: number) { return Math.round(n * 100) / 100; }

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "xlsx";
    const yearParam = searchParams.get("year");
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();
    const mode = searchParams.get("mode") || "full"; // "full" = accountant-ready, "simple" = basic

    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);

    const [transactions, taxConfig, recurringExpenses, distributions, taxPayments] = await Promise.all([
      prisma.transaction.findMany({
        where: { date: { gte: yearStart, lte: yearEnd } },
        orderBy: { date: "asc" },
        include: { project: { select: { name: true } } },
      }),
      prisma.taxConfig.findFirst(),
      prisma.recurringExpense.findMany({ orderBy: { service: "asc" } }),
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
      stateName: "Wisconsin",
    };

    const wb = XLSX.utils.book_new();

    // ─── Sheet 1: All Transactions ─────────────────────────────────
    const txRows = transactions.map((t) => ({
      Date: new Date(t.date).toLocaleDateString("en-US"),
      Type: t.type === "income" ? "Income" : "Expense",
      Description: t.description,
      Category: t.category,
      Project: t.project?.name || "",
      Amount: t.type === "income" ? t.amount : -t.amount,
      "Tax Deductible": t.taxDeductible === "yes" ? "Yes" : t.taxDeductible === "partial" ? "Partial" : t.taxDeductible === "no" ? "No" : "",
      "Receipt Saved": t.receiptSaved ? "Yes" : "No",
      Notes: t.notes || "",
    }));

    const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    txRows.push(
      { Date: "", Type: "", Description: "", Category: "", Project: "", Amount: 0, "Tax Deductible": "", "Receipt Saved": "", Notes: "" },
      { Date: "", Type: "", Description: "TOTAL INCOME", Category: "", Project: "", Amount: fmt$(totalIncome), "Tax Deductible": "", "Receipt Saved": "", Notes: "" },
      { Date: "", Type: "", Description: "TOTAL EXPENSES", Category: "", Project: "", Amount: fmt$(-totalExpenses), "Tax Deductible": "", "Receipt Saved": "", Notes: "" },
      { Date: "", Type: "", Description: "NET PROFIT", Category: "", Project: "", Amount: fmt$(totalIncome - totalExpenses), "Tax Deductible": "", "Receipt Saved": "", Notes: "" },
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txRows), "All Transactions");

    // ─── Sheet 2: Income by Source ─────────────────────────────────
    const incomeByCategory: Record<string, number> = {};
    for (const t of transactions.filter((t) => t.type === "income")) {
      incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
    }
    const incomeRows = Object.entries(incomeByCategory)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, amount]) => ({ "Income Source": cat, Amount: fmt$(amount) }));
    incomeRows.push({ "Income Source": "TOTAL", Amount: fmt$(totalIncome) });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(incomeRows), "Income by Source");

    // ─── Sheet 3: Expenses by Category ─────────────────────────────
    const expenseByCategory: Record<string, number> = {};
    for (const t of transactions.filter((t) => t.type === "expense")) {
      expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
    }
    const expenseRows = Object.entries(expenseByCategory)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, amount]) => ({ "Expense Category": cat, Amount: fmt$(amount) }));
    expenseRows.push({ "Expense Category": "TOTAL", Amount: fmt$(totalExpenses) });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenseRows), "Expenses by Category");

    // ─── Sheet 4: Monthly Summary ──────────────────────────────────
    const monthlyData = MONTHS.map((name, i) => {
      const monthTx = transactions.filter((t) => new Date(t.date).getMonth() === i);
      const inc = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const exp = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      const net = inc - exp;
      return {
        Month: name,
        "Total Income": fmt$(inc),
        "Total Expenses": fmt$(exp),
        "Net Profit": fmt$(net),
        "Tax Reserve (30%)": fmt$(net > 0 ? net * (config.taxReserveRate ?? 0.3) : 0),
        "Available Cash": fmt$(net > 0 ? net * (1 - (config.taxReserveRate ?? 0.3)) : net),
      };
    });
    let cumIncome = 0, cumExpenses = 0;
    for (const t of transactions) {
      if (t.type === "income") cumIncome += t.amount;
      else cumExpenses += t.amount;
    }
    monthlyData.push({
      Month: "ANNUAL TOTAL",
      "Total Income": fmt$(cumIncome),
      "Total Expenses": fmt$(cumExpenses),
      "Net Profit": fmt$(cumIncome - cumExpenses),
      "Tax Reserve (30%)": fmt$((cumIncome - cumExpenses) > 0 ? (cumIncome - cumExpenses) * (config.taxReserveRate ?? 0.3) : 0),
      "Available Cash": fmt$((cumIncome - cumExpenses) > 0 ? (cumIncome - cumExpenses) * (1 - (config.taxReserveRate ?? 0.3)) : cumIncome - cumExpenses),
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthlyData), "Monthly Summary");

    if (mode === "full") {
      // ─── Sheet 5: Quarterly Tax Estimates ──────────────────────────
      const netProfit = fmt$(totalIncome - totalExpenses);
      const split = config.ownershipSplit ?? 0.5;
      const yourShare = fmt$(netProfit * split);
      const qbiDeduction = fmt$(yourShare * (config.qbiDeductionRate ?? 0.2));
      const seTax = fmt$(yourShare * (config.selfEmploymentRate ?? 0.153));
      const seDeductionAmt = fmt$(seTax * (config.seDeduction ?? 0.5));
      const taxableIncome = fmt$(yourShare - qbiDeduction - seDeductionAmt);
      const federalTax = fmt$(taxableIncome * (config.federalTaxRate ?? 0.12));
      const stateTax = fmt$(taxableIncome * (config.stateTaxRate ?? 0.0465));

      const quarterPeriods = ["Jan – Mar", "Apr – Jun", "Jul – Sep", "Oct – Dec"];
      const quarterDueDates = ["April 15", "June 15", "September 15", "January 15 (next year)"];

      const taxEstRows = [
        { "": "TAX ASSUMPTIONS", "Value": "" },
        { "": `Federal income tax rate`, "Value": `${((config.federalTaxRate ?? 0.12) * 100).toFixed(1)}%` },
        { "": `Self-employment tax rate`, "Value": `${((config.selfEmploymentRate ?? 0.153) * 100).toFixed(1)}%` },
        { "": `${config.stateName ?? "State"} state tax rate`, "Value": `${((config.stateTaxRate ?? 0.0465) * 100).toFixed(2)}%` },
        { "": `Ownership split`, "Value": `${((config.ownershipSplit ?? 0.5) * 100).toFixed(0)}%` },
        { "": `QBI deduction rate`, "Value": `${((config.qbiDeductionRate ?? 0.2) * 100).toFixed(0)}%` },
        { "": "", "Value": "" },
        { "": "ANNUAL SUMMARY", "Value": "" },
        { "": "LLC Net Profit", "Value": fmt$(netProfit) },
        { "": `${config.partner1Name ?? "Partner 1"}'s Share (${((split) * 100).toFixed(0)}%)`, "Value": fmt$(yourShare) },
        { "": `${config.partner2Name ?? "Partner 2"}'s Share (${((1 - split) * 100).toFixed(0)}%)`, "Value": fmt$(netProfit - yourShare) },
        { "": "", "Value": "" },
        { "": `TAX BREAKDOWN — ${config.partner1Name ?? "Partner 1"}`, "Value": "" },
        { "": "Federal income tax", "Value": fmt$(federalTax) },
        { "": "Self-employment tax", "Value": fmt$(seTax) },
        { "": `${config.stateName ?? "State"} state tax`, "Value": fmt$(stateTax) },
        { "": "TOTAL ESTIMATED TAX", "Value": fmt$(federalTax + seTax + stateTax) },
        { "": "Quarterly payment", "Value": fmt$((federalTax + seTax + stateTax) / 4) },
        { "": "", "Value": "" },
        { "": "QUARTERLY SCHEDULE", "Value": "" },
        ...quarterPeriods.map((period, i) => ({
          "": `Q${i + 1} (${period})`,
          "Value": `Due: ${quarterDueDates[i]}`,
        })),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(taxEstRows), "Tax Estimates");

      // ─── Sheet 6: Partner Split ────────────────────────────────────
      const splitRows = [
        { "": "PARTNER DISTRIBUTION SUMMARY", [config.partner1Name ?? "Partner 1"]: "", [config.partner2Name ?? "Partner 2"]: "" },
        { "": "Share of Net Profit", [config.partner1Name ?? "Partner 1"]: fmt$(yourShare), [config.partner2Name ?? "Partner 2"]: fmt$(netProfit - yourShare) },
        { "": "Estimated Tax Owed", [config.partner1Name ?? "Partner 1"]: fmt$(federalTax + seTax + stateTax), [config.partner2Name ?? "Partner 2"]: fmt$(federalTax + seTax + stateTax) },
        { "": "Distribution Available", [config.partner1Name ?? "Partner 1"]: fmt$(yourShare - (federalTax + seTax + stateTax)), [config.partner2Name ?? "Partner 2"]: fmt$((netProfit - yourShare) - (federalTax + seTax + stateTax)) },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(splitRows), "Partner Split");

      // ─── Sheet 7: Distributions ────────────────────────────────────
      if (distributions.length > 0) {
        const distRows = distributions.map((d) => ({
          Date: new Date(d.date).toLocaleDateString("en-US"),
          Type: d.type,
          "LLC Net Profit": fmt$(d.llcNetProfit),
          [config.partner1Name ?? "Partner 1"]: fmt$(d.partner1Share),
          [config.partner2Name ?? "Partner 2"]: fmt$(d.partner2Share),
          Method: d.method || "",
          "Approved By": d.approvedBy || "",
          Notes: d.notes || "",
        }));
        const totalDist1 = distributions.reduce((s, d) => s + d.partner1Share, 0);
        const totalDist2 = distributions.reduce((s, d) => s + d.partner2Share, 0);
        distRows.push({
          Date: "", Type: "TOTAL",
          "LLC Net Profit": fmt$(distributions.reduce((s, d) => s + d.llcNetProfit, 0)),
          [config.partner1Name ?? "Partner 1"]: fmt$(totalDist1),
          [config.partner2Name ?? "Partner 2"]: fmt$(totalDist2),
          Method: "", "Approved By": "", Notes: "",
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(distRows), "Distributions");
      }

      // ─── Sheet 8: Recurring Expenses ───────────────────────────────
      const recurRows = recurringExpenses.map((r) => ({
        Service: r.service,
        Category: r.category,
        "Monthly Cost": fmt$(r.monthlyCost),
        "Annual Cost": fmt$(r.annualCost || r.monthlyCost * 12),
        "Billing Cycle": r.billingCycle,
        Active: r.active ? "Yes" : "No",
        Notes: r.notes || "",
      }));
      const totalMonthly = recurringExpenses.filter((r) => r.active).reduce((s, r) => s + r.monthlyCost, 0);
      const totalAnnual = recurringExpenses.filter((r) => r.active).reduce((s, r) => s + (r.annualCost || r.monthlyCost * 12), 0);
      recurRows.push({
        Service: "TOTAL (Active)", Category: "",
        "Monthly Cost": fmt$(totalMonthly), "Annual Cost": fmt$(totalAnnual),
        "Billing Cycle": "", Active: "", Notes: "",
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(recurRows), "Recurring Expenses");

      // ─── Sheet 9: Tax Payments ─────────────────────────────────────
      if (taxPayments.length > 0) {
        const tpRows = taxPayments.map((tp) => ({
          Quarter: `Q${tp.quarter}`,
          Type: tp.type.replace("_", " "),
          Amount: fmt$(tp.amount),
          "Due Date": new Date(tp.dueDate).toLocaleDateString("en-US"),
          Paid: tp.paid ? "Yes" : "No",
          "Paid Date": tp.paidDate ? new Date(tp.paidDate).toLocaleDateString("en-US") : "",
          Notes: tp.notes || "",
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tpRows), "Tax Payments");
      }

      // ─── Sheet 10: Filing Dates ────────────────────────────────────
      const filingRows = [
        { Form: "Form 1065 (Partnership Return)", "Due Date": "March 15", Notes: "$220/partner/month penalty if late" },
        { Form: "Schedule K-1 to each partner", "Due Date": "March 15", Notes: "Generated with Form 1065" },
        { Form: "Personal return (Form 1040)", "Due Date": "April 15", Notes: "Extension to Oct 15 via Form 4868" },
        { Form: `${config.stateName} Form 1 (State Personal)`, "Due Date": "April 15", Notes: "File at tap.revenue.wi.gov" },
        { Form: `${config.stateName} Form 3 (State Partnership)`, "Due Date": "March 15", Notes: "CPA handles with 1065" },
        { Form: "WI Annual Report + $25 fee", "Due Date": "June 30", Notes: "Filed at apps.dfi.wi.gov" },
        { Form: "Q1 Estimated Tax", "Due Date": "April 15", Notes: "" },
        { Form: "Q2 Estimated Tax", "Due Date": "June 15", Notes: "" },
        { Form: "Q3 Estimated Tax", "Due Date": "September 15", Notes: "" },
        { Form: "Q4 Estimated Tax", "Due Date": "January 15 (next year)", Notes: "" },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filingRows), "Filing Dates");
    }

    const today = new Date().toISOString().split("T")[0];
    const filename = mode === "full"
      ? `FWU-Tax-Report-${year}-${today}`
      : `FWU-Finance-Export-${today}`;

    if (format === "csv") {
      const csvSections: string[] = [];
      for (const sheetName of wb.SheetNames) {
        csvSections.push(`=== ${sheetName.toUpperCase()} ===`);
        csvSections.push(XLSX.utils.sheet_to_csv(wb.Sheets[sheetName]));
      }
      const csv = csvSections.join("\n\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    }

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("GET /api/finance/export error:", error);
    return NextResponse.json({ error: "Failed to generate export" }, { status: 500 });
  }
}
