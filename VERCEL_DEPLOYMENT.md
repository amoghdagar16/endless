# Safe Deployment Guide - Vercel + Railway

## Architecture Overview

```
┌─────────────────┐
│   Vercel        │ ← Frontend (Next.js)
│   (Frontend)    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Railway       │ ← Backend API (FastAPI)
│   (Backend)     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Supabase      │ ← Database + Auth (Already deployed)
│  (DB + Auth)    │
└─────────────────┘
```

---

## Prerequisites

Before starting, make sure you have:
- [ ] GitHub repository with your code (✅ Already done!)
- [ ] Railway account: https://railway.app
- [ ] Vercel account: https://vercel.com
- [ ] Supabase project running (✅ Already done!)
- [ ] All API keys ready:
  - Supabase URL and Keys
  - OpenAI API key
  - Perplexity API key

---

## Part 1: Deploy Backend to Railway

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

### Step 2: Login to Railway

```bash
railway login
```

This will open your browser for authentication.

### Step 3: Initialize Railway Project

```bash
# Make sure you're in the project root directory
cd "/Users/amoghdagar/Downloads/endless-claude-accounting-dashboard-layout-01VFWUiN6GiREBcVGdqYQqGC 2"

# Initialize Railway
railway init
```

You'll be prompted to:
- Create a new project or select existing
- Name your project (e.g., "endless-accounting-backend")

### Step 4: Link to GitHub Repository (Optional but Recommended)

In Railway dashboard:
1. Go to your project
2. Click "Settings"
3. Under "Service Source", click "Connect GitHub"
4. Select your repository
5. Select branch: `Frontend-+-backend-integration`

This enables automatic deployments on push!

### Step 5: Add Environment Variables in Railway

In Railway dashboard → Your Project → Variables tab, add:

```bash
# Supabase Configuration
SUPABASE_URL=https://xgunschzrcnxcxdphwha.supabase.co
SUPABASE_KEY=your_service_role_key_here
SUPABASE_JWT_SECRET=your_jwt_secret_here

# AI APIs
OPENAI_API_KEY=sk-proj-...
PERPLEXITY_API_KEY=pplx-...
```

**Where to find these:**
- `SUPABASE_URL`: Supabase Dashboard → Settings → API → Project URL
- `SUPABASE_KEY`: Supabase Dashboard → Settings → API → service_role key (⚠️ Keep secret!)
- `SUPABASE_JWT_SECRET`: Supabase Dashboard → Settings → API → JWT Secret
- `OPENAI_API_KEY`: Your existing OpenAI key
- `PERPLEXITY_API_KEY`: Get from https://www.perplexity.ai/settings/api

### Step 6: Deploy to Railway

```bash
railway up
```

### Step 7: Get Your Backend URL

After deployment:
```bash
railway domain
```

Or find it in Railway dashboard → Your service → Settings → Domains

Example: `https://endless-accounting-production.up.railway.app`

**📝 Save this URL - you'll need it for Vercel!**

### Step 8: Test Backend Deployment

```bash
# Test health endpoint
curl https://your-backend-url.railway.app/status/healthz

# Should return: {"status": "healthy"}
```

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Navigate to Frontend Directory

```bash
cd frontend
```

### Step 3: Login to Vercel

```bash
vercel login
```

### Step 4: Deploy Frontend

```bash
vercel
```

You'll be asked:
- **Set up and deploy?** → Yes
- **Which scope?** → Select your account
- **Link to existing project?** → No
- **Project name?** → `endless-accounting` (or your preferred name)
- **Directory?** → `./` (current directory)
- **Override settings?** → No

This creates a **preview deployment**.

### Step 5: Add Environment Variables in Vercel

**Option A: Via Vercel CLI**

```bash
# Add backend API URL (use your Railway URL from Part 1, Step 7)
vercel env add NEXT_PUBLIC_API_BASE

# When prompted, paste: https://your-backend-url.railway.app
# Select: Production, Preview, Development (all three)

# Add Supabase URL
vercel env add NEXT_PUBLIC_SUPABASE_URL

# When prompted, paste: https://xgunschzrcnxcxdphwha.supabase.co
# Select: Production, Preview, Development

# Add Supabase Anon Key
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY

# When prompted, paste your Supabase anon key
# Select: Production, Preview, Development
```

**Option B: Via Vercel Dashboard**

1. Go to https://vercel.com/dashboard
2. Click your project
3. Go to Settings → Environment Variables
4. Add these three variables:

```
NEXT_PUBLIC_API_BASE = https://your-backend-url.railway.app
NEXT_PUBLIC_SUPABASE_URL = https://xgunschzrcnxcxdphwha.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your_anon_key_here
```

