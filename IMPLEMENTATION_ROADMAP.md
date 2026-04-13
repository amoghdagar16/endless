# Endless Accounting Dashboard - Production Roadmap

## Executive Summary

Your accounting dashboard has **strong foundational features** (double-entry bookkeeping, journal entries, chart of accounts, OpenAI integration) but **critical security and multi-tenancy gaps** that must be addressed before hosting for trial runs.

**Current State:** ✅ Feature-complete for single company | ❌ Not multi-tenant secure
**Target State:** Production-ready SaaS with Perplexity AI insights and Stripe onboarding

---

## 🔴 CRITICAL FINDINGS

### Security Vulnerabilities (MUST FIX BEFORE HOSTING)

1. **No API Authentication** - Backend endpoints don't validate JWT tokens
   - Any user can access any company's financial data
   - No verification of user identity on backend routes

2. **Data Isolation Missing** - No company_id filtering at API level
   - User A can query Company B's data by changing company_id parameter
   - Service role key bypasses all Row-Level Security policies

3. **Exposed Credentials** - API keys visible in `.env` file
   - OpenAI key: `sk-proj-wNIx...` (exposed)
   - Supabase service_role key (should never be public)

4. **No Input Validation** - company_id accepted from request body
   - Users can impersonate other companies
   - No ownership validation

**Risk Level:** 🔴 **CRITICAL** - Data breach imminent if deployed as-is

---

## 📊 CURRENT ARCHITECTURE

### What Works Well ✅

- **Accounting Core**: Proper double-entry bookkeeping with debit/credit validation
- **Database Schema**: Well-designed multi-tenant structure (tables ready)
- **Authentication Frontend**: Supabase Auth working (login/signup)
- **AI Integration**: OpenAI GPT-4o-mini providing financial insights
- **OCR Parsing**: Receipt extraction with easyocr + AI enhancement
- **Modern Stack**: Next.js 14 + FastAPI + Supabase

### What's Missing ❌

| Feature | Frontend | Backend | Status |
|---------|----------|---------|--------|
| JWT Validation | N/A | ❌ | Not implemented |
| Company Scoping | Partial | ❌ | Not enforced |
| Perplexity AI | ❌ | ❌ | Not integrated |
| Stripe Onboarding | ❌ | ❌ | Not implemented |
| Business Metadata Collection | ❌ | ❌ | No industry/location capture |
| Role-Based Access | ✅ Schema | ❌ | Not enforced |
| RLS Policies | ✅ Schema | ❌ | Not activated |
| Audit Logging | ✅ Table | ❌ | Not used |

---

## 🎯 IMPLEMENTATION PHASES

### Phase 1: Security & Multi-Tenancy (PRIORITY 1) ⏱️ Week 1

**Objective:** Make the app secure for multi-company deployment

#### 1.1 Backend Authentication Middleware
```python
# New file: /middleware/auth.py

from fastapi import HTTPException, Depends, Header
from jose import jwt, JWTError
import os

async def verify_token(authorization: str = Header(None)):
    """Validate JWT and extract user_id"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authentication")

    token = authorization.replace("Bearer ", "")
    try:
        # Verify JWT with Supabase public key
        payload = jwt.decode(
            token,
            os.getenv("SUPABASE_JWT_SECRET"),
            algorithms=["HS256"],
            audience="authenticated"
        )
        return payload["sub"]  # user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user_company(user_id: str = Depends(verify_token)):
    """Get authenticated user's company_id"""
    from database import supabase
    response = supabase.table("users").select("company_id").eq("id", user_id).single().execute()

    if not response.data or not response.data.get("company_id"):
        raise HTTPException(status_code=403, detail="User not assigned to company")

    return {
        "user_id": user_id,
        "company_id": response.data["company_id"]
    }
```

#### 1.2 Update All Routes to Use Authentication
**Example: `/routes/journals.py`**
```python
from middleware.auth import get_current_user_company

@router.get("/")
async def get_journals(auth: dict = Depends(get_current_user_company)):
    """Get journals for authenticated user's company only"""
    company_id = auth["company_id"]

    response = supabase.table("journal_entries")\
        .select("*, journal_lines(*)")\
        .eq("company_id", company_id)\
        .execute()

    return response.data
```

#### 1.3 Add Row-Level Security Policies
```sql
-- Enable RLS on all tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own company's data
CREATE POLICY "Users access own company accounts"
ON accounts FOR ALL
USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users access own company journals"
ON journal_entries FOR ALL
USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Admin override policy
CREATE POLICY "Admins access all data"
ON accounts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

#### 1.4 Switch Backend to Anon Key (Not Service Role)
**In `/database.py`:**
```python
# BEFORE (insecure - bypasses RLS)
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)  # service_role key

