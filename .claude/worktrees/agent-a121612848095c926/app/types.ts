/**
 * Shared TypeScript interfaces for The Forge
 */

// ─── Core Entities ───

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  color?: string;
}

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  projectId: string | null;
  recurring: boolean;
  notes: string | null;
  receiptSaved: boolean;
  taxDeductible: string;
  project: ProjectSummary | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string | null;
}

export interface NoteData {
  id: string;
  title: string;
  content: string;
  projectId: string | null;
  pinned: boolean;
  category: string;
  project: { id: string; name: string; color: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DistributionData {
  id: string;
  date: string;
  type: string;
  llcNetProfit: number;
  partner1Share: number;
  partner2Share: number;
  method: string | null;
  approvedBy: string | null;
  notes: string | null;
}

export interface RecurringExpenseData {
  id: string;
  service: string;
  category: string;
  monthlyCost: number;
  annualCost: number | null;
  billingCycle: string;
  nextDueDate: string | null;
  active: boolean;
  notes: string | null;
}

export interface TaxPaymentData {
  id: string;
  year: number;
  quarter: number;
  type: string;
  amount: number;
  paid: boolean;
  paidDate: string | null;
  dueDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Finance Aggregates ───

export interface FinanceSummary {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyNet: number;
  ytdNet: number;
}

export interface ChartDataPoint {
  month: string;
  income: number;
  expenses: number;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
}

export interface FinanceData {
  transactions: Transaction[];
  categories: Category[];
  projects: { id: string; name: string }[];
  summary: FinanceSummary;
  monthlyChart: ChartDataPoint[];
  categoryBreakdown: CategoryBreakdown[];
}

// ─── Activity Feed ───

export interface ActivityItem {
  id: string;
  text: string;
  detail: string;
  timestamp: string;
  color: string;
  href?: string;
}
