# MiniBooks - Product Flow Diagrams

## 🎯 Complete User Journeys & Workflows

---

## Flow 1: User Onboarding & Setup 🚀

```
┌─────────────────────────────────────────────────────────────────┐
│                    NEW USER JOURNEY                             │
└─────────────────────────────────────────────────────────────────┘

1. Landing Page
   │
   ├─→ "Sign Up" Button
   │
   ↓
2. Sign Up Form ✅
   │ • Email address
   │ • Password
   │ • Full name
   │
   ↓
3. Email Verification
   │ • Confirm email link
   │
   ↓
4. Company Onboarding ✅
   │
   ├─→ Option A: Join Existing Company
   │   │ • See list of companies you have access to
   │   │ • Select company
   │   └─→ Go to Dashboard ✅
   │
   └─→ Option B: Create New Company
       │ • Company name
       │ • Industry (dropdown)
       │ • Fiscal year start
       │ • Currency
       │ • Time zone
       ↓
   5. Chart of Accounts Setup
      │
      ├─→ Use Industry Template (Recommended)
      │   │ • Pre-populated accounts for your industry
      │   └─→ Confirm and proceed
      │
      └─→ Start from Scratch
          │ • Manual account creation
          └─→ Confirm and proceed
       ↓
   6. Quick Setup Wizard
      │
      ├─→ Step 1: Add Bank Account (Optional)
      │   │ • Connect via Plaid
      │   │ • Or enter manually
      │
      ├─→ Step 2: Invite Team Members (Optional)
      │   │ • Email addresses
      │   │ • Assign roles
      │
      ├─→ Step 3: Import Existing Data (Optional)
      │   │ • Upload CSV
      │   │ • Import from QuickBooks
      │   │ • Skip for now
      │
      └─→ Complete Setup
          └─→ Go to Dashboard ✅
```

---

## Flow 2: Expense Management Journey 💵

```
┌─────────────────────────────────────────────────────────────────┐
│                 EXPENSE TRACKING FLOW                           │
└─────────────────────────────────────────────────────────────────┘

Method A: Receipt Scanning (Mobile/Web) ✅
───────────────────────────────────────────
1. User opens Receipt Parser ✅
   │
   ↓
2. Upload Receipt Image ✅
   │ • Take photo (mobile)
   │ • Upload file (web)
   │ • Drag & drop
   │
   ↓
3. AI Processing (EasyOCR + GPT-4o) ✅
   │ • Extract vendor name ✅
   │ • Extract amount ✅
   │ • Extract date ✅
   │ • Detect category ✅
   │ • Normalize vendor ✅
   │
   ↓
4. Review AI Suggestions ✅
   │ • See extracted fields
   │ • Confidence scores shown
   │
   ├─→ Accept Suggestions ✅
   │   └─→ Go to Step 5
   │
   └─→ Edit Manually ✅
       └─→ Go to Step 5
   ↓
5. Go to Expense Form (Pre-filled) ✅
   │
   ↓
   [Continue to "Expense Form Entry" below]


Method B: Manual Entry ✅
───────────────────────
1. Navigate to /expenses ✅
   │
   ↓
2. Click "New Expense" ✅
   │
   ↓
   [Continue to "Expense Form Entry" below]


Expense Form Entry (Common Path)
─────────────────────────────────
3. Fill Expense Details ✅
   │ • Vendor Name ✅
   │ • Amount ✅
   │ • Date ✅
   │ • Category (dropdown) ✅
   │ • Payment Method
   │ • Memo ✅
   │ • Receipt attachment
   │ • Tags
   │
   ├─→ Run AI Validation ✅
   │   │ • Check for duplicates
   │   │ • Verify amounts
   │   │ • Suggest better category
   │   │ • Vendor normalization ✅
   │   └─→ Apply suggestions or ignore
   │
   └─→ Skip AI
   ↓
4. Submit Expense ✅
   │
   ├─→ If Requires Approval
   │   │ • Send to manager
   │   │ • Status: Pending Approval
   │   │ • Email notification sent
   │   └─→ Wait for approval
   │
   └─→ If No Approval Required
       │ • Status: Approved ✅
       │ • Create Journal Entry (automated)
       │   ├─→ Debit: Expense Account
       │   └─→ Credit: AP or Bank Account
       └─→ Success! ✅


Managing Expenses
─────────────────
5. View Expenses List ✅
   │ • Filter by date, vendor, category
   │ • Search ✅
   │ • Sort columns
   │
   ├─→ Edit Expense ✅
   │   │ • Opens edit modal ✅
   │   │ • Modify fields ✅
   │   │ • Save changes ✅
   │   └─→ Refresh list ✅
   │
   ├─→ Delete Expense ✅
   │   │ • Confirmation dialog ✅
   │   │ • Soft delete (void status) ✅
   │   │ • Reverse journal entry
   │   └─→ Refresh list ✅
   │
   └─→ Export to Report
       │ • CSV export
       └─→ PDF export
```