# AFTER (secure - enforces RLS)
supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)  # public anon key
```

Then validate JWTs manually and pass them to Supabase:
```python
# In authenticated routes
supabase.auth.set_session(user_jwt_token)
```

#### 1.5 Frontend: Send JWT with Requests
**Update `/frontend/lib/api.ts`:**
```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabase = createClientComponentClient()

export async function fetchAPI(endpoint: string, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
      ...options.headers,
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      // Redirect to login
      window.location.href = '/login'
    }
    throw new Error(`API error: ${response.statusText}`)
  }

  return response.json()
}
```

**Deliverables:**
- ✅ JWT validation on all backend routes
- ✅ Company-scoped queries enforced
- ✅ RLS policies active in Supabase
- ✅ Frontend sends auth tokens
- ✅ No more direct company_id in request bodies

---

### Phase 2: Business Metadata & Onboarding (PRIORITY 2) ⏱️ Week 1-2

**Objective:** Capture business context for Perplexity AI comparisons

#### 2.1 Extend Companies Table Schema
```sql
ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS business_type TEXT; -- 'sole_proprietor', 'llc', 'corporation'
ALTER TABLE companies ADD COLUMN IF NOT EXISTS employee_count INT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS annual_revenue DECIMAL(15,2);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS location_city TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS location_state TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS location_country TEXT DEFAULT 'USA';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS founded_year INT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS primary_products TEXT[]; -- Array of product/service categories
ALTER TABLE companies ADD COLUMN IF NOT EXISTS target_market TEXT; -- 'B2B', 'B2C', 'B2B2C'
ALTER TABLE companies ADD COLUMN IF NOT EXISTS competitors TEXT[]; -- Known competitors
ALTER TABLE companies ADD COLUMN IF NOT EXISTS growth_stage TEXT; -- 'startup', 'growth', 'mature'
```

#### 2.2 Create Onboarding Flow
**New Page: `/frontend/app/onboarding/page.tsx`**

Multi-step wizard:
1. **Company Basics** (name, industry, location)
2. **Business Profile** (revenue, employees, founded year)
3. **Market Context** (competitors, target market, products)
4. **Accounting Setup** (fiscal year, currency, chart of accounts template)
5. **Stripe Connection** (optional for now)

**Example Industry Options:**
```typescript
const INDUSTRIES = [
  'SaaS / Software',
  'E-commerce / Retail',
  'Professional Services',
  'Healthcare',
  'Manufacturing',
  'Food & Beverage',
  'Real Estate',
  'Construction',
  'Marketing / Advertising',
  'Education',
  'Other'
]
```

#### 2.3 Update Profile Page
**Enhance `/frontend/app/profile/page.tsx`:**
- Add industry selector
- Add location fields (city, state)
- Add revenue range slider
- Add employee count
- Add multi-select for product categories

#### 2.4 Backend Route: Update Company Profile
```python
# /routes/companies.py

@router.put("/{company_id}")
async def update_company_profile(
    company_id: str,
    updates: CompanyProfileUpdate,
    auth: dict = Depends(get_current_user_company)
):
    # Verify user owns this company
    if auth["company_id"] != company_id:
        raise HTTPException(status_code=403, detail="Cannot update other company")

    response = supabase.table("companies")\
        .update(updates.dict(exclude_unset=True))\
        .eq("id", company_id)\
        .execute()

    return response.data
```

**Deliverables:**
- ✅ Extended company schema with business metadata
- ✅ Multi-step onboarding wizard
- ✅ Enhanced profile page
- ✅ Backend validation for profile updates

---

### Phase 3: Perplexity AI Integration (PRIORITY 3) ⏱️ Week 2

**Objective:** Add real-time market intelligence and contextual business comparisons

#### 3.1 Add Perplexity API Key
**Update `.env`:**
```bash
PERPLEXITY_API_KEY=pplx-your-key-here
```

#### 3.2 Create Perplexity Client
**New File: `/lib/perplexity_client.py`**
```python
import os
import httpx
from typing import List, Dict

