-- Add checkout-related columns to orders
alter table public.orders
  add column if not exists coupon_code     text,
  add column if not exists discount_amount numeric(10,2) not null default 0,
  add column if not exists payment_method  text not null default 'cod'
    check (payment_method in ('razorpay', 'cod')),
  add column if not exists shipping_method text
    check (shipping_method in ('personal', 'shiprocket'));

-- Add out_for_delivery to order_status enum
-- (PostgreSQL requires a transaction-safe ALTER TYPE)
alter type order_status add value if not exists 'out_for_delivery' after 'shipped';
