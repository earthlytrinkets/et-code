# Earthly Trinkets — Implementation Guide

A complete reference for everything built in this project, plus beginner-friendly explanations of every concept used. If you're new to React, TypeScript, or web development — start at [Part 2: Concepts & Tutorials](#part-2-concepts--tutorials).

---

## Table of Contents

**Part 1 — What Was Built**
1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [File Structure](#3-file-structure)
4. [Features Implemented](#4-features-implemented)
5. [Database Schema](#5-database-schema)
6. [Setup Guide — Fresh Install](#6-setup-guide--fresh-install)
7. [Environment Variables](#7-environment-variables)
8. [Planned Next Steps](#8-planned-next-steps)

**Part 2 — Concepts & Tutorials**
9. [What is React?](#9-what-is-react)
10. [What is TypeScript?](#10-what-is-typescript)
11. [What is Vite?](#11-what-is-vite)
12. [What is Tailwind CSS?](#12-what-is-tailwind-css)
13. [What is Supabase?](#13-what-is-supabase)
14. [React Context API](#14-react-context-api)
15. [TanStack React Query](#15-tanstack-react-query)
16. [React Router](#16-react-router)
17. [Row Level Security (RLS)](#17-row-level-security-rls)
18. [How Auth Works End-to-End](#18-how-auth-works-end-to-end)
19. [How the Cart Works](#19-how-the-cart-works)
20. [How Admin Detection Works (No Flash)](#20-how-admin-detection-works-no-flash)
21. [Common Patterns in This Codebase](#21-common-patterns-in-this-codebase)

---

# Part 1 — What Was Built

## 1. Project Overview

**Earthly Trinkets** is a full-stack e-commerce web app for a handmade resin art business. It sells jewellery, paperweights, and home décor.

| | |
|---|---|
| **Business email** | business.earthlytrinkets@gmail.com |
| **Dev server** | `http://localhost:8080` |
| **Backend** | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| **Payments** | Razorpay (online) + Cash on Delivery |
| **Shipping** | Shiprocket + personal shipping |
| **Transactional email** | Resend API via Supabase Edge Functions |

---

## 2. Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                       USER'S BROWSER                           │
│                                                                │
│   React App  (Vite + TypeScript)                               │
│   ┌─────────┐  ┌───────────┐  ┌──────────┐  ┌─────────────┐  │
│   │  Pages  │  │Components │  │ Contexts │  │    Hooks    │  │
│   │(screens)│  │(reusable) │  │(global   │  │(data fetch) │  │
│   └────┬────┘  └─────┬─────┘  │  state)  │  └──────┬──────┘  │
│        └─────────────┴─────────┴──────────┴─────────┘         │
│                              │                                 │
└──────────────────────────────┼─────────────────────────────────┘
                               │  HTTPS (Supabase JS client)
                               ▼
┌────────────────────────────────────────────────────────────────┐
│                          SUPABASE                              │
│  ┌──────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  PostgreSQL  │  │   Auth   │  │ Storage  │  │  Edge    │  │
│  │  (RLS on     │  │ (Google  │  │ (product │  │Functions │  │
│  │  all tables) │  │ + email) │  │  images, │  │ (emails) │  │
│  │              │  │          │  │  avatars)│  │          │  │
│  └──────────────┘  └──────────┘  └──────────┘  └──────────┘  │
└────────────────────────────────────────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
        Razorpay (payments)          Resend (email delivery)
```

**Key principle:** There is no traditional backend server (no Node.js/Express API). The React app talks directly to Supabase using a client library. Security is enforced at the database level through Row Level Security (RLS) policies — so even if someone bypasses the frontend, they can only access what the database allows for their account.

---

## 3. File Structure

```
et-code/
├── src/
│   ├── App.tsx                      # Root — all routes + global providers
│   ├── main.tsx                     # Entry point, mounts App into the HTML
│   │
│   ├── pages/                       # One file per screen / URL
│   │   ├── Index.tsx                # Homepage  /
│   │   ├── Shop.tsx                 # Product listing  /shop
│   │   ├── ProductDetail.tsx        # Single product  /product/:slug
│   │   ├── Cart.tsx                 # Cart  /cart
│   │   ├── Profile.tsx              # Profile + orders + admin UI  /profile
│   │   ├── CustomOrders.tsx         # Custom order enquiry  /custom-orders
│   │   ├── Contact.tsx              # Contact page  /contact
│   │   ├── ResetPassword.tsx        # Password reset  /reset-password
│   │   ├── NotFound.tsx             # 404 page
│   │   ├── checkout/
│   │   │   ├── Address.tsx          # Step 1: pick address
│   │   │   ├── Payment.tsx          # Step 2: pay (Razorpay or COD)
│   │   │   └── Success.tsx          # Step 3: confirmation
│   │   └── admin/
│   │       ├── Products.tsx         # Admin: create/edit/delete products
│   │       └── Orders.tsx           # Admin: manage all orders
│   │
│   ├── components/                  # Reusable UI pieces
│   │   ├── Navbar.tsx               # Top navigation bar
│   │   ├── Footer.tsx               # Page footer
│   │   ├── ProductCard.tsx          # Product tile in grid
│   │   ├── AuthModal.tsx            # Sign in / sign up popup
│   │   ├── ProtectedRoute.tsx       # Redirects to login if not signed in
│   │   ├── AdminRoute.tsx           # Redirects if not admin
│   │   ├── SplashScreen.tsx         # Animated intro on first load
│   │   ├── BackToTop.tsx            # Floating scroll-to-top button
│   │   ├── GracefulImage.tsx        # Image with fallback if URL breaks
│   │   ├── HeroSection.tsx          # Homepage hero banner
│   │   └── ReviewSection.tsx        # Product reviews + star ratings
│   │
│   ├── contexts/                    # Global state shared across the whole app
│   │   ├── AuthContext.tsx          # Who is logged in
│   │   ├── CartContext.tsx          # Items in the cart
│   │   ├── ThemeContext.tsx         # Dark / light mode
│   │   └── CheckoutContext.tsx      # Selected address during checkout
│   │
│   ├── hooks/                       # Reusable data-fetching logic
│   │   ├── useIsAdmin.ts            # Is the current user an admin?
│   │   ├── useProducts.ts           # Fetch products from DB
│   │   └── useReviews.ts            # Fetch + submit reviews
│   │
│   ├── types/
│   │   └── product.ts               # TypeScript types for Product + Cart
│   │
│   └── integrations/supabase/
│       ├── client.ts                # Supabase JS client (reads env vars)
│       └── types.ts                 # Auto-generated DB types
│
├── supabase/
│   ├── scripts/                     # SQL to run once in Supabase SQL Editor
│   │   ├── 01_schema.sql            # ALL tables, functions, RLS policies
│   │   ├── 02_storage.sql           # Storage buckets + policies
│   │   └── 03_admin_setup.sql       # Grant admin role to a user
│   ├── functions/
│   │   └── send-order-email/        # Edge Function: sends all emails
│   └── emails/
│       ├── signup-confirm.html      # Custom signup email (paste into Supabase)
│       └── password-reset.html      # Custom password reset email
│
├── .env                             # Secret keys — NEVER commit this
├── IMPLEMENTATION.md                # This file
└── README.md                        # Basic project info
```

---

## 4. Features Implemented

### 4.1 Authentication

**Files:** [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx), [src/components/AuthModal.tsx](src/components/AuthModal.tsx)

- Google OAuth (one-click sign-in)
- Email + password sign-in and sign-up
- Password reset via email
- After Google sign-in, the user's name and avatar are automatically synced to the `profiles` table
- On sign-out, a flag is stored in localStorage so the next Google sign-in shows the account picker — allowing account switching after logout, but not interrupting an active session
- New Google OAuth users automatically receive a welcome email

---

### 4.2 Product Catalogue

**Files:** [src/pages/Shop.tsx](src/pages/Shop.tsx), [src/components/ProductCard.tsx](src/components/ProductCard.tsx), [src/pages/ProductDetail.tsx](src/pages/ProductDetail.tsx)

- Products loaded from Supabase, filterable by category
- Product cards: name, price, sale badge, "New" badge
- Product detail: full description, materials, care instructions, reviews
- Availability states:

| State | How it is set | What shoppers see |
|---|---|---|
| In Stock | `stock > 0`, `is_coming_soon = false` | Normal, Add to Cart enabled |
| Out of Stock | `stock = 0` (automatic after order) | Greyed out, "Out of Stock" overlay |
| Coming Soon | Admin checks "Coming Soon" | Greyed out, "Coming Soon" overlay |
| Inactive | Admin unchecks "Active" | Hidden from shop entirely |

---

### 4.3 Admin Panel

**Files:** [src/pages/admin/Products.tsx](src/pages/admin/Products.tsx), [src/pages/admin/Orders.tsx](src/pages/admin/Orders.tsx)

**Products:**
- Create, edit, delete products
- Upload multiple images → stored in Supabase Storage, served via CDN
- Fields: name, slug, price, compare-at price, category, stock, materials, care instructions, tags, descriptions
- Toggles: Active, Featured, New, Coming Soon
- Table shows "Coming Soon" (blue) or "Out of Stock" (red) badges next to stock count

**Orders:**
- View all orders with customer names and totals
- Update order status: Pending → Confirmed → Processing → Shipped → Out for Delivery → Delivered
- Moving back to a pre-shipping status (pending/confirmed/processing) automatically clears AWB and shipping data
- Assign AWB/tracking number (personal shipping or Shiprocket)
- Update AWB even after it has been set, to correct mistakes
- Every status change triggers a branded email to the customer

---

### 4.4 Admin Role Detection — No Flash

**File:** [src/hooks/useIsAdmin.ts](src/hooks/useIsAdmin.ts)

On page load the app briefly doesn't know if the user is admin — auth resolution takes ~200ms. Without a fix, the wrong menu flashes before the correct one appears.

**Solution:** Cache the admin status in `localStorage` keyed by user ID. On first render, this cache is read synchronously (zero network delay), so the correct UI shows immediately. The DB is queried in the background to verify and refresh the cache for next time.

---

### 4.5 Shopping Cart

**File:** [src/contexts/CartContext.tsx](src/contexts/CartContext.tsx)

- In-memory cart (React state — resets on page refresh)
- Add, remove, update quantity
- Enforces stock limit (can't add more than available stock)
- Hidden entirely from admin users
- Admin navbar shows "Shop (View Only)"

---

### 4.6 Checkout Flow

**Files:** [src/pages/checkout/](src/pages/checkout/)

```
Cart → Step 1: Pick Address → Step 2: Pay → Step 3: Success
```

- **Step 1:** Select a saved address or add a new one
- **Step 2:** Razorpay (opens payment modal) or Cash on Delivery. After confirmed payment, stock is decremented atomically using a PostgreSQL stored procedure with a row lock — preventing two simultaneous orders from both succeeding on the last unit
- **Step 3:** Shows order confirmation, clears cart

---

### 4.7 Order Tracking (User Side)

**File:** [src/pages/Profile.tsx](src/pages/Profile.tsx)

- Users see all their orders under "My Orders" in their profile
- Each order expands to show:
  - **Delivery progress bar:** 6-step dot tracker (Ordered → Confirmed → Processing → Shipped → On the Way → Delivered) with animated fill line. Current step pulses; completed steps show a checkmark
  - Items ordered with images and prices
  - Price summary with discount applied
  - Delivery address snapshot
  - AWB/tracking number (if assigned)
- Cancelled or refunded orders show a coloured status banner instead of the progress bar

---

### 4.8 Transactional Emails

**File:** [supabase/functions/send-order-email/index.ts](supabase/functions/send-order-email/index.ts)

Branded HTML emails sent via **Resend** API through a Supabase Edge Function.

| Trigger | Email sent |
|---|---|
| New Google OAuth user | Welcome email |
| Order placed | Order confirmation (customer) + notification (admin) |
| Status → `confirmed` | Order confirmed |
| Status → `shipped` | Shipped with AWB number |
| Status → `out_for_delivery` | Out for delivery (COD reminder if applicable) |
| Status → `delivered` | Delivered + 5-star review request |

Auth emails (signup confirm, password reset) are custom branded HTML templates in [supabase/emails/](supabase/emails/) — paste into Supabase Dashboard → Auth → Email Templates.

---

### 4.9 Reviews

**File:** [src/components/ReviewSection.tsx](src/components/ReviewSection.tsx)

- Signed-in users can leave a 1–5 star rating with an optional comment
- One review per user per product (enforced by a DB unique constraint)
- **Verified Buyer** badge shown if the user has a confirmed+ order containing that product
- Product `rating` and `review_count` auto-update via a PostgreSQL trigger — no manual sync needed

---

### 4.10 Coupon System

Stored in the `coupons` table. Supports:
- **Percentage** (e.g. 10% off) or **Flat** (e.g. ₹100 off) discounts
- Minimum order value, maximum uses cap, expiry date
- Active/inactive toggle

Applied at checkout. Discount amount and code are stored with the order.

---

### 4.11 Dark / Light Theme

**File:** [src/contexts/ThemeContext.tsx](src/contexts/ThemeContext.tsx)

Toggled via the moon/sun icon in the navbar. Preference saved to `localStorage`. Implemented via a `dark` class on the `<html>` element — Tailwind's `dark:` variants handle all colour changes automatically.

---

### 4.12 Splash Screen

**File:** [src/components/SplashScreen.tsx](src/components/SplashScreen.tsx)

Animated intro on first page load using Framer Motion. Dismisses automatically, then the main app fades in.

---

## 5. Database Schema

All tables live in Supabase. Run [supabase/scripts/01_schema.sql](supabase/scripts/01_schema.sql) to create everything.

```
categories ──< products >── order_items >── orders ──< profiles
                  │                                        │
                  └──────────── reviews ───────────────────┘

coupons        (standalone — code referenced by orders)
custom_orders  (standalone — customer enquiry submissions)
user_roles     (user_id + role: 'admin' | 'user')
addresses      (user delivery addresses)
```

**Products — key columns:**

| Column | Type | Purpose |
|---|---|---|
| `slug` | text unique | URL-friendly ID e.g. `lavender-ring` |
| `stock` | integer | Current inventory; auto-decrements on order |
| `is_active` | boolean | If false, hidden from shop |
| `is_featured` | boolean | Shown on homepage carousel |
| `is_new` | boolean | Shows "New" badge |
| `is_coming_soon` | boolean | Greyed out, not purchasable |
| `rating` | numeric | Auto-maintained by reviews trigger |
| `review_count` | integer | Auto-maintained by reviews trigger |

**Orders — status lifecycle:**

```
pending → confirmed → processing → shipped → out_for_delivery → delivered
                                                              ↘ cancelled
                                                              ↘ refunded
```

**Key DB functions:**

| Function | What it does |
|---|---|
| `decrement_product_stock(id, qty)` | Atomically decrements stock with a row lock |
| `sync_product_rating()` | Trigger: keeps rating + review_count updated |
| `get_verified_buyers(product_id)` | Returns user IDs who bought a product |
| `has_role(user_id, role)` | Checks role (used in all RLS policies) |

---

## 6. Setup Guide — Fresh Install

### Prerequisites

- **Node.js** v18+ — [https://nodejs.org](https://nodejs.org) (download LTS)
- **Git** — [https://git-scm.com](https://git-scm.com)
- **VS Code** (recommended) — [https://code.visualstudio.com](https://code.visualstudio.com)

### Step 1 — Clone and install

```bash
git clone <your-git-url> et-code
cd et-code
npm install
```

`npm install` reads `package.json` and downloads all dependencies into `node_modules/`. Takes about a minute on first run.

### Step 2 — Create a Supabase project

1. Go to [https://supabase.com](https://supabase.com) → sign up (free tier is sufficient)
2. Click **New project**, choose a name and a region close to India
3. Wait ~2 minutes for it to provision
4. Go to **Project Settings → API** and copy:
   - **Project URL** (looks like `https://abcxyz.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

### Step 3 — Create `.env`

Create a file named `.env` in the project root (same folder as `package.json`):

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key...
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx
```

> Never commit `.env` to Git. It is already listed in `.gitignore`.

### Step 4 — Run the SQL scripts

In Supabase Dashboard → **SQL Editor → New query**:

1. Open [supabase/scripts/01_schema.sql](supabase/scripts/01_schema.sql) → copy all → paste → **Run**
2. Open [supabase/scripts/02_storage.sql](supabase/scripts/02_storage.sql) → copy all → paste → **Run**

### Step 5 — Set up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com) → create a new project
2. APIs & Services → **OAuth consent screen** → fill in app name and support email
3. APIs & Services → **Credentials → Create OAuth Client ID** → type: Web application
4. Add Authorised redirect URI: `https://your-project-id.supabase.co/auth/v1/callback`
5. Copy **Client ID** and **Client Secret**
6. In Supabase → **Authentication → Providers → Google** → paste both → Save

Also in Supabase → **Authentication → URL Configuration → Redirect URLs**, add:
- `http://localhost:8080`
- Your production domain (when you deploy)

### Step 6 — Grant yourself admin access

1. Run `npm run dev` → open `http://localhost:8080` → sign in with your account
2. In Supabase → **SQL Editor**, run: `SELECT id, email FROM auth.users;`
3. Copy your UUID from the result
4. Open [supabase/scripts/03_admin_setup.sql](supabase/scripts/03_admin_setup.sql), replace `<your-user-uuid>`, run it
5. Hard-refresh the browser (Cmd+Shift+R on Mac) — the admin menu should appear

### Step 7 — Set up transactional emails (optional)

1. Sign up at [https://resend.com](https://resend.com) (free: 100 emails/day)
2. Get an API key
3. In Supabase → **Edge Functions** → `send-order-email` → **Secrets**:
   - Add `RESEND_API_KEY` = your key
4. Deploy: `npx supabase functions deploy send-order-email`

### Step 8 — Customise auth email templates (optional)

In Supabase → **Authentication → Email Templates**:
- **Confirm signup** → paste contents of [supabase/emails/signup-confirm.html](supabase/emails/signup-confirm.html)
- **Reset password** → paste contents of [supabase/emails/password-reset.html](supabase/emails/password-reset.html)

### Step 9 — Start the dev server

```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080). You're running.

---

## 7. Environment Variables

| Variable | Where to get it | Required? |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon key | Yes |
| `VITE_RAZORPAY_KEY_ID` | Razorpay Dashboard → API Keys | For payments |

> Variables must start with `VITE_` to be accessible in the React app. This is a Vite requirement — it prevents accidentally exposing server-only secrets to the browser.

> The anon key is **designed to be public**. Security comes from RLS policies at the database level, not from hiding this key.

---

## 8. Planned Next Steps

| Feature | Notes |
|---|---|
| Deploy to Vercel | `npm run build` → push to GitHub → connect Vercel |
| Persist cart to localStorage | So cart survives page refresh |
| Shiprocket auto-booking | Call Shiprocket API directly from admin |
| Razorpay webhook | Server-side payment confirmation (more reliable) |
| Product search | Full-text search using Supabase `tsquery` |
| Admin coupon manager | UI to create/edit/deactivate coupons |
| Order PDF invoices | Auto-generated on delivery |
| Docker + Kubernetes | For scale — Azure Container Apps recommended |
| SonarCloud | Free code quality scanning for public repos |

---

---

# Part 2 — Concepts & Tutorials

---

## 9. What is React?

React is a JavaScript library for building user interfaces. The old way of building websites was to manually update the HTML whenever data changed — find the element, change its text, update a class. React flips this: you describe **what the UI should look like for any given data**, and React figures out what to update automatically.

### Components — the building block

Everything in React is a **component** — a JavaScript function that returns HTML-like markup called JSX.

```tsx
// A simple component — takes a prop, returns JSX
const Greeting = ({ name }: { name: string }) => {
  return <h1>Hello, {name}!</h1>;
};

// Use it like an HTML tag
const App = () => {
  return (
    <div>
      <Greeting name="Soumav" />
      <Greeting name="Earthly Trinkets" />
    </div>
  );
};
// Renders: <h1>Hello, Soumav!</h1>  <h1>Hello, Earthly Trinkets!</h1>
```

`{ name }` is a **prop** (short for property) — how you pass data into a component. The `: { name: string }` is TypeScript saying "name must be a string".

### State — making things dynamic

`useState` lets a component remember a value. When state changes, React re-renders the component automatically.

```tsx
import { useState } from "react";

const Counter = () => {
  const [count, setCount] = useState(0); // initial value = 0

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>Click me</button>
    </div>
  );
};
```

`count` is the current value. `setCount` is the only way to change it — you never mutate `count` directly.

### useEffect — running code after render

`useEffect` runs code after the component appears on screen. It is used for fetching data, setting up timers, or anything with side effects.

```tsx
useEffect(() => {
  // Runs once when the component first appears
  fetchProducts();
}, []); // ← empty array = "run only once"

useEffect(() => {
  // Runs every time userId changes
  fetchOrdersForUser(userId);
}, [userId]); // ← dependency array
```

**In this project:** Every page is a component. Navbar, ProductCard, DeliveryProgress — all components, nested inside each other like building blocks.

---

## 10. What is TypeScript?

TypeScript is JavaScript with **types** added. Types describe what kind of value a variable holds, catching bugs before the code runs.

```ts
// Plain JavaScript — crashes at runtime
function greet(name) {
  return "Hello " + name.toUpperCase();
}
greet(42); // 💥 "name.toUpperCase is not a function"

// TypeScript — error caught immediately in your editor
function greet(name: string): string {
  return "Hello " + name.toUpperCase();
}
greet(42); // ❌ TypeScript: Argument of type 'number' is not assignable to 'string'
```

### Interfaces — describing the shape of data

```ts
// Describes exactly what a Product object must contain
interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  is_coming_soon: boolean;
  images: string[];                    // array of strings
  categories: { name: string } | null; // object or null
}

const p: Product = { ... };
p.colour;  // ❌ Error: Property 'colour' does not exist on type 'Product'
p.name;    // ✅ Fine — and VS Code autocompletes it
```

**In this project:** All data types are in [src/types/product.ts](src/types/product.ts). VS Code uses them to autocomplete field names and catch typos before you even run the app.

---

## 11. What is Vite?

Vite is the **build tool** — it takes your TypeScript + React code and turns it into plain HTML/CSS/JavaScript that a browser understands.

```bash
npm run dev    # Starts a local server at http://localhost:8080
               # Changes appear instantly — no page reload needed

npm run build  # Creates an optimised production bundle in /dist/
               # This is what you deploy to Vercel or Netlify
```

You don't interact with Vite much — it runs in the background and just works.

---

## 12. What is Tailwind CSS?

Tailwind is a CSS framework where you style elements by adding utility class names directly in your JSX, instead of writing separate `.css` files.

```tsx
// Traditional CSS — two files, lots of context-switching
// button.css: .my-btn { border-radius: 999px; background: green; ... }
// Component:  <button className="my-btn">Click</button>

// Tailwind — everything inline and readable
<button className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-90 dark:bg-green-700">
  Click
</button>
```

Class names are self-explanatory:

| Class | Effect |
|---|---|
| `rounded-full` | Fully rounded corners (pill shape) |
| `bg-primary` | Background = primary brand colour |
| `px-5 py-2` | Padding: 5 units horizontal, 2 vertical |
| `text-sm` | Small font size |
| `hover:opacity-90` | 90% opacity on mouse hover |
| `dark:bg-gray-800` | Different background in dark mode |
| `md:flex` | `display: flex` only on screens ≥ 768px |
| `lg:px-8` | Larger padding on screens ≥ 1024px |

The `dark:`, `md:`, `lg:` prefixes are called **variants** — they apply a style only under specific conditions.

---

## 13. What is Supabase?

Supabase is a Backend-as-a-Service. It gives you a complete backend without writing any server code:

| Feature | What you get |
|---|---|
| **PostgreSQL** | A real relational database |
| **Auth** | Google OAuth, email/password, magic links |
| **Storage** | File uploads with a CDN (for product images) |
| **Edge Functions** | Serverless code (used to send emails) |

You interact with it from React using the Supabase JS client:

```ts
import { supabase } from "@/integrations/supabase/client";

// READ: fetch active products, join with categories
const { data, error } = await supabase
  .from("products")
  .select("*, categories(name, slug)")
  .eq("is_active", true)
  .order("created_at", { ascending: false });

// WRITE: insert a new order
const { data, error } = await supabase
  .from("orders")
  .insert({ user_id: user.id, total: 1299, status: "confirmed" })
  .select("id")
  .single();

// UPDATE: change an order's status
await supabase
  .from("orders")
  .update({ status: "shipped", shiprocket_awb: "123456" })
  .eq("id", orderId);
```

This is SQL — but written in JavaScript, with no server in between. Supabase handles the connection, security, and everything else.

---

## 14. React Context API

**The problem — prop drilling:**

If 10 components all need to know who's logged in, you'd have to pass `user` as a prop through every component in between, even ones that don't use it. This is called prop drilling and gets messy fast.

```tsx
// Without Context — messy
<App user={user}>
  <Layout user={user}>
    <Navbar user={user}>
      <UserMenu user={user} />  ← finally uses it
    </Navbar>
  </Layout>
</App>
```

**Context solves this** — it creates a global broadcast channel that any component can subscribe to directly.

```tsx
// 1. Create a context
const AuthContext = createContext(null);

// 2. Provider: holds the value and wraps the app
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  return (
    <AuthContext.Provider value={{ user, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. Any component accesses it directly — no prop drilling
const Navbar = () => {
  const { user } = useContext(AuthContext);
  return <div>{user?.email ?? "Not signed in"}</div>;
};
```

**The 4 contexts in this project:**

| Context | Provides | Used by |
|---|---|---|
| `AuthContext` | `user`, `loading`, `signOut` | Nearly everything |
| `CartContext` | `items`, `addToCart`, `removeFromCart`, `totalItems` | Navbar, Cart, ProductCard, Checkout |
| `ThemeContext` | `theme`, `toggleTheme` | Navbar toggle button |
| `CheckoutContext` | `selectedAddress`, `setSelectedAddress` | Address and Payment pages |

All four wrap the entire app in [src/App.tsx](src/App.tsx).

---

## 15. TanStack React Query

Plain `useEffect` + `useState` for data fetching requires lots of boilerplate: loading state, error state, caching, re-fetching. React Query handles all of it.

```tsx
// Without React Query — write all this yourself
const [products, setProducts] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
useEffect(() => {
  setLoading(true);
  fetchProducts()
    .then(data => { setProducts(data); setLoading(false); })
    .catch(err => { setError(err); setLoading(false); });
}, []);

// With React Query — clean and automatic
const { data: products = [], isLoading, error } = useQuery({
  queryKey: ["products"],    // cache identifier
  queryFn: async () => {
    const { data } = await supabase.from("products").select("*");
    return data;
  },
});
```

React Query automatically caches results. Two components using `queryKey: ["products"]` share one request. It also refetches in the background when the user returns to the tab.

**Writing data with `useMutation`:**

```tsx
const updateStatus = useMutation({
  mutationFn: async (newStatus: string) => {
    const { error } = await supabase
      .from("orders").update({ status: newStatus }).eq("id", orderId);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["orders"] }); // re-fetch
    toast.success("Updated!");
  },
  onError: () => toast.error("Failed"),
});

<button onClick={() => updateStatus.mutate("shipped")}>Mark Shipped</button>
```

`invalidateQueries` marks cached data as stale, triggering a re-fetch to keep the UI in sync.

---

## 16. React Router

React Router enables navigation between pages without the browser loading a new HTML file each time. This is a **Single Page Application (SPA)**.

```tsx
// Defined in App.tsx
<Routes>
  <Route path="/"              element={<Index />} />
  <Route path="/shop"          element={<Shop />} />
  <Route path="/product/:slug" element={<ProductDetail />} />
  {/* :slug is a URL variable — e.g. /product/lavender-ring */}

  {/* Redirects to login if not signed in */}
  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

  {/* Redirects if not admin */}
  <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
</Routes>
```

```tsx
// Navigate programmatically
const navigate = useNavigate();
navigate("/checkout/payment");

// Read the :slug from the URL
const { slug } = useParams();
// On /product/lavender-ring → slug = "lavender-ring"

// Link (doesn't reload the page, unlike <a href>)
<Link to="/shop">Browse Shop</Link>
```

**Protected and Admin routes** are just wrapper components that check auth status and redirect if the condition isn't met.

---

## 17. Row Level Security (RLS)

RLS is a PostgreSQL feature that enforces access rules at the database level. Even if someone gets your Supabase URL and anon key and calls the API directly, they can only access what the policies allow.

```sql
-- Users can only read their own orders
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
  --     ^^^^^^^^^
  --     Supabase injects the logged-in user's ID automatically

-- Admins can read and write everything
CREATE POLICY "Admins can manage orders"
  ON public.orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
```

When your React code calls `supabase.from("orders").select("*")`, Supabase applies these conditions silently. A regular user gets only their rows. An admin gets all rows.

All policies are in [supabase/scripts/01_schema.sql](supabase/scripts/01_schema.sql).

---

## 18. How Auth Works End-to-End

Full flow for Google sign-in:

```
1. User clicks "Sign in with Google"
   └─ supabase.auth.signInWithOAuth({ provider: "google" })

2. Browser redirects to Google's login page

3. User approves → Google redirects back with an auth code

4. Supabase exchanges the code for a session JWT
   and stores it in localStorage

5. AuthContext's onAuthStateChange fires
   └─ sets user state in React

6. All components using useAuth() re-render

7. Future API calls automatically include the JWT
   └─ Supabase RLS uses auth.uid() from this token

8. After 1 hour the JWT expires
   └─ Supabase silently refreshes it in the background
```

A **JWT (JSON Web Token)** is a signed piece of data proving who you are. It contains your user ID, email, and expiry time — signed by Supabase's private key so it can't be forged. You don't need to understand the cryptography; Supabase handles it entirely.

---

## 19. How the Cart Works

The cart lives in `CartContext` as a plain React array, never persisted to a database.

```
Add item → CartContext.addToCart(product)
  ├─ If product already in cart: increase quantity (capped at stock limit)
  └─ If new: append { product, quantity: 1 } to the array

Remove → filter the item out of the array

Total items → items.reduce((sum, item) => sum + item.quantity, 0)
```

Because it's just React state, it resets on page refresh. For a future improvement, it could be persisted to `localStorage` so the cart survives a refresh.

---

## 20. How Admin Detection Works (No Flash)

**The problem:** On page load, auth takes ~200ms to resolve. Without a fix, the wrong nav items briefly flash before the correct ones appear.

**The solution — synchronous localStorage cache:**

```
Page load (synchronous, instant):
├─ useState initializer reads "et_current_uid" from localStorage
├─ Reads "et_admin_<uid>" from localStorage  →  "true"
└─ Sets isAdmin = true, roleChecked = true
   └─ Correct UI rendered on the very first paint ✓

~200ms later (async):
├─ Supabase resolves the session → user = { id: "<uid>", ... }
├─ useEffect fires (loading is now false)
├─ Checks: if still loading → skip (don't flash!)
├─ Queries DB to confirm admin status
└─ Updates localStorage cache for next visit
```

The `if (loading) return;` guard is critical — without it, the effect fires during auth loading with `user = null`, clears the cache, and causes the flash.

---

## 21. Common Patterns in This Codebase

### Conditional rendering based on role

```tsx
// Show cart only to non-admin users
{!(roleChecked && isAdmin) && (
  <Link to="/cart"><ShoppingBag /></Link>
)}

// Different sidebar items per role
{(isAdmin ? adminNavItems : userNavItems).map(item => (
  <NavItem key={item.id} {...item} />
))}
```

The `roleChecked && isAdmin` pattern ensures nothing is hidden until we actually know the role.

### Animated expand / collapse

```tsx
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden"
    >
      {/* content */}
    </motion.div>
  )}
</AnimatePresence>
```

`AnimatePresence` is needed to play the `exit` animation before the element is removed from the DOM.

### Generic form state setter

```tsx
const [form, setForm] = useState({ name: "", price: "", is_active: true });

// One setter works for every field
const set = (key: keyof typeof form, value: unknown) =>
  setForm(prev => ({ ...prev, [key]: value }));

<Input onChange={(e) => set("name", e.target.value)} />
<input type="checkbox" onChange={(e) => set("is_active", e.target.checked)} />
```

### Mutate → invalidate → toast

```tsx
const save = useMutation({
  mutationFn: async (data) => {
    const { error } = await supabase.from("products").insert(data);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    toast.success("Product saved!");
    onClose();
  },
  onError: (e: Error) => toast.error(e.message),
});

<Button onClick={() => save.mutate(formData)} disabled={save.isPending}>
  {save.isPending ? "Saving…" : "Save"}
</Button>
```

### Calling a PostgreSQL stored procedure (RPC)

```tsx
// Runs decrement_product_stock(p_product_id, p_quantity) in the DB
const { data: success } = await (supabase as any).rpc("decrement_product_stock", {
  p_product_id: product.id,
  p_quantity: quantity,
});
// Returns true if stock was sufficient, false otherwise
```

RPC runs a custom PostgreSQL function server-side. Used here because the function uses a `FOR UPDATE` row lock to prevent race conditions — something a plain client-side `update()` call cannot do safely.

---

*Last updated: March 2026*
