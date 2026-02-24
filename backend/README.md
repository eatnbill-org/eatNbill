# RBS Backend - Restobilo API

Multi-tenant SaaS backend for restaurant management.

## Stack

- **Runtime:** Bun
- **Framework:** Express.js 5
- **Database:** PostgreSQL (Supabase)
- **ORM:** Prisma 4.16
- **Auth:** Local JWT + OTP
- **Cache:** Redis
- **Email:** Resend API

## Getting Started

### Prerequisites

- Bun >= 1.0
- Docker (for Redis)
- Supabase account

### Install Dependencies

```bash
bun install
```

### Environment Setup

Copy `.env.example` to `.env` and configure:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://...
JWT_AUDIENCE=authenticated
JWT_ISSUER=https://your-project.supabase.co/auth/v1
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:3001
FRONTEND_URLS=http://localhost:5173,https://eatnbill.com,https://www.eatnbill.com

# Optional: Restrict admin API to specific IPs (comma-separated)
ADMIN_ALLOWED_IPS=127.0.0.1,::1
```

### Database Setup

```bash
# Generate Prisma client
bun prisma generate

# Run migrations
bun prisma migrate dev
```

### Start Redis

```bash
bun run docker:up
```

### Start Development Server

```bash
bun run dev
```

## API Endpoints

### Auth (`/api/v1/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register and send email OTP |
| POST | `/verify-register-otp` | Verify registration OTP |
| POST | `/resend-register-otp` | Generate and resend registration OTP |
| POST | `/login` | Login with email + password |
| POST | `/forgot-password` | Send forgot-password OTP |
| POST | `/verify-forgot-password-otp` | Verify forgot-password OTP |
| POST | `/reset-password` | Change password using verified reset token |
| POST | `/staff/login` | Staff login (email/phone/login ID + password) |
| GET | `/staff/me` | Current staff profile |
| POST | `/staff/logout` | Staff logout |

Legacy aliases kept for compatibility: `/waiter/login`, `/waiter/me`, `/waiter/logout`.

### Restaurant Staff (`/api/v1/restaurant/staff`) - Requires OWNER or MANAGER

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List staff |
| POST | `/` | Create staff (MANAGER/WAITER with credentials) |
| GET | `/:id` | Get staff details |
| PATCH | `/:id` | Update staff |
| PATCH | `/:id/toggle` | Toggle active status |
| DELETE | `/:id` | Delete staff |
| GET | `/shared-login` | Get shared staff login settings |
| POST | `/shared-login` | Set shared staff login settings |

### Users (`/api/v1/users`) - Requires Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List users (OWNER only) |
| POST | `/` | Create user (OWNER only) |
| GET | `/:id` | Get user details |
| PATCH | `/:id` | Update user |
| DELETE | `/:id` | Delete user (OWNER only) |

### Products (`/api/v1/products`) - Requires Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List products |
| POST | `/` | Create product |
| GET | `/:id` | Get product details |
| PATCH | `/:id` | Update product |
| DELETE | `/:id` | Delete product |

### Public (`/api/v1/public`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/menu/:slug` | Get public menu by restaurant slug |

---

## 🛡️ Admin Module (`/api/v1/admin`)

Platform-level Super Admin API for governance and control.

### Authentication

Super Admin uses **separate authentication**:
- Same Supabase Auth
- User must exist in `AdminUser` table with `is_active = true`
- JWT is verified, then checked against internal DB (never trust JWT claims alone)

### Middleware Chain

```
adminRateLimiter (30/min)
→ adminIPAllowlist (optional)
→ adminAuthMiddleware
→ zodValidation
→ controller
```

### Admin Endpoints

#### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard/overview` | Platform-wide metrics |

#### Tenant Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tenants` | List all tenants |
| POST | `/tenants` | Create tenant |
| GET | `/tenants/:id` | Get tenant details |
| PATCH | `/tenants/:id` | Update tenant |
| POST | `/tenants/:id/suspend` | Suspend tenant |
| POST | `/tenants/:id/activate` | Activate tenant |

#### Restaurant Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/restaurants` | List all restaurants |
| POST | `/restaurants` | Create restaurant for tenant |
| GET | `/restaurants/:id` | Get restaurant details |
| PATCH | `/restaurants/:id` | Update restaurant |
| DELETE | `/restaurants/:id` | Delete restaurant |

#### User Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List all users |
| GET | `/users/:id` | Get user details |
| POST | `/users/owner` | Create/invite owner for tenant |

#### Subscription Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/subscriptions` | List tenant subscriptions |
| PATCH | `/subscriptions/:tenantId` | Update subscription/plan |

#### Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/impersonate` | Impersonate a user (logged) |
| GET | `/audit-logs` | View platform audit logs |
| GET | `/ip/blocked` | List blocked IPs |
| POST | `/ip/block` | Block an IP address |
| POST | `/ip/unblock` | Unblock an IP address |
| GET | `/health` | System health status |

### Creating First Super Admin

```bash
# 1. Create user in Supabase Auth (dashboard or API)
# 2. Copy the Supabase user UUID
# 3. Run seed script:
bun run scripts/seed-admin.ts "supabase-uuid" "admin@example.com"
```

---

## Scripts

```bash
bun run dev          # Start development server
bun run dev:all      # Start server + Redis
bun run docker:up    # Start Redis container
bun run docker:down  # Stop Redis container
bun run test         # Run tests
bun run test:auth    # Run auth tests
bun run test:users   # Run user tests
bun run test:products # Run product tests
```

## Project Structure

```
src/
├── index.ts              # Entry point
├── routes.ts             # Route registration
├── env.ts                # Environment config
├── middlewares/
│   ├── auth.middleware.ts      # Tenant user auth
│   ├── admin.middleware.ts     # Super admin auth
│   ├── tenant.middleware.ts    # Tenant isolation
│   ├── role.middleware.ts      # Role-based access
│   └── validation.middleware.ts
├── modules/
│   ├── admin/            # Super Admin module
│   ├── auth/             # Authentication
│   ├── users/            # User management
│   └── products/         # Product catalog
├── prisma/
│   └── schema.prisma     # Database schema
└── utils/
    ├── prisma.ts         # Prisma client
    ├── redis.ts          # Redis client
    ├── supabase.ts       # Supabase client
    ├── jwt.ts            # JWT utilities
    ├── email.ts          # Email service (Resend)
    ├── email-templates.ts # Email HTML templates
    └── email-helpers.ts  # Email convenience functions
```

## Email Service

The backend includes a built-in email service using Resend. It supports:

- Signup confirmation emails with OTP
- Password reset emails with OTP  
- User invitation emails
- Async/non-blocking email sending

For detailed setup instructions and usage examples, see [EMAIL_SERVICE.md](./EMAIL_SERVICE.md).

Quick setup:
1. Create a Resend API key
2. Add `RESEND_API_KEY` (or `RESEND_APPI_KEY`) to `.env`
3. Set `RESEND_FROM_EMAIL` and `RESEND_FROM_NAME`

For complete route payloads and ready-to-run curl examples, see [AUTH_STAFF_API_CURL.md](./AUTH_STAFF_API_CURL.md).

## License

Proprietary