---

## Flow 3: Invoice to Payment (AR) 💰

```
┌─────────────────────────────────────────────────────────────────┐
│              ACCOUNTS RECEIVABLE FLOW                           │
└─────────────────────────────────────────────────────────────────┘

1. Create Customer
   │ • Customer name
   │ • Email & phone
   │ • Billing address
   │ • Payment terms (Net 30, etc.)
   │ • Tax exempt status
   │
   ↓
2. Create Invoice
   │ • Select customer
   │ • Invoice date
   │ • Due date (auto-calculated from terms)
   │ • Add line items:
   │   ├─→ Product/Service (from catalog)
   │   ├─→ Description
   │   ├─→ Quantity
   │   ├─→ Rate
   │   └─→ Amount (auto-calculated)
   │ • Apply discount (if any)
   │ • Add sales tax (auto-calculated)
   │ • Add memo/notes
   │ • Attach files
   │
   ├─→ Save as Draft
   │   └─→ Status: Draft
   │
   └─→ Send Invoice
       │ • Preview invoice (PDF)
       │ • Email to customer
       │ • Status: Sent
       │ • Track "Viewed" status
       │
       │ Journal Entry Created:
       │ ├─→ Debit: Accounts Receivable
       │ └─→ Credit: Revenue
       │
       ↓
3. Customer Receives Invoice
   │ • Email with PDF attachment
   │ • "Pay Now" button (payment portal)
   │ • "View Online" link
   │
   ↓
4. Payment Methods
   │
   ├─→ Online Payment
   │   │ • Customer clicks "Pay Now"
   │   │ • Payment portal (Stripe/PayPal)
   │   │ • Enter card/bank details
   │   │ • Process payment
   │   └─→ Auto-recorded in system
   │
   └─→ Offline Payment (Check/Cash/Wire)
       │ • Customer pays externally
       │ • You manually record payment
       └─→ Go to Step 5
   ↓
5. Record Payment Received
   │ • Select customer
   │ • Payment amount
   │ • Payment date
   │ • Payment method
   │ • Reference number
   │ • Select invoice(s) to apply
   │
   ├─→ Full Payment
   │   │ • Invoice status: Paid
   │   │ • Invoice balance: $0
   │
   ├─→ Partial Payment
   │   │ • Invoice status: Partially Paid
   │   │ • Remaining balance shown
   │
   └─→ Overpayment
       │ • Apply to invoice
       │ • Create customer credit for excess
       │
       │ Journal Entry Created:
       │ ├─→ Debit: Bank Account
       │ └─→ Credit: Accounts Receivable
       │
   ↓
6. Invoice Complete
   │ • Send payment receipt to customer
   │ • Update AR aging
   │ • Update customer balance
   │
   └─→ End


Overdue Invoice Handling
────────────────────────
If Invoice not paid by due date:
│
├─→ Auto-send Reminder Email (Day 0, 7, 14, 30)
│   │ • "Friendly reminder: Invoice #{number} is due"
│   │ • Include payment link
│   │ • Show amount due
│
├─→ Apply Late Fee (if configured)
│   │ • Create late fee invoice
│   │ • Auto-send to customer
│
└─→ Escalate to Collections (Day 60+)
    │ • Flag in system
    │ • Manual follow-up
    └─→ Write-off as Bad Debt (if uncollectible)
```

---

## Flow 4: Bill to Payment (AP) 💳

