# Expense Tracker with ML-Powered Auto-Drafting
## Strategic Implementation Plan

**Version**: 1.0
**Date**: November 11, 2025
**Status**: Planning Phase

---

## Executive Summary

This plan outlines the implementation of a dual-entry system for the accounting platform:

1. **Expense Tracker** - Simplified interface for everyday users to log expenses quickly
2. **Journal Entry System** - Professional accounting interface for accountants (already implemented)
3. **ML Auto-Drafting Engine** - Machine learning system that learns from user patterns to automatically suggest debit/credit account assignments

The expense tracker will lower the barrier to entry for non-accountants while the ML engine bridges the gap by learning user patterns and automatically generating draft journal entries that can be reviewed before posting.

---

## Vision & User Personas

### Target Users

#### 1. Everyday User (Expense Tracker)
**Profile**: Small business owner, freelancer, or employee
- Limited accounting knowledge
- Wants to quickly log expenses
- Needs simple categorization
- Prefers natural language descriptions
- Mobile-first mindset

**Current Pain Points**:
- Journal entry system too complex
- Don't understand debits/credits
- Need to track expenses but fear making mistakes
- Want quick capture, not accounting theory

#### 2. Professional Accountant (Journal Entry)
**Profile**: Trained accountant, bookkeeper, or finance professional
- Deep accounting knowledge
- Needs full control over entries
- Understands double-entry bookkeeping
- Requires audit trails and compliance
- Desktop-focused workflow

