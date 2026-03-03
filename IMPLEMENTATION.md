# Earthly Trinkets — Implementation Guide

> Living document. Updated as each phase is implemented and tested.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture Decisions](#3-architecture-decisions)
4. [React Concepts Primer](#4-react-concepts-primer)
5. [Phase 1 — Google OAuth](#5-phase-1--google-oauth)
6. [Phase 2 — Products in Database + CDN](#6-phase-2--products-in-database--cdn)
7. [Phase 3 — Node.js Backend (Vercel Serverless)](#7-phase-3--nodejs-backend-vercel-serverless)
8. [Phase 4 — Razorpay Payments](#8-phase-4--razorpay-payments)
9. [Phase 5 — Shiprocket Shipping](#9-phase-5--shiprocket-shipping)
10. [Phase 6 — Deploy to Vercel](#10-phase-6--deploy-to-vercel)
11. [Phase 7 — Docker + Kubernetes (Future)](#11-phase-7--docker--kubernetes-future)
12. [Phase 8 — Code Quality & Security (SonarQube + Fortify)](#12-phase-8--code-quality--security-sonarqube--fortify)
13. [Phase 9 — Observability (Prometheus + Grafana)](#13-phase-9--observability-prometheus--grafana)
14. [Database Schema Reference](#14-database-schema-reference)
15. [Environment Variables Reference](#15-environment-variables-reference)

---

## 1. Project Overview

**Earthly Trinkets** is a React e-commerce storefront for a handcrafted resin art business. It sells jewellery, paperweights, home decor, and accepts custom orders.

The app was scaffolded using **Lovable** — meaning the UI, routing, and component structure are already in place. What it lacks is real backend integration. This document tracks every integration we add.

### What exists (from Lovable)
- Full responsive UI with product pages, cart, shop, contact, custom orders
- Supabase project connected with `profiles` and `user_roles` tables
- Auth UI built (email/phone/Google) — Google not yet configured
- Products are hardcoded in `src/data/products.ts`
- Cart is in-memory (lost on page refresh)
- Razorpay button present but non-functional

### What we're building
- Real Google OAuth (Phase 1)
- Products from PostgreSQL + images from CDN (Phase 2)
- Secure backend API endpoints (Phase 3)
- Real payment processing via Razorpay (Phase 4)
- Shipping via Shiprocket (Phase 5)
- Production deploy on Vercel (Phase 6)

---

## 2. Tech Stack

### Frontend
| Tool | Version | Purpose |
|---|---|---|
| React | 18.3 | UI framework |
| TypeScript | 5.8 | Type safety |
| Vite | 5.4 | Build tool (dev server on port 8080) |
| Tailwind CSS | 3.4 | Utility-first styling |
| shadcn/ui | — | Pre-built accessible components (built on Radix UI) |
| Framer Motion | 12 | Animations |
| React Router DOM | 6 | Client-side routing |
| TanStack React Query | 5 | Data fetching, caching, loading states |
| React Hook Form + Zod | — | Forms and validation |
| Supabase JS SDK | 2 | Database queries + auth |

### Backend
| Tool | Purpose |
|---|---|
| Vercel Serverless Functions | API endpoints (Node.js/TypeScript) |
| Supabase (PostgreSQL) | Database |
| Supabase Storage | CDN for product images |
| Razorpay | Payment gateway |
| Shiprocket | Shipping aggregator |

### Future (Scaling Phase)
| Tool | Purpose |
|---|---|
| Docker | Containerisation |
| Azure Container Apps | Managed Kubernetes hosting |
| Azure CDN | Image delivery at scale |
| Spring Boot | Dedicated microservices (inventory, orders) |

---

## 3. Architecture Decisions

### Why Node.js over Spring Boot (for now)

Spring Boot is excellent for large-scale microservices but is the wrong tool for the initial phase of this project:

| | Spring Boot | Node.js Serverless |
|---|---|---|
| Cold start time | 2–5 seconds (JVM warmup) | ~100ms |
| Vercel compatible | No (needs a separate always-on server) | Yes (native support) |
| Razorpay SDK quality | Java SDK (less maintained) | Official Node.js SDK |
| Same language as frontend | No | Yes (TypeScript) |
| Memory per instance | 256–512 MB | 50–100 MB |

**Decision**: Use Node.js Vercel Serverless Functions for Phases 1–6. Introduce Spring Boot microservices in Phase 7 when specific services (inventory, order management) benefit from it, deployed as containers on Azure Container Apps.

### Why Supabase Storage over AWS S3 (for now)

| | Supabase Storage | Cloudflare R2 | AWS S3 + CloudFront |
|---|---|---|---|
| Cost | Free (1 GB) | $0.015/GB, free egress | ~$0.09/GB + egress |
| Integration complexity | Zero (already connected) | Medium | High |
| Best for | Starting out | Growth phase | Enterprise |

**Decision**: Use Supabase Storage for Phases 1–6. Migrate to Cloudflare R2 when product catalogue grows large or image traffic becomes significant. R2 has zero egress fees, making it cheapest at scale.

### Why Vercel over other platforms (initially)

- Zero-config deployment for Vite + React
- Serverless functions live in the same repo as the frontend
- Generous free tier (hobby)
- Instant preview deployments per git branch

---

## 4. React Concepts Primer

> Explanations of key React concepts used throughout this project.

### Components

A component is a reusable piece of UI. In React, every component is a TypeScript function that returns JSX (HTML-like syntax):

```tsx
// A simple component
function ProductCard({ name, price }: { name: string; price: number }) {
  return (
    <div className="rounded border p-4">
      <h2>{name}</h2>
      <p>₹{price}</p>
    </div>
  );
}
```

Components are composable — you build complex UIs by nesting smaller components.

### Props

Props are how you pass data **into** a component (like function arguments):

```tsx
// Parent passes data
<ProductCard name="Lavender Pendant" price={1299} />

// Child receives it
function ProductCard({ name, price }) { ... }
```

### State

State is data that **changes over time**. When state changes, React re-renders the component:

```tsx
import { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0) // initial value = 0

  return (
    <button onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  )
}
```

### Context

Context is a way to share state across many components without "prop drilling" (passing props through every level). This project uses it for:
- `AuthContext` — who is logged in
- `CartContext` — what's in the cart
- `ThemeContext` — light or dark mode

```tsx
// Any component can read cart data without being passed it as props
import { useCart } from '../contexts/CartContext'

function Navbar() {
  const { totalItems } = useCart()
  return <span>{totalItems} items in cart</span>
}
```

### Hooks

Hooks are functions starting with `use` that tap into React features. The most common ones:

| Hook | Purpose |
|---|---|
| `useState` | Local component state |
| `useEffect` | Side effects (API calls, subscriptions) — runs after render |
| `useContext` | Read from a Context |
| `useQuery` (React Query) | Fetch data from an API with caching |
| `useMutation` (React Query) | Send data to an API (POST/PUT/DELETE) |

### React Query (`useQuery`)

React Query is how we fetch data from Supabase. It handles loading states, errors, and caching automatically:

```tsx
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../integrations/supabase/client'

function Shop() {
  const { data: products, isLoading, isError } = useQuery({
    queryKey: ['products'],           // cache key — unique name for this query
    queryFn: async () => {            // the function that fetches data
      const { data, error } = await supabase
        .from('products')
        .select('*')
      if (error) throw error
      return data
    }
  })

  if (isLoading) return <p>Loading...</p>
  if (isError) return <p>Something went wrong</p>

  return products.map(p => <ProductCard key={p.id} {...p} />)
}
```

### Supabase RLS (Row Level Security)

RLS is database-level access control. Rules are written in SQL and enforced by Supabase before any data is returned. Examples:

- "A user can only read their own orders" — enforced in the database, not just the frontend
- "Only admins can insert/update products" — even if someone bypasses the UI, the DB rejects it
- "Products are publicly readable" — no auth needed to browse the shop

This means your data is secure even if someone calls your Supabase URL directly.

---

## 5. Phase 1 — Google OAuth

**Status**: `[x] Complete` — Google sign-in working, user email displayed in Navbar. Supabase project ref updated to `abymyaohtxrbaiiyoyak`.

### What this enables
- Users sign in with their Google account — no password needed
- User profile (name, avatar) auto-populated from Google
- Foundation for identifying users in orders, cart persistence, etc.

### How OAuth works

```
1. User clicks "Sign in with Google"
2. Browser redirects to Google's login page
3. User approves your app
4. Google redirects back to your app with an auth "code"
5. Supabase exchanges that code for a user session
6. User is now logged in — session stored in browser
```

You need to register your app with Google (so Google knows who is allowed to use this flow) and tell Supabase your Google credentials.

### Step 1 — Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project → name it `Earthly Trinkets`
3. Navigate to **APIs & Services → OAuth consent screen**
   - User Type: **External**
   - App name: `Earthly Trinkets`
   - User support email: `business.earthlytrinkets@gmail.com`
   - Developer contact: same email
   - Scopes: add `email` and `profile`
   - Test users: add your Gmail for development
4. Navigate to **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `Earthly Trinkets Web`
   - Authorised JavaScript origins:
     ```
     http://localhost:8080
     https://your-vercel-domain.vercel.app   ← add later when you have it
     ```
   - Authorised redirect URIs:
     ```
     https://babhvcgybtwwbphkwela.supabase.co/auth/v1/callback
     ```
     > **How to find this URL**: You don't need to construct it manually. In Supabase Dashboard → Authentication → Providers → Google, there is a read-only field labelled **"Callback URL (for OAuth)"** — copy it from there. It always follows the pattern `https://<project-ref>.supabase.co/auth/v1/callback`. Your project ref is `babhvcgybtwwbphkwela`, visible in your `.env` file and in the Supabase dashboard URL bar.
     >
     > **What this URL does**: After Google authenticates the user, it redirects to Supabase (not directly to your app). Supabase receives the auth code from Google, exchanges it for a user session, then redirects the user back to your app already logged in. The flow is: `Your app → Google → Supabase callback → Your app (logged in)`.
5. Save → copy **Client ID** and **Client Secret**

### Step 2 — Supabase Dashboard

1. Supabase Dashboard → **Authentication → Providers → Google**
2. Toggle **Enable**
3. Paste **Client ID** and **Client Secret**
4. The **Callback URL** field shown here is exactly what you put in Google Console (step above)
5. Click **Save**

### Supabase Auth Settings to configure

In Supabase Dashboard → **Authentication → Configuration → Auth**:

| Setting | Value | Reason |
|---|---|---|
| **Allow users without an email** | **OFF (disabled)** | Email is required for order confirmations, shipping updates, Razorpay receipts, and password reset. Enabling this allows phone-only accounts with no email — those users would receive no transactional emails after placing an order. |
| **Enable email confirmations** | Your choice | ON = user must verify email before logging in (recommended for production). OFF = easier during development. |
| **Minimum password length** | 8+ | Basic security |

> **Phone auth + email**: Your `AuthModal.tsx` supports phone/password login. The correct pattern is to require email during sign-up regardless of login method — phone is just used as an alternative login credential, not as a replacement for email.

### Step 3 — Verify in the App

No code changes needed — `AuthModal.tsx` already has the Google button wired to Supabase. Run the dev server and test:

```bash
npm run dev
```

Open `http://localhost:8080` → Sign In → Continue with Google → complete Google flow → verify:
- [x] Redirected back to app and logged in
- [x] User appears in Supabase Dashboard → Authentication → Users
- [x] Row in `profiles` table (auto-created by trigger)
- [x] Row in `user_roles` with `role = 'user'`

### How user data is saved automatically

When any user signs up (Google OAuth or email), the `handle_new_user()` trigger in the migration fires and does two things:

```sql
-- Trigger creates this automatically from Google's returned metadata
INSERT INTO profiles (id, full_name, avatar_url)
VALUES (new_user.id, google_name, google_avatar_url);

-- And assigns the default role
INSERT INTO user_roles (user_id, role) VALUES (new_user.id, 'user');
```

This is why you see the user's name and avatar without any code — Supabase runs this trigger server-side the moment the account is created.

### Profile Page (added alongside Phase 1)

A full `/profile` page was added with three tabs:
- **Profile** — edit name and phone number (reads/writes `profiles` table)
- **Addresses** — saved delivery addresses with add/edit/delete/set-default (uses new `addresses` table)
- **Orders** — placeholder, populated in Phase 4 (Razorpay)

#### Addresses table SQL (run in Supabase SQL Editor)

```sql
CREATE TABLE public.addresses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label       TEXT DEFAULT 'Home',
  full_name   TEXT NOT NULL,
  phone       TEXT NOT NULL,
  line1       TEXT NOT NULL,
  line2       TEXT,
  city        TEXT NOT NULL,
  state       TEXT NOT NULL,
  pincode     TEXT NOT NULL,
  country     TEXT DEFAULT 'India',
  is_default  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own addresses"
ON public.addresses FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_addresses_updated_at
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

#### Files added/changed
- [src/pages/Profile.tsx](src/pages/Profile.tsx) — new profile page (Profile, Addresses, Orders tabs)
- [src/App.tsx](src/App.tsx) — added `/profile` route
- [src/components/Navbar.tsx](src/components/Navbar.tsx) — added "My Profile" link in user dropdown

### Files involved
- [src/components/AuthModal.tsx](src/components/AuthModal.tsx) — Google sign-in button (already wired)
- [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx) — session management (already wired)
- [src/integrations/supabase/client.ts](src/integrations/supabase/client.ts) — Supabase client

---

## 6. Phase 2 — Products in Database + CDN

**Status**: `[ ] Not started`

**Prerequisite**: Phase 1 complete and tested.

### What this enables
- Products managed in PostgreSQL — add/edit without code changes
- Images stored in Supabase Storage and served via CDN URL
- Foundation for stock tracking, filtering by DB, admin panel

### 6.1 — Database Tables

Run in **Supabase Dashboard → SQL Editor**:

#### Products table

```sql
CREATE TABLE public.products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  description       TEXT,
  short_description TEXT,
  price             DECIMAL(10,2) NOT NULL,
  original_price    DECIMAL(10,2),
  category          TEXT CHECK (category IN ('jewellery','paperweights','home-decor','custom-pieces')),
  images            TEXT[] DEFAULT '{}',
  materials         TEXT[] DEFAULT '{}',
  care_instructions TEXT[] DEFAULT '{}',
  rating            DECIMAL(3,2) DEFAULT 0,
  review_count      INT DEFAULT 0,
  in_stock          BOOLEAN DEFAULT true,
  stock_quantity    INT DEFAULT 0,
  featured          BOOLEAN DEFAULT false,
  is_new            BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Public can read products (the shop is open to everyone)
CREATE POLICY "Products are publicly readable"
ON public.products FOR SELECT TO public
USING (true);

-- Only admins can create/update/delete products
CREATE POLICY "Admins can manage products"
ON public.products FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Auto-update updated_at on any change
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

#### Orders table

```sql
CREATE TABLE public.orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id),
  status              TEXT DEFAULT 'pending'
                      CHECK (status IN ('pending','paid','processing','shipped','delivered','cancelled')),
  total_amount        DECIMAL(10,2) NOT NULL,
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT,
  shiprocket_order_id TEXT,
  tracking_number     TEXT,
  shipping_address    JSONB NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
ON public.orders FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create orders"
ON public.orders FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all orders"
ON public.orders FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

#### Order items table

```sql
CREATE TABLE public.order_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  quantity   INT NOT NULL,
  price      DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order items"
ON public.order_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = order_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all order items"
ON public.order_items FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
```

### 6.2 — Supabase Storage Bucket

1. Supabase Dashboard → **Storage → New Bucket**
   - Name: `product-images`
   - Public: **Yes**

2. Storage policies (run in SQL Editor):

```sql
CREATE POLICY "Public can view product images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'product-images');

CREATE POLICY "Admins can manage product images"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'product-images' AND
  public.has_role(auth.uid(), 'admin')
);
```

### 6.3 — CDN URL Pattern

When you upload an image to Supabase Storage, the public URL follows this pattern:

```
https://babhvcgybtwwbphkwela.supabase.co/storage/v1/object/public/product-images/{filename}
```

This URL is what gets stored in `products.images[]` array. Supabase serves these through a CDN automatically.

### 6.4 — Seeding Products

We'll insert the 6 existing mock products into the database. Images need to be uploaded to the `product-images` bucket first, then the insert runs with their CDN URLs.

```sql
-- Example single product insert (run after uploading images)
INSERT INTO public.products (name, short_description, description, price, original_price, category, images, materials, care_instructions, in_stock, featured, is_new)
VALUES (
  'Lavender Dream Pendant',
  'Delicate dried lavender preserved in crystal-clear resin',
  'This beautiful pendant features real dried lavender flowers...',
  1299, 1599, 'jewellery',
  ARRAY['https://babhvcgybtwwbphkwela.supabase.co/storage/v1/object/public/product-images/lavender-pendant.jpg'],
  ARRAY['Clear resin', 'Dried lavender', 'Gold-plated chain'],
  ARRAY['Keep away from moisture', 'Store in cool dry place'],
  true, true, true
);
```

### 6.5 — Frontend Changes

#### Replace hardcoded products with DB query

**File**: `src/pages/Shop.tsx`

```tsx
// BEFORE (hardcoded)
import { products } from '../data/products'

// AFTER (from Supabase)
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../integrations/supabase/client'

const { data: products = [], isLoading } = useQuery({
  queryKey: ['products'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }
})
```

The `queryKey: ['products']` acts as a cache key — React Query won't re-fetch if it already has fresh data. The cache is automatically invalidated after 5 minutes (configurable).

#### Files to update in this phase
- [src/pages/Shop.tsx](src/pages/Shop.tsx)
- [src/pages/ProductDetail.tsx](src/pages/ProductDetail.tsx)
- [src/components/FeaturedProducts.tsx](src/components/FeaturedProducts.tsx)
- [src/integrations/supabase/types.ts](src/integrations/supabase/types.ts) — add products/orders/order_items types

### Verification Checklist
- [ ] Products table created in Supabase
- [ ] Orders + order_items tables created
- [ ] `product-images` bucket created and public
- [ ] All 6 products seeded with images uploaded
- [ ] Shop page loads products from DB
- [ ] Product detail page loads from DB
- [ ] Featured products on homepage load from DB
- [ ] Images load correctly from Supabase Storage CDN

---

## 7. Phase 3 — Node.js Backend (Vercel Serverless)

**Status**: `[ ] Not started`

**Prerequisite**: Phase 2 complete and tested.

### What this enables
- Secure API endpoints where secret keys (Razorpay, Shiprocket) never reach the browser
- Payment order creation and verification
- Shipping order creation

### Why a backend is needed

Some operations must never run in the browser because your source code is visible to anyone:

```
NEVER in frontend code:
  RAZORPAY_KEY_SECRET=...     ← anyone can steal this and charge your account
  SHIPROCKET_PASSWORD=...     ← anyone can create fake shipments

SAFE in frontend code:
  RAZORPAY_KEY_ID=...         ← this is public, it's ok
  VITE_SUPABASE_URL=...       ← this is public, RLS protects the data
```

### Folder structure

Create an `api/` folder at the project root. Each file becomes an API endpoint:

```
et-code/
├── src/                      ← React app (unchanged)
├── api/                      ← New backend folder
│   ├── create-order.ts       → POST /api/create-order
│   ├── verify-payment.ts     → POST /api/verify-payment
│   └── shiprocket/
│       ├── create-order.ts   → POST /api/shiprocket/create-order
│       └── track.ts          → GET  /api/shiprocket/track
└── vercel.json               ← Vercel configuration
```

### Vercel configuration

**File**: `vercel.json` (create at project root)

```json
{
  "functions": {
    "api/**/*.ts": {
      "runtime": "@vercel/node"
    }
  }
}
```

### Example API endpoint structure

```ts
// api/create-order.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { amount } = req.body
  // ... create Razorpay order using secret key
  // ... return order_id to frontend

  return res.status(200).json({ order_id: '...' })
}
```

### Installing backend dependencies

```bash
npm install @vercel/node razorpay
npm install --save-dev @types/razorpay
```

---

## 8. Phase 4 — Razorpay Payments

**Status**: `[ ] Not started`

**Prerequisite**: Phase 3 complete and tested.

### Account setup
1. Create account at [razorpay.com](https://razorpay.com)
2. Complete KYC verification (business/individual)
3. Dashboard → Settings → API Keys → Generate Test Keys
4. You get two keys:
   - `rzp_test_XXXXXXXX` — Key ID (safe for frontend)
   - Secret key — never expose this

### Payment flow

```
1. User fills in shipping address and clicks "Place Order"
2. Frontend → POST /api/create-order { amount, currency: 'INR' }
3. Backend creates Razorpay order with secret key → returns { razorpay_order_id }
4. Frontend opens Razorpay checkout popup with razorpay_order_id
5. User completes payment (UPI, card, netbanking, wallets)
6. Razorpay calls your webhook OR frontend gets { razorpay_payment_id, razorpay_signature }
7. Frontend → POST /api/verify-payment { razorpay_order_id, razorpay_payment_id, razorpay_signature }
8. Backend verifies HMAC signature (proves payment is genuine, not forged)
9. If valid → create order record in Supabase, clear cart
10. Return success to frontend → show confirmation page
```

### Why signature verification matters

When Razorpay tells you "payment succeeded", you must verify it came from Razorpay and wasn't fabricated by someone. Razorpay signs the response with your secret key. You verify the signature by recreating it:

```ts
// api/verify-payment.ts
import crypto from 'crypto'

const generated_signature = crypto
  .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
  .update(`${razorpay_order_id}|${razorpay_payment_id}`)
  .digest('hex')

if (generated_signature !== razorpay_signature) {
  return res.status(400).json({ error: 'Payment verification failed' })
}

// Only if this passes do you create the order in Supabase
```

### Frontend integration

Razorpay provides a script tag that loads their payment UI:

```html
<!-- index.html -->
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

```ts
// In Cart.tsx or a checkout component
const options = {
  key: import.meta.env.VITE_RAZORPAY_KEY_ID,
  amount: totalAmount * 100,         // Razorpay uses paise (₹1 = 100 paise)
  currency: 'INR',
  order_id: razorpayOrderId,         // from your /api/create-order response
  handler: async (response) => {
    // Payment done — verify on backend
    await fetch('/api/verify-payment', {
      method: 'POST',
      body: JSON.stringify(response)
    })
  }
}
const rzp = new (window as any).Razorpay(options)
rzp.open()
```

### Files to create/update
- `api/create-order.ts` — new
- `api/verify-payment.ts` — new
- [src/pages/Cart.tsx](src/pages/Cart.tsx) — replace placeholder with real checkout
- [index.html](index.html) — add Razorpay script tag

### Verification Checklist
- [ ] Razorpay test account created
- [ ] Test API keys added to `.env.local`
- [ ] `/api/create-order` endpoint working
- [ ] `/api/verify-payment` endpoint with signature check working
- [ ] Razorpay popup opens on checkout
- [ ] Test payment completes (use test card: 4111 1111 1111 1111)
- [ ] Order created in Supabase `orders` table after payment
- [ ] Order items created in `order_items` table
- [ ] Cart cleared after successful payment

---

## 9. Phase 5 — Shiprocket Shipping

**Status**: `[ ] Not started`

**Prerequisite**: Phase 4 complete and tested.

### What Shiprocket does

Shiprocket is a shipping aggregator. Instead of integrating with Delhivery, Blue Dart, DTDC etc. separately, Shiprocket:
- Picks the best courier for each order (based on pincode serviceability and price)
- Provides one AWB (tracking number) to pass to customers
- Handles label generation and pickup scheduling

### Account setup
1. Sign up at [shiprocket.in](https://shiprocket.in)
2. Add your **pickup address** (your studio/storage location)
3. Note your login email and password (used for API authentication)
4. Shiprocket uses JWT token-based auth — you call their login endpoint to get a token, then use it for subsequent calls

### Shiprocket auth (token-based, not OAuth)

```ts
// api/shiprocket/create-order.ts

// Step 1: Get auth token
const authResponse = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: process.env.SHIPROCKET_EMAIL,
    password: process.env.SHIPROCKET_PASSWORD
  })
})
const { token } = await authResponse.json()

// Step 2: Create shipment
const orderResponse = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    order_id: supabaseOrderId,
    order_date: new Date().toISOString(),
    pickup_location: 'Primary',      // name of pickup address in Shiprocket
    channel_id: '',
    billing_customer_name: shippingAddress.name,
    billing_address: shippingAddress.line1,
    billing_city: shippingAddress.city,
    billing_pincode: shippingAddress.pincode,
    billing_state: shippingAddress.state,
    billing_country: 'India',
    billing_email: userEmail,
    billing_phone: userPhone,
    shipping_is_billing: true,
    order_items: cartItems.map(item => ({
      name: item.name,
      sku: item.product_id,
      units: item.quantity,
      selling_price: item.price
    })),
    payment_method: 'Prepaid',       // since Razorpay already collected payment
    sub_total: totalAmount,
    length: 10, breadth: 10, height: 5,   // package dimensions in cm
    weight: 0.5                            // in kg
  })
})
```

### Tracking integration

After creating the Shiprocket order, save the `awb_code` (tracking number) to your `orders` table. Add a tracking page or status display in the user's order history.

```ts
// After creating Shiprocket order
const { shipment_id, awb_code } = await orderResponse.json()

await supabase
  .from('orders')
  .update({
    shiprocket_order_id: shipment_id,
    tracking_number: awb_code,
    status: 'processing'
  })
  .eq('id', supabaseOrderId)
```

### Webhook for status updates

Shiprocket can notify your backend when shipment status changes (shipped, out for delivery, delivered):

```
Shiprocket Dashboard → Settings → Webhooks
→ Add webhook URL: https://your-domain.vercel.app/api/shiprocket/webhook
```

```ts
// api/shiprocket/webhook.ts
export default async function handler(req, res) {
  const { awb, current_status } = req.body

  const statusMap = {
    'Picked Up': 'processing',
    'In Transit': 'shipped',
    'Delivered': 'delivered'
  }

  await supabase
    .from('orders')
    .update({ status: statusMap[current_status] ?? 'processing' })
    .eq('tracking_number', awb)

  return res.status(200).json({ received: true })
}
```

### Files to create/update
- `api/shiprocket/create-order.ts` — new
- `api/shiprocket/webhook.ts` — new
- `api/shiprocket/track.ts` — new (for customer-facing tracking)
- [src/pages/](src/pages/) — add Orders page showing order history + tracking status

### Verification Checklist
- [ ] Shiprocket account created with pickup address configured
- [ ] Test order created via API
- [ ] AWB number saved to Supabase `orders` table
- [ ] Tracking status displays on order history page
- [ ] Webhook receives status updates from Shiprocket

---

## 10. Phase 6 — Deploy to Vercel

**Status**: `[ ] Not started`

**Prerequisite**: Phases 1–5 complete and tested locally.

### Setup

```bash
npm install -g vercel
vercel login    # sign in with GitHub/email
vercel          # first deploy (follow prompts)
vercel --prod   # deploy to production
```

### Environment variables on Vercel

Set these in **Vercel Dashboard → Project → Settings → Environment Variables**:

```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_KEY_ID
SHIPROCKET_EMAIL
SHIPROCKET_PASSWORD
```

### After first deploy

1. Copy your Vercel domain (e.g., `earthly-trinkets.vercel.app`)
2. **Google Console** → OAuth client → Authorised JavaScript origins → add Vercel domain
3. **Google Console** → OAuth client → Authorised redirect URIs → already correct (Supabase URL)
4. **Supabase** → Authentication → URL Configuration → add Vercel domain to:
   - Site URL
   - Redirect URLs

### Continuous deployment

Every push to `main` branch auto-deploys to production. Every push to other branches creates a preview URL. This is free on Vercel's hobby plan.

---

## 11. Phase 7 — Docker + Kubernetes (Future)

**Status**: `[ ] Future — not started`

### When to do this

When any of these become true:
- App traffic requires more than Vercel's serverless limits
- You need dedicated, always-warm backend services (no cold starts)
- You want Spring Boot microservices for specific domains
- Need advanced scaling, blue-green deployments, or multi-region

### Recommended platform: Azure Container Apps

| Platform | Monthly cost (small) | Managed K8s | Cold starts |
|---|---|---|---|
| **Azure Container Apps** | ~$10–30 | Yes (fully managed) | No (min replicas) |
| Azure AKS | ~$70+ | Yes (you manage nodes) | No |
| DigitalOcean Kubernetes | ~$24 (2 nodes) | Partial | No |
| Google Cloud Run | ~$5–15 | No (simpler) | Yes (unless min=1) |

**Azure Container Apps** is the best balance — managed Kubernetes without the complexity of AKS. Scales to zero when idle, scales up automatically under load.

### Containerisation plan

```dockerfile
# Frontend Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

```dockerfile
# Backend Dockerfile (when migrating to Express or Spring Boot)
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### Spring Boot microservices (at scale)

When migrating specific services to Spring Boot:
- **Inventory service** — stock tracking, reservation, restock alerts
- **Order service** — order lifecycle management, state machine
- **Notification service** — email/SMS for order updates

Each runs as a separate container in Azure Container Apps. The React frontend and Node.js gateway remain on Vercel or move to Azure Static Web Apps.

### Image CDN at scale

When Supabase Storage limits are reached, migrate to **Cloudflare R2**:
- $0.015/GB storage, **$0 egress** (vs AWS which charges per GB served)
- S3-compatible API (drop-in replacement)
- Integrated with Cloudflare CDN globally

---

## 12. Phase 8 — Code Quality & Security (SonarQube + Fortify)

**Status**: `[ ] Future — after Phase 7 (K8s deployment)`

### What these tools do and why they matter

| Tool | Category | What it catches |
|---|---|---|
| **SonarQube / SonarCloud** | SAST + Code Quality | Bugs, code smells, duplications, test coverage gaps, some security vulnerabilities |
| **Fortify SAST** | Security-focused SAST | Deep security vulnerabilities — injection, XSS, insecure crypto, data exposure |
| **Fortify SCA** | Supply chain security | Vulnerabilities in your npm/Maven dependencies |

**SAST** = Static Application Security Testing — analysing your source code without running it.

Think of it like a spell-checker, but for security and code quality. It reads every line of your code and flags patterns that are known to cause bugs or be exploitable.

### SonarQube vs SonarCloud

| | SonarQube | SonarCloud |
|---|---|---|
| Hosting | Self-hosted (Docker container) | Cloud SaaS |
| Cost | Free (Community Edition) | Free for public repos, paid for private |
| Setup effort | Medium (needs a server) | Low (GitHub OAuth, done in minutes) |
| Best for | Phase 8 with K8s (runs as a pod) | Quick wins before K8s |

**Recommendation**: Use **SonarCloud** as soon as the code is on GitHub (free for public repos, works without K8s). Add self-hosted SonarQube inside your K8s cluster in Phase 8 for full control and private scanning.

### SonarCloud Setup (can be done before Phase 7)

1. Go to [sonarcloud.io](https://sonarcloud.io) → Sign in with GitHub
2. Import your `et-code` repository
3. SonarCloud auto-detects the tech stack (TypeScript/React)
4. Add a `sonar-project.properties` file at the project root:

```properties
# sonar-project.properties
sonar.projectKey=earthly-trinkets
sonar.organization=your-github-org
sonar.projectName=Earthly Trinkets
sonar.projectVersion=1.0

sonar.sources=src,api
sonar.exclusions=src/components/ui/**,node_modules/**,dist/**
sonar.tests=src
sonar.test.inclusions=**/*.test.tsx,**/*.test.ts,**/*.spec.ts

sonar.typescript.lcov.reportPaths=coverage/lcov.info
sonar.javascript.lcov.reportPaths=coverage/lcov.info
```

5. Add to GitHub Actions CI pipeline (`.github/workflows/sonar.yml`):

```yaml
name: SonarCloud Analysis

on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  sonarcloud:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # full history needed for blame info

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npm run test -- --coverage

      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

6. Add `SONAR_TOKEN` to GitHub → Settings → Secrets

Now every PR gets a quality gate — SonarCloud comments directly on the PR with issues found.

### Quality Gate (what SonarCloud enforces)

The default quality gate blocks merging if:
- New code has **coverage < 80%**
- New code has any **blocker or critical bugs**
- New code has any **security hotspots** not reviewed
- Code **duplication > 3%**

You can customise these thresholds in the SonarCloud dashboard.

### Self-hosted SonarQube in Kubernetes (Phase 8)

When you have K8s running, add SonarQube as a pod:

```yaml
# k8s/sonarqube-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sonarqube
spec:
  replicas: 1
  selector:
    matchLabels:
      app: sonarqube
  template:
    spec:
      containers:
        - name: sonarqube
          image: sonarqube:10-community
          ports:
            - containerPort: 9000
          env:
            - name: SONAR_JDBC_URL
              value: jdbc:postgresql://postgres-service:5432/sonar
          volumeMounts:
            - mountPath: /opt/sonarqube/data
              name: sonarqube-data
```

Connect it to your PostgreSQL (separate DB from app data) and point your CI pipeline at your internal SonarQube URL instead of SonarCloud.

### Fortify Setup

Fortify is an enterprise product by OpenText (formerly Micro Focus). It is significantly deeper than SonarQube for security — it understands data flow (taint analysis) across your entire codebase.

**Licensing**: Fortify requires a commercial licence. Options:
- **Fortify on Demand (FoD)** — cloud-based, pay-per-scan, easiest to start
- **Fortify SCA** — self-hosted, annual licence, integrates with K8s CI/CD
- **Free alternative**: Use **Semgrep** (open source) for security rules if Fortify cost is a concern

#### Fortify on Demand workflow

```
1. Upload your source code zip to FoD portal
2. FoD scans it (takes 30–60 minutes for a project this size)
3. Download the FVDL report
4. Review findings categorised by:
   - Critical (fix immediately)
   - High (fix before release)
   - Medium (fix in next sprint)
   - Low (review and document)
```

#### Common findings in React + Node.js apps

| Vulnerability | Where it usually appears | Fix |
|---|---|---|
| XSS (Cross-site scripting) | `dangerouslySetInnerHTML`, unescaped user input | Never use `dangerouslySetInnerHTML`, use React's default escaping |
| SQL Injection | Raw query strings with user input | Supabase parameterised queries (already safe by default) |
| Insecure direct object reference | `/api/orders/:id` without ownership check | RLS policies in Supabase |
| Hardcoded credentials | `.env` values in source code | Environment variables (never commit `.env`) |
| Broken auth | Missing token verification | Verify Supabase JWT on every API call |

#### Integrating Fortify into CI/CD

```yaml
# .github/workflows/fortify.yml
name: Fortify SAST

on:
  push:
    branches: [main]

jobs:
  fortify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Fortify Scan
        uses: fortify/github-action@v1
        with:
          ssc-url: ${{ secrets.SSC_URL }}
          ssc-ci-token: ${{ secrets.SSC_CI_TOKEN }}
          sast-scan: true
```

### Dependency scanning (supply chain security)

Both SonarQube and Fortify have dependency scanning (SCA — Software Composition Analysis). Additionally:

```bash
# Built into npm — run regularly
npm audit

# Fix automatically where safe
npm audit fix

# More detailed (free tool, open source)
npx snyk test
```

Add `npm audit` to your CI pipeline so every deploy checks for known vulnerabilities in dependencies.

### Verification Checklist (Phase 8)
- [ ] SonarCloud connected to GitHub repo
- [ ] `sonar-project.properties` committed
- [ ] GitHub Actions workflow running on every PR
- [ ] Quality gate passing (no blockers/criticals)
- [ ] Test coverage > 80% for new code
- [ ] `npm audit` passing with no critical vulnerabilities
- [ ] Fortify scan completed (at least once before go-live)
- [ ] All Critical + High Fortify findings resolved

---

## 13. Phase 9 — Observability (Prometheus + Grafana)

**Status**: `[ ] Future — after Phase 7 (K8s deployment)`

### What observability means

Observability is knowing **what your system is doing in production** — without having to guess or reproduce bugs locally. It has three pillars:

| Pillar | Tool | What it answers |
|---|---|---|
| **Metrics** | Prometheus | "How many requests per second? What's the error rate? Memory usage?" |
| **Logs** | Loki (or ELK) | "What exactly happened in this request? Show me the error message." |
| **Traces** | Jaeger / Tempo | "This request was slow — which service/function caused the delay?" |

For this project, we'll implement all three. Prometheus + Grafana is the core, plus Loki for logs and Tempo for traces — all part of the **Grafana stack**, which is free and open source.

### The Grafana stack

```
┌─────────────────────────────────────────────────────┐
│                    Grafana UI                        │
│         (dashboards, alerts, log explorer)           │
└──────────┬────────────────┬───────────────┬──────────┘
           │                │               │
     ┌─────▼──────┐  ┌──────▼──────┐ ┌─────▼──────┐
     │ Prometheus │  │    Loki     │ │   Tempo    │
     │ (metrics)  │  │   (logs)    │ │  (traces)  │
     └─────┬──────┘  └──────┬──────┘ └─────┬──────┘
           │                │               │
     ┌─────▼──────────────────────────────────────┐
     │           Your Application                  │
     │   (React frontend + Node.js API + K8s)      │
     └─────────────────────────────────────────────┘
```

### What you'll monitor

#### Frontend metrics (via Web Vitals)
- **LCP** (Largest Contentful Paint) — page load speed
- **FID** / **INP** — responsiveness to user input
- **CLS** — layout stability (no jumpy content)
- **Custom**: cart abandonment rate, checkout funnel drop-off

#### Backend / API metrics
- Request rate (requests per second)
- Error rate (% of requests returning 5xx)
- Latency (p50, p95, p99 — median and tail latencies)
- Active orders being processed
- Payment success/failure rate

#### Infrastructure metrics (auto-collected in K8s)
- CPU and memory per pod
- Pod restarts (sign of crashes)
- Database connection pool usage
- Storage usage

### Deployment in Kubernetes

The entire Grafana stack deploys with one Helm chart:

```bash
# Add Grafana Helm repo
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install the full observability stack (Prometheus + Grafana + Loki + Tempo)
helm install observability grafana/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set grafana.adminPassword=your-secure-password
```

This single command gives you:
- Prometheus collecting metrics from all K8s pods
- Grafana with pre-built dashboards for Kubernetes, Node.js
- Alertmanager for sending alerts to email/Slack
- Node exporter for host-level metrics

### Instrumenting the Node.js API

Add Prometheus metrics to your backend:

```bash
npm install prom-client
```

```ts
// api/_metrics.ts  (shared metrics setup)
import client from 'prom-client'

// Collect default Node.js metrics (memory, CPU, event loop lag)
client.collectDefaultMetrics()

// Custom metrics for your business
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5]
})

export const ordersCreated = new client.Counter({
  name: 'orders_created_total',
  help: 'Total number of orders created',
  labelNames: ['status']  // 'success' | 'failed'
})

export const paymentAttempts = new client.Counter({
  name: 'payment_attempts_total',
  help: 'Razorpay payment attempts',
  labelNames: ['result']  // 'success' | 'failed' | 'verification_failed'
})
```

```ts
// api/metrics.ts  ← Prometheus scrape endpoint
import client from 'prom-client'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', client.register.contentType)
  res.end(await client.register.metrics())
}
```

Tell Prometheus to scrape this endpoint (in K8s via ServiceMonitor).

### Frontend observability (Web Vitals → Prometheus)

```tsx
// src/lib/vitals.ts
import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals'

function sendToAnalytics(metric: { name: string; value: number; rating: string }) {
  // Send to your backend metrics endpoint
  fetch('/api/vitals', {
    method: 'POST',
    body: JSON.stringify(metric),
    headers: { 'Content-Type': 'application/json' }
  })
}

// Register all Core Web Vitals
onLCP(sendToAnalytics)
onINP(sendToAnalytics)
onCLS(sendToAnalytics)
onFCP(sendToAnalytics)
onTTFB(sendToAnalytics)
```

```ts
// api/vitals.ts  ← receives web vitals, records as Prometheus metrics
import { webVitalsHistogram } from './_metrics'

export default async function handler(req, res) {
  const { name, value, rating } = req.body
  webVitalsHistogram.observe({ metric: name, rating }, value)
  res.status(200).end()
}
```

### Grafana Dashboards

After setup, import these pre-built dashboards (by ID from grafana.com):

| Dashboard | ID | What it shows |
|---|---|---|
| Kubernetes cluster overview | `315` | All pod CPU/memory across cluster |
| Node.js metrics | `11159` | Heap usage, event loop lag, GC |
| React Web Vitals | Custom | LCP, CLS, INP per page |
| Business metrics | Custom | Orders/hr, revenue/hr, cart abandonment |

Custom dashboards are defined in JSON and can be committed to your repo (GitOps for dashboards).

### Alerting

Configure alerts in Grafana for:

```yaml
# example alert rules
- alert: HighErrorRate
  expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
  for: 2m
  annotations:
    summary: "Error rate above 5% for 2 minutes"

- alert: PaymentFailureSpike
  expr: rate(payment_attempts_total{result="failed"}[10m]) > 0.1
  for: 1m
  annotations:
    summary: "More than 10% of payments failing"

- alert: PodCrashLooping
  expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
  annotations:
    summary: "Pod {{ $labels.pod }} is crash looping"
```

Route alerts to **email** and **Slack** via Alertmanager.

### Logging with Loki

Loki is like Prometheus but for logs. In K8s, Promtail (a log collector) automatically ships logs from all pods to Loki. No code changes needed.

In Grafana, you can then:
- Search logs: `{app="earthly-trinkets-api"} |= "payment failed"`
- Correlate: click a spike in the error rate graph → jump to the logs at that exact time
- Set log-based alerts: alert when "FATAL" appears in logs

### Distributed tracing with Tempo

When a request is slow, tracing shows you exactly which function or external API call caused it:

```
POST /api/verify-payment — 2.3 seconds total
  ├── Verify HMAC signature — 2ms
  ├── Supabase: INSERT orders — 45ms
  ├── Supabase: INSERT order_items — 12ms
  └── Shiprocket: create shipment — 2.2 seconds  ← THIS is slow
```

Add tracing to Node.js API:

```bash
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http
```

```ts
// api/_tracing.ts  (initialise before anything else)
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

const sdk = new NodeSDK({
  serviceName: 'earthly-trinkets-api',
  traceExporter: new OTLPTraceExporter({
    url: process.env.TEMPO_ENDPOINT  // your Tempo URL in K8s
  }),
  instrumentations: [getNodeAutoInstrumentations()]  // auto-instruments fetch, postgres, etc.
})

sdk.start()
```

After this, every `fetch()` call, Supabase query, and HTTP request is automatically traced with zero additional code.

### Verification Checklist (Phase 9)
- [ ] Prometheus + Grafana deployed in K8s cluster
- [ ] Loki deployed and receiving logs from all pods
- [ ] Tempo deployed and receiving traces from API
- [ ] Node.js API instrumented with `prom-client`
- [ ] `/api/metrics` endpoint scraped by Prometheus
- [ ] Frontend Web Vitals sent to backend metrics
- [ ] Kubernetes cluster dashboard imported in Grafana
- [ ] Node.js dashboard imported in Grafana
- [ ] Business metrics dashboard created (orders, payments, revenue)
- [ ] Alerts configured for error rate, payment failures, pod crashes
- [ ] Alert notifications reaching email/Slack

---

## 14. Database Schema Reference

### Execution order for SQL scripts

| File | When | Status |
|------|------|--------|
| `supabase/migrations/20260228...sql` | First — on every new Supabase project | ✅ Done |
| `supabase/scripts/01_addresses.sql` | After migration | ✅ Done |
| `supabase/scripts/02_products.sql` | Phase 2 (product catalogue) | ✅ Done |
| `supabase/scripts/03_orders.sql` | Phase 4 (before Razorpay checkout) | ✅ Done |

> **Note on `::app_role` cast:** The `has_role()` function expects the `app_role` enum type, not plain text.
> Always write `'admin'::app_role` in policies, never just `'admin'`.

### Current tables

```
auth.users               — Supabase managed (email, phone, OAuth identities)
public.profiles          — extended user info (full_name, avatar_url, phone)
public.user_roles        — role: 'admin' | 'user'  (app_role enum)
public.addresses         — user delivery addresses (label, line1/2, city, state, pincode, is_default)
public.categories        — product categories (name, slug)
public.products          — product catalogue (name, slug, price, images[], stock, is_featured)
public.orders            — orders with Razorpay + Shiprocket fields
public.order_items       — line items (price/name snapshotted at order time)
```

### Table details

```
public.addresses
  id         UUID PK
  user_id    UUID → auth.users
  label      TEXT  ('Home' | 'Work' | 'Other')
  full_name  TEXT
  phone      TEXT
  line1      TEXT
  line2      TEXT (nullable)
  city       TEXT
  state      TEXT
  pincode    TEXT
  is_default BOOLEAN
  created_at TIMESTAMPTZ

public.categories
  id   UUID PK
  name TEXT UNIQUE
  slug TEXT UNIQUE
  Seeded: rings, earrings, necklaces, bracelets, home-decor, keychains

public.products
  id               UUID PK
  name             TEXT
  slug             TEXT UNIQUE
  description      TEXT
  price            NUMERIC(10,2)
  compare_at_price NUMERIC(10,2)  ← strikethrough/original price
  category_id      UUID → categories
  images           TEXT[]         ← Supabase Storage public URLs
  tags             TEXT[]
  stock            INTEGER
  is_active        BOOLEAN
  is_featured      BOOLEAN
  created_at       TIMESTAMPTZ
  updated_at       TIMESTAMPTZ

public.orders
  id                  UUID PK
  user_id             UUID → auth.users
  status              order_status enum (pending/confirmed/processing/shipped/delivered/cancelled/refunded)
  subtotal            NUMERIC(10,2)
  shipping_fee        NUMERIC(10,2)
  total               NUMERIC(10,2)
  shipping_address    JSONB  ← full address snapshot at order time
  razorpay_order_id   TEXT
  razorpay_payment_id TEXT
  shiprocket_order_id TEXT
  shiprocket_awb      TEXT   ← airway bill / tracking number
  notes               TEXT
  created_at          TIMESTAMPTZ
  updated_at          TIMESTAMPTZ

public.order_items
  id            UUID PK
  order_id      UUID → orders
  product_id    UUID → products (SET NULL on delete)
  product_name  TEXT           ← snapshot — won't change if product is renamed
  product_image TEXT           ← snapshot — first image URL at time of purchase
  price         NUMERIC(10,2)  ← snapshot — price at time of purchase
  quantity      INTEGER
  created_at    TIMESTAMPTZ
```

---

## 15. Environment Variables Reference

### Where to find Supabase values

All three Supabase variables come from one place:
**Supabase Dashboard → Project Settings (gear icon, bottom-left) → Data API tab**

| Variable | Label in dashboard | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | **Project URL** | e.g. `https://xxxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **Project API keys → anon public** | Safe to expose in frontend |
| `VITE_SUPABASE_PROJECT_ID` | **Reference ID** | Just the `xxxx` part of the URL |

> **Never use the `service_role` key in frontend code.** It bypasses all RLS policies. It only ever goes in backend (server-side) environment variables.

> **Already set**: Lovable populated all three Supabase values when the project was created. The `.env` file is ready as-is — no changes needed for Supabase connectivity.

---

### `.env.local` (development — never commit this file)

```bash
# Supabase — frontend (VITE_ prefix means exposed in browser, but that's safe)
VITE_SUPABASE_URL=https://babhvcgybtwwbphkwela.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...

# Razorpay — frontend (key ID is safe to expose)
VITE_RAZORPAY_KEY_ID=rzp_test_XXXXXXXX

# Razorpay — backend only (never expose these)
RAZORPAY_KEY_ID=rzp_test_XXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXX

# Shiprocket — backend only
SHIPROCKET_EMAIL=your@email.com
SHIPROCKET_PASSWORD=yourpassword
```

### `.env.example` (commit this — template for other developers)

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_RAZORPAY_KEY_ID=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
SHIPROCKET_EMAIL=
SHIPROCKET_PASSWORD=
```

---

*Last updated: Phase 0 — codebase reviewed, plan drafted. Starting Phase 1 next.*