```
┌─────────────────────────────────────────────────────────────────┐
│              ACCOUNTS PAYABLE FLOW                              │
└─────────────────────────────────────────────────────────────────┘

1. Receive Vendor Bill
   │
   ├─→ Email Receipt
   │   │ • Forward to bills@minibooks.com
   │   │ • AI extracts data
   │   └─→ Creates draft bill
   │
   ├─→ Upload PDF
   │   │ • Drag & drop bill PDF
   │   │ • OCR extracts data
   │   └─→ Creates draft bill
   │
   └─→ Manual Entry
       │ • Select vendor
       │ • Bill date
       │ • Due date
       │ • Reference number
       │ • Add line items
       │ • Allocate to accounts/categories
       └─→ Creates draft bill
   ↓
2. Bill Approval Workflow
   │
   ├─→ If Amount < $1,000
   │   │ • Auto-approved
   │   └─→ Go to Step 3
   │
   └─→ If Amount >= $1,000
       │ • Submit for approval
       │ • Manager receives notification
       │ • Manager reviews bill
       │   ├─→ Approve
       │   │   └─→ Go to Step 3
       │   ├─→ Reject
       │   │   │ • Add rejection reason
       │   │   └─→ Notify submitter
       │   └─→ Request Changes
       │       │ • Add comments
       │       └─→ Return to submitter
       ↓
3. Bill Approved
   │ • Status: Approved
   │ • Added to payment queue
   │
   │ Journal Entry Created:
   │ ├─→ Debit: Expense Account
   │ └─→ Credit: Accounts Payable
   │
   ↓
4. Payment Scheduling
   │ • View bills due
   │ • Filter by due date, vendor, amount
   │ • Select bills to pay
   │
   ├─→ Pay Immediately
   │   └─→ Go to Step 5
   │
   └─→ Schedule Payment
       │ • Set payment date
       │ • Add to payment batch
       └─→ Auto-pays on scheduled date
   ↓
5. Make Payment
   │ • Select payment method
   │   ├─→ Check
   │   │   │ • Generate check
   │   │   │ • Print check
   │   │   └─→ Mark as sent
   │   ├─→ ACH Transfer
   │   │   │ • Initiate via bank
   │   │   └─→ Upload confirmation
   │   ├─→ Wire Transfer
   │   │   │ • Enter wire details
   │   │   └─→ Mark as sent
   │   └─→ Credit Card
   │       │ • Process payment
   │       └─→ Auto-recorded
   │
   │ Journal Entry Created:
   │ ├─→ Debit: Accounts Payable
   │ └─→ Credit: Bank Account
   │
   ↓
6. Payment Complete
   │ • Bill status: Paid
   │ • Update vendor balance
   │ • Update AP aging
   │ • Record payment in vendor history
   │
   └─→ End


Early Payment Discount
──────────────────────
If bill offers discount (e.g., "2/10 Net 30"):
│
├─→ Pay within 10 days
│   │ • Apply 2% discount
│   │ • Journal Entry:
│   │   ├─→ Debit: Accounts Payable (full amount)
│   │   ├─→ Credit: Bank Account (discounted amount)
│   │   └─→ Credit: Purchase Discounts (discount amount)
│   └─→ Save money!
│
└─→ Pay after 10 days
    └─→ Pay full amount (no discount)
```

---

## Flow 5: Bank Reconciliation 🏦