**Current Needs**:
- Full journal entry control (already available)
- Review and approve auto-drafted expenses
- Correct ML suggestions when needed
- Train the system over time

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         USER LAYER                          │
├──────────────────────────┬──────────────────────────────────┤
│   Expense Tracker UI     │    Journal Entry UI (Existing)   │
│   (Simple/Consumer)      │    (Professional/Accountant)     │
└──────────────┬───────────┴──────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────────────────────────────────────┐
│                      API LAYER                               │
├──────────────────────────┬───────────────────────────────────┤
│  /v1/expenses/*          │  /v1/transactions/* (Existing)    │
│  /v1/ml/train            │                                   │
│  /v1/ml/suggest          │                                   │
└──────────────┬───────────┴──────────────────┬────────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                             │
├──────────────────────────┬───────────────────────────────────┤
│  ExpenseService          │  TransactionService (Existing)    │
│  MLSuggestionService     │  PostingService                   │
│  CategoryMappingService  │  AuditService                     │
└──────────────┬───────────┴──────────────────┬────────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────────────────────────────────────┐
│                     DATA LAYER                               │
├──────────────────────────┬───────────────────────────────────┤
│  expenses                │  transactions (Existing)          │
│  expense_categories      │  transaction_lines                │
│  ml_training_data        │  accounts                         │
│  ml_models               │  periods                          │
└──────────────────────────┴───────────────────────────────────┘
```

---

## Phase 1: Foundation - Expense Tracker Backend

### Overview
Build the core expense tracking system with simplified data model and API.

### 1.1 Database Schema Design

#### **expenses** Table
```sql
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NULL,  -- Future: user who created expense

    -- Basic Info
    date DATE NOT NULL,
    amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    merchant VARCHAR(255) NULL,

    -- Simplified Categorization
    category_id UUID NULL REFERENCES expense_categories(id),
    payment_method VARCHAR(50) NULL,  -- cash, credit_card, bank_transfer, etc.

    -- ML Processing
    suggested_debit_account_id UUID NULL REFERENCES accounts(id),
    suggested_credit_account_id UUID NULL REFERENCES accounts(id),
    ml_confidence NUMERIC(5,4) NULL,  -- 0.0000 to 1.0000

    -- Draft Transaction Link
    draft_transaction_id UUID NULL REFERENCES transactions(id) ON DELETE SET NULL,

    -- Status Workflow
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
        -- 'pending': Just created, not yet drafted
        -- 'drafted': ML created draft transaction
        -- 'posted': Approved and posted to ledger
        -- 'rejected': User rejected this expense

    -- Attachments (Future)
    receipt_url TEXT NULL,

    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID NULL,

    -- Indexes
    CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(id),
    CONSTRAINT fk_draft_transaction FOREIGN KEY (draft_transaction_id)
        REFERENCES transactions(id) ON DELETE SET NULL
);

CREATE INDEX idx_expenses_company_date ON expenses(company_id, date);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_created_at ON expenses(created_at);
```

#### **expense_categories** Table
```sql
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Category Info
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    icon VARCHAR(50) NULL,  -- For UI display
    color VARCHAR(7) NULL,  -- Hex color code

    -- Default Account Mapping (Optional)
    default_debit_account_id UUID NULL REFERENCES accounts(id),
    default_credit_account_id UUID NULL REFERENCES accounts(id),

    -- Hierarchy (Optional)
    parent_id UUID NULL REFERENCES expense_categories(id),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_expense_category_name UNIQUE (company_id, name)
);

CREATE INDEX idx_expense_categories_company ON expense_categories(company_id);
```

#### **ml_training_data** Table
```sql
CREATE TABLE ml_training_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Input Features
    description TEXT NOT NULL,
    merchant VARCHAR(255) NULL,
    amount NUMERIC(18,2) NOT NULL,
    category_id UUID NULL REFERENCES expense_categories(id),
    day_of_week INTEGER NULL,  -- 0-6
    month INTEGER NULL,  -- 1-12

    -- Output Labels (What user chose)
    debit_account_id UUID NOT NULL REFERENCES accounts(id),
    credit_account_id UUID NOT NULL REFERENCES accounts(id),

    -- Metadata
    expense_id UUID NULL REFERENCES expenses(id) ON DELETE SET NULL,
    transaction_id UUID NULL REFERENCES transactions(id) ON DELETE SET NULL,
    was_suggested BOOLEAN NOT NULL DEFAULT FALSE,  -- Did ML suggest this?
    was_accepted BOOLEAN NOT NULL DEFAULT TRUE,    -- Did user accept suggestion?

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_ml_company FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE INDEX idx_ml_training_company ON ml_training_data(company_id);
CREATE INDEX idx_ml_training_description ON ml_training_data
    USING GIN (to_tsvector('english', description));
```

#### **ml_models** Table
```sql
CREATE TABLE ml_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Model Info
    model_type VARCHAR(50) NOT NULL,  -- 'decision_tree', 'random_forest', 'neural_net'
    version VARCHAR(50) NOT NULL,

    -- Model Binary Storage
    model_data BYTEA NOT NULL,  -- Serialized model (pickle/joblib)

    -- Performance Metrics
    accuracy NUMERIC(5,4) NULL,
    training_samples INTEGER NOT NULL,
    feature_importance JSONB NULL,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT FALSE,

    trained_at TIMESTAMP NOT NULL DEFAULT NOW(),
    activated_at TIMESTAMP NULL,

    CONSTRAINT uk_ml_model_version UNIQUE (company_id, version)
);

CREATE INDEX idx_ml_models_company_active ON ml_models(company_id, is_active);
```

### 1.2 Backend Services

#### **ExpenseService** (`backend/app/services/expense_service.py`)

**Core Methods**:
```python
class ExpenseService:
    """Service for managing expense entries."""

    async def create_expense(
        self,
        db: Session,
        company_id: UUID,
        data: ExpenseCreate,
        user_id: Optional[UUID] = None
    ) -> Expense:
        """
        Create a new expense entry.

        Flow:
        1. Validate amount > 0
        2. Validate category exists (if provided)
        3. Create expense record with status='pending'
        4. Optionally trigger ML suggestion
        5. Return expense with suggestions
        """

    async def get_expense(
        self,
        db: Session,
        expense_id: UUID,
        company_id: UUID
    ) -> Expense:
        """Get single expense with relationships."""

    async def list_expenses(
        self,
        db: Session,
        company_id: UUID,
        filters: ExpenseFilters
    ) -> ExpenseList:
        """
        List expenses with filtering and pagination.

        Filters:
        - status: pending, drafted, posted, rejected
        - date_from, date_to
        - category_id
        - min_amount, max_amount
        - search: text search in description/merchant
        """

    async def update_expense(
        self,
        db: Session,
        expense_id: UUID,
        company_id: UUID,
        data: ExpenseUpdate
    ) -> Expense:
        """
        Update expense (only if status='pending' or 'drafted').
        Cannot update after posted.
        """

    async def delete_expense(
        self,
        db: Session,
        expense_id: UUID,
        company_id: UUID
    ) -> None:
        """
        Delete expense (only if status='pending' or 'drafted').
        Also deletes linked draft transaction.
        """

    async def approve_and_post_expense(
        self,
        db: Session,
        expense_id: UUID,
        company_id: UUID,
        override_accounts: Optional[Dict] = None
    ) -> Transaction:
        """
        Approve expense and post to ledger.

        Flow:
        1. Validate expense status (must be 'drafted' or 'pending')
        2. Get or create draft transaction
        3. Apply account overrides if provided
        4. Post transaction (TransactionService)
        5. Update expense status to 'posted'
        6. Create ML training data record
        7. Return posted transaction
        """

    async def reject_expense(
        self,
        db: Session,
        expense_id: UUID,
        company_id: UUID,
        reason: Optional[str] = None
    ) -> None:
        """Mark expense as rejected."""

    async def bulk_approve(
        self,
        db: Session,
        expense_ids: List[UUID],
        company_id: UUID
    ) -> List[Transaction]:
        """Approve and post multiple expenses at once."""
```

#### **CategoryService** (`backend/app/services/category_service.py`)

**Core Methods**:
```python
class CategoryService:
    """Service for managing expense categories."""

    async def create_category(
        self,
        db: Session,
        company_id: UUID,
        data: CategoryCreate
    ) -> ExpenseCategory:
        """Create new expense category."""

    async def list_categories(
        self,
        db: Session,
        company_id: UUID,
        active_only: bool = True
    ) -> List[ExpenseCategory]:
        """List all categories for company."""

    async def update_category(
        self,
        db: Session,
        category_id: UUID,
        company_id: UUID,
        data: CategoryUpdate
    ) -> ExpenseCategory:
        """Update category details."""

    async def delete_category(
        self,
        db: Session,
        category_id: UUID,
        company_id: UUID
    ) -> None:
        """Soft delete category (set is_active=False)."""

    async def seed_default_categories(
        self,
        db: Session,
        company_id: UUID
    ) -> List[ExpenseCategory]:
        """
        Create default categories for new companies.

        Default Categories:
        - Travel & Transportation
        - Meals & Entertainment
        - Office Supplies
        - Utilities
        - Rent & Facilities
        - Professional Services
        - Marketing & Advertising
        - Software & Subscriptions
        - Insurance
        - Other
        """
```

### 1.3 API Endpoints

#### **Expense Routes** (`backend/app/api/v1/routes/expenses.py`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/expenses` | Create new expense |
| GET | `/v1/expenses` | List expenses (filtered/paginated) |
| GET | `/v1/expenses/{id}` | Get single expense |
| PUT | `/v1/expenses/{id}` | Update expense |
| DELETE | `/v1/expenses/{id}` | Delete expense |
| POST | `/v1/expenses/{id}/approve` | Approve and post to ledger |
| POST | `/v1/expenses/{id}/reject` | Reject expense |
| POST | `/v1/expenses/bulk-approve` | Bulk approve multiple expenses |
| GET | `/v1/expenses/{id}/suggestions` | Get ML suggestions for expense |

#### **Category Routes** (`backend/app/api/v1/routes/categories.py`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/expense-categories` | Create category |
| GET | `/v1/expense-categories` | List categories |
| GET | `/v1/expense-categories/{id}` | Get single category |
| PUT | `/v1/expense-categories/{id}` | Update category |
| DELETE | `/v1/expense-categories/{id}` | Delete category |
| POST | `/v1/expense-categories/seed` | Seed default categories |

### 1.4 Request/Response Schemas

```python
# backend/app/schemas/expenses.py

class ExpenseCreate(BaseModel):
    date: date
    amount: Decimal
    description: str
    merchant: Optional[str] = None
    category_id: Optional[UUID] = None
    payment_method: Optional[str] = None

    class Config:
        alias_generator = to_camel
        populate_by_name = True

class ExpenseResponse(BaseModel):
    id: UUID
    company_id: UUID
    date: date
    amount: Decimal
    description: str
    merchant: Optional[str]
    category_id: Optional[UUID]
    category_name: Optional[str]  # Joined from category
    payment_method: Optional[str]
    status: str

    # ML Suggestions
    suggested_debit_account_id: Optional[UUID]
    suggested_debit_account_name: Optional[str]
    suggested_credit_account_id: Optional[UUID]
    suggested_credit_account_name: Optional[str]
    ml_confidence: Optional[Decimal]

    # Links
    draft_transaction_id: Optional[UUID]

    created_at: datetime

    class Config:
        alias_generator = to_camel
        populate_by_name = True
        from_attributes = True

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    default_debit_account_id: Optional[UUID] = None
    default_credit_account_id: Optional[UUID] = None
    parent_id: Optional[UUID] = None
```

---

## Phase 2: ML Auto-Drafting Engine

### Overview
Build the machine learning system that learns from user behavior to automatically suggest account assignments.

### 2.1 ML Architecture

#### **Approach: Hybrid Rule-Based + ML System**

**Stage 1: Rule-Based (Bootstrap Phase)**
- Use category default mappings
- Use keyword matching (e.g., "rent" → Rent Expense)
- Use merchant matching (e.g., "Amazon" → Office Supplies)
- Confidence: 0.6 - 0.7

**Stage 2: Classical ML (10+ training samples)**
- Decision Tree / Random Forest
- Features: description tokens, merchant, amount range, category, date features
- Confidence: 0.7 - 0.9

**Stage 3: Deep Learning (100+ training samples)**
- Neural network or transformer-based model
- Natural language understanding of descriptions
- Confidence: 0.85 - 0.98

### 2.2 Feature Engineering

#### **Input Features**

1. **Text Features**:
   - Description (TF-IDF or embeddings)
   - Merchant name
   - Payment method

2. **Numerical Features**:
   - Amount (normalized)
   - Amount range bucket (0-50, 50-200, 200-1000, 1000+)
   - Day of week (0-6)
   - Month (1-12)
   - Is weekend (boolean)

3. **Categorical Features**:
   - Category ID (if provided)
   - Payment method (one-hot encoded)

4. **Historical Features** (for experienced models):
   - User's most common debit account
   - User's most common credit account for category
   - Frequency of this merchant

#### **Output Labels**

- **Debit Account ID** (classification)
- **Credit Account ID** (classification)
- **Confidence Score** (probability)

### 2.3 ML Service Implementation

#### **MLSuggestionService** (`backend/app/services/ml_suggestion_service.py`)

```python
class MLSuggestionService:
    """Machine learning service for account suggestions."""

    async def suggest_accounts(
        self,
        db: Session,
        company_id: UUID,
        expense: Expense
    ) -> AccountSuggestion:
        """
        Suggest debit/credit accounts for an expense.

        Flow:
        1. Check if ML model exists and is trained
        2. Extract features from expense
        3. Get predictions from model
        4. Fall back to rule-based if no model or low confidence
        5. Return suggestion with confidence score

        Returns:
            AccountSuggestion(
                debit_account_id=UUID,
                credit_account_id=UUID,
                confidence=0.85,
                method='ml' | 'rule_based' | 'category_default'
            )
        """

    async def get_or_train_model(
        self,
        db: Session,
        company_id: UUID,
        force_retrain: bool = False
    ) -> Optional[MLModel]:
        """
        Get active ML model or train a new one.

        Training Triggers:
        - No active model exists
        - force_retrain=True
        - New training data available (threshold: 10 samples)
        - Scheduled retrain (weekly)

        Returns:
            MLModel instance or None if insufficient data
        """

    async def train_model(
        self,
        db: Session,
        company_id: UUID
    ) -> MLModel:
        """
        Train a new ML model for the company.

        Flow:
        1. Fetch training data from ml_training_data table
        2. Check minimum sample size (10 samples minimum)
        3. Prepare features and labels
        4. Split train/test
        5. Train model (RandomForest or DecisionTree)
        6. Evaluate model (accuracy, precision, recall)
        7. Serialize model to BYTEA
        8. Save to ml_models table
        9. Activate model if accuracy > 0.7
        10. Return model instance

        Model Selection:
        - 10-50 samples: Decision Tree
        - 50-200 samples: Random Forest
        - 200+ samples: Gradient Boosting or Neural Net
        """

    async def add_training_data(
        self,
        db: Session,
        company_id: UUID,
        expense: Expense,
        transaction: Transaction,
        was_suggested: bool,
        was_accepted: bool
    ) -> MLTrainingData:
        """
        Add new training sample after user approves/edits expense.

        This is called after:
        - User approves ML suggestion
        - User edits accounts and approves
        - User manually posts transaction from expense
        """

    async def get_model_stats(
        self,
        db: Session,
        company_id: UUID
    ) -> ModelStats:
        """
        Get statistics about current ML model.

        Returns:
            ModelStats(
                is_trained=True,
                training_samples=45,
                accuracy=0.85,
                last_trained_at=datetime,
                suggestion_acceptance_rate=0.78,
                top_features=['description', 'category', 'amount']
            )
        """

    def _extract_features(
        self,
        expense: Expense
    ) -> np.ndarray:
        """Extract feature vector from expense."""

    def _rule_based_suggestion(
        self,
        db: Session,
        company_id: UUID,
        expense: Expense
    ) -> AccountSuggestion:
        """
        Fallback rule-based suggestion.

        Rules:
        1. If category has default accounts → use them
        2. If merchant matches known pattern → use pattern
        3. If description contains keywords → use keyword mapping
        4. Default: Expense account + Cash/Bank account
        """
```

### 2.4 ML API Endpoints

#### **ML Routes** (`backend/app/api/v1/routes/ml.py`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/ml/suggest` | Get account suggestions for expense data |
| POST | `/v1/ml/train` | Manually trigger model retraining |
| GET | `/v1/ml/stats` | Get model statistics and performance |
| POST | `/v1/ml/feedback` | Submit feedback on suggestion quality |

---

## Phase 3: Expense Tracker Frontend

### Overview
Build a user-friendly interface for everyday users to quickly log expenses.

### 3.1 Page Structure

#### **Expense List Page** (`frontend/app/expenses/page.tsx`)

**Features**:
- Quick expense entry form at top
- List of recent expenses below
- Status filters (pending, drafted, posted)
- Date range filter
- Category filter
- Search by description/merchant
- Bulk approve button
- Mobile-responsive card layout

**Quick Entry Form**:
```tsx
<QuickExpenseForm>
  <DatePicker label="Date" />
  <CurrencyInput label="Amount" />
  <TextInput label="Description" placeholder="What did you buy?" />
  <TextInput label="Merchant" placeholder="Where?" optional />
  <CategorySelect label="Category" />
  <PaymentMethodSelect label="Payment" />
  <Button type="submit">Add Expense</Button>
</QuickExpenseForm>
```

**Expense Card**:
```tsx
<ExpenseCard>
  <Badge status={expense.status} />
  <Date>{expense.date}</Date>
  <Description>{expense.description}</Description>
  <Merchant>{expense.merchant}</Merchant>
  <Amount>${expense.amount}</Amount>
  <Category>{expense.category?.name}</Category>

  {expense.status === 'drafted' && (
    <MLSuggestion>
      <Icon name="sparkle" />
      <Text>Auto-drafted: {debitAccount} → {creditAccount}</Text>
      <Confidence>{(confidence * 100).toFixed(0)}%</Confidence>
      <Actions>
        <Button onClick={approve}>Approve</Button>
        <Button onClick={edit}>Edit Accounts</Button>
      </Actions>
    </MLSuggestion>
  )}
</ExpenseCard>
```

#### **Expense Detail Page** (`frontend/app/expenses/[id]/page.tsx`)

**Features**:
- Full expense details
- Linked draft transaction view
- ML suggestion details and confidence
- Edit accounts interface
- Approve/reject actions
- Receipt upload (future)
- Audit trail

#### **Category Management Page** (`frontend/app/expenses/categories/page.tsx`)

**Features**:
- List of categories with icons
- Add/edit/delete categories
- Set default account mappings per category
- Reorder categories (drag & drop)
- Color picker for visual identification

### 3.2 Components

#### **ExpenseForm Component**
```tsx
interface ExpenseFormProps {
  initialData?: Expense;
  onSubmit: (data: ExpenseCreate) => Promise<void>;
  mode: 'create' | 'edit';
}

export function ExpenseForm({ initialData, onSubmit, mode }: ExpenseFormProps) {
  // Form with validation
  // Auto-trigger ML suggestion after form fill (debounced)
  // Show suggested accounts in real-time
  // Allow account override before submit
}
```

#### **MLSuggestionBadge Component**
```tsx
interface MLSuggestionBadgeProps {
  debitAccount: Account;
  creditAccount: Account;
  confidence: number;
  method: 'ml' | 'rule_based' | 'category_default';
}

export function MLSuggestionBadge({
  debitAccount,
  creditAccount,
  confidence,
  method
}: MLSuggestionBadgeProps) {
  // Visual indicator of ML suggestion
  // Confidence meter
  // Clickable to edit
  // Different styling based on method and confidence
}
```

#### **AccountSelector Component**
```tsx
interface AccountSelectorProps {
  label: string;
  value: string;
  onChange: (accountId: string) => void;
  accountType?: 'debit' | 'credit';
  suggested?: string;  // Highlighted suggestion
}

export function AccountSelector({
  label,
  value,
  onChange,
  suggested
}: AccountSelectorProps) {
  // Searchable dropdown
  // Show account number + name
  // Highlight suggested account
  // Group by account type
}
```

### 3.3 User Flows

#### **Flow 1: Quick Expense Entry (First-Time User)**

1. User opens Expense Tracker
2. Fills quick entry form:
   - Date: Today (default)
   - Amount: $45.00
   - Description: "Office lunch with client"
   - Merchant: "The Bistro"
   - Category: "Meals & Entertainment"
   - Payment: "Credit Card"
3. Clicks "Add Expense"
4. System creates expense with status='pending'
5. ML service runs (rule-based, no model yet)
6. Suggests: Meals Expense (debit) / Credit Card (credit)
7. Confidence: 65% (rule-based)
8. Expense card shows suggestion
9. User clicks "Approve"
10. System posts transaction
11. Adds to ML training data
12. Expense status → 'posted'

#### **Flow 2: Expense with ML Suggestion (Trained Model)**

1. User adds expense: "$120 - Zoom subscription"
2. ML model runs (has 50+ training samples)
3. Suggests: Software Expense (debit) / Bank Account (credit)
4. Confidence: 92% (ML-based)
5. Shows green badge: "High Confidence ✓"
6. User reviews suggestion
7. Clicks "Approve"
8. Transaction posted automatically
9. ML training data added with was_accepted=true

#### **Flow 3: Editing ML Suggestion**

1. User adds expense: "$500 - New laptop"
2. ML suggests: Office Supplies (debit) / Bank (credit)
3. Confidence: 78%
4. User thinks: "No, this should be Equipment"
5. Clicks "Edit Accounts"
6. Modal opens with account selectors
7. Changes debit to: Equipment/Computer Equipment
8. Keeps credit as: Bank Account
9. Clicks "Approve"
10. Transaction posted with user's choice
11. ML training data added with was_accepted=false
12. Model learns: "laptop" → Equipment, not Office Supplies

#### **Flow 4: Bulk Approval**

1. User logs 10 expenses throughout week
2. All auto-drafted with ML suggestions
3. User reviews list on Friday
4. Selects 8 expenses with good suggestions
5. Clicks "Approve Selected (8)"
6. Confirmation modal shows total amount
7. User confirms
8. System posts all 8 transactions in batch
9. Success message: "8 expenses posted"
10. Remaining 2 expenses stay for review

---

## Phase 4: Integration & Workflow

### Overview
Connect expense tracker with journal entry system and establish approval workflows.

### 4.1 Expense → Transaction Bridge

#### **Draft Transaction Creation**

When ML suggests accounts for an expense, system automatically creates a **draft transaction**:

```python
async def create_draft_from_expense(
    expense: Expense,
    debit_account_id: UUID,
    credit_account_id: UUID
) -> Transaction:
    """
    Create draft transaction from expense.

    Transaction Fields:
    - date = expense.date
    - source = 'expense_tracker'  # New source type
    - status = 'draft'
    - memo = expense.description
    - doc_no = f"EXP-{expense.id[:8]}"
    - lines[0]: debit_account_id, debit=expense.amount
    - lines[1]: credit_account_id, credit=expense.amount
    """
```

**New Transaction Source**:
- Add `'expense_tracker'` to `txn_source` enum
- Distinguishes expense-tracked entries from manual journal entries
- Allows filtering in reports

#### **Approval Flow**

```
Expense Created (pending)
         ↓
   ML Suggestion Run
         ↓
Draft Transaction Created (drafted)
         ↓
    User Reviews
         ↓
    ┌─────┴─────┐
    ↓           ↓
 Approve      Edit
    ↓           ↓
    ↓    Update Accounts
    ↓           ↓
    └─────┬─────┘
         ↓
Post Transaction (posted)
         ↓
Update Expense Status
         ↓
  Add Training Data
```

### 4.2 Unified Transaction View

#### **Enhanced Journal Entry List**

Update `/journals` page to show ALL transactions:
- Journal entries (manual, source='journal')
- Opening balances (source='opening_balance')
- Expense-tracked entries (source='expense_tracker')

**Filter Options**:
```tsx
<Select label="Source">
  <option value="">All Sources</option>
  <option value="journal">Manual Journal Entries</option>
  <option value="expense_tracker">Expense Tracker</option>
  <option value="opening_balance">Opening Balances</option>
</Select>
```

**Visual Indicators**:
- Journal Entry: 📝 icon
- Expense Tracker: 💰 icon
- Opening Balance: 🔢 icon

### 4.3 Accountant Review Dashboard

#### **New Page**: `/expenses/review` (Accountant View)

**Features**:
- Show all drafted expenses pending approval
- Group by confidence level:
  - High confidence (>85%): Green section
  - Medium confidence (70-85%): Yellow section
  - Low confidence (<70%): Red section
- Bulk approve high-confidence items
- Detailed review for low-confidence items
- Edit accounts inline
- Reject with reason
- Filter by date, user, category

**Statistics Panel**:
```tsx
<StatsPanel>
  <Stat label="Pending Review" value={pendingCount} />
  <Stat label="Avg Confidence" value="84%" />
  <Stat label="Auto-Draft Rate" value="92%" />
  <Stat label="ML Accuracy" value="87%" />
</StatsPanel>
```

---

## Phase 5: ML Model Training & Improvement

### Overview
Continuous improvement system for ML model accuracy.

### 5.1 Training Pipeline

#### **Automated Retraining Schedule**

```python
# backend/app/tasks/ml_training.py

from celery import Celery
from app.services.ml_suggestion_service import MLSuggestionService

app = Celery('tasks')

@app.task
async def retrain_models_for_all_companies():
    """
    Scheduled task: Run weekly on Sunday midnight.

    For each company:
    1. Check if new training data available
    2. Check if model needs retraining (threshold: 10 new samples)
    3. Train new model
    4. Evaluate against test set
    5. Activate if accuracy improved
    6. Send notification to admins
    """

@app.task
async def retrain_model_for_company(company_id: UUID):
    """On-demand retraining for specific company."""
```

#### **Training Data Quality**

**Include in Training**:
- ✅ Approved expenses (was_accepted=true)
- ✅ Edited expenses (was_accepted=false, learn from correction)
- ✅ Manual journal entries matching expense pattern

**Exclude from Training**:
- ❌ Rejected expenses
- ❌ Complex multi-line transactions
- ❌ Opening balances
- ❌ Adjusting entries

#### **Model Versioning**

```python
# Track model versions
ml_models table:
  - version: 'v1.0', 'v1.1', 'v2.0'
  - trained_at: timestamp
  - training_samples: count
  - accuracy: float
  - is_active: boolean

# Keep last 5 versions for rollback
# Activate new model only if accuracy > current_accuracy + 0.05
```

### 5.2 Feedback Loop

#### **User Feedback Collection**

```python
# backend/app/schemas/ml.py

class MLFeedback(BaseModel):
    expense_id: UUID
    suggestion_quality: int  # 1-5 stars
    was_helpful: bool
    comment: Optional[str]
```

**Feedback Triggers**:
- After approving suggestion
- After editing suggestion
- Periodic survey (monthly)

**Use Feedback For**:
- Feature importance weighting
- Confidence threshold tuning
- Model selection (tree vs neural net)
- Error analysis

### 5.3 Model Monitoring

#### **Metrics Dashboard** (`/admin/ml-metrics`)

**Key Metrics**:
1. **Accuracy**: % of suggestions accepted without modification
2. **Coverage**: % of expenses that get suggestions
3. **Confidence Distribution**: Histogram of confidence scores
4. **Acceptance Rate by Confidence**: Correlation analysis
5. **Top Accounts Suggested**: Distribution
6. **Common Errors**: Confusion matrix

**Alerts**:
- Accuracy drops below 70% → Trigger retraining
- Low acceptance rate (<50%) → Review model
- High rejection rate for specific category → Investigate

---

## Phase 6: Advanced Features (Future)

### 6.1 Receipt OCR Integration

**Flow**:
1. User uploads receipt image
2. OCR extracts: merchant, amount, date, items
3. Auto-populate expense form
4. ML suggests accounts
5. User reviews and approves

**Tech Stack**:
- Tesseract OCR or Google Cloud Vision API
- Store receipt in S3/object storage
- Link receipt URL to expense

### 6.2 Mobile App

**Features**:
- Native iOS/Android app
- Camera capture for receipts
- Voice input for descriptions
- Push notifications for approvals
- Offline mode with sync

### 6.3 Multi-Currency Support

**Features**:
- Record expenses in any currency
- Auto-fetch exchange rates
- Convert to base currency for posting
- Show both original and converted amounts

### 6.4 Recurring Expenses

**Features**:
- Mark expense as recurring
- Set frequency (weekly, monthly, yearly)
- Auto-create on schedule
- Auto-approve if pattern matches

### 6.5 Expense Policies & Limits

**Features**:
- Set spending limits by category
- Require approval for amounts >$X
- Enforce expense policies (e.g., no alcohol)
- Manager approval workflow

### 6.6 Advanced ML Features

**Features**:
- Natural language processing: "Lunch with John at Starbucks $25"
- Anomaly detection: Flag unusual expenses
- Predictive categorization: Suggest category based on description
- Multi-account splitting: Auto-split between accounts (e.g., 50/50)

---

## Implementation Roadmap

### Timeline Overview

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| **Phase 1**: Backend Foundation | 2 weeks | Database schema, Services, APIs |
| **Phase 2**: ML Engine | 3 weeks | ML service, Training pipeline |
| **Phase 3**: Frontend | 2 weeks | Expense UI, Category management |
| **Phase 4**: Integration | 1 week | Workflow, Unified views |
| **Phase 5**: ML Training | 1 week | Automated retraining, Monitoring |
| **Testing & Polish** | 1 week | End-to-end testing, UX refinement |
| **Total** | **10 weeks** | Complete expense tracker with ML |

### Phase 1 Tasks (Week 1-2)

**Week 1: Database & Models**
- [ ] Create migration for expenses tables
- [ ] Create migration for expense_categories table
- [ ] Create migration for ml_training_data table
- [ ] Create migration for ml_models table
- [ ] Create SQLAlchemy models for all tables
- [ ] Seed default expense categories
- [ ] Test migrations and rollback

**Week 2: Services & APIs**
- [ ] Implement ExpenseService
- [ ] Implement CategoryService
- [ ] Create Pydantic schemas
- [ ] Create API routes for expenses
- [ ] Create API routes for categories
- [ ] Write unit tests for services
- [ ] Write integration tests for APIs
- [ ] Update OpenAPI documentation

### Phase 2 Tasks (Week 3-5)

**Week 3: Rule-Based System**
- [ ] Implement rule-based suggestion engine
- [ ] Create keyword mapping dictionary
- [ ] Create merchant pattern matching
- [ ] Implement category default fallback
- [ ] Test rule-based accuracy

**Week 4: ML Foundation**
- [ ] Set up scikit-learn dependency
- [ ] Implement feature extraction
- [ ] Implement Decision Tree model
- [ ] Implement model serialization/deserialization
- [ ] Create training data loader
- [ ] Test model training with sample data

**Week 5: ML Service**
- [ ] Implement MLSuggestionService
- [ ] Create model training pipeline
- [ ] Implement model evaluation
- [ ] Create ML API endpoints
- [ ] Add model versioning logic
- [ ] Test end-to-end suggestion flow

### Phase 3 Tasks (Week 6-7)

**Week 6: Expense UI**
- [ ] Create ExpenseListPage component
- [ ] Create QuickExpenseForm component
- [ ] Create ExpenseCard component
- [ ] Create ExpenseDetailPage component
- [ ] Create MLSuggestionBadge component
- [ ] Implement expense API client
- [ ] Add routing and navigation

**Week 7: Category & Review UI**
- [ ] Create CategoryManagementPage
- [ ] Create AccountantReviewDashboard
- [ ] Create AccountSelector component
- [ ] Create bulk approval interface
- [ ] Add loading states and error handling
- [ ] Polish UX and styling

### Phase 4 Tasks (Week 8)

- [ ] Update transaction source enum
- [ ] Create draft transaction from expense flow
- [ ] Update journal entry list to show all sources
- [ ] Add source filters to reports
- [ ] Create unified transaction detail view
- [ ] Test end-to-end approval workflow

### Phase 5 Tasks (Week 9)

- [ ] Set up Celery for background tasks
- [ ] Implement automated retraining schedule
- [ ] Create model monitoring dashboard
- [ ] Add feedback collection endpoints
- [ ] Implement model performance tracking
- [ ] Create admin ML metrics page

### Testing & Launch (Week 10)

- [ ] End-to-end testing of full workflow
- [ ] User acceptance testing
- [ ] Performance testing (bulk operations)
- [ ] Security review
- [ ] Documentation writing
- [ ] Deployment preparation
- [ ] Beta launch with select users

---

## Technical Considerations

### 6.1 Performance

**Concerns**:
- ML model inference latency
- Training time for large datasets
- Bulk approval performance

**Solutions**:
- Cache model in memory (avoid DB reads)
- Async model training (background job)
- Batch insert for ML training data
- Database indexes on filtered columns
- Pagination for large expense lists

### 6.2 Security

**Concerns**:
- Model tampering (malicious training data)
- Unauthorized expense approval
- Data privacy (training data contains sensitive info)

**Solutions**:
- Validate training data before adding
- Role-based access control (RBAC)
- Audit log all approvals and edits
- Encrypt model_data in database
- Company-level data isolation

### 6.3 Scalability

**Multi-Tenancy**:
- Each company has independent ML model
- Training data scoped by company_id
- Model storage in PostgreSQL (acceptable for <100 companies)
- Future: Move to Redis or S3 for 1000+ companies

**Model Size**:
- Decision Tree: ~100KB
- Random Forest: ~1-5MB
- Neural Net: ~10-50MB
- PostgreSQL BYTEA: Max 1GB (sufficient)

### 6.4 Data Quality

**Training Data Hygiene**:
- Minimum 10 samples before training
- Remove outliers (amount >3 std dev)
- Balance classes (account distribution)
- Regular data cleaning (remove duplicates)

---

## Success Metrics

### Launch Metrics (Month 1)

- [ ] 80% of expenses get ML suggestions
- [ ] 60% suggestion acceptance rate
- [ ] 50% reduction in time to log expense (vs manual journal)
- [ ] 70% ML model accuracy
- [ ] <2s average expense entry time

### Growth Metrics (Month 3)

- [ ] 85% of expenses get ML suggestions
- [ ] 75% suggestion acceptance rate
- [ ] ML model accuracy >80%
- [ ] 90% of users prefer expense tracker over journal entry
- [ ] <1s average expense entry time

### Maturity Metrics (Month 6)

- [ ] 90% of expenses get ML suggestions
- [ ] 85% suggestion acceptance rate
- [ ] ML model accuracy >85%
- [ ] 95% user satisfaction score
- [ ] 10x increase in transaction volume (easier to log)

---

## Risk Mitigation

### Risk 1: Low ML Accuracy
**Probability**: Medium
**Impact**: High (users won't trust suggestions)
**Mitigation**:
- Strong rule-based fallback
- Clear confidence scores
- Easy editing interface
- Continuous training on corrections

### Risk 2: User Confusion (Debit/Credit)
**Probability**: High
**Impact**: Medium (defeats purpose of simplified interface)
**Mitigation**:
- Hide debit/credit terminology from expense UI
- Use natural language ("From" / "To" accounts)
- Provide contextual help tooltips
- Video tutorials

### Risk 3: Insufficient Training Data
**Probability**: Medium
**Impact**: Medium (model won't improve)
**Mitigation**:
- Seed training data from manual journal entries
- Import sample data for new companies
- Lower training threshold (5 samples minimum)
- Share anonymized model across companies (future)

### Risk 4: Performance Issues
**Probability**: Low
**Impact**: High (slow UX hurts adoption)
**Mitigation**:
- Cache models in Redis
- Async model training
- Optimize feature extraction
- Load testing before launch

---

## Conclusion

This expense tracker with ML auto-drafting bridges the gap between:
- **Simplicity** (for everyday users) and **Precision** (for accountants)
- **Speed** (quick expense logging) and **Accuracy** (proper double-entry)
- **Automation** (ML suggestions) and **Control** (manual review)

By implementing this system in 6 phases over 10 weeks, you'll create a unique product that:
1. Makes accounting accessible to non-accountants
2. Reduces data entry time by 80%
3. Maintains accounting rigor and compliance
4. Learns and improves over time
5. Scales with your users' growth

The ML engine is the secret sauce—it learns each user's patterns and becomes their personal bookkeeping assistant, making journal entries as easy as jotting down a quick note.

---

**Next Steps**: Review this plan, prioritize phases, and kick off Phase 1 with database schema design!
