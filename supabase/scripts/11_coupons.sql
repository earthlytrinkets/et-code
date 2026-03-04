-- Coupons table
create table if not exists public.coupons (
  id             uuid primary key default gen_random_uuid(),
  code           text unique not null,
  discount_type  text not null check (discount_type in ('percentage', 'flat')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  min_order_value numeric(10,2) not null default 0,
  max_uses       integer,           -- null = unlimited
  uses_count     integer not null default 0,
  is_active      boolean not null default true,
  expires_at     timestamptz,       -- null = never expires
  created_at     timestamptz not null default now()
);

-- RLS
alter table public.coupons enable row level security;

-- Anyone can read active coupons (needed for client-side validation)
create policy "Public can read active coupons"
  on public.coupons for select
  using (is_active = true);

-- Only admins can manage coupons
create policy "Admins can manage coupons"
  on public.coupons for all
  using (has_role(auth.uid(), 'admin'::app_role));

-- Sample coupons (remove or adjust before production)
insert into public.coupons (code, discount_type, discount_value, min_order_value, max_uses)
values
  ('WELCOME10', 'percentage', 10, 0,    null),
  ('FLAT100',   'flat',      100, 500,  null),
  ('FIRST50',   'percentage', 50, 1000, 100)
on conflict (code) do nothing;