class PerplexityClient:
    def __init__(self):
        self.api_key = os.getenv("PERPLEXITY_API_KEY")
        self.base_url = "https://api.perplexity.ai"
        self.model = "llama-3.1-sonar-large-128k-online"  # Real-time web search

    async def query(
        self,
        prompt: str,
        system_prompt: str = None,
        search_domain_filter: List[str] = None
    ) -> Dict:
        """Query Perplexity with optional domain filtering"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt or "You are a financial analyst."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2,  # Low temp for factual responses
            "max_tokens": 1000,
            "search_domain_filter": search_domain_filter or [],
            "return_citations": True,
            "return_images": False
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()

    async def get_industry_benchmarks(
        self,
        industry: str,
        location: str,
        metrics: List[str]
    ) -> Dict:
        """Get real-time industry benchmarks"""
        prompt = f"""
        For {industry} businesses in {location}, provide current benchmarks for:
        {', '.join(metrics)}

        Include:
        - Median values for small-medium businesses
        - Growth trends (2024-2026)
        - Key performance indicators
        - Sources with publication dates

        Format as JSON with citations.
        """

        return await self.query(
            prompt,
            system_prompt="You are a business analyst providing factual market data.",
            search_domain_filter=["ibisworld.com", "census.gov", "statista.com", "forbes.com"]
        )

    async def compare_competitors(
        self,
        company_name: str,
        industry: str,
        competitors: List[str],
        location: str
    ) -> Dict:
        """Compare company to competitors using real-time data"""
        prompt = f"""
        Compare {company_name} (a {industry} business in {location}) with these competitors:
        {', '.join(competitors)}

        Focus on:
        - Revenue growth rates (recent quarters)
        - Market share trends
        - Customer acquisition strategies
        - Operational efficiency metrics

        Provide actionable insights with citations.
        """

        return await self.query(prompt)

    async def get_tax_compliance_updates(
        self,
        business_type: str,
        location_state: str,
        year: int
    ) -> Dict:
        """Get latest tax compliance requirements"""
        prompt = f"""
        What are the latest tax compliance requirements for {business_type}
        businesses in {location_state} for {year}?

        Include:
        - Recent law changes
        - Filing deadlines
        - Deduction opportunities
        - State-specific credits

        Only include official sources (IRS, state revenue department).
        """

        return await self.query(
            prompt,
            search_domain_filter=["irs.gov", f"{location_state.lower()}.gov"]
        )
```

#### 3.3 Create New AI Endpoints
**New File: `/routes/ai_research.py`**
```python
from fastapi import APIRouter, Depends, HTTPException
from lib.perplexity_client import PerplexityClient
from middleware.auth import get_current_user_company
from database import supabase

router = APIRouter(prefix="/ai/research", tags=["AI Research"])

@router.post("/industry-benchmarks")
async def get_industry_benchmarks(auth: dict = Depends(get_current_user_company)):
    """Get real-time industry benchmarks for user's company"""
    company_id = auth["company_id"]

    # Fetch company profile
    company = supabase.table("companies")\
        .select("*")\
        .eq("id", company_id)\
        .single()\
        .execute()

    if not company.data:
        raise HTTPException(status_code=404, detail="Company not found")

    company_data = company.data

    # Ensure required fields exist
    if not company_data.get("industry") or not company_data.get("location_state"):
        raise HTTPException(
            status_code=400,
            detail="Please complete your company profile (industry and location required)"
        )

    # Query Perplexity
    perplexity = PerplexityClient()
    benchmarks = await perplexity.get_industry_benchmarks(
        industry=company_data["industry"],
        location=f"{company_data['location_city']}, {company_data['location_state']}",
        metrics=[
            "Average revenue",
            "Profit margins",
            "Operating expenses ratio",
            "Customer acquisition cost",
            "Growth rate"
        ]
    )

    return benchmarks

@router.post("/competitor-analysis")
async def analyze_competitors(auth: dict = Depends(get_current_user_company)):
    """Compare company to competitors using real-time data"""
    company_id = auth["company_id"]

    company = supabase.table("companies")\
        .select("*")\
        .eq("id", company_id)\
        .single()\
        .execute()

    company_data = company.data

    if not company_data.get("competitors"):
        raise HTTPException(
            status_code=400,
            detail="Please add competitors in your company profile"
        )

    perplexity = PerplexityClient()
    analysis = await perplexity.compare_competitors(
        company_name=company_data["name"],
        industry=company_data["industry"],
        competitors=company_data["competitors"],
        location=company_data["location_state"]
    )

    return analysis

