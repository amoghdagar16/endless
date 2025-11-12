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
