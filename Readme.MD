# Earthly Trinkets

E-commerce web app for **Earthly Trinkets** — a handcrafted resin art business selling jewellery, paperweights, home decor, and custom pieces.

**Live:** [earthlytrinkets.in](https://www.earthlytrinkets.in)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui + Framer Motion |
| Routing | React Router DOM v6 |
| State | React Context (Auth, Cart, Theme, Checkout) + TanStack React Query |
| Forms | React Hook Form + Zod |
| Backend/DB | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| Payments | Razorpay (with server-side verification) |
| Shipping | Shiprocket (order creation, AWB tracking, webhooks) |
| Email | Resend (transactional + newsletter) |
| Serverless API | Vercel Serverless Functions |
| Hosting | Vercel |

## Features

- Google OAuth + email/password authentication
- Product catalog with categories, search, and filters
- Image carousel with thumbnail navigation
- Shopping cart with quantity controls (persisted to localStorage)
- Multi-step checkout: Address → Payment → Confirmation
- Razorpay payment integration (UPI, cards, net banking)
- Cash on Delivery option
- Coupon code support
- Product reviews and ratings
- Admin panel — product CRUD, image upload, drag-and-drop ordering, order management
- Dark/light theme toggle
- Responsive design (mobile + desktop)

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Clone the repo
git clone https://github.com/your-username/et-code.git
cd et-code

# Install dependencies
npm install

# Create .env file with your keys
cp .env.example .env

# Start development server
npm run dev
```

The app runs at `http://localhost:8080`.

### Environment Variables

Create a `.env` file in the project root:

```
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_RAZORPAY_KEY_ID=rzp_test_xxx

# Backend only (used by Vercel serverless functions)
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=your_secret
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

`VITE_` prefixed variables are exposed to the frontend. Non-prefixed variables are only available in serverless functions.

## Project Structure

```
├── api/                    # Vercel serverless functions
│   ├── create-order.js     # Creates Razorpay order
│   └── verify-payment.js   # Verifies payment signature + saves order
├── src/
│   ├── components/         # Reusable UI components
│   ├── contexts/           # React Context providers (Auth, Cart, Theme, Checkout)
│   ├── hooks/              # Custom hooks (useProducts, useReviews, etc.)
│   ├── integrations/       # Supabase client + types
│   ├── pages/              # Route-level page components
│   │   ├── admin/          # Admin panel pages
│   │   └── checkout/       # Checkout flow (Address, Payment, Success)
│   └── types/              # TypeScript type definitions
├── supabase/scripts/       # SQL migration scripts
└── vercel.json             # Vercel config + routing
```

## Documentation

- [Implementation Guide](docs/implementation.md) — project structure, database tables, key flows, environment variables
- [Edge Functions Reference](docs/edge-functions.md) — all Supabase Edge Functions with deploy commands and secrets

## Database Setup

Run the SQL scripts in `supabase/scripts/` in order (00 → 05) in the Supabase SQL Editor:

1. `00_prerequisites.sql` — enums, extensions
2. `01_schema.sql` — tables, RLS policies, functions
3. `02_storage.sql` — product-images bucket + policies
4. `03_admin_setup.sql` — admin role setup
5. `04_test_user.sql` — test user for development
6. `05_subscribers.sql` — newsletter subscribers table

## Deployment

Deployed on **Vercel** with automatic GitHub integration.

For manual deployment:
```bash
vercel --prod
```

Ensure all environment variables are configured in Vercel Dashboard → Settings → Environment Variables.

## Payment Flow

```
Cart → Address → Payment → Razorpay Popup → Verification → Order Confirmation
```

1. Frontend calls `POST /api/create-order` with amount
2. Serverless function creates Razorpay order, returns `order_id`
3. Frontend opens Razorpay checkout popup
4. On success, frontend calls `POST /api/verify-payment` with signature
5. Serverless function verifies HMAC signature, saves order to Supabase
6. User redirected to order confirmation page

## Contact

**Email:** business.earthlytrinkets@gmail.com