@router.post("/tax-updates")
async def get_tax_updates(auth: dict = Depends(get_current_user_company)):
    """Get latest tax compliance updates for user's jurisdiction"""
    from datetime import datetime

    company_id = auth["company_id"]
    company = supabase.table("companies")\
        .select("business_type, location_state")\
        .eq("id", company_id)\
        .single()\
        .execute()

    company_data = company.data

    perplexity = PerplexityClient()
    updates = await perplexity.get_tax_compliance_updates(
        business_type=company_data["business_type"],
        location_state=company_data["location_state"],
        year=datetime.now().year
    )

    return updates
```

#### 3.4 Enhanced AI Console with Perplexity Toggle
**Update `/frontend/app/ai/page.tsx`:**
```tsx
const [aiMode, setAiMode] = useState<'local' | 'research'>('local')

// Add toggle UI
<div className="flex gap-2 mb-4">
  <button
    onClick={() => setAiMode('local')}
    className={aiMode === 'local' ? 'btn-primary' : 'btn-secondary'}
  >
    📊 Local Analysis (OpenAI)
  </button>
  <button
    onClick={() => setAiMode('research')}
    className={aiMode === 'research' ? 'btn-primary' : 'btn-secondary'}
  >
    🌐 Market Intelligence (Perplexity)
  </button>
</div>

// Update query function
const handleQuery = async () => {
  const endpoint = aiMode === 'local'
    ? '/ai/query'
    : '/ai/research/industry-benchmarks'

  const response = await fetchAPI(endpoint, {
    method: 'POST',
    body: JSON.stringify({ question: query, company_id: companyId })
  })

  setResponse(response)
}
```

#### 3.5 Add Quick Research Buttons
```tsx
const RESEARCH_PROMPTS = [
  {
    label: "Industry Benchmarks",
    endpoint: "/ai/research/industry-benchmarks",
    icon: "📈"
  },
  {
    label: "Competitor Analysis",
    endpoint: "/ai/research/competitor-analysis",
    icon: "🎯"
  },
  {
    label: "Tax Updates",
    endpoint: "/ai/research/tax-updates",
    icon: "📋"
  }
]
```

**Deliverables:**
- ✅ Perplexity API client with domain filtering
- ✅ Industry benchmark queries
- ✅ Competitor analysis endpoint
- ✅ Tax compliance updates
- ✅ Dual-mode AI console (OpenAI + Perplexity)
- ✅ Citation tracking for audit trail

---

### Phase 4: Stripe Integration & Onboarding (PRIORITY 4) ⏱️ Week 3

**Objective:** Capture real accounting data via Stripe Connect

#### 4.1 Add Stripe SDK
**Backend:**
```bash
cd backend
pip install stripe
```

**Frontend:**
```bash
cd frontend
npm install @stripe/stripe-js @stripe/react-stripe-js
```

#### 4.2 Create Stripe Connect Onboarding
**New Table: `stripe_accounts`**
```sql
CREATE TABLE stripe_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  stripe_account_id TEXT UNIQUE NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
```

#### 4.3 Backend: Stripe OAuth Flow
**New File: `/routes/stripe_integration.py`**
```python
import stripe
import os
from fastapi import APIRouter, Depends, HTTPException, Request
from middleware.auth import get_current_user_company

router = APIRouter(prefix="/stripe", tags=["Stripe Integration"])

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

@router.post("/connect-account")
async def create_connect_account(auth: dict = Depends(get_current_user_company)):
    """Create Stripe Connect account for onboarding"""
    company_id = auth["company_id"]

    # Create Stripe Express account
    account = stripe.Account.create(
        type="express",
        country="US",
        capabilities={
            "card_payments": {"requested": True},
            "transfers": {"requested": True},
        },
    )

    # Create account link for onboarding
    account_link = stripe.AccountLink.create(
        account=account.id,
        refresh_url=f"{os.getenv('FRONTEND_URL')}/onboarding/stripe/refresh",
        return_url=f"{os.getenv('FRONTEND_URL')}/onboarding/stripe/return",
        type="account_onboarding",
    )

    # Store in database
    supabase.table("stripe_accounts").insert({
        "company_id": company_id,
        "stripe_account_id": account.id
    }).execute()

    return {"url": account_link.url}

@router.get("/account-status")
async def get_account_status(auth: dict = Depends(get_current_user_company)):
    """Check Stripe Connect account status"""
    company_id = auth["company_id"]

    account_data = supabase.table("stripe_accounts")\
        .select("*")\
        .eq("company_id", company_id)\
        .single()\
        .execute()

    if not account_data.data:
        return {"connected": False}

    # Fetch live status from Stripe
    account = stripe.Account.retrieve(account_data.data["stripe_account_id"])

    return {
        "connected": True,
        "charges_enabled": account.charges_enabled,
        "payouts_enabled": account.payouts_enabled,
        "details_submitted": account.details_submitted
    }

