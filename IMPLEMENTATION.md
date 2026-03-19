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
6. [Razorpay Integration](#6-razorpay-integration)
7. [Shiprocket Integration](#7-shiprocket-integration)
8. [Transactional Emails](#8-transactional-emails)
9. [Setup Guide — Fresh Install](#9-setup-guide--fresh-install)
10. [Environment Variables](#10-environment-variables)
11. [Deployment (Vercel)](#11-deployment-vercel)
12. [Planned Next Steps](#12-planned-next-steps)

**Part 2 — Concepts & Tutorials**
13. [What is React?](#13-what-is-react)
14. [What is TypeScript?](#14-what-is-typescript)
15. [What is Vite?](#15-what-is-vite)
16. [What is Tailwind CSS?](#16-what-is-tailwind-css)
17. [What is Supabase?](#17-what-is-supabase)
18. [React Context API](#18-react-context-api)
19. [TanStack React Query](#19-tanstack-react-query)
20. [React Router](#20-react-router)
21. [Row Level Security (RLS)](#21-row-level-security-rls)
22. [How Auth Works End-to-End](#22-how-auth-works-end-to-end)
23. [How the Cart Works](#23-how-the-cart-works)
24. [How Admin Detection Works (No Flash)](#24-how-admin-detection-works-no-flash)
25. [Common Patterns in This Codebase](#25-common-patterns-in-this-codebase)

---

# Part 1 — What Was Built

## 1. Project Overview

**Earthly Trinkets** is a full-stack e-commerce web app for a handmade resin art business. It sells jewellery, paperweights, and home décor.

| | |
|---|---|
| **Business email** | business.earthlytrinkets@gmail.com |
| **Dev server** | `vercel dev` → `http://localhost:3000` (needed for API routes) |
| **Backend** | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| **API Functions** | Vercel Serverless Functions (`/api/` folder) |
| **Payments** | Razorpay (online) + Cash on Delivery |
| **Shipping** | Shiprocket + personal shipping |
| **Transactional email** | Resend API via Supabase Edge Functions |
| **Production URL** | `https://earthlytrinkets.in` |

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
                               │  HTTPS
                    ┌──────────┴──────────┐
                    ▼                     ▼
    ┌──────────────────────┐  ┌─────────────────────┐
    │   Vercel Serverless  │  │      SUPABASE        │
    │   /api/create-order  │  │  ┌────────────────┐  │
    │   /api/verify-payment│  │  │  PostgreSQL     │  │
    │   (Razorpay backend) │  │  │  (RLS on all)   │  │
    └──────────┬───────────┘  │  ├────────────────┤  │
               │              │  │  Auth (Google   │  │
               │              │  │  + email/pwd)   │  │
               │              │  ├────────────────┤  │
               │              │  │  Storage (CDN)  │  │
               │              │  ├────────────────┤  │
               │              │  │  Edge Functions │  │
               │              │  │  (emails,       │  │
               │              │  │   shiprocket)   │  │
               │              │  └────────────────┘  │
               │              └─────────────────────┘
               │                        │
      ┌────────┴────┐         ┌─────────┴─────────┐
      ▼             ▼         ▼                   ▼
  Razorpay      Supabase   Resend          Shiprocket
 (payments)      (DB)     (emails)         (shipping)
```

**Key principle:** The React app talks directly to Supabase using its client library. Security is enforced at the database level through Row Level Security (RLS) policies. Razorpay payment verification runs through Vercel serverless functions (server-side only — the Razorpay secret key never reaches the browser).

---

## 3. File Structure

```
et-code/
├── api/                               # Vercel serverless functions
│   ├── create-order.js                # Creates Razorpay order (amount → order_id)
│   └── verify-payment.js             # Verifies Razorpay signature + saves order to DB
│
├── src/
│   ├── App.tsx                        # Root — all routes + global providers + splash
│   ├── main.tsx                       # Entry point, mounts App into the HTML
│   │
│   ├── pages/                         # One file per screen / URL
│   │   ├── Index.tsx                  # Homepage  /
│   │   ├── Shop.tsx                   # Product listing  /shop
│   │   ├── ProductDetail.tsx          # Single product  /product/:slug
│   │   ├── Cart.tsx                   # Cart  /cart
│   │   ├── Profile.tsx               # Profile + orders + admin UI  /profile
│   │   ├── CustomOrders.tsx          # Custom order enquiry  /custom-orders
│   │   ├── Contact.tsx               # Contact page  /contact
│   │   ├── ResetPassword.tsx         # Password reset  /reset-password
│   │   ├── NotFound.tsx              # 404 page
│   │   ├── checkout/
│   │   │   ├── Address.tsx           # Step 1: pick address
│   │   │   ├── Payment.tsx           # Step 2: pay (Razorpay or COD)
│   │   │   └── Success.tsx           # Step 3: confirmation
│   │   └── admin/
│   │       ├── Products.tsx          # Admin: create/edit/delete products + drag reorder
│   │       └── Orders.tsx            # Admin: manage all orders + Shiprocket
│   │
│   ├── components/                    # Reusable UI pieces
│   │   ├── Navbar.tsx                # Sticky top nav, theme toggle, user menu, cart icon
│   │   ├── Footer.tsx                # Page footer
│   │   ├── ProductCard.tsx           # Product tile in grid (badges, price, image)
│   │   ├── AuthModal.tsx             # Sign in / sign up popup
│   │   ├── ProtectedRoute.tsx        # Redirects to login if not signed in
│   │   ├── AdminRoute.tsx            # Redirects if not admin
│   │   ├── SplashScreen.tsx          # Animated intro on first load (2.2s)
│   │   ├── BackToTop.tsx             # Floating scroll-to-top button (near page bottom)
│   │   ├── GracefulImage.tsx         # Image with skeleton loader + fade-in fallback
│   │   ├── HeroSection.tsx           # Homepage hero banner
│   │   ├── FeaturedProducts.tsx      # Homepage featured product grid
│   │   ├── CategorySection.tsx       # Homepage category cards
│   │   ├── TestimonialSection.tsx    # Homepage testimonials
│   │   ├── NewsletterSection.tsx     # Homepage email signup
│   │   ├── ReviewSection.tsx         # Product reviews + star ratings + verified badge
│   │   └── ui/                       # shadcn/ui components (60+ components)
│   │
│   ├── contexts/                      # Global state shared across the whole app
│   │   ├── AuthContext.tsx           # Who is logged in + Google OAuth
│   │   ├── CartContext.tsx           # Items in the cart (persisted to localStorage)
│   │   ├── ThemeContext.tsx          # Dark / light mode
│   │   └── CheckoutContext.tsx       # Selected address + coupon during checkout
│   │
│   ├── hooks/                         # Reusable data-fetching logic
│   │   ├── useIsAdmin.ts             # Is the current user an admin? (cached)
│   │   ├── useProducts.ts            # useProducts, useFeaturedProducts, useProduct, useAllProducts, useCategories
│   │   ├── useReviews.ts             # useReviews, useMyReview, useSubmitReview, useDeleteReview
│   │   ├── use-mobile.tsx            # Detect mobile viewport (<768px)
│   │   └── use-toast.ts              # shadcn toast API
│   │
│   ├── types/
│   │   └── product.ts                # Product + CartProduct interfaces
│   │
│   ├── lib/
│   │   └── utils.ts                  # cn() — Tailwind class merge utility
│   │
│   └── integrations/supabase/
│       ├── client.ts                 # Supabase JS client (reads VITE_ env vars)
│       └── types.ts                  # Auto-generated DB types
│
├── supabase/
│   ├── config.toml                    # Supabase CLI config
│   ├── scripts/                       # SQL to run in Supabase SQL Editor
│   │   ├── 00_prerequisites.sql      # Base auth layer (skip if migration applied)
│   │   ├── 01_schema.sql             # ALL tables, functions, RLS policies
│   │   ├── 02_storage.sql            # Storage buckets + policies
│   │   ├── 03_admin_setup.sql        # Grant admin role to a user
│   │   └── 04_test_user.sql          # Optional test data
│   ├── functions/
│   │   ├── send-order-email/         # Edge Function: sends all transactional emails
│   │   │   └── index.ts
│   │   └── shiprocket/               # Edge Function: CORS proxy for Shiprocket API
│   │       └── index.ts
│   └── emails/
│       ├── signup-confirm.html       # Custom signup email (paste into Supabase)
│       └── password-reset.html       # Custom password reset email
│
├── .env                               # Secret keys — NEVER commit this
├── vercel.json                        # Vercel routing (API + SPA fallback)
├── vite.config.ts                     # Vite config (port 8080)
├── tailwind.config.ts                 # Tailwind theme + custom colours
├── IMPLEMENTATION.md                  # This file
└── README.md                          # Basic project info
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
- **Display order:** Products appear in the same order as arranged in the admin panel (`display_order` column). Featured products also respect this ordering.
- Product cards: name, price, sale badge, "New" badge
- Product detail page includes:
  - **Image gallery** with prev/next buttons, thumbnail strip (4 visible at a time with scroll arrows), dot indicators
  - Full description, materials, care instructions
  - Reviews section with star ratings
  - Quantity selector with "Proceed to Checkout" button (appears after adding to cart)
- Availability states:

| State | How it is set | What shoppers see |
|---|---|---|
| In Stock | `stock > 0`, `is_coming_soon = false` | Normal, Add to Cart enabled |
| Out of Stock | `stock = 0` (automatic after order) | Greyed out, "Out of Stock" overlay |
| Coming Soon | Admin checks "Coming Soon" | Greyed out, "Coming Soon" overlay |
| Inactive | Admin unchecks "Active" | Hidden from shop entirely |

**Stock freshness:** Product queries use `staleTime: 0` and `refetchOnMount: "always"` so stock updates from admin are reflected immediately on refresh.

---

### 4.3 Admin Panel

**Files:** [src/pages/admin/Products.tsx](src/pages/admin/Products.tsx), [src/pages/admin/Orders.tsx](src/pages/admin/Orders.tsx)

**Products:**
- Create, edit, delete products
- Upload multiple images → stored in Supabase Storage (`product-images` bucket), served via CDN
  - File size limit: 10MB per file
  - Supported formats: jpeg, jpg, png, webp, gif
  - URL format: `${SUPABASE_URL}/storage/v1/object/public/product-images/${filename}` (constructed manually to avoid `getPublicUrl()` format issues)
- Fields: name, slug (auto-generated from name), price, compare-at price, category, stock, materials (comma-separated → stored as TEXT[]), care instructions, tags, descriptions
- Toggles: Active, Featured, New, Coming Soon
- Table shows "Coming Soon" (blue) or "Out of Stock" (red) badges next to stock count
- **Drag-to-reorder** featured products using `@dnd-kit` library (updates `display_order` column — reflected in Shop page and Homepage)

**Orders:**
- View all orders with customer names and totals
- Update order status: Pending → Confirmed → Processing → Shipped → Out for Delivery → Delivered
- Moving back to a pre-shipping status (pending/confirmed/processing) automatically clears AWB and shipping data
- Assign AWB/tracking number:
  - **Personal shipping:** Admin enters AWB manually
  - **Shiprocket:** Admin logs in via Shiprocket Edge Function, creates order, Shiprocket generates AWB
- Update AWB even after it has been set, to correct mistakes
- Every status change triggers a branded email to the customer

---

### 4.4 Admin Role Detection — No Flash

**File:** [src/hooks/useIsAdmin.ts](src/hooks/useIsAdmin.ts)

On page load the app briefly doesn't know if the user is admin — auth resolution takes ~200ms. Without a fix, the wrong menu flashes before the correct one appears.

**Solution:** Cache the admin status in `localStorage` keyed by user ID (`et_admin_{uid}` + `et_current_uid`). On first render, this cache is read synchronously (zero network delay), so the correct UI shows immediately. The DB is queried in the background to verify and refresh the cache for next time.

---

### 4.5 Shopping Cart

**File:** [src/contexts/CartContext.tsx](src/contexts/CartContext.tsx)

- Cart persisted to `localStorage` (key: `et_cart`) — survives page refresh
- Add, remove, update quantity
- Enforces stock limit (can't add more than available stock)
- Hidden entirely from admin users
- Admin navbar shows "Shop (View Only)"
- **Product links in cart:** Both the product image and name are clickable links to the product detail page (`/product/:slug`)

---

### 4.6 Checkout Flow

**Files:** [src/pages/checkout/](src/pages/checkout/), [src/contexts/CheckoutContext.tsx](src/contexts/CheckoutContext.tsx)

```
Cart → Step 1: Pick Address → Step 2: Pay → Step 3: Success
```

- **Step 1:** Select a saved address or add a new one
- **Step 2:** Razorpay (opens payment modal) or Cash on Delivery
  - After confirmed payment, stock is decremented atomically using a PostgreSQL stored procedure (`decrement_product_stock`) with a row lock — preventing two simultaneous orders from both succeeding on the last unit
- **Step 3:** Shows order confirmation with clickable product links, clears cart

**Checkout Context** uses `sessionStorage` (key: `et_checkout`) to persist the selected address and applied coupon across page navigations during checkout. Cleared on successful order.

**Product page shortcut:** After adding a product and selecting quantity on the product detail page, a "Proceed to Checkout" button appears next to the quantity controls — users can go straight to checkout without visiting the cart page.

---

### 4.7 Coupon System

**Table:** `coupons` in Supabase

Supports:
- **Percentage** (e.g. 10% off) or **Flat** (e.g. ₹100 off) discounts
- Minimum order value, maximum uses cap, expiry date
- Active/inactive toggle

**How it works:**
1. Cart page shows coupon input field
2. User enters code → frontend validates against DB: checks `is_active`, `expires_at`, `uses_count < max_uses`, `min_order_value`
3. If valid, discount is calculated and stored in `CheckoutContext`
4. On order confirmation, `coupon_code` + `discount_amount` are saved with the order

**Seeded coupons:** `WELCOME10` (10% off), `FLAT100` (₹100 off, min ₹500), `FIRST50` (50% off, min ₹1000, max 100 uses)

---

### 4.8 Order Tracking (User Side)

**File:** [src/pages/Profile.tsx](src/pages/Profile.tsx)

- Users see all their orders under "My Orders" in their profile
- Each order expands to show:
  - **Delivery progress bar:** 6-step dot tracker (Ordered → Confirmed → Processing → Shipped → On the Way → Delivered) with animated fill line. Current step pulses; completed steps show a checkmark
  - Items ordered with images and prices — **both image and name are clickable links** to the product detail page (joined via `order_items(*, products(slug))`)
  - Price summary with discount applied
  - Delivery address snapshot
  - Payment method (Razorpay or COD)
  - AWB/tracking number (if assigned)
- Cancelled or refunded orders show a coloured status banner instead of the progress bar
- The **order success page** ([src/pages/checkout/Success.tsx](src/pages/checkout/Success.tsx)) also has clickable product links in the items list

---

### 4.9 Reviews

**File:** [src/components/ReviewSection.tsx](src/components/ReviewSection.tsx), [src/hooks/useReviews.ts](src/hooks/useReviews.ts)

- Signed-in users can leave a 1–5 star rating with an optional comment
- One review per user per product (enforced by a DB unique constraint)
- Users can edit or delete their existing review
- **Verified Buyer** badge shown if the user has a confirmed+ order containing that product (checked via `get_verified_buyers(product_id)` RPC)
- Product `rating` and `review_count` auto-update via a PostgreSQL trigger (`sync_product_rating`) — no manual sync needed

---

### 4.10 Custom Orders

**File:** [src/pages/CustomOrders.tsx](src/pages/CustomOrders.tsx)

- Free-form enquiry form: name, email, description, budget range dropdown (₹500-1K, 1K-2.5K, 2.5K-5K, 5K+)
- Inserts into `custom_orders` table — **no authentication required** (RLS allows public insert)
- Status workflow: `new` → `reviewed` → `contacted` → `closed`
- Admins can view and manage custom orders in the profile/admin section

---

### 4.11 Dark / Light Theme

**File:** [src/contexts/ThemeContext.tsx](src/contexts/ThemeContext.tsx)

Toggled via the moon/sun icon in the navbar. Preference saved to `localStorage` (key: `earthly-theme`). Implemented via a `dark` class on the `<html>` element — Tailwind's `dark:` variants handle all colour changes automatically.

---

### 4.12 Splash Screen

**File:** [src/components/SplashScreen.tsx](src/components/SplashScreen.tsx)

Animated intro on first page load (2.2 seconds). Cycles through 6 icons (Gem, Sparkles, Leaf, Droplets, Flower, Star) every 380ms. Fades out, then the main app fades in. Controlled by `showSplash` state in App.tsx.

---

### 4.13 Back-to-Top Button

**File:** [src/components/BackToTop.tsx](src/components/BackToTop.tsx)

- Appears only when user is within 200px of page bottom
- Repositions itself relative to the footer using `getBoundingClientRect()`
- Continuous idle bounce animation
- Click → smooth scroll to top

---

### 4.14 GracefulImage

**File:** [src/components/GracefulImage.tsx](src/components/GracefulImage.tsx)

Image component with skeleton loader and fade-in animation. Shows a shimmer placeholder while loading, gracefully handles broken URLs. Used throughout the app for product images, cart items, and order history.

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

### Products — key columns

| Column | Type | Purpose |
|---|---|---|
| `slug` | text unique | URL-friendly ID e.g. `lavender-ring` |
| `stock` | integer | Current inventory; auto-decrements on order |
| `display_order` | integer | Controls display order in Shop page + Homepage (set via admin drag-reorder) |
| `is_active` | boolean | If false, hidden from shop |
| `is_featured` | boolean | Shown on homepage carousel |
| `is_new` | boolean | Shows "New" badge |
| `is_coming_soon` | boolean | Greyed out, not purchasable |
| `rating` | numeric | Auto-maintained by reviews trigger |
| `review_count` | integer | Auto-maintained by reviews trigger |
| `images` | text[] | Array of Supabase Storage public URLs |
| `materials` | text[] | e.g. `["Epoxy resin", "Dried flowers"]` |
| `care_instructions` | text[] | e.g. `["Keep away from direct heat"]` |

### Orders — status lifecycle

```
pending → confirmed → processing → shipped → out_for_delivery → delivered
                                                              ↘ cancelled
                                                              ↘ refunded
```

### Order Items — snapshots

| Column | Purpose |
|---|---|
| `product_name` | Name at time of purchase (doesn't change if product renamed) |
| `product_image` | First image URL at time of purchase |
| `price` | Price at time of purchase |
| `product_id` | FK to products (for linking back; `ON DELETE SET NULL`) |

### Coupons

| Column | Type | Purpose |
|---|---|---|
| `code` | text unique | e.g. `WELCOME10` |
| `discount_type` | text | `percentage` or `flat` |
| `discount_value` | numeric | e.g. `10` (10% off) or `100` (₹100 off) |
| `min_order_value` | numeric | Minimum cart total to apply |
| `max_uses` | integer | `NULL` = unlimited |
| `uses_count` | integer | Incremented on use |
| `is_active` | boolean | Toggle on/off |
| `expires_at` | timestamptz | `NULL` = never expires |

### Storage Buckets

| Bucket | Max size | Access | Purpose |
|---|---|---|---|
| `product-images` | 10MB | Public read, admin upload/update/delete | Product photos |
| `avatars` | 5MB | Public read, users manage own folder | Profile pictures |

### Key DB functions

| Function | What it does |
|---|---|
| `decrement_product_stock(id, qty)` | Atomically decrements stock with a `FOR UPDATE` row lock |
| `sync_product_rating()` | Trigger: keeps rating + review_count updated on review changes |
| `get_verified_buyers(product_id)` | Returns user IDs who bought a product (confirmed+ orders) |
| `has_role(user_id, role)` | Checks role (used in all RLS policies) — must cast: `'admin'::app_role` |

---

## 6. Razorpay Integration

**Files:** [api/create-order.js](api/create-order.js), [api/verify-payment.js](api/verify-payment.js), [src/pages/checkout/Payment.tsx](src/pages/checkout/Payment.tsx)

### End-to-end flow

```
1. User clicks "Pay Now" on Payment page
2. Frontend loads Razorpay script (checkout.razorpay.com/v1/checkout.js)
3. Frontend calls POST /api/create-order { amount: 129900 }  (paise)
   └─ Server creates Razorpay order via Razorpay API
   └─ Returns { order_id: "order_xxx" }
4. Frontend opens Razorpay payment modal with order_id
5. User completes payment (UPI / card / net banking)
6. Razorpay calls handler with { razorpay_order_id, razorpay_payment_id, razorpay_signature }
7. Frontend calls POST /api/verify-payment with signature + order details
   └─ Server reconstructs HMAC-SHA256: sha256(order_id|payment_id, SECRET)
   └─ Compares with received signature
   └─ If valid: inserts order + order_items into Supabase (service role, bypasses RLS)
   └─ Returns { orderId }
8. Frontend decrements stock, clears cart, redirects to /checkout/success?orderId=xxx
```

### COD flow (simpler)

```
1. User clicks "Place Order" on Payment page
2. Frontend inserts order directly into Supabase (via anon key + RLS)
3. Frontend inserts order_items with product snapshots (name, image, price)
4. Decrements stock, clears cart, redirects to success page
```

### Important: product_image in order_items

Both flows snapshot `product.images[0]` into `order_items.product_image` at order time. The Razorpay flow sends the image URL to `/api/verify-payment` in the items payload (`image` field). Without this, order history would show broken images.

---

## 7. Shiprocket Integration

**File:** [supabase/functions/shiprocket/index.ts](supabase/functions/shiprocket/index.ts)

A Supabase Edge Function that acts as a **CORS proxy** for the Shiprocket API (Shiprocket doesn't allow browser cross-origin requests).

### Supported actions

| Action | Input | Output |
|---|---|---|
| `login` | `{ email, password }` | `{ token }` |
| `create_order` | `{ token, order: {...} }` | `{ order_id, shipment_id }` |
| `assign_awb` | `{ token, shipment_id }` | `{ awb_code }` |
| `track` | `{ token, awb }` | Tracking info |

### Admin workflow

1. Admin clicks "Assign AWB" on an order → selects "Shiprocket"
2. First time: prompted for Shiprocket credentials → token cached in `localStorage: et_shiprocket_token`
3. Admin creates shipment → Shiprocket returns AWB
4. AWB saved to order in Supabase (`shiprocket_awb`, `shiprocket_order_id`)
5. Customer receives "Shipped" email with AWB number

### Deployment

```bash
npx supabase functions deploy shiprocket
```

---

## 8. Transactional Emails

**File:** [supabase/functions/send-order-email/index.ts](supabase/functions/send-order-email/index.ts)

Branded HTML emails sent via **Resend** API through a Supabase Edge Function.

| Trigger | Email sent | Recipient |
|---|---|---|
| New Google OAuth user | Welcome email with brand story | Customer |
| Order placed | Order confirmation with itemized receipt | Customer |
| Order placed | New order notification | Admin |
| Status → `confirmed` | Order confirmed with timeline | Customer |
| Status → `shipped` | Shipped with AWB + tracking link | Customer |
| Status → `out_for_delivery` | Out for delivery + COD reminder (if applicable) | Customer |
| Status → `delivered` | Delivered + 5-star review request | Customer |

### Brand styling in emails

```javascript
const C = {
  green:  "#4a7c59",   // Primary green
  bg:     "#f5f0eb",   // Warm cream
  text:   "#2d2015",   // Dark brown
  muted:  "#8a7a6a",
  border: "#e8e0d5",
  accent: "#c96b4a",   // Rust orange
};
```

- From: `orders@earthlytrinkets.in`
- Admin notifications: `business.earthlytrinkets@gmail.com`

### Auth email templates

Custom branded HTML templates for Supabase-managed auth emails:
- **Confirm signup** → paste [supabase/emails/signup-confirm.html](supabase/emails/signup-confirm.html) into Supabase Dashboard → Auth → Email Templates
- **Reset password** → paste [supabase/emails/password-reset.html](supabase/emails/password-reset.html)

### Deployment

```bash
npx supabase functions deploy send-order-email
# Set secret in Supabase Dashboard → Edge Functions → Secrets:
# RESEND_API_KEY = your-resend-api-key
```

---

## 9. Setup Guide — Fresh Install

### Prerequisites

- **Node.js** v18+ — [https://nodejs.org](https://nodejs.org) (download LTS)
- **Git** — [https://git-scm.com](https://git-scm.com)
- **VS Code** (recommended) — [https://code.visualstudio.com](https://code.visualstudio.com)
- **Vercel CLI** — `npm i -g vercel` (needed for `vercel dev` to run API routes locally)

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
   - **service_role** key (starts with `eyJ...` — keep this secret, never expose to frontend)

### Step 3 — Create `.env`

Create a file named `.env` in the project root (same folder as `package.json`):

```env
# Frontend (exposed to browser — VITE_ prefix required)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key...
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx

# Backend only (Vercel serverless functions — never reaches browser)
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your-razorpay-secret
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...
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
- `http://localhost:8080` (Vite dev)
- `http://localhost:3000` (Vercel dev)
- Your production domain (when you deploy)

### Step 6 — Grant yourself admin access

1. Run `vercel dev` → open the app → sign in with your account
2. In Supabase → **SQL Editor**, run: `SELECT id, email FROM auth.users;`
3. Copy your UUID from the result
4. Open [supabase/scripts/03_admin_setup.sql](supabase/scripts/03_admin_setup.sql), replace `<your-user-uuid>`, run it
5. Hard-refresh the browser (Cmd+Shift+R on Mac) — the admin menu should appear

### Step 7 — Set up Razorpay

1. Sign up at [https://razorpay.com](https://razorpay.com)
2. Go to **Settings → API Keys** → generate a test key pair
3. Copy the **Key ID** (starts with `rzp_test_`) and **Key Secret**
4. Add both to `.env` (see Step 3)

### Step 8 — Set up transactional emails (optional)

1. Sign up at [https://resend.com](https://resend.com) (free: 100 emails/day)
2. Get an API key
3. In Supabase → **Edge Functions** → `send-order-email` → **Secrets**:
   - Add `RESEND_API_KEY` = your key
4. Deploy: `npx supabase functions deploy send-order-email`

### Step 9 — Customise auth email templates (optional)

In Supabase → **Authentication → Email Templates**:
- **Confirm signup** → paste contents of [supabase/emails/signup-confirm.html](supabase/emails/signup-confirm.html)
- **Reset password** → paste contents of [supabase/emails/password-reset.html](supabase/emails/password-reset.html)

### Step 10 — Start the dev server

```bash
vercel dev
```

> **Why `vercel dev` instead of `npm run dev`?** The Razorpay payment flow requires the serverless API functions in `/api/`. Plain `npm run dev` (Vite only) doesn't serve these — payment will fail with "Failed to initiate payment". `vercel dev` runs both Vite and the API routes.

Open the URL shown in the terminal. You're running.

---

## 10. Environment Variables

### Frontend (browser-accessible)

| Variable | Where to get it | Required? |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon key | Yes |
| `VITE_RAZORPAY_KEY_ID` | Razorpay Dashboard → API Keys | For payments |

> Variables must start with `VITE_` to be accessible in the React app. This is a Vite requirement — it prevents accidentally exposing server-only secrets to the browser.

> The anon key is **designed to be public**. Security comes from RLS policies at the database level, not from hiding this key.

### Backend (server-side only — Vercel functions)

| Variable | Where to get it | Required? |
|---|---|---|
| `RAZORPAY_KEY_ID` | Razorpay Dashboard → API Keys | For payments |
| `RAZORPAY_KEY_SECRET` | Razorpay Dashboard → API Keys | For payments |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role | For payments |

> These are set in `.env` locally and in **Vercel → Project Settings → Environment Variables** for production.

### Supabase Edge Function secrets

| Variable | Where to set it |
|---|---|
| `RESEND_API_KEY` | Supabase Dashboard → Edge Functions → Secrets |

---

## 11. Deployment (Vercel)

**File:** [vercel.json](vercel.json)

```json
{
  "framework": "vite",
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1" },
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

- `/api/*` routes to Vercel serverless functions (create-order, verify-payment)
- All other routes → `index.html` (React Router handles SPA navigation)

### Deploy steps

1. Push code to GitHub
2. Connect repo to Vercel (`vercel` CLI or Vercel Dashboard)
3. Set environment variables in Vercel → Project Settings → Environment Variables (all from `.env`)
4. Deploy: `vercel --prod`

### Edge Functions (Supabase)

Deploy separately:
```bash
npx supabase functions deploy send-order-email
npx supabase functions deploy shiprocket
```

---

## 12. Planned Next Steps

| Feature | Notes |
|---|---|
| Shiprocket auto-booking | Call Shiprocket API directly from admin |
| Razorpay webhook | Server-side payment confirmation (more reliable than client callback) |
| Product search | Full-text search using Supabase `tsquery` |
| Admin coupon manager | UI to create/edit/deactivate coupons |
| Order PDF invoices | Auto-generated on delivery |
| Docker + Kubernetes | For scale — Azure Container Apps recommended |
| SonarCloud | Free code quality scanning for public repos |

---

---

# Part 2 — Concepts & Tutorials

---

## 13. What is React?

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

## 14. What is TypeScript?

TypeScript is JavaScript with **types** added. Types describe what kind of value a variable holds, catching bugs before the code runs.

```ts
// Plain JavaScript — crashes at runtime
function greet(name) {
  return "Hello " + name.toUpperCase();
}
greet(42); // "name.toUpperCase is not a function"

// TypeScript — error caught immediately in your editor
function greet(name: string): string {
  return "Hello " + name.toUpperCase();
}
greet(42); // TypeScript: Argument of type 'number' is not assignable to 'string'
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
p.colour;  // Error: Property 'colour' does not exist on type 'Product'
p.name;    // Fine — and VS Code autocompletes it
```

**In this project:** All data types are in [src/types/product.ts](src/types/product.ts). VS Code uses them to autocomplete field names and catch typos before you even run the app.

---

## 15. What is Vite?

Vite is the **build tool** — it takes your TypeScript + React code and turns it into plain HTML/CSS/JavaScript that a browser understands.

```bash
npm run dev    # Starts a local server at http://localhost:8080
               # Changes appear instantly — no page reload needed

npm run build  # Creates an optimised production bundle in /dist/
               # This is what gets deployed to Vercel
```

You don't interact with Vite much — it runs in the background and just works.

> **Note:** For local development with Razorpay payments, use `vercel dev` instead of `npm run dev` — see [Setup Guide](#9-setup-guide--fresh-install).

---

## 16. What is Tailwind CSS?

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
| `md:flex` | `display: flex` only on screens >= 768px |
| `lg:px-8` | Larger padding on screens >= 1024px |

The `dark:`, `md:`, `lg:` prefixes are called **variants** — they apply a style only under specific conditions.

---

## 17. What is Supabase?

Supabase is a Backend-as-a-Service. It gives you a complete backend without writing any server code:

| Feature | What you get |
|---|---|
| **PostgreSQL** | A real relational database |
| **Auth** | Google OAuth, email/password, magic links |
| **Storage** | File uploads with a CDN (for product images) |
| **Edge Functions** | Serverless code (used to send emails, proxy Shiprocket) |

You interact with it from React using the Supabase JS client:

```ts
import { supabase } from "@/integrations/supabase/client";

// READ: fetch active products, join with categories
const { data, error } = await supabase
  .from("products")
  .select("*, categories(name, slug)")
  .eq("is_active", true)
  .order("display_order", { ascending: true });

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

## 18. React Context API

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

| Context | Provides | Storage | Used by |
|---|---|---|---|
| `AuthContext` | `user`, `loading`, `signOut` | Supabase session (automatic) | Nearly everything |
| `CartContext` | `items`, `addToCart`, `removeFromCart`, `totalItems`, `totalPrice` | `localStorage: et_cart` | Navbar, Cart, ProductCard, Checkout |
| `CheckoutContext` | `selectedAddress`, `appliedCoupon`, `discountAmount` | `sessionStorage: et_checkout` | Address and Payment pages |
| `ThemeContext` | `theme`, `toggleTheme` | `localStorage: earthly-theme` | Navbar toggle button |

All four wrap the entire app in [src/App.tsx](src/App.tsx).

---

## 19. TanStack React Query

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

## 20. React Router

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

## 21. Row Level Security (RLS)

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

## 22. How Auth Works End-to-End

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

## 23. How the Cart Works

The cart lives in `CartContext` as a React array, persisted to `localStorage` (key: `et_cart`).

```
Add item → CartContext.addToCart(product)
  ├─ If product already in cart: increase quantity (capped at stock limit)
  └─ If new: append { product, quantity: 1 } to the array

Remove → filter the item out of the array

Total items → items.reduce((sum, item) => sum + item.quantity, 0)
```

Cart survives page refresh thanks to localStorage. It is cleared on successful order placement.

---

## 24. How Admin Detection Works (No Flash)

**The problem:** On page load, auth takes ~200ms to resolve. Without a fix, the wrong nav items briefly flash before the correct ones appear.

**The solution — synchronous localStorage cache:**

```
Page load (synchronous, instant):
├─ useState initializer reads "et_current_uid" from localStorage
├─ Reads "et_admin_<uid>" from localStorage  →  "true"
└─ Sets isAdmin = true, roleChecked = true
   └─ Correct UI rendered on the very first paint

~200ms later (async):
├─ Supabase resolves the session → user = { id: "<uid>", ... }
├─ useEffect fires (loading is now false)
├─ Checks: if still loading → skip (don't flash!)
├─ Queries DB to confirm admin status
└─ Updates localStorage cache for next visit
```

The `if (loading) return;` guard is critical — without it, the effect fires during auth loading with `user = null`, clears the cache, and causes the flash.

---

## 25. Common Patterns in This Codebase

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
  {save.isPending ? "Saving..." : "Save"}
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

## Known Gotchas

| Issue | Solution |
|---|---|
| `.env` key must be Supabase anon JWT (`eyJ...`), NOT Lovable `sb_publishable_...` key | Use the key from Supabase → Project Settings → API |
| After modifying a Context file, do a hard refresh (Cmd+Shift+R) | Vite HMR creates duplicate context instances |
| `.single()` throws 406 if row doesn't exist | Use `.maybeSingle()` |
| RLS policies using `has_role()` must cast the role | `'admin'::app_role` not `'admin'` (causes error 42883) |
| Supabase Storage `getPublicUrl()` can return wrong URL format | Construct URL manually: `${SUPABASE_URL}/storage/v1/object/public/product-images/${filename}` |
| Storage uploads return 400 without RLS policies | Run 02_storage.sql |
| Google OAuth redirects to wrong domain | Add localhost to Supabase Auth → URL Configuration → Redirect URLs |
| `npm run dev` doesn't serve `/api/` routes | Use `vercel dev` for local development with Razorpay payments |
| `orders` table not in generated Supabase types | TypeScript errors on `supabase.from("orders")` — use `as any` or update types.ts |

---

*Last updated: March 2026*
