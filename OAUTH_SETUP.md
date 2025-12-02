# OAuth Setup Guide (Google & Apple)

## Overview
The login page supports Google and Apple sign-in using Supabase Auth.

## Prerequisites

1. **Supabase Project** - You already have one at: `https://gdzkfwzphgudkeirgbcx.supabase.co`

2. **Frontend Environment Variables** - Update `/frontend/.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://gdzkfwzphgudkeirgbcx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

   To get your anon key:
   - Go to [Supabase Dashboard](https://supabase.com/dashboard/project/gdzkfwzphgudkeirgbcx)
   - Settings → API
   - Copy the **anon/public** key (NOT the service_role key)

## Google OAuth Setup

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
5. Application type: **Web application**
6. Add authorized redirect URIs:
   ```
   https://gdzkfwzphgudkeirgbcx.supabase.co/auth/v1/callback
   ```
7. Copy the **Client ID** and **Client Secret**

### 2. Configure in Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/gdzkfwzphgudkeirgbcx)
2. Navigate to **Authentication** → **Providers**
3. Find **Google** and click to configure
4. Enable Google provider
5. Paste your **Client ID** and **Client Secret**
6. Save

## Apple OAuth Setup

### 1. Create Apple App ID & Service ID

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Create an **App ID** (if you don't have one)
3. Create a **Service ID** for Sign in with Apple
4. Configure the Service ID:
   - Enable "Sign in with Apple"
   - Add domains: `supabase.co`
   - Add return URLs: `https://gdzkfwzphgudkeirgbcx.supabase.co/auth/v1/callback`

### 2. Create a Key

1. In Apple Developer Portal, go to **Keys**
2. Create a new key
3. Enable "Sign in with Apple"
4. Download the key file (`.p8` file)
5. Note the **Key ID** and **Team ID**

### 3. Configure in Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/gdzkfwzphgudkeirgbcx)
2. Navigate to **Authentication** → **Providers**
3. Find **Apple** and click to configure
4. Enable Apple provider
5. Enter:
   - **Service ID** (from step 1)
   - **Team ID** (from step 2)
   - **Key ID** (from step 2)
   - **Private Key** (contents of the `.p8` file)
6. Save

## Testing

1. Start your frontend: `cd frontend && npm run dev`
2. Navigate to: `http://localhost:3000/login`
3. Click "Continue with Google" or "Continue with Apple"
4. Complete OAuth flow
5. You should be redirected back to the dashboard

## Troubleshooting

### Google Sign-In Issues
- Make sure redirect URI matches exactly in Google Console
- Check that Google+ API is enabled
- Verify Client ID and Secret are correct

### Apple Sign-In Issues
- Ensure Service ID is properly configured
- Check that the `.p8` key file is valid
- Verify return URLs match in Apple Developer Portal
- Apple Sign-In requires HTTPS in production (works on localhost for development)

### General Issues
- Check browser console for errors
- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set correctly
- Ensure Supabase project has OAuth providers enabled

## Notes

- **Development**: OAuth works on `localhost` for testing
- **Production**: Update redirect URIs to your production domain
- **Security**: Never commit `.env.local` files to git
- The anon key is safe to use in frontend (it's public)