@router.post("/sync-transactions")
async def sync_stripe_transactions(auth: dict = Depends(get_current_user_company)):
    """Import Stripe transactions as journal entries"""
    company_id = auth["company_id"]

    # Get Stripe account
    stripe_account = supabase.table("stripe_accounts")\
        .select("stripe_account_id")\
        .eq("company_id", company_id)\
        .single()\
        .execute()

    if not stripe_account.data:
        raise HTTPException(status_code=404, detail="Stripe account not connected")

    # Fetch recent charges
    charges = stripe.Charge.list(
        limit=100,
        stripe_account=stripe_account.data["stripe_account_id"]
    )

    # Convert to journal entries
    imported_count = 0
    for charge in charges.data:
        if charge.paid:
            # Create journal entry: Debit Cash, Credit Revenue
            await create_journal_from_charge(company_id, charge)
            imported_count += 1

    return {"imported": imported_count}
```

#### 4.4 Frontend: Stripe Onboarding UI
**New Page: `/frontend/app/onboarding/stripe/page.tsx`**
```tsx
'use client'

export default function StripeOnboarding() {
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    setLoading(true)
    const response = await fetchAPI('/stripe/connect-account', {
      method: 'POST'
    })

    // Redirect to Stripe onboarding
    window.location.href = response.url
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">Connect Your Stripe Account</h1>
      <p className="text-gray-600 mb-6">
        Automatically import transactions and streamline accounting.
      </p>

      <button onClick={handleConnect} disabled={loading}>
        {loading ? 'Connecting...' : 'Connect Stripe'}
      </button>
    </div>
  )
}
```

**Deliverables:**
- ✅ Stripe Connect Express integration
- ✅ Automatic transaction import
- ✅ Journal entry creation from Stripe charges
- ✅ Revenue recognition automation

---

### Phase 5: Production Readiness (PRIORITY 5) ⏱️ Week 3-4

#### 5.1 Environment Configuration
**Create `.env.production`:**
```bash
# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_SUPABASE_URL=https://xgunschzrcnxcxdphwha.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Backend
SUPABASE_URL=https://xgunschzrcnxcxdphwha.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_JWT_SECRET=your-jwt-secret-here
OPENAI_API_KEY=your-openai-key
PERPLEXITY_API_KEY=your-perplexity-key
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=https://yourdomain.com
```

#### 5.2 Add Rate Limiting
```bash
pip install slowapi
```

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@router.post("/ai/query")
@limiter.limit("10/minute")  # Max 10 AI queries per minute
async def ai_query(request: Request, ...):
    ...
```

#### 5.3 Add Error Tracking
```bash
pip install sentry-sdk[fastapi]
npm install @sentry/nextjs
```

#### 5.4 Deployment Checklist
- [ ] Remove all console.log statements
- [ ] Add proper error boundaries in React
- [ ] Set up CORS for production domain
- [ ] Enable HTTPS only
- [ ] Add CSP headers
- [ ] Configure CDN for static assets
- [ ] Set up database backups (Supabase auto-backups)
- [ ] Add monitoring (Sentry, DataDog, or similar)
- [ ] Load testing (simulate 100 concurrent users)
- [ ] Security audit (OWASP top 10 checklist)

#### 5.5 Hosting Options

**Option A: Vercel (Frontend) + Railway (Backend)**
- Frontend: Deploy Next.js to Vercel (zero config)
- Backend: Deploy FastAPI to Railway
- Database: Supabase (already hosted)
- Cost: ~$20-50/month

**Option B: AWS (Full Stack)**
- Frontend: S3 + CloudFront
- Backend: ECS Fargate or Lambda
- Database: Supabase or RDS Postgres
- Cost: ~$50-100/month

**Option C: DigitalOcean App Platform**
- All-in-one deployment
- Cost: ~$30-60/month

---

## 📋 DEMO PREPARATION CHECKLIST

### Pre-Demo Setup
- [ ] Create 3 demo companies with different industries
  - Company A: SaaS (tech startup)
  - Company B: Coffee shop (retail)
  - Company C: Consulting firm (services)
- [ ] Pre-populate realistic journal entries (30 days of transactions)
- [ ] Add sample competitors for each company
- [ ] Configure Perplexity AI to return fast responses
- [ ] Create demo script with key talking points