```
┌─────────────────────────────────────────────────────────────────┐
│              BANK RECONCILIATION FLOW                           │
└─────────────────────────────────────────────────────────────────┘

1. Choose Reconciliation Method
   │
   ├─→ Auto-Reconcile (Bank Feed)
   │   │ • Connected via Plaid
   │   │ • Transactions auto-import daily
   │   │ • AI auto-matches transactions
   │   └─→ Go to Step 3
   │
   └─→ Manual Upload
       │ • Download bank statement (CSV/OFX)
       │ • Upload to MiniBooks
       └─→ Go to Step 2
   ↓
2. Import Bank Transactions
   │ • Parse file
   │ • Map columns (Date, Description, Amount)
   │ • Import transactions
   │
   ↓
3. Transaction Matching
   │ • AI attempts auto-match
   │   ├─→ Match by amount & date (±3 days)
   │   ├─→ Match by description similarity
   │   └─→ Learn from past matches
   │
   ↓
4. Review Matches
   │
   ├─→ Auto-Matched (Green) ✓
   │   │ • Review and confirm
   │   │ • Click "Confirm Match"
   │
   ├─→ Suggested Matches (Yellow)
   │   │ • Review suggestion
   │   │ • Accept or reject
   │   │ • If accept, click "Confirm Match"
   │
   └─→ Unmatched (Red)
       │ • No match found
       │ • Options:
       │   ├─→ Find & Match Manually
       │   │   │ • Search existing transactions
       │   │   └─→ Link transaction
       │   ├─→ Create New Transaction
       │   │   │ • Categorize
       │   │   │ • Add description
       │   │   └─→ Save
       │   └─→ Mark as Cleared
       │       └─→ For transactions already in books
       ↓
5. Reconciliation Report
   │ • Opening balance (from last reconciliation)
   │ • (+) Deposits/Credits
   │ • (−) Withdrawals/Debits
   │ • = Closing balance
   │
   ├─→ If Balances Match ✓
   │   │ • Bank statement balance
   │   │ • MiniBooks balance
   │   │ • Difference: $0.00
   │   └─→ Click "Complete Reconciliation"
   │
   └─→ If Balances Don't Match ✗
       │ • Show discrepancy amount
       │ • Possible causes:
       │   ├─→ Missing transactions
       │   ├─→ Duplicate entries
       │   ├─→ Incorrect amounts
       │   └─→ Bank errors
       │ • Review outstanding items
       │ • Find and fix discrepancies
       └─→ Try again
   ↓
6. Reconciliation Complete
   │ • Lock period (prevent changes)
   │ • Generate reconciliation report
   │ • Save PDF for records
   │ • Update account balance
   │
   └─→ End
```

---

## Flow 6: Journal Entry Flow (Double-Entry) 📒

```
┌─────────────────────────────────────────────────────────────────┐
│                 JOURNAL ENTRY FLOW                              │
└─────────────────────────────────────────────────────────────────┘

Types of Journal Entries
────────────────────────

A. Automated Journal Entries (System-Generated)
   │
   ├─→ Invoice Created
   │   │ DR: Accounts Receivable
   │   │ CR: Revenue
   │
   ├─→ Bill Created
   │   │ DR: Expense Account
   │   │ CR: Accounts Payable
   │
   ├─→ Payment Received
   │   │ DR: Bank Account
   │   │ CR: Accounts Receivable
   │
   ├─→ Bill Paid
   │   │ DR: Accounts Payable
   │   │ CR: Bank Account
   │
   └─→ Expense Recorded
       │ DR: Expense Account
       │ CR: Bank Account / AP


B. Manual Journal Entries
   │
   ↓
1. Navigate to Journal Entries
   │ • Click "New Journal Entry"
   │
   ↓
2. Entry Header
   │ • Date
   │ • Reference number (auto-generated)
   │ • Description/Memo
   │ • Attachment (supporting docs)
   │
   ↓
3. Add Journal Lines (minimum 2)
   │
   Line 1:
   │ • Select Account (Chart of Accounts)
   │ • Debit Amount: $___
   │ • Credit Amount: $___
   │ • Line Memo
   │
   Line 2:
   │ • Select Account
   │ • Debit Amount: $___
   │ • Credit Amount: $___
   │ • Line Memo
   │
   [+ Add More Lines]
   │
   ↓
4. Validate Entry
   │ • Check: Total Debits = Total Credits
   │   ├─→ If Equal ✓
   │   │   └─→ Allow posting
   │   └─→ If Not Equal ✗
   │       │ • Show error: "Debits must equal Credits"
   │       │ • Highlight difference: $___
   │       └─→ Fix before proceeding
   │
   ↓
5. Post Journal Entry
   │
   ├─→ Save as Draft
   │   │ • Status: Draft
   │   │ • Does not affect balances
   │   │ • Can edit later
   │
   └─→ Post Entry
       │ • Status: Posted
       │ • Updates account balances
       │ • Cannot edit (must reverse)
       │
       ↓
   6. Entry Posted
      │ • Update General Ledger
      │ • Update Trial Balance
      │ • Create audit trail
      │
      └─→ End


Common Manual Journal Entries
──────────────────────────────

1. Depreciation
   DR: Depreciation Expense
   CR: Accumulated Depreciation

2. Accrued Revenue
   DR: Accounts Receivable
   CR: Revenue

3. Accrued Expense
   DR: Expense
   CR: Accrued Liabilities

4. Prepaid Expense Adjustment
   DR: Expense
   CR: Prepaid Asset

5. Bad Debt Write-off
   DR: Bad Debt Expense
   CR: Accounts Receivable

6. Owner's Draw
   DR: Owner's Draw
   CR: Cash

7. Loan Payment (Principal & Interest)
   DR: Loan Payable
   DR: Interest Expense
   CR: Cash
```

