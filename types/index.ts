// TypeScript types matching backend schemas

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense' | 'other';

export interface Account {
  id: string;
  companyId: string;
  number: string;
  name: string;
  type: AccountType;
  detail_type: string | null;
  parentId: string | null;
  parentNumber: string | null;
  isActive: boolean;
  openingBalance: number | null;
  openingBalanceDate: string | null;
}

export interface AccountHierarchy {
  id: string;
  number: string;
  name: string;
  type: AccountType;
  detail_type: string | null;
  is_active: boolean;
  children: AccountHierarchy[];
}

export interface ImportResult {
  inserted: number;
  warnings: ImportMessage[];
}

export interface ImportMessage {
  level: string;
  message: string;
  row: number | null;
}

export interface DryRunResult {
  proposedAccounts: ProposedAccount[];
  errors: ImportMessage[];
  warnings: ImportMessage[];
}

export interface ProposedAccount {
  number: string;
  name: string;
  type: string;
  detail_type: string | null;
  parent_number: string | null;
  is_active: boolean;
  opening_balance: number | null;
  opening_balance_date: string | null;
}

export interface Document {
  id: string;
  filename: string;
  uploadDate: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  extractedData?: any;
}

export interface HealthCheck {
  status: string;
}

// Export transaction types
export * from './transaction';
