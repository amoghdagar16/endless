# Quick Start Guide - Get Running in 10 Minutes

## ⚡ Prerequisites

- Python 3.9+ installed
- Node.js 18+ installed
- Supabase account (you already have this)
- Perplexity API key ([Get one here](https://www.perplexity.ai/settings/api))

---

## 🚀 Step-by-Step Setup

### Step 1: Install Dependencies (3 minutes)

```bash
# Install backend dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 2: Add Perplexity API Key (1 minute)

Edit your `.env` file and add:

```bash
PERPLEXITY_API_KEY=pplx-your-key-here
```

### Step 3: Run Database Migration (2 minutes)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"
5. Copy the contents of `migrations/002_extend_companies_metadata.sql`
6. Paste into the editor
7. Click "Run" (green play button)
8. You should see "Success. No rows returned"

### Step 4: Start the Backend (1 minute)

```bash
# From project root
uvicorn main:app --reload --port 8000
```

Expected output:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**Keep this terminal open!**

### Step 5: Start the Frontend (1 minute)

Open a **new terminal** window:

```bash
cd frontend
npm run dev
```

Expected output:
```
- ready started server on [::]:3000, url: http://localhost:3000
- info  Linting and checking validity of types
```

**Keep this terminal open too!**

### Step 6: Test It! (2 minutes)

1. **Open browser**: http://localhost:3000

2. **Create account**:
   - Go to `/signup`
   - Enter email and password
   - Click "Sign Up"

3. **Complete onboarding**:
   - Should redirect to `/onboarding`
   - Fill out Step 1: Company name, industry, location
   - Fill out Step 2: Business type, revenue, employees
   - Fill out Step 3: Add 1-2 competitors
   - Click through to completion

4. **Test AI Console**:
   - Navigate to `/ai` or look for AI tab
   - **Local Mode**: Click "Top Expenses" button
   - **Market Mode**: Toggle to "Market Intelligence" → Click "Industry Benchmarks"
   - You should see real-time data with citations!

---

## ✅ Verification Checklist

- [ ] Backend running without errors
- [ ] Frontend running without errors
- [ ] Can create account and login
- [ ] Onboarding flow works (all 4 steps)
- [ ] AI Local mode responds to queries
- [ ] AI Market mode shows industry benchmarks (if profile complete)
- [ ] Competitor analysis works (if competitors added)

---

## 🐛 Common Issues

### "Module not found: python-jose"
```bash
pip install python-jose[cryptography]
```

### "PERPLEXITY_API_KEY not found"
- Make sure you added it to `.env` in the **root directory** (not frontend)
- Restart the backend server

### "Cannot connect to backend"
- Make sure backend is running on port 8000
- Check `frontend/.env.local` has `NEXT_PUBLIC_API_BASE=http://localhost:8000`

### "Industry benchmarks not available"
- Complete your company profile first (industry field required)
- Navigate to `/onboarding` to fill missing fields

---

## 🎬 Demo Time!

Once everything is running:

1. **Show the onboarding flow**: Walk through all 4 steps
2. **Show the dashboard**: Real-time KPIs
3. **Show AI Local mode**: Click quick action buttons
4. **Show AI Market Intelligence**: Industry benchmarks with citations
5. **Show competitor analysis**: Real-time competitive insights

**Total demo time: 5 minutes**

---

## 📦 Next: Deploy to Production

When you're ready to deploy:

1. Read `DEPLOYMENT_GUIDE.md`
2. Choose deployment option (Vercel + Railway recommended)
3. Deploy in ~30 minutes
4. Share with beta users!

---

## 🎉 You're Ready!

Your secure, AI-powered accounting platform is now running locally.

**What you have:**
- ✅ Secure multi-tenant system
- ✅ Real-time AI market intelligence
- ✅ Industry benchmarking
- ✅ Competitor analysis
- ✅ Professional onboarding flow

**Need help?** Check `DEPLOYMENT_GUIDE.md` troubleshooting section.

**Ready to launch?** Follow `DEPLOYMENT_GUIDE.md` for production deployment.

---

**Pro Tip:** Create 2-3 test companies with different industries to see how AI adapts its responses!