### Demo Flow
1. **Login** (10 seconds) - Show existing user login
2. **Dashboard** (30 seconds) - Highlight KPIs, expense breakdown
3. **Journal Entries** (30 seconds) - Show double-entry bookkeeping
4. **AI Copilot - Local** (60 seconds) - Ask "What are my top expenses?" (OpenAI)
5. **AI Research - Perplexity** (90 seconds) - Click "Industry Benchmarks" → Show real-time comparison
6. **Competitor Analysis** (60 seconds) - Show side-by-side comparison with citations
7. **Profile & Settings** (30 seconds) - Show business metadata capture
8. **Stripe Connect** (optional) - Show transaction import

**Total Demo Time:** 5-6 minutes

### Key Talking Points
- "Traditional accounting software shows numbers, we explain what they mean"
- "Perplexity AI gives context: how do I compare to similar businesses in my area?"
- "Grounded in real data, not AI hallucinations—see the citations"
- "Designed for small business owners who aren't accountants"

---

## 🚀 IMPLEMENTATION TIMELINE

| Phase | Tasks | Duration | Dependencies |
|-------|-------|----------|--------------|
| **Phase 1** | Security & Multi-Tenancy | 3-5 days | None |
| **Phase 2** | Business Metadata | 2-3 days | Phase 1 |
| **Phase 3** | Perplexity Integration | 3-4 days | Phase 2 |
| **Phase 4** | Stripe Connect | 4-5 days | Phase 1 |
| **Phase 5** | Production Deploy | 2-3 days | All phases |

**Total Estimated Time:** 2-3 weeks for full implementation

---

## 💰 COST ESTIMATES (Monthly)

### API Usage
- **Perplexity AI**: ~$0.001 per request → $50-100/month (5k-10k queries)
- **OpenAI GPT-4o-mini**: ~$0.0001 per 1k tokens → $20-50/month
- **Supabase**: Free tier → $0 (up to 50k auth users)
- **Stripe**: 2.9% + $0.30 per transaction (revenue-based)

### Hosting
- **Vercel**: Free tier or $20/month (Pro)
- **Railway**: $5-10/month (Backend)
- **Sentry**: Free tier (up to 5k events)

**Total:** $75-180/month (scales with usage)

---

## 🔐 SECURITY BEST PRACTICES

1. **Never commit `.env` files** (add to `.gitignore`)
2. **Use separate API keys for dev/staging/production**
3. **Rotate Stripe webhook secrets regularly**
4. **Enable 2FA for Supabase dashboard**
5. **Set up IP allowlisting for admin routes**
6. **Monitor auth logs for suspicious activity**
7. **Implement session timeout (30 min inactivity)**
8. **Add CAPTCHA to signup form (prevent bot registrations)**

---

## 📞 NEXT STEPS

### Immediate Actions (Today)
1. **Add Perplexity API key to `.env`**
2. **Create `/middleware/auth.py` file**
3. **Test JWT validation with Postman**
4. **Update one route (e.g., `/journals/`) to use authentication**
5. **Verify company isolation works**

### This Week
1. Complete Phase 1 (Security)
2. Start Phase 2 (Metadata collection)
3. Design onboarding UI mockups

### Next Week
1. Implement Perplexity endpoints
2. Build competitor analysis UI
3. Create demo data

---

## 🎯 SUCCESS METRICS

### Before Launch
- [ ] 100% of API routes require authentication
- [ ] Zero cross-company data leaks (penetration tested)
- [ ] Average AI response time < 3 seconds
- [ ] All environment variables in secure vault
- [ ] 95%+ uptime during 1-week trial

### After Launch (Trial Period)
- [ ] 10+ beta users onboarded
- [ ] Average session duration > 10 minutes
- [ ] 80%+ users connect Stripe account
- [ ] <5% error rate on AI queries
- [ ] Net Promoter Score (NPS) > 40

---

## 📚 ADDITIONAL RESOURCES

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [FastAPI Security Best Practices](https://fastapi.tiangolo.com/tutorial/security/)
- [Perplexity API Docs](https://docs.perplexity.ai/)
- [Stripe Connect Guide](https://stripe.com/docs/connect)
- [OWASP Top 10 Checklist](https://owasp.org/www-project-top-ten/)

---

**Document Version:** 1.0
**Last Updated:** 2026-02-01
**Author:** Claude Code AI
**Status:** 🚧 READY FOR IMPLEMENTATION
