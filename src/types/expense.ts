export interface BankAccountInfo {
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
}

export interface ExpenseDetailItem {
  id?: string;
  employeeCode: string;
  fullName: string;
  taxCode?: string;
  bankAccount: BankAccountInfo;
  taxableIncome: number;
  personalIncomeTax: number;
  netIncome: number;
  workLocation?: string;
  paymentDate: string;
  paymentContent?: string;
  onboardDate?: string | null;
  offboardDate?: string | null;
  period: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CollaboratorExpenseSummary {
  id?: string;
  employeeCode: string;
  fullName: string;
  taxCode?: string;
  totalPaymentCount: number;
  onboardDate?: string | null;
  offboardDate?: string | null;
  latestPaymentDate?: string | null;
  latestPeriod?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface MonthlyCollaboratorCountStat {
  period: string;
  label: string;
  count: number;
}

export interface MonthlyPaymentAmountStat {
  period: string;
  label: string;
  totalNetIncome: number;
  totalTaxableIncome: number;
  totalPersonalIncomeTax: number;
}

export interface ExpenseStatsResponse {
  totalPaidAmount: number;
  totalTaxableAmount: number;
  totalTaxAmount: number;
  totalPaymentTransactions: number;
  totalCollaborators: number;
  latestPeriod?: string | null;
  collaboratorCountsByMonth: MonthlyCollaboratorCountStat[];
  paymentAmountsByMonth: MonthlyPaymentAmountStat[];
}

export interface ExpenseImportResponse {
  success: boolean;
  totalRows: number;
  importedDetails: number;
  updatedDetails: number;
  newReconciliationCreated: number;
  collaboratorsCount: number;
  periodsAffected: string[];
  warnings?: string[];
  message: string;
}

export interface PaginatedExpenseDetails {
  items: ExpenseDetailItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaginatedExpenseCollaborators {
  items: CollaboratorExpenseSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
