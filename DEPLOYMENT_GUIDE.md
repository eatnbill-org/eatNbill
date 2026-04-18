# Deploy to Production - Step by Step

## Quick Start (for your eatnbill.com deployment)

### 1️⃣ Backend Setup (Production Server)

```bash
# SSH into your production server
ssh user@your-server

# Navigate to backend directory
cd /path/to/eatnbill/backend

# Create or update .env file with PRODUCTION values
cat > .env << 'EOF'
# Database (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-key-here
SUPABASE_SERVICE_ROLE_KEY=your-key-here
DATABASE_URL=postgresql://user:pass@host:port/db
DIRECT_URL=postgresql://user:pass@host:port/db

# JWT
JWT_AUDIENCE=authenticated
JWT_ISSUER=https://your-project.supabase.co/auth/v1
JWT_SECRET=your-32-char-secret-here

# Server
NODE_ENV=production
PORT=3000

# CRITICAL: CORS Configuration
FRONTEND_URL=https://eatnbill.com
FRONTEND_URLS=https://eatnbill.com,https://www.eatnbill.com

# Redis (for rate limiting)
REDIS_URL=redis://:password@localhost:6379

# Email
RESEND_API_KEY=your-key-here
RESEND_FROM_EMAIL=noreply@eatnbill.com
RESEND_FROM_NAME=EatNBill
EOF

# Install dependencies
bun install

# Run database migrations
bunx prisma migrate deploy

# Start the backend
bun run src/index.ts
# OR use PM2 for process management
pm2 start "bun run src/index.ts" --name "eatnbill-api" --env production
```

### 2️⃣ Frontend Build & Deploy

**Local Build:**
```bash
cd frontend

# Create .env.production
cat > .env.production << 'EOF'
VITE_API_URL=https://api.eatnbill.com/api/v1
EOF

# Build for production
npm run build

# Output goes to dist/ folder
```

**Deploy to Vercel (Recommended):**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod

# Set environment variables in Vercel Dashboard:
# - VITE_API_URL=https://api.eatnbill.com/api/v1
```

**Deploy to Netlify:**
```bash
# Set build command: npm run build
# Set publish directory: dist
# Add environment variable in Netlify Dashboard:
# - VITE_API_URL=https://api.eatnbill.com/api/v1
```

### 3️⃣ Verify Everything Works

```bash
# Test API health
curl -X GET https://api.eatnbill.com/api/v1/health

# Test CORS preflight (should return 200)
curl -X OPTIONS https://api.eatnbill.com/api/v1/auth/register \
  -H "Origin: https://eatnbill.com" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

Look for these headers in response:
- `Access-Control-Allow-Origin: https://eatnbill.com`
- `Access-Control-Allow-Credentials: true`
- `Access-Control-Allow-Methods: GET, POST, ...`

### 4️⃣ Open Browser and Test

1. Go to `https://eatnbill.com`
2. Click "Register"
3. Enter email and try registering
4. ✅ Should see OTP verification screen (no more CORS error!)

---

## Using Docker (Optional)

**docker-compose.yml** for production:
```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: eatnbill-redis
    restart: unless-stopped
    command: redis-server --requirepass "${REDIS_PASSWORD}"
    ports:
      - '6379:6379'
    environment:
      REDIS_PASSWORD: ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data

  api:
    build: ./backend
    container_name: eatnbill-api
    restart: unless-stopped
    ports:
      - '3000:3000'
    environment:
      # Database
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
      SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY}
      DATABASE_URL: ${DATABASE_URL}
      
      # JWT
      JWT_AUDIENCE: authenticated
      JWT_ISSUER: ${JWT_ISSUER}
      JWT_SECRET: ${JWT_SECRET}
      
      # Server
      NODE_ENV: production
      PORT: 3000
      
      # CRITICAL: CORS
      FRONTEND_URL: https://eatnbill.com
      FRONTEND_URLS: https://eatnbill.com,https://www.eatnbill.com
      
      # Redis
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      
      # Email
      RESEND_API_KEY: ${RESEND_API_KEY}
      RESEND_FROM_EMAIL: noreply@eatnbill.com
    depends_on:
      - redis
    volumes:
      - ./backend:/app
    command: bun run src/index.ts

volumes:
  redis-data:
```

Run:
```bash
docker-compose --env-file .env.production up -d
```

---

## Nginx Reverse Proxy (Recommended)

Configure Nginx to:
1. Serve frontend from `/`
2. Proxy API to backend at `/api/`

```nginx
server {
    listen 443 ssl http2;
    server_name eatnbill.com www.eatnbill.com;
    
    ssl_certificate /etc/letsencrypt/live/eatnbill.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/eatnbill.com/privkey.pem;

    # Frontend (SPA)
    location / {
        root /var/www/eatnbill-frontend/dist;
        try_files $uri /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name eatnbill.com www.eatnbill.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Troubleshooting After Deploy

### Still Getting CORS Error?

```bash
# 1. Check if environment variables are loaded
docker exec eatnbill-api printenv | grep FRONTEND

# 2. Check backend logs
docker logs eatnbill-api

# 3. Verify Nginx config
nginx -t

# 4. Check API is responding
curl https://api.eatnbill.com/api/v1/health
```

### Check CORS Headers

```bash
curl -X OPTIONS https://api.eatnbill.com/api/v1/auth/register \
  -H "Origin: https://eatnbill.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

Should see:
```
< Access-Control-Allow-Origin: https://eatnbill.com
< Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
< Access-Control-Allow-Headers: Content-Type, Authorization, x-restaurant-id
< Access-Control-Allow-Credentials: true
```

---

## Next Steps

1. ✅ Deploy backend with correct environment variables
2. ✅ Build and deploy frontend with API URL configured
3. ✅ Test registration endpoint
4. ✅ Monitor logs for any errors

Good luck! 🚀

