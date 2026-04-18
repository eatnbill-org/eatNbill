# Registration CORS Issue - Troubleshooting Guide

## Problem Summary
- ❌ CORS error: "No 'Access-Control-Allow-Origin' header"  
- ❌ Warning: "No restaurant ID found in cookies" (this is normal for new users)

## Root Causes

### 1. **Backend Environment Variables Not Set** 🔴
Your production server needs these environment variables set:
```
FRONTEND_URL=https://eatnbill.com
FRONTEND_URLS=https://eatnbill.com,https://www.eatnbill.com
```

### 2. **Frontend API URL Not Configured** 🔴
The frontend doesn't know about your production API and defaults to `localhost`.

---

## Solution Steps

### Step 1: Configure Backend Environment Variables

**For Production Deployment:**

Set these environment variables on your production server:

```bash
# Production Backend .env
NODE_ENV=production
FRONTEND_URL=https://eatnbill.com
FRONTEND_URLS=https://eatnbill.com,https://www.eatnbill.com
```

**If using Docker:**
```yaml
environment:
  - NODE_ENV=production
  - FRONTEND_URL=https://eatnbill.com
  - FRONTEND_URLS=https://eatnbill.com,https://www.eatnbill.com
```

**If using Environment Variables on Server:**
```bash
export NODE_ENV=production
export FRONTEND_URL=https://eatnbill.com
export FRONTEND_URLS=https://eatnbill.com,https://www.eatnbill.com
```

### Step 2: Configure Frontend for Production

**Option A: Using .env.production file**

Create `.frontend/.env.production`:
```
VITE_API_URL=https://api.eatnbill.com/api/v1
```

Then build:
```bash
npm run build  # Uses .env.production automatically
```

**Option B: Build-time environment variable**

```bash
VITE_API_URL=https://api.eatnbill.com/api/v1 npm run build
```

**Option C: Using Vercel/Netlify**

Set in deployment settings:
```
VITE_API_URL=https://api.eatnbill.com/api/v1
```

### Step 3: Verify CORS Configuration

Check backend logs:
```bash
# Should see this if CORS is working:
✓ Supabase Database connected
✓ Supabase Auth/API connected
✓ Redis connected
```

If CORS still fails, verify:
1. Environment variables are actually set (not in comments)
2. No trailing slashes: `https://eatnbill.com` not `https://eatnbill.com/`
3. Exact domain match: if frontend is at `https://eatnbill.com`, include that exact URL

### Step 4: Test Registration

1. Open browser DevTools (F12) → Network tab
2. Try registration again
3. Check the preflight OPTIONS request:
   - ✅ Should see `Access-Control-Allow-Origin: https://eatnbill.com` in response
   - ✅ Should see `Access-Control-Allow-Credentials: true`

---

## How CORS Works in Your App

```
Frontend (https://eatnbill.com)
    ↓
    Makes request to API
    ↓
Backend checks CORS_ALLOWED_ORIGINS
    ↓
    If origin matches FRONTEND_URL or FRONTEND_URLS → ✅ Allow
    If origin doesn't match → ❌ Block
```

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| CORS blocked | Env vars not set | Set `FRONTEND_URL` and `FRONTEND_URLS` |
| API returns 404 | Wrong API URL in frontend | Use `https://api.eatnbill.com/api/v1` |
| Cookies not sent | `credentials: 'include'` missing | ✅ Already configured in axios |
| OAuth/SSO fails | Domain not in FRONTEND_URLS | Add to `FRONTEND_URLS` env var |

## Restaurant ID Warning (Normal)

This warning is **expected for new users**:
```
[API Client] No restaurant ID found in cookies
```

Why? New users haven't authenticated yet, so there's no cookie. The registration endpoint (`/auth/register`) is configured to skip requiring restaurant ID.

---

## Deployment Checklist

- [ ] Backend environment variables set on production server
- [ ] `FRONTEND_URL=https://eatnbill.com`
- [ ] `FRONTEND_URLS=https://eatnbill.com,https://www.eatnbill.com`
- [ ] Frontend built with `VITE_API_URL=https://api.eatnbill.com/api/v1`
- [ ] Backend Redis configured and running
- [ ] Database migrations applied
- [ ] Test registration endpoint from browser

---

## Quick Debug Command

Run this on backend to verify CORS origins are loaded:
```bash
# Check if environment variables are set
echo $FRONTEND_URL
echo $FRONTEND_URLS
```

If empty, environment variables are not loaded properly.