---

## Flow 7: Financial Close Process 📊

```
┌─────────────────────────────────────────────────────────────────┐
│              MONTH-END CLOSE FLOW                               │
└─────────────────────────────────────────────────────────────────┘

Day 1-5: Transaction Entry
───────────────────────────
□ Enter all sales invoices for the month
□ Enter all vendor bills for the month
□ Record all bank transactions
□ Scan and upload all receipts
□ Record all employee expenses
□ Process payroll for the period
│
↓

Day 6-7: Reconciliations
────────────────────────
□ Reconcile all bank accounts
□ Reconcile all credit card accounts
□ Match all transactions
□ Resolve discrepancies
│
↓

Day 8-9: Accruals & Adjustments
────────────────────────────────
□ Accrue unbilled revenue
□ Defer unearned revenue
□ Accrue unpaid expenses
□ Defer prepaid expenses
□ Record depreciation
□ Adjust inventory (if applicable)
□ Accrue payroll liabilities
□ Record bad debt (if any)
│
↓

Day 10: Review & Verification
──────────────────────────────
□ Run Trial Balance
  ├─→ If Balanced ✓
  │   └─→ Proceed
  └─→ If Not Balanced ✗
      │ • Find error
      └─→ Fix and re-run

□ Review Balance Sheet
  │ • Check all account balances
  │ • Investigate unusual balances
  │ • Verify AR aging
  │ • Verify AP aging

□ Review Income Statement
  │ • Check revenue recognition
  │ • Review expense allocations
  │ • Compare to budget
  │ • Investigate variances

□ Review Cash Flow Statement
  │ • Verify cash position
  │ • Check operating cash flow
│
↓

Day 11: Generate Reports
────────────────────────
□ Balance Sheet (current month)
□ Income Statement (current month)
□ Cash Flow Statement (current month)
□ Trial Balance
□ AR Aging Report
□ AP Aging Report
□ General Ledger (full)
□ Department/Class reports
│
↓

Day 12: Distribute Reports
───────────────────────────
□ Send reports to management
□ Schedule review meeting
□ Present key metrics and variances
□ Answer questions
│
↓

Day 13: Lock Period
────────────────────
□ Close period in system
□ Lock transactions (no edits allowed)
□ Archive reports
□ Create backup
│
↓

Day 14: Close Complete ✓
────────────────────────
□ Month is closed
□ Begin next period
│
└─→ End


Year-End Close (Additional Steps)
──────────────────────────────────
□ All month-end close steps above
□ Physical inventory count
□ Reconcile inventory to GL
□ Review fixed asset register
□ Calculate depreciation for year
□ Prepare tax schedules
□ Review equity accounts
□ Close revenue/expense accounts to Retained Earnings
□ Generate annual financial statements
□ Prepare tax returns
□ Audit preparation (if applicable)
□ Archive year-end documents
```

---

## Flow 8: AI Assistant Interaction 🤖

