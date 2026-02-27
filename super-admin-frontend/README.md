# Super Admin Frontend

A Next.js-based super admin dashboard for managing the EatnBill platform.

## Features

- **Dashboard Overview**: Platform statistics, recent activity, plan distribution
- **Tenant Management**: Create, view, suspend/activate tenants
- **Restaurant Management**: Cross-tenant restaurant listing
- **User Management**: View all users with activity tracking
- **Audit Logs**: Complete audit trail of admin actions

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: React Context + Zustand
- **Data Fetching**: React Query + Axios

## Getting Started

### Prerequisites

- Node.js 18+
- Backend API running (default: http://localhost:3000)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Run development server
npm run dev
```

### Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```
Note: The API path `/api/v1` is handled in the application routing, not in the base URL.

## Default Login

After running the backend seeder:
- **Email**: admin@eatnbill.com
- **Password**: changeme123

## Project Structure

```
app/
├── dashboard/          # Dashboard pages
│   ├── layout.tsx      # Dashboard layout with sidebar
│   └── page.tsx        # Overview page
├── tenants/            # Tenant management
├── restaurants/        # Restaurant management
├── users/              # User management
├── audit-logs/         # Audit logs
├── login/              # Login page
├── layout.tsx          # Root layout
└── page.tsx            # Root redirect

components/
├── ui/                 # shadcn/ui components
├── sidebar.tsx         # Navigation sidebar
└── theme-provider.tsx  # Theme provider

lib/
├── api.ts              # API client
├── auth-context.tsx    # Authentication context
└── utils.ts            # Utility functions
```

## API Integration

The frontend communicates with the backend via REST API at `/api/v1/super-admin/*`.

Authentication uses HTTP-only cookies for secure token storage.

## License

Private - EatnBill Internal Use Only