**Where to find Supabase Anon Key:**
- Supabase Dashboard → Settings → API → anon/public key

### Step 6: Deploy to Production

```bash
vercel --prod
```

This creates your production deployment!

### Step 7: Get Your Frontend URL

After deployment, Vercel will show:
```
✅ Production: https://endless-accounting.vercel.app
```

**📝 Save this URL!**

---

## Part 3: Connect Frontend & Backend

### Step 1: Update Backend CORS Settings

Your backend needs to allow requests from your Vercel frontend.

Edit your `main.py` file and update the CORS middleware:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "https://endless-accounting.vercel.app",  # Replace with YOUR Vercel URL
        "https://*.vercel.app",  # Allow all preview deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Step 2: Commit and Push Changes

```bash
# From project root
git add main.py
git commit -m "Update CORS for Vercel deployment"
git push
```

If you connected Railway to GitHub, it will automatically redeploy! Otherwise:

```bash
railway up
```

---

## Part 4: Verification & Testing

### Test 1: Check Frontend Loads

Visit your Vercel URL: `https://endless-accounting.vercel.app`

You should see your app!

### Test 2: Test Authentication

1. Go to `/signup` and create a test account
2. You should be able to sign up successfully
3. Login with your credentials
4. Should redirect to dashboard or onboarding

### Test 3: Test API Connection

Open browser console (F12) and check:
- Network tab → Should see requests to your Railway backend
- No CORS errors
- API requests returning data

### Test 4: Test Full Flow

1. Complete onboarding
2. Navigate to dashboard
3. Try AI features
4. Verify all functionality works

---

## Troubleshooting

### Issue: "Failed to fetch" or CORS errors

**Solution:**
1. Check that `NEXT_PUBLIC_API_BASE` in Vercel points to your Railway URL
2. Verify CORS settings in `main.py` include your Vercel URL
3. Redeploy both frontend and backend

### Issue: "Authentication failed"

**Solution:**
1. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly in Vercel
2. Check Supabase dashboard for any auth errors
3. Try clearing browser cookies and logging in again

### Issue: Backend not responding

**Solution:**
```bash
# Check Railway logs
railway logs

# Check if service is running
railway status
```

### Issue: Environment variables not working

**Solution:**
1. Verify all env vars are set in Railway/Vercel dashboards
2. Redeploy after adding env vars:
   ```bash
   # Vercel
   vercel --prod

   # Railway
   railway up
   ```

---

## Post-Deployment Checklist

- [ ] Backend deployed to Railway
- [ ] Frontend deployed to Vercel
- [ ] All environment variables set correctly
- [ ] CORS configured in backend
- [ ] Test user signup works
- [ ] Test user login works
- [ ] Test dashboard loads
- [ ] Test AI features work
- [ ] Test data isolation (create 2 users, verify data separation)

---

## URLs to Save

**Backend (Railway):**
```
https://your-backend-url.railway.app
```

**Frontend (Vercel):**
```
https://your-app-name.vercel.app
```

**Database (Supabase):**
```
https://xgunschzrcnxcxdphwha.supabase.co
```

---

## Monitoring

### Railway Logs
```bash
railway logs --tail
```

### Vercel Logs
- Dashboard → Your Project → Deployments → Click deployment → View Logs

### Supabase Logs
- Dashboard → Logs → API Logs

---

## Automatic Deployments

Both platforms support automatic deployments:

**Railway:** Already set up if you connected GitHub repo
**Vercel:** Already set up automatically

Now when you push to your main branch:
1. Railway auto-deploys backend
2. Vercel auto-deploys frontend

---

## Cost Estimate

**Railway:**
- Free tier: $5/month credit
- Estimated usage: ~$5-10/month for a small app

**Vercel:**
- Free tier: Generous limits for hobby projects
- Should stay within free tier

**Supabase:**
- Free tier: 500MB database, 50,000 monthly active users
- Should stay within free tier

**Total:** Free to ~$5-10/month

---

## Next Steps

1. **Custom Domain (Optional):**
   - Vercel: Settings → Domains → Add custom domain
   - Railway: Settings → Domains → Add custom domain

2. **Monitoring:**
   - Set up Sentry for error tracking
   - Use Railway/Vercel analytics

3. **Performance:**
   - Monitor response times
   - Optimize database queries if needed

4. **Security:**
   - Review Supabase RLS policies
   - Rotate API keys periodically
   - Set up security headers

---

## Support

If you run into issues:
1. Check the logs (Railway/Vercel/Supabase)
2. Review environment variables
3. Test locally first
4. Check CORS settings

**Ready to deploy!** 🚀