```
┌─────────────────────────────────────────────────────────────────┐
│                 AI ASSISTANT FLOW                               │
└─────────────────────────────────────────────────────────────────┘

1. User Opens AI Chat
   │ • Click "AI Assistant" in sidebar
   │ • Chat interface appears
   │
   ↓
2. User Asks Question (Natural Language)
   │
   Examples:
   │ • "What's my cash position?"
   │ • "Show me top expenses this month"
   │ • "Am I profitable?"
   │ • "Which customers owe me money?"
   │ • "Create an invoice for ACME Corp"
   │ • "Find all office supply expenses"
   │
   ↓
3. AI Processing
   │ • Parse intent (GPT-4o)
   │ • Identify entities (customer names, dates, amounts)
   │ • Determine required data
   │ • Query database
   │ • Generate response
   │
   ↓
4. AI Response
   │
   ├─→ Data Query Response
   │   │ • Present data in structured format
   │   │ • Include visualizations (if applicable)
   │   │ • Offer follow-up questions
   │   │
   │   Example:
   │   "Your current cash position is $45,230.
   │    This is down 8% from last month due to
   │    increased marketing spend.
   │
   │    Would you like to see a cash flow forecast?"
   │
   ├─→ Action Request Response
   │   │ • AI performs action
   │   │ • Confirms completion
   │   │
   │   Example:
   │   "I've created a draft invoice for ACME Corp:
   │    - Invoice #INV-1234
   │    - Amount: $5,000
   │    - Due: 30 days
   │
   │    Would you like to review before sending?"
   │
   └─→ Insight/Recommendation
       │ • AI provides analysis
       │ • Suggests actions
       │
       Example:
       "I notice you have 5 invoices over 60 days past due,
        totaling $12,450. I recommend:
        1. Send payment reminders (I can do this now)
        2. Apply late fees (if allowed by terms)
        3. Schedule collection calls

        Shall I send the reminders?"
   ↓
5. User Follow-up
   │
   ├─→ Ask Another Question
   │   └─→ Return to Step 2
   │
   ├─→ Request Action
   │   │ • "Yes, send reminders"
   │   │ • AI executes
   │   └─→ Confirms completion
   │
   └─→ End Chat
       └─→ Chat saved to history


AI Insights (Proactive)
───────────────────────
Dashboard shows AI-generated insights:

□ "Your burn rate increased 15% this month"
  └─→ Click to see details

□ "3 large expenses detected - potential duplicates?"
  └─→ Click to review

□ "Cash flow tight in 30 days - collect receivables"
  └─→ Click for action plan

□ "You're on track to exceed Q4 revenue target by 12%"
  └─→ Click for breakdown

□ "Tax deduction opportunity: $3,200 in home office expenses"
  └─→ Click to categorize
```

---

## Flow 9: Multi-User Collaboration 👥

```
┌─────────────────────────────────────────────────────────────────┐
│              TEAM COLLABORATION FLOW                            │
└─────────────────────────────────────────────────────────────────┘

1. Invite Team Member
   │ • Admin goes to Settings > Users
   │ • Click "Invite User"
   │ • Enter email address
   │ • Select role:
   │   ├─→ Admin (full access)
   │   ├─→ Accountant (accounting access)
   │   ├─→ Manager (approval permissions)
   │   ├─→ Employee (expense entry only)
   │   └─→ Auditor (read-only access)
   │ • Click "Send Invitation"
   │
   ↓
2. Team Member Receives Email
   │ • "You've been invited to join [Company] on MiniBooks"
   │ • Click "Accept Invitation"
   │
   ↓
3. Team Member Signs Up
   │ • Create account (if new user)
   │ • Or log in (if existing user)
   │ • Automatically added to company
   │ • Permissions applied based on role
   │
   ↓
4. Collaboration Features
   │
   ├─→ Comments on Transactions
   │   │ • Click "Add Comment" on any transaction
   │   │ • Type message
   │   │ • @mention team member
   │   │ • Team member gets notification
   │   └─→ Reply thread
   │
   ├─→ Approval Workflows
   │   │ • Employee submits expense
   │   │ • Manager receives notification
   │   │ • Manager reviews expense
   │   │ • Approves or rejects with comment
   │   │ • Employee gets notification
   │   └─→ If approved, expense posts
   │
   ├─→ Task Assignment
   │   │ • Assign task: "Reconcile August bank account"
   │   │ • Assign to: Jane (Accountant)
   │   │ • Due date: Aug 31
   │   │ • Jane gets notification
   │   │ • Jane completes task
   │   │ • Marks as complete
   │   └─→ Assigner gets notification
   │
   └─→ Shared Reports
       │ • Create custom report
       │ • Click "Share"
       │ • Select team members
       │ • Set permissions (view/edit)
       │ • Schedule auto-send (optional)
       └─→ Team members receive access
```

