# Supabase Configuration Guide

## Required Supabase Dashboard Settings

### 1. Add Redirect URLs

Go to your Supabase Dashboard:
1. Navigate to **Authentication** → **URL Configuration**
2. Add the following to **Redirect URLs**:

#### Development:
```
http://localhost:3000/auth/callback
```

#### Production:
```
https://yourdomain.com/auth/callback
```

### 2. Configure Email Templates (Optional but Recommended)

Go to **Authentication** → **Email Templates** → **Confirm signup**

**Recommended Template:**
```html
<h2>Welcome to Endless Moments!</h2>
<p>Thanks for signing up. Please confirm your email address by clicking the button below:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm Email</a></p>
<p>If the button doesn't work, copy and paste this link into your browser:</p>
<p>{{ .ConfirmationURL }}</p>
```

### 3. Enable Email Confirmations

Go to **Authentication** → **Providers** → **Email**

Make sure these are checked:
- ✅ **Confirm email** - Users must confirm email before login
- ✅ **Secure email change** - Users must confirm email changes

### 4. SMTP Settings (Production Only)

For production, set up custom SMTP to avoid rate limits:

Go to **Project Settings** → **Auth** → **SMTP Settings**

**Recommended Providers:**
- SendGrid
- AWS SES
- Resend
- Postmark

**Configuration:**
```
Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: <your-sendgrid-api-key>
From: noreply@yourdomain.com
```

### 5. JWT Settings

Go to **Project Settings** → **API** → **JWT Settings**

**Default is fine (1 hour)**, but you can customize:
- JWT expiry: 3600 seconds (1 hour)
- Refresh token expiry: 604800 seconds (7 days)

### 6. Site URL Configuration

Go to **Authentication** → **URL Configuration**

**Site URL:**
- Development: `http://localhost:3000`
- Production: `https://yourdomain.com`

This is where users are redirected after magic link/OAuth logins.

---

## Testing Email Flow

### 1. Test Signup
```bash
# Start frontend
cd frontend
npm run dev

# Start backend (in another terminal)
cd ..
python main.py
```

### 2. Create Test Account
1. Go to `http://localhost:3000`
2. Click "Get started"
3. Fill out signup form with REAL email
4. Submit

### 3. Check Email
1. Check your inbox (and spam folder)
2. Look for "Confirm your signup" email from Supabase
3. Click the confirmation link

### 4. Verify Redirect
You should be redirected to:
```
http://localhost:3000/auth/callback?code=XXX
```

Then automatically to:
```
http://localhost:3000/login?confirmed=true
```

### 5. Complete Login
1. Enter your email and password
2. Click "Sign In"
3. You should be redirected to onboarding

---

## Troubleshooting

### Email not arriving

**Check Supabase rate limits:**
- Development: 3 emails per hour (per email address)
- Production with custom SMTP: Higher limits

**Solutions:**
1. Wait an hour and try again
2. Check spam folder
3. Use different email address
4. Set up custom SMTP (production)

### "Invalid redirect URL" error

**Cause:** Redirect URL not whitelisted in Supabase

**Fix:**
1. Go to Supabase Dashboard
2. Authentication → URL Configuration
3. Add `http://localhost:3000/auth/callback` to Redirect URLs
4. Save and try again

### Confirmation link doesn't work

**Possible causes:**
1. Link expired (valid for 24 hours)
2. Already used
3. Redirect URL not configured

**Fix:**
1. Request new confirmation email
2. Check Supabase Dashboard → Authentication → Users
3. Manually confirm email if needed (for testing)

### "User already registered" error

**Cause:** Email already exists in database

**Options:**
1. Use different email
2. Delete user from Supabase Dashboard → Authentication → Users
3. Use the login page instead

---

## Manual Email Confirmation (Testing Only)

If you need to bypass email confirmation for testing:

### Option 1: Supabase Dashboard
1. Go to **Authentication** → **Users**
2. Find your user
3. Click the three dots → **Edit user**
4. Toggle "Email confirmed" to ON
5. Save

### Option 2: Disable Email Confirmation (NOT RECOMMENDED)
1. Go to **Authentication** → **Providers** → **Email**
2. Uncheck "Confirm email"
3. Save

⚠️ **WARNING:** Only use this for local development. Always require email confirmation in production.

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Set up custom SMTP provider
- [ ] Update Site URL to production domain
- [ ] Add production redirect URLs
- [ ] Customize email templates with branding
- [ ] Enable email confirmation
- [ ] Test full signup flow
- [ ] Set up rate limiting
- [ ] Configure password requirements
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Test password reset flow
- [ ] Verify JWT expiry settings

---

## Environment Variables Reference

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Backend (.env)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=eyJ... (service_role key - KEEP SECRET!)
SUPABASE_JWT_SECRET=your-jwt-secret
```

⚠️ **NEVER commit `.env` files to git!** Add them to `.gitignore`.

---

## Support

If you're still having issues:

1. Check Supabase logs: **Logs** → **Auth Logs**
2. Check browser console for errors
3. Check backend terminal for errors
4. Review [AUTH_FLOW.md](./AUTH_FLOW.md) for complete flow
5. Contact Supabase support (if Supabase issue)

---

## Quick Reference: Common Supabase URLs

- **Dashboard:** https://app.supabase.com/project/YOUR_PROJECT_ID
- **Auth Users:** https://app.supabase.com/project/YOUR_PROJECT_ID/auth/users
- **Auth Logs:** https://app.supabase.com/project/YOUR_PROJECT_ID/logs/auth-logs
- **URL Config:** https://app.supabase.com/project/YOUR_PROJECT_ID/auth/url-configuration
- **Email Templates:** https://app.supabase.com/project/YOUR_PROJECT_ID/auth/templates
