// Types for Budget Limit operations

export interface BudgetLimitCreateInput {
  userId: string;
  period: string;
  limitAmount: number;
  currency: string;
  month?: number;
  year: number;
}

export interface ExpenseCreateInput {
  userId: string;
  title: string;
  amount: number;
  date: Date;
  category?: string;
}
