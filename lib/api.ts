import type {
  Account,
  AccountHierarchy,
  ImportResult,
  DryRunResult,
  Transaction,
  TransactionCreate,
  TransactionUpdate,
  TransactionFilters,
  TransactionListResponse,
  SimpleTransaction,
  SimpleTransactionCreate,
  SimpleTransactionFilters,
  SimpleTransactionListResponse,
  ConvertToJournalRequest,
  TransactionLineCreate,
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const COMPANY_ID = process.env.NEXT_PUBLIC_COMPANY_ID || "00000000-0000-0000-0000-000000000001";

function getHeaders(): HeadersInit {
  return {
    "X-Company-Id": COMPANY_ID,
    "Content-Type": "application/json",
  };
}

export async function fetchAccounts(): Promise<Account[]> {
  const response = await fetch(`${API_BASE_URL}/v1/accounts`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to fetch accounts");
  }

  const data = await response.json();
  return data.accounts || [];
}

export async function fetchAccountsHierarchy(): Promise<AccountHierarchy[]> {
  const response = await fetch(`${API_BASE_URL}/v1/accounts?hierarchy=true`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to fetch account hierarchy");
  }

  const data = await response.json();
  return data.accounts || [];
}

export async function importCOA(
  file: File,
  dryRun: boolean = false
): Promise<ImportResult | DryRunResult> {
  const formData = new FormData();
  formData.append("file", file);

  // Convert boolean to lowercase string for FastAPI
  const url = `${API_BASE_URL}/v1/accounts/import?dry_run=${dryRun ? 'true' : 'false'}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-Company-Id": COMPANY_ID,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = 'Failed to import accounts';
    try {
      const error = await response.json();
      console.error('Import error:', error);

      // Extract detailed validation errors
      if (error.error?.details && Array.isArray(error.error.details)) {
        const errorDetails = error.error.details
          .map((d: any) => `Row ${d.row}: ${d.message}`)
          .join('\n');
        errorMessage = `${error.error.message}\n\nDetails:\n${errorDetails}`;
      } else {
        errorMessage = error.error?.message || error.detail || errorMessage;
      }
    } catch (e) {
      console.error('Failed to parse error response:', e);
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function exportAccountsCSV(): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/v1/accounts/export`, {
    headers: {
      "X-Company-Id": COMPANY_ID,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to export accounts");
  }

  return response.blob();
}

export async function downloadTemplate(format: 'csv' | 'xlsx'): Promise<Blob> {
  const templateData = [
    ['number', 'name', 'type', 'detail_type', 'parent_number', 'is_active', 'opening_balance', 'opening_balance_date'],
    ['1000', 'Assets', 'asset', 'group', '', 'True', '', ''],
    ['1010', 'Current Assets', 'asset', 'group', '1000', 'True', '', ''],
    ['2000', 'Liabilities', 'liability', 'group', '', 'True', '', ''],
    ['3000', 'Equity', 'equity', 'group', '', 'True', '', ''],
    ['4000', 'Revenue', 'income', 'group', '', 'True', '', ''],
    ['5000', 'Expenses', 'expense', 'group', '', 'True', '', ''],
  ];

  if (format === 'csv') {
    const csv = templateData.map(row => row.join(',')).join('\n');
    return new Blob([csv], { type: 'text/csv' });
  } else {
    // For Excel, we'll just return CSV for now - browser will handle it
    const csv = templateData.map(row => row.join(',')).join('\n');
    return new Blob([csv], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
}

export async function createAccount(account: Omit<Account, 'id' | 'companyId'>): Promise<Account> {
  const response = await fetch(`${API_BASE_URL}/v1/accounts`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(account),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to create account';
    try {
      const error = await response.json();
      errorMessage = error.error?.message || error.detail || errorMessage;
    } catch (e) {
      console.error('Failed to parse error response:', e);
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function updateAccount(id: string, account: Partial<Account>): Promise<Account> {
  const response = await fetch(`${API_BASE_URL}/v1/accounts/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(account),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to update account';
    try {
      const error = await response.json();
      errorMessage = error.error?.message || error.detail || errorMessage;
    } catch (e) {
      console.error('Failed to parse error response:', e);
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function deleteAccount(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/v1/accounts/${id}`, {
    method: "DELETE",
    headers: {
      "X-Company-Id": COMPANY_ID,
    },
  });

  if (!response.ok) {
    let errorMessage = 'Failed to delete account';
    try {
      const error = await response.json();
      errorMessage = error.error?.message || error.detail || errorMessage;
    } catch (e) {
      console.error('Failed to parse error response:', e);
    }
    throw new Error(errorMessage);
  }
}

export async function deleteAllAccounts(): Promise<{ message: string; deleted: { accounts: number; transactions: number; transaction_lines: number } }> {
  const response = await fetch(`${API_BASE_URL}/v1/accounts/`, {
    method: "DELETE",
    headers: {
      "X-Company-Id": COMPANY_ID,
    },
  });

  if (!response.ok) {
    let errorMessage = 'Failed to delete all accounts';
    try {
      const error = await response.json();
      errorMessage = error.error?.message || error.detail || errorMessage;
    } catch (e) {
      console.error('Failed to parse error response:', e);
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function checkHealth(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/v1/health`);

  if (!response.ok) {
    throw new Error("Health check failed");
  }

  return response.json();
}

// Transaction API methods
export const transactions = {
  async list(filters?: TransactionFilters): Promise<TransactionListResponse> {
    const params = new URLSearchParams();
    
    if (filters?.status) params.append('status', filters.status);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.accountId) params.append('accountId', filters.accountId);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.perPage) params.append('perPage', filters.perPage.toString());

    const url = `${API_BASE_URL}/v1/transactions${params.toString() ? '?' + params.toString() : ''}`;
    
    const response = await fetch(url, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to fetch transactions';
      try {
        const error = await response.json();
        errorMessage = error.error?.message || error.detail || errorMessage;
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async get(id: string): Promise<Transaction> {
    const response = await fetch(`${API_BASE_URL}/v1/transactions/${id}`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to fetch transaction';
      try {
        const error = await response.json();
        errorMessage = error.error?.message || error.detail || errorMessage;
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async create(data: TransactionCreate): Promise<Transaction> {
    const response = await fetch(`${API_BASE_URL}/v1/transactions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to create transaction';
      try {
        const error = await response.json();
        errorMessage = error.error?.message || error.detail || errorMessage;
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async update(id: string, data: TransactionUpdate): Promise<Transaction> {
    const response = await fetch(`${API_BASE_URL}/v1/transactions/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to update transaction';
      try {
        const error = await response.json();
        errorMessage = error.error?.message || error.detail || errorMessage;
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/v1/transactions/${id}`, {
      method: 'DELETE',
      headers: {
        "X-Company-Id": COMPANY_ID,
      },
    });

    if (!response.ok) {
      let errorMessage = 'Failed to delete transaction';
      try {
        const error = await response.json();
        errorMessage = error.error?.message || error.detail || errorMessage;
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      throw new Error(errorMessage);
    }
  },

  async post(id: string): Promise<Transaction> {
    const response = await fetch(`${API_BASE_URL}/v1/transactions/${id}/post`, {
      method: 'POST',
      headers: getHeaders(),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to post transaction';
      try {
        const error = await response.json();
        errorMessage = error.error?.message || error.detail || errorMessage;
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },
};

// Simple Transactions API methods (user-friendly entry)
export const simpleTransactions = {
  async list(filters?: SimpleTransactionFilters): Promise<SimpleTransactionListResponse> {
    const params = new URLSearchParams();
    
    if (filters?.status) params.append('status', filters.status);
    if (filters?.needsReview !== undefined) params.append('needsReview', filters.needsReview.toString());
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.perPage) params.append('perPage', filters.perPage.toString());

    const url = `${API_BASE_URL}/v1/transactions/simple${params.toString() ? '?' + params.toString() : ''}`;
    
    const response = await fetch(url, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to fetch simple transactions';
      try {
        const error = await response.json();
        errorMessage = error.error?.message || error.detail || errorMessage;
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async get(id: string): Promise<SimpleTransaction> {
    const response = await fetch(`${API_BASE_URL}/v1/transactions/simple/${id}`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to fetch simple transaction';
      try {
        const error = await response.json();
        errorMessage = error.error?.message || error.detail || errorMessage;
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async create(data: SimpleTransactionCreate): Promise<SimpleTransaction> {
    const response = await fetch(`${API_BASE_URL}/v1/transactions/simple`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to create simple transaction';
      try {
        const error = await response.json();
        errorMessage = error.error?.message || error.detail || errorMessage;
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async convertToJournal(id: string, lines: TransactionLineCreate[]): Promise<Transaction> {
    const response = await fetch(`${API_BASE_URL}/v1/transactions/${id}/convert`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ lines }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to convert to journal entry';
      try {
        const error = await response.json();
        errorMessage = error.error?.message || error.detail || errorMessage;
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },
};

// Opening Balances API methods
export const openingBalances = {
  async get(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/v1/opening-balances`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to fetch opening balances';
      try {
        const error = await response.json();
        errorMessage = error.error?.message || error.detail || errorMessage;
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async set(data: { asOfDate: string; balances: Array<{ accountId: string; balance: number; memo?: string }> }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/v1/opening-balances`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to set opening balances';
      try {
        const error = await response.json();
        errorMessage = error.error?.message || error.detail || errorMessage;
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },
};

// Documents API methods
export const documents = {
  async upload(file: File): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/v1/documents/upload`, {
      method: "POST",
      headers: {
        "X-Company-Id": COMPANY_ID,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = "Failed to upload document";
      try {
        const error = await response.json();
        errorMessage = error.error?.message || error.detail || errorMessage;
      } catch (e) {
        console.error("Failed to parse error response:", e);
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async process(documentId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/v1/documents/${documentId}/process`, {
      method: "POST",
      headers: getHeaders(),
    });

    if (!response.ok) {
      let errorMessage = "Failed to process document";
      try {
        const error = await response.json();
        errorMessage = error.error?.message || error.detail || errorMessage;
      } catch (e) {
        console.error("Failed to parse error response:", e);
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async get(documentId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/v1/documents/${documentId}`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      let errorMessage = "Failed to get document";
      try {
        const error = await response.json();
        errorMessage = error.error?.message || error.detail || errorMessage;
      } catch (e) {
        console.error("Failed to parse error response:", e);
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async update(documentId: string, updates: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/v1/documents/${documentId}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      let errorMessage = "Failed to update document";
      try {
        const error = await response.json();
        errorMessage = error.error?.message || error.detail || errorMessage;
      } catch (e) {
        console.error("Failed to parse error response:", e);
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },
};

export { API_BASE_URL, COMPANY_ID };
