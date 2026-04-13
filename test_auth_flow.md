# Testing the Complete Authentication Flow

## Start the System

**Terminal 1 - Backend:**
```bash
uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

---

## Test Sequence

### 1. **Create Account** (Supabase Auth)
- Navigate to http://localhost:3000/signup
- Enter email: `test@example.com`
- Enter password: `password123`
- Enter name: `Test User`
- Click "Sign Up"
- ✅ **Expected**: Redirects to onboarding or dashboard

**What happens behind the scenes:**
```
Frontend: signUp() → Supabase.auth.signUp()
          ↓
Supabase: Creates user in auth.users table
          ↓
Backend:  Creates user record in public.users table
          ↓
Frontend: Receives JWT token, stores in session
          ↓
AuthContext: Loads user + company data
```

---

### 2. **Complete Onboarding**
- Should auto-redirect to `/onboarding`
- Fill out all 4 steps
- ✅ **Expected**: Data saved to companies table with your user_id

**What happens behind the scenes:**
```
Frontend: api.post('/companies/', data)
          ↓
api.ts:   Injects JWT token: "Authorization: Bearer <token>"
          ↓
Backend:  middleware/auth.py validates token
          ↓
          Extracts user_id from JWT
          ↓
          Creates company with authenticated user_id
          ↓
          Returns success
```

---

### 3. **Test Protected Routes**
- Navigate to `/journals`
- Try to create a journal entry
- ✅ **Expected**: Only sees own company's data

**What happens behind the scenes:**
```
Frontend: api.get('/journals/')
          ↓
api.ts:   Sends "Authorization: Bearer <token>"
          ↓
Backend:  auth.py validates token
          ↓
          Extracts company_id from users table
          ↓
          Filters journals by company_id
          ↓
          Returns ONLY your company's journals
```

---

### 4. **Test AI Console**
- Navigate to `/ai`
- Click "Top Expenses" (Local mode)
- ✅ **Expected**: AI analyzes YOUR company's data

- Switch to "Market Intelligence" mode
- Click "Industry Benchmarks"
- ✅ **Expected**: Real-time benchmarks for YOUR industry

**What happens behind the scenes:**
```
Frontend: api.post('/ai/research/industry-benchmarks')
          ↓
api.ts:   Sends JWT token
          ↓
Backend:  Validates token → Gets company_id
          ↓
          Fetches YOUR company profile
          ↓
          Calls Perplexity AI with YOUR industry/location
          ↓
          Returns personalized benchmarks
```

---

### 5. **Test Company Isolation** (Security Test)
- Create a second account (different email)
- Create a different company
- Login as User 1
- Try to access User 2's company_id in URL
- ✅ **Expected**: 403 Forbidden error

**Browser DevTools Test:**
```javascript
// Open browser console
// Try to fetch another company's data
fetch('http://localhost:8000/companies/some-other-company-id', {
  headers: {
    'Authorization': 'Bearer ' + 'your-token-here'
  }
})

// Expected: 403 Forbidden
```

---

### 6. **Test Token Refresh**
- Stay logged in for 1 hour
- Click around the app
- ✅ **Expected**: Token auto-refreshes, no re-login needed

---

### 7. **Test Logout**
- Click logout button
- ✅ **Expected**: Redirects to login page

**What happens behind the scenes:**
```
Frontend: signOut() → Supabase.auth.signOut()
          ↓
          Clears session
          ↓
          Clears AuthContext
          ↓
          Redirects to /login
```

---

## Success Criteria

✅ Can create account
✅ Can login/logout
✅ Token persists across page reloads
✅ All API calls include JWT token
✅ Backend validates JWT on every request
✅ Data scoped to authenticated company
✅ Cannot access other companies' data
✅ AI queries use authenticated company context

---

## Troubleshooting

### "Missing authentication token"
- Check browser DevTools → Network tab
- Verify Authorization header is present
- Check Supabase session exists

### "Invalid token"
- Clear browser cache
- Logout and login again
- Check SUPABASE_JWT_SECRET matches your Supabase project

### "Cannot access another company's data"
- **This is correct!** Security is working
- Each user can only access their own company

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                    │
│                                                          │
│  ┌──────────────┐      ┌─────────────────────────────┐ │
│  │ Supabase     │──────│ AuthContext                 │ │
│  │ Auth Client  │      │ - Manages user session      │ │
│  └──────────────┘      │ - Stores user + company     │ │
│                        └─────────────────────────────┘ │
│                                    ↓                     │
│                        ┌─────────────────────────────┐ │
│                        │ api.ts                      │ │
│                        │ - Auto-injects JWT tokens   │ │
│                        └─────────────────────────────┘ │
└────────────────────────────────┬────────────────────────┘
                                 │ Authorization: Bearer <JWT>
                                 ↓
┌─────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                     │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ middleware/auth.py                                │  │
│  │ 1. Validates JWT with Supabase                   │  │
│  │ 2. Extracts user_id                              │  │
│  │ 3. Fetches company_id from users table           │  │
│  │ 4. Passes to route handler                       │  │
│  └──────────────────────────────────────────────────┘  │
│                         ↓                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Route Handlers (journals, accounts, etc.)        │  │
│  │ - Receives authenticated context                  │  │
│  │ - Filters data by company_id                     │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────┘
                                 │
                                 ↓
┌─────────────────────────────────────────────────────────┐
│              SUPABASE (Database + Auth)                  │
│                                                          │
│  auth.users      → Supabase-managed auth                │
│  public.users    → Your user records + company_id       │
│  companies       → Company data (scoped by user)        │
│  journal_entries → Financial data (scoped by company)   │
└─────────────────────────────────────────────────────────┘
```

---

**Status: ✅ FULLY AUTHENTICATED AND SECURE**