---

## Flow 10: Reporting & Analytics 📈

```
┌─────────────────────────────────────────────────────────────────┐
│              REPORTING FLOW                                     │
└─────────────────────────────────────────────────────────────────┘

1. Navigate to Reports
   │ • Click "Reports" in sidebar
   │
   ↓
2. Choose Report Type
   │
   ├─→ Pre-Built Reports
   │   │ • Balance Sheet
   │   │ • Income Statement
   │   │ • Cash Flow Statement
   │   │ • AR Aging
   │   │ • AP Aging
   │   │ • General Ledger
   │   │ • Trial Balance
   │   │ • Sales by Customer
   │   │ • Expense by Vendor
   │   │ • Etc.
   │   └─→ Go to Step 3
   │
   └─→ Custom Report Builder
       │ • Drag & drop interface
       │ • Select data sources
       │ • Choose columns
       │ • Add filters
       │ • Group/sort
       │ • Add calculations
       └─→ Go to Step 3
   ↓
3. Configure Report Parameters
   │ • Date range (This Month, Last Quarter, Custom, etc.)
   │ • Accounting method (Cash vs Accrual)
   │ • Filters:
   │   ├─→ By account
   │   ├─→ By customer/vendor
   │   ├─→ By class/department
   │   ├─→ By location
   │   └─→ By tag
   │ • Comparison:
   │   ├─→ None
   │   ├─→ Previous period
   │   ├─→ Previous year
   │   └─→ Budget
   │
   ↓
4. Generate Report
   │ • Click "Run Report"
   │ • Processing...
   │ • Report displayed
   │
   ↓
5. Interact with Report
   │
   ├─→ Drill Down
   │   │ • Click any number
   │   │ • See underlying transactions
   │   │ • Click transaction to view details
   │   └─→ Navigate back
   │
   ├─→ Modify Filters
   │   │ • Adjust date range
   │   │ • Add/remove filters
   │   └─→ Report refreshes
   │
   ├─→ Add Visualizations
   │   │ • Toggle chart view
   │   │ • Choose chart type (bar, line, pie)
   │   └─→ Interactive charts
   │
   └─→ Export
       │ • PDF (formatted)
       │ • Excel (with formulas)
       │ • CSV (raw data)
       │ • Google Sheets
       └─→ Download or email
   ↓
6. Save Report
   │
   ├─→ Save Custom View
   │   │ • Name the view
   │   │ • Save filters and parameters
   │   └─→ Quick access later
   │
   └─→ Schedule Report
       │ • Set frequency (daily, weekly, monthly)
       │ • Select recipients
       │ • Choose format (PDF, Excel)
       │ • Set time/day
       └─→ Auto-sends going forward
```

---

## Flow 11: Data Import Flow 📥

