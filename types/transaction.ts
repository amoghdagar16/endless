// TypeScript types for transactions matching backend schemas

export interface TransactionLine {
  id: string;
  accountId: string;
  accountNumber: string;
  accountName: string;
  debit: number;
  credit: number;
  memo: string | null;
}

export interface TransactionLineCreate {
  accountId: string;
  debit: number;
  credit: number;
  memo?: string | null;
}

export interface Transaction {
  id: string;
  companyId: string;
  date: string;
  description: string;
  reference: string | null;
  source: string;
  status: 'draft' | 'posted';
  totalDebit: number;
  totalCredit: number;
  vendorName?: string | null;
  amount?: number | null;
  createdAt?: string;
  updatedAt?: string;
  lines: TransactionLine[];
}

export interface TransactionCreate {
  date: string;
  description: string;
  reference?: string | null;
  source?: string;
  lines: TransactionLineCreate[];
}

export interface TransactionUpdate {
  date?: string;
  description?: string;
  reference?: string | null;
  lines?: TransactionLineCreate[];
}

export interface TransactionFilters {
  status?: 'draft' | 'posted' | '';
  dateFrom?: string;
  dateTo?: string;
  accountId?: string;
  page?: number;
  perPage?: number;
}

export interface TransactionListResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  perPage: number;
}

// Simple Transaction Types (user-friendly entry)

export interface SimpleTransaction {
  id: string;
  vendorName: string;
  date: string;
  amount: number;
  description: string;
  reference: string | null;
  status: 'draft' | 'posted';
  source: string;
  needsReview: boolean;
  createdAt: string | null;
}

export interface SimpleTransactionCreate {
  vendorName: string;
  date: string;
  amount: number;
  description: string;
  reference?: string | null;
}

export interface SimpleTransactionFilters {
  status?: 'draft' | 'posted' | '';
  needsReview?: boolean;
  page?: number;
  perPage?: number;
}

export interface SimpleTransactionListResponse {
  transactions: SimpleTransaction[];
  total: number;
  page: number;
  perPage: number;
}

export interface ConvertToJournalRequest {
  lines: TransactionLineCreate[];
}

