# Quick Deployment Commands

## 🚀 Deploy in 5 Minutes

### 1️⃣ Deploy Backend (Railway)

```bash
# Install and login
npm install -g @railway/cli
railway login

# Deploy
railway init
railway up

# Get backend URL
railway domain
# Save this URL! Example: https://your-app.railway.app
```

**Add these env vars in Railway dashboard:**
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_JWT_SECRET`
- `OPENAI_API_KEY`
- `PERPLEXITY_API_KEY`

---

### 2️⃣ Deploy Frontend (Vercel)

```bash
# Install and login
npm install -g vercel
vercel login

# Deploy
cd frontend
vercel
vercel --prod
```

**Add these env vars in Vercel dashboard:**
- `NEXT_PUBLIC_API_BASE` = Your Railway URL
- `NEXT_PUBLIC_SUPABASE_URL` = Your Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your Supabase anon key

---

### 3️⃣ Update CORS in main.py

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://your-app.vercel.app",  # Your Vercel URL
        "https://*.vercel.app",
    ],
    # ... rest of config
)
```

Then redeploy backend:
```bash
git add main.py
git commit -m "Update CORS for Vercel"
git push
railway up
```

---

### 4️⃣ Test

Visit your Vercel URL and test:
- ✅ Signup
- ✅ Login
- ✅ Dashboard loads
- ✅ AI features work

---

## 📚 Full Documentation

See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for complete guide with troubleshooting.

---

## 🆘 Quick Troubleshooting

**CORS errors?**
- Update `main.py` with your Vercel URL
- Redeploy backend

**Auth not working?**
- Check Vercel env vars are set
- Verify Supabase anon key is correct

**API not responding?**
- Check Railway logs: `railway logs`
- Verify env vars in Railway dashboard