```
┌─────────────────────────────────────────────────────────────────┐
│              DATA IMPORT FLOW                                   │
└─────────────────────────────────────────────────────────────────┘

1. Navigate to Import
   │ • Settings > Import Data
   │
   ↓
2. Select Import Type
   │
   ├─→ Chart of Accounts
   ├─→ Customers
   ├─→ Vendors
   ├─→ Products/Services
   ├─→ Invoices
   ├─→ Bills
   ├─→ Expenses
   ├─→ Journal Entries
   ├─→ Bank Transactions
   └─→ Full QuickBooks Migration
   ↓
3. Choose Import Method
   │
   ├─→ Upload CSV File
   │   │ • Download template (recommended)
   │   │ • Fill in template
   │   │ • Upload file
   │   └─→ Go to Step 4
   │
   ├─→ Connect to QuickBooks
   │   │ • OAuth authentication
   │   │ • Select company file
   │   │ • Choose data to import
   │   └─→ Go to Step 5
   │
   └─→ Import from Accounting Software
       │ • Export from Xero/Wave/etc.
       │ • Upload export file
       └─→ Go to Step 4
   ↓
4. Map Columns (CSV Import)
   │ • Auto-detect columns (AI-powered)
   │ • Manual adjustments:
   │   ├─→ Map "Customer Name" → Customer
   │   ├─→ Map "Amount" → Total
   │   ├─→ Map "Date" → Invoice Date
   │   └─→ Etc.
   │ • Set default values (if needed)
   │ • Choose date format
   │
   ↓
5. Preview & Validate
   │ • Show first 10 rows
   │ • Highlight errors:
   │   ├─→ Missing required fields
   │   ├─→ Invalid formats
   │   ├─→ Duplicate entries
   │   └─→ Out-of-range values
   │ • Fix errors or skip rows
   │
   ↓
6. Import Options
   │ • How to handle duplicates:
   │   ├─→ Skip duplicates
   │   ├─→ Update existing
   │   └─→ Create anyway
   │ • Create missing items:
   │   ├─→ Auto-create customers/vendors
   │   └─→ Auto-create accounts
   │
   ↓
7. Execute Import
   │ • Click "Import Data"
   │ • Progress bar...
   │ • "Importing 1,234 records..."
   │
   ↓
8. Import Results
   │ • Summary:
   │   ├─→ ✓ 1,150 records imported successfully
   │   ├─→ ⚠ 50 records skipped (duplicates)
   │   └─→ ✗ 34 records failed (see details)
   │ • Download error log
   │ • Review imported data
   │ • Fix failed records manually
   │
   └─→ End
```

---

## Flow 12: Mobile App Flow 📱

```
┌─────────────────────────────────────────────────────────────────┐
│              MOBILE EXPERIENCE FLOW                             │
└─────────────────────────────────────────────────────────────────┘

On-the-Go Expense Capture
─────────────────────────
1. Take Receipt Photo
   │ • Open MiniBooks app
   │ • Tap "Scan Receipt" (camera icon)
   │ • Point camera at receipt
   │ • Tap shutter button
   │
   ↓
2. AI Processing (Real-time)
   │ • Processing indicator...
   │ • OCR extracts data (3-5 seconds)
   │ • Pre-fills expense form
   │
   ↓
3. Quick Review
   │ • Swipe left/right to edit fields
   │ • Tap to change category
   │ • Add voice memo (optional)
   │
   ↓
4. Submit Expense
   │ • Tap "Save Expense"
   │ • Notification: "Expense saved!"
   │ • Syncs to cloud immediately
   │
   └─→ Available on desktop instantly


Mobile Dashboard
────────────────
• Quick stats (cash, revenue, expenses)
• Mini charts (swipeable)
• Recent transactions
• Action items (bills due, approvals needed)


Mileage Tracking
────────────────
1. Start Trip
   │ • Tap "Track Mileage"
   │ • Enter purpose
   │ • Tap "Start Trip"
   │ • GPS tracking begins
   │
   ↓
2. Drive
   │ • Real-time distance counter
   │ • Map shows route
   │
   ↓
3. End Trip
   │ • Tap "End Trip"
   │ • Review distance
   │ • Confirm or edit
   │ • Auto-calculates reimbursement
   │ • Save
   │
   └─→ Added to mileage log


Approvals on Mobile
───────────────────
1. Receive Push Notification
   │ "John submitted expense for $145 - Approve?"
   │
   ↓
2. Tap Notification
   │ • Opens expense detail
   │ • See receipt image
   │ • See all fields
   │
   ↓
3. Approve/Reject
   │ • Swipe right → Approve
   │ • Swipe left → Reject
   │ • Or tap buttons
   │
   └─→ Notification sent to submitter


Quick Invoicing
───────────────
1. Tap "Quick Invoice"
   │ • Select customer (from list)
   │ • Enter amount
   │ • Select product/service (optional)
   │ • Add memo (optional)
   │
   ↓
2. Send Invoice
   │ • Tap "Send"
   │ • Email sent to customer
   │ • SMS with payment link (optional)
   │
   └─→ Track status in app


Offline Mode
────────────
• Capture expenses offline
• Queue for sync when online
• View cached reports
• Sync indicator in status bar
```

---

This comprehensive flow documentation covers all major user journeys in MiniBooks! 🚀
