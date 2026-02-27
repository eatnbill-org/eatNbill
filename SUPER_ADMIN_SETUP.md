# Super Admin Setup Guide

This guide explains how to set up the Super Admin module for EatnBill.

## Overview

The Super Admin system consists of:
1. **Backend Module** (`backend/src/modules/super-admin/`)
2. **Frontend Application** (`super-admin-frontend/`)

## Backend Setup

### 1. Database Migration

The `AdminUser` model now includes a `password_hash` field for local authentication.

```bash
cd backend

# Generate Prisma client
bun run prisma:generate

# Create and apply migration
bun run prisma:migrate
```

When prompted for migration name, enter: `add_admin_password_hash`

### 2. Seed Super Admin User

Create the default super admin account:

```bash
cd backend

# Using default credentials
bun run db:seed:super-admin

# Or with custom credentials
SUPER_ADMIN_EMAIL=admin@yourdomain.com \
SUPER_ADMIN_PASSWORD=YourSecurePassword123 \
SUPER_ADMIN_NAME="Admin Name" \
bun run db:seed:super-admin
```

**Default Credentials:**
- Email: `admin@eatnbill.com`
- Password: `changeme123`

### 3. Start Backend Server

```bash
cd backend
bun run dev
```

The backend will be available at `http://localhost:3000`.

### 4. API Endpoints

Super Admin API endpoints are available at `/api/v1/super-admin/*`:

**Auth:**
- `POST /api/v1/super-admin/auth/login` - Login with email/password
- `POST /api/v1/super-admin/auth/logout` - Logout
- `POST /api/v1/super-admin/auth/refresh` - Refresh access token
- `GET /api/v1/super-admin/auth/me` - Get current admin info

**Management:**
- `GET /api/v1/super-admin/dashboard/overview` - Dashboard statistics
- `GET /api/v1/super-admin/tenants` - List tenants
- `POST /api/v1/super-admin/tenants` - Create tenant
- `GET /api/v1/super-admin/tenants/:id` - Get tenant details
- `PATCH /api/v1/super-admin/tenants/:id` - Update tenant
- `POST /api/v1/super-admin/tenants/:id/suspend` - Suspend tenant
- `POST /api/v1/super-admin/tenants/:id/activate` - Activate tenant
- `GET /api/v1/super-admin/restaurants` - List restaurants
- `GET /api/v1/super-admin/users` - List users
- `GET /api/v1/super-admin/users/:id/activity` - Get user activity
- `GET /api/v1/super-admin/audit-logs` - List audit logs
- `GET /api/v1/super-admin/system/health` - System health check

## Frontend Setup

### 1. Install Dependencies

```bash
cd super-admin-frontend
npm install
```

### 2. Environment Configuration

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

### 3. Run Development Server

```bash
cd super-admin-frontend
npm run dev
```

The frontend will be available at `http://localhost:3001`.

## Usage

### Accessing the Super Admin Dashboard

1. Navigate to `http://localhost:3001`
2. You will be redirected to the login page
3. Enter credentials:
   - Email: `admin@eatnbill.com`
   - Password: `changeme123`
4. Click "Sign In"

### Features

**Dashboard:**
- View platform statistics (tenants, users, restaurants, revenue)
- See recent admin activity
- View plan distribution

**Tenants:**
- View all tenants with their status
- Create new tenants
- Suspend/activate tenants
- View tenant details

**Restaurants:**
- Cross-tenant restaurant listing
- View restaurant statistics
- Quick access to public menu

**Users:**
- View all users across tenants
- Filter by role
- View user activity and sessions

**Audit Logs:**
- Complete audit trail
- Filter by entity and action
- Track admin actions

## Security Notes

1. **Change Default Password**: Immediately change the default password after first login
2. **HTTPS in Production**: Always use HTTPS in production
3. **CORS Configuration**: Update CORS settings in backend to allow the super admin frontend domain
4. **IP Allowlist**: Consider enabling `ADMIN_ALLOWED_IPS` environment variable for additional security

## Troubleshooting

### Cannot Login

1. Verify backend is running
2. Check that super admin was seeded correctly
3. Check browser console for API errors
4. Verify cookies are being set (check Application > Cookies in DevTools)

### Database Connection Issues

```bash
# Test database connection
cd backend
bun run prisma:studio
```

### CORS Errors

Update `backend/src/middlewares/index.ts` to include the super admin frontend URL:

```typescript
const allowedOrigins = [
  env.FRONTEND_URL,
  'http://localhost:3001', // Super admin frontend
  // Add your production domain
];
```

## Production Deployment

### Backend

1. Set environment variables:
   ```env
   NODE_ENV=production
   JWT_SECRET=your-secure-random-secret
   ADMIN_ALLOWED_IPS=your-office-ip,another-allowed-ip
   ```

2. Run migrations:
   ```bash
   bun run prisma:migrate
   ```

3. Seed admin (if needed):
   ```bash
   bun run db:seed:super-admin
   ```

### Frontend

1. Update environment:
   ```env
   NEXT_PUBLIC_API_URL=https://your-api-domain.com/api/v1
   ```

2. Build:
   ```bash
   npm run build
   ```

3. Deploy to your hosting platform (Vercel, Netlify, etc.)

## File Structure

```
backend/
└── src/
    └── modules/
        └── super-admin/
            ├── auth/
            │   ├── routes.ts
            │   ├── controller.ts
            │   ├── service.ts
            │   └── schema.ts
            ├── routes.ts
            ├── controller.ts
            ├── service.ts
            ├── repository.ts
            ├── schema.ts
            └── middleware.ts

super-admin-frontend/
├── app/
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── tenants/
│   │   └── page.tsx
│   ├── restaurants/
│   │   └── page.tsx
│   ├── users/
│   │   └── page.tsx
│   ├── audit-logs/
│   │   └── page.tsx
│   ├── login/
│   │   └── page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── sidebar.tsx
│   └── theme-provider.tsx
├── lib/
│   ├── api.ts
│   ├── auth-context.tsx
│   └── utils.ts
└── middleware.ts
```

## Support

For issues or questions, please contact the development team.
