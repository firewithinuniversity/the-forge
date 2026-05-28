-- CreateTable
CREATE TABLE "TaxConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "federalTaxRate" REAL NOT NULL DEFAULT 0.12,
    "selfEmploymentRate" REAL NOT NULL DEFAULT 0.153,
    "seDeduction" REAL NOT NULL DEFAULT 0.5,
    "stateTaxRate" REAL NOT NULL DEFAULT 0.0465,
    "stateName" TEXT NOT NULL DEFAULT 'Wisconsin',
    "ownershipSplit" REAL NOT NULL DEFAULT 0.5,
    "qbiDeductionRate" REAL NOT NULL DEFAULT 0.2,
    "taxReserveRate" REAL NOT NULL DEFAULT 0.30,
    "partner1Name" TEXT NOT NULL DEFAULT 'Brett Breunig',
    "partner2Name" TEXT NOT NULL DEFAULT 'Jude Begay',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TaxPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "paidDate" DATETIME,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RecurringExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "service" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "monthlyCost" REAL NOT NULL,
    "annualCost" REAL,
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "nextDueDate" DATETIME,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Distribution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'quarterly',
    "llcNetProfit" REAL NOT NULL,
    "partner1Share" REAL NOT NULL,
    "partner2Share" REAL NOT NULL,
    "method" TEXT,
    "approvedBy" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "TaxPayment_year_idx" ON "TaxPayment"("year");

-- CreateIndex
CREATE UNIQUE INDEX "TaxPayment_year_quarter_type_key" ON "TaxPayment"("year", "quarter", "type");

-- CreateIndex
CREATE INDEX "Distribution_date_idx" ON "Distribution"("date");
