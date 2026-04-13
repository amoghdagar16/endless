# End-to-End Authentication & Onboarding Flow

## Complete User Journey

### 1. Landing Page (`/`)
**File:** `frontend/app/page.tsx`
- Clean Notion x Nvidia aesthetic
- No sidebar (public route)
- Two CTAs: "Get started" → `/signup` | "Sign in" → `/login`
- **Behavior:**
  - Unauthenticated users: See landing page
  - Authenticated users without company: Redirect to `/onboarding`
  - Authenticated users with company: Redirect to `/new-dashboard`

---

### 2. Signup Flow (`/signup`)
**File:** `frontend/app/signup/page.tsx`

**Steps:**
1. User enters: Full Name, Email, Password
2. Submit → `AuthContext.signUp()`
3. **Backend creates user record** via `POST /users/`
4. **Supabase sends confirmation email** with link to `/auth/callback`
5. **Success message shown**: "Check your email!"
6. User stays on signup page (doesn't redirect yet)

**Key Points:**
- Email confirmation is REQUIRED before login
- Redirect URL set to: `window.location.origin/auth/callback`
- User record created in database immediately
- No auto-redirect to onboarding (must confirm email first)

---

### 3. Email Confirmation
**User clicks link in email → `/auth/callback`**

**File:** `frontend/app/auth/callback/page.tsx`

**Flow:**
1. Extracts `code` from URL params
2. Exchanges code for session via `supabase.auth.exchangeCodeForSession()`
3. Shows success animation
4. **Redirects to `/login?confirmed=true`**

**Error Handling:**
- If error → Show error message → Redirect to `/login`
- If no code → Redirect to `/login`

---

### 4. Login Page (`/login`)
**File:** `frontend/app/login/page.tsx`

**Behavior:**
- If `?confirmed=true` in URL → Show green success banner
- User enters Email + Password
- Submit → `AuthContext.signIn()`

**Backend Flow:**
1. Supabase validates credentials
2. Checks user's `company_id` and `onboarding_completed` status
3. **Redirects based on state:**
   - No company_id → `/onboarding`
   - Has company but not onboarded → `/onboarding`
   - Fully onboarded → `/new-dashboard`

---

### 5. Onboarding (`/onboarding`)
**File:** `frontend/app/onboarding/page.tsx`

**3-Step Process:**

#### Step 1: Company Basics
- Company Name
- Industry
- Location (City, State)

#### Step 2: Business Profile
- Business Type (LLC, S-Corp, etc.)
- Founded Year
- Employee Count
- Annual Revenue

#### Step 3: Market Context
- Growth Stage
- Target Market
- Primary Products
- Competitors

**API Calls:**
- `GET /companies/` - Load existing company (returns [] if none)
- `POST /companies/` - Create new company
- `PATCH /companies/{id}` - Update company + progress
- Final step sets `onboarding_completed: true`

**On Completion:**
- Redirects to `/new-dashboard`
- User account fully set up

---

### 6. Dashboard (`/new-dashboard`)
**File:** `frontend/app/new-dashboard/page.tsx`

**Requirements:**
- User must be authenticated
- User must have `company_id`
- Company must have `onboarding_completed: true`

**Access:**
- Sidebar visible
- All app features available
- Full ERP functionality

---

## Backend API Endpoints

### Authentication
- **All endpoints require JWT token** except:
  - `POST /users/` (user creation during signup)
  - `POST /companies/` (company creation during onboarding)

### Key Routes

#### `/companies/`
**GET** - Retrieve user's company
- Uses `verify_token` (not `get_current_user_company`)
- Returns empty array if user has no company yet
- Allows new users to access during onboarding

**POST** - Create company
- No auth required (open for onboarding)
- Creates company record
- Returns company data

**PATCH `/{company_id}`** - Update company
- Requires auth + ownership verification
- Used for onboarding progress

#### `/users/`
**POST** - Create user
- No auth required (called during signup)
- Creates user record in database
- Sets role to 'admin' by default

---

## Auth Middleware
**File:** `middleware/auth.py`

### `verify_token()`
- Validates JWT from Authorization header
- Returns `user_id`
- Does NOT require company_id

### `get_current_user_company()`
- Validates JWT
- Fetches user's company_id
- **Throws 403 if no company** → Use `verify_token` instead for onboarding routes

### `require_role()`
- Validates user has required role
- Role hierarchy: admin > accountant > user > viewer

---

## Public Routes (No Sidebar)
**File:** `frontend/components/AppLayout.tsx`

```typescript
const publicRoutes = ['/', '/login', '/signup', '/onboarding', '/auth/callback']
```

These routes bypass the AppLayout sidebar and show full-screen content.

---

## Environment Variables

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://xgunschzrcnxcxdphwha.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Backend (`.env`)
```env
SUPABASE_URL=https://xgunschzrcnxcxdphwha.supabase.co
SUPABASE_KEY=eyJ... (service_role key)
SUPABASE_JWT_SECRET=uK6...
OPENAI_API_KEY=sk-...
PERPLEXITY_API_KEY=pplx-...
```

---

## Key Design Decisions

### 1. Email Confirmation Required
- Users CANNOT login until email is confirmed
- Prevents spam accounts
- Ensures valid email addresses

### 2. Two-Stage Onboarding
- User creation happens at signup
- Company creation happens during onboarding
- Allows for team invites in future

### 3. Auth Token Flow
- Frontend gets JWT from Supabase
- Backend validates JWT on every request
- Token includes `user_id` in payload

### 4. Company Scoping
- Most endpoints require `company_id`
- Users can only access their own company data
- Enforced via auth middleware

---

## Error Handling

### Common Issues

#### 401 Unauthorized
- **Cause:** Missing or invalid JWT token
- **Fix:** User needs to login again

#### 403 Forbidden
- **Cause:** User lacks required permissions or company_id
- **Fix:** Complete onboarding or check role

#### 404 Not Found
- **Cause:** Resource doesn't exist or user lacks access
- **Fix:** Verify company_id and resource ownership

---

## Testing the Flow

### Full Journey Test:
1. Visit `/` → See landing page (no sidebar)
2. Click "Get started" → `/signup`
3. Fill form, submit → See "Check your email"
4. Check email, click link → `/auth/callback` → `/login?confirmed=true`
5. See success message, enter credentials → Login
6. Redirect to `/onboarding` (no company yet)
7. Complete 3 steps → Company created
8. Redirect to `/new-dashboard` (with sidebar)
9. Full app access

### Edge Cases:
- **Signup without email confirmation:** Cannot login (Supabase rejects)
- **Login before onboarding:** Redirect to `/onboarding`
- **Direct access to `/new-dashboard`:** Redirect based on auth state
- **Expired token:** Redirect to `/login`

---

## Future Enhancements

### Planned Features:
1. **Team Management**
   - Invite users to company
   - Assign roles (admin, accountant, user, viewer)
   - Multi-user collaboration

2. **OAuth Providers**
   - Google Sign-In
   - GitHub Sign-In
   - SSO for enterprises

3. **Password Reset**
   - Forgot password flow
   - Email verification

4. **Session Management**
   - Remember me option
   - Multiple device tracking
   - Force logout from all devices

---

## Troubleshooting

### Frontend won't connect to backend
- Check `NEXT_PUBLIC_API_BASE` points to correct port
- Backend runs on 8000, frontend on 3000
- CORS must allow frontend origin

### Email not sending
- Check Supabase Email Templates settings
- Verify `emailRedirectTo` URL is whitelisted in Supabase
- Check spam folder

### 401 on all requests
- Check JWT_SECRET matches between Supabase and backend
- Verify token is being sent in Authorization header
- Check token hasn't expired (default 1 hour)

### Onboarding stuck on loading
- Check `/companies/` endpoint returns [] for new users
- Verify backend is running
- Check browser console for errors

---

## Summary

This flow ensures:
✅ Secure authentication with email verification
✅ Clean user experience with proper redirects
✅ Backend/frontend sync on all auth states
✅ Company scoping for multi-tenant architecture
✅ Proper error handling at every step
✅ Professional UX with success/error messages
