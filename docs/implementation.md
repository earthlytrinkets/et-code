# Earthly Trinkets — Implementation Guide

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite (port 8080)
- **UI:** Tailwind CSS + shadcn/ui + Framer Motion + Lucide icons
- **Routing:** React Router DOM v6
- **State:** React Context (Auth, Cart, Theme, Checkout) + TanStack React Query
- **Forms:** React Hook Form + Zod
- **Backend/DB:** Supabase (PostgreSQL + Auth + Edge Functions + Storage)
- **Payments:** Razorpay
- **Shipping:** Shiprocket
- **Email:** Resend (SMTP for auth emails, API for transactional/newsletter)

## Project Structure

```
src/
├── assets/              # Static assets (logo, images)
├── components/          # Shared UI components
│   ├── AuthModal.tsx    # Sign in/up modal (email, Google, phone OTP)
│   ├── AdminRoute.tsx   # Admin route guard
│   ├── Navbar.tsx       # Top navigation
│   ├── Footer.tsx       # Site footer
│   ├── NewsletterSection.tsx  # Subscribe form
│   └── ...
├── contexts/            # React Context providers
│   ├── AuthContext.tsx   # Auth state + Google profile sync
│   ├── CartContext.tsx   # Cart (in-memory)
│   ├── ThemeContext.tsx  # Dark/light mode
│   └── CheckoutContext.tsx  # Checkout flow state
├── hooks/               # Custom hooks
│   └── useProducts.ts   # Product queries (useProducts, useAllProducts, etc.)
├── integrations/
│   └── supabase/
│       ├── client.ts    # Supabase client init
│       └── types.ts     # Auto-generated DB types
├── pages/
│   ├── admin/
│   │   ├── Products.tsx # Product CRUD + image upload
│   │   ├── Orders.tsx   # Order management + Shiprocket integration
│   │   └── Subscribers.tsx  # Newsletter subscriber management
│   ├── checkout/
│   │   ├── Address.tsx  # Address selection step
│   │   ├── Payment.tsx  # Payment method + Razorpay
│   │   └── Success.tsx  # Order confirmation
│   ├── Profile.tsx      # User profile + admin dashboard
│   ├── Shop.tsx         # Product listing
│   ├── ProductDetail.tsx # Single product page
│   └── ...
└── types/
    └── product.ts       # Product + CartProduct types

supabase/
├── functions/           # Edge functions (server-side, Deno runtime)
│   ├── shiprocket/      # Shiprocket API proxy
│   ├── shipping-hook/   # Shiprocket webhook receiver
│   ├── send-order-email/# Transactional order emails
│   ├── send-newsletter/ # Newsletter notifications
│   └── unsubscribe/     # One-click unsubscribe
├── scripts/             # SQL migrations (run in order)
│   ├── 00_prerequisites.sql  # Roles, enums, triggers
│   ├── 01_schema.sql         # Products, orders, order_items, stock functions
│   ├── 02_storage.sql        # Product images bucket + policies
│   ├── 03_admin_setup.sql    # Admin user role assignment
│   ├── 04_test_user.sql      # Test user setup
│   ├── 05_subscribers.sql    # Newsletter subscribers table
│   └── 99_cleanup.sql        # Data reset scripts (use selectively)
└── config.toml          # Supabase local config
```

## Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profile (full_name, avatar_url, phone) |
| `user_roles` | Admin/user role assignment |
| `addresses` | User delivery addresses |
| `categories` | Product categories (jewellery, pendants, etc.) |
| `products` | Product catalogue with stock tracking |
| `orders` | Orders with Razorpay + Shiprocket fields |
| `order_items` | Line items snapshotted at order time |
| `reviews` | Product reviews and ratings |
| `coupons` | Discount codes |
| `custom_orders` | Custom order requests |
| `subscribers` | Newsletter email subscribers |

## Key Flows

### Authentication
- Google OAuth (primary) + Email/password signup
- `handle_new_user()` trigger auto-creates profile on signup
- Welcome email sent on first Google sign-in (detected via `created_at` check)

### Order Flow
1. User adds items to cart → selects address → chooses payment
2. **Razorpay:** Frontend creates order → Razorpay popup → verify payment server-side → save order
3. **COD:** Save order directly
4. Stock decremented via `decrement_product_stock()` RPC
5. Order confirmation email sent via `send-order-email` edge function

### Shipping (Shiprocket)
1. Admin creates Shiprocket order from admin panel
2. Admin assigns courier + pays in Shiprocket dashboard
3. Admin clicks "Sync from Shiprocket" to pull AWB into DB, or enters AWB manually
4. Shiprocket webhooks auto-update status (in-transit, delivered, etc.) when they fire
5. Stock restored automatically on cancellation/RTO

### Newsletter
1. Users subscribe via "Stay Connected" section on homepage
2. Admin views subscribers in Profile → Subscribers tab
3. Admin sends notification (new product / price drop) to all active subscribers
4. Each email includes one-click unsubscribe link

## Environment Variables

### Frontend (.env)
```
VITE_SUPABASE_URL=https://abymyaohtxrbaiiyoyak.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_RAZORPAY_KEY_ID=rzp_...
```

### Supabase Edge Function Secrets
See [edge-functions.md](edge-functions.md) for the full list.

## SQL Scripts

Run in order in Supabase SQL Editor:

| Script | Purpose |
|--------|---------|
| `00_prerequisites.sql` | Enums, roles, `handle_new_user()` trigger |
| `01_schema.sql` | All tables, RLS policies, stock functions |
| `02_storage.sql` | Product images storage bucket |
| `03_admin_setup.sql` | Assign admin role to a user |
| `04_test_user.sql` | Create test user for development |
| `05_subscribers.sql` | Newsletter subscribers table |
| `99_cleanup.sql` | Selective data cleanup (use sections individually) |
