-- Custom orders table for storing customer requests
create table if not exists public.custom_orders (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  description text not null,
  budget_range text,
  status      text not null default 'new' check (status in ('new', 'reviewed', 'contacted', 'closed')),
  created_at  timestamptz not null default now()
);

-- Enable RLS
alter table public.custom_orders enable row level security;

-- Anyone (including anon) can submit a custom order
create policy "Anyone can submit custom orders"
  on public.custom_orders for insert
  with check (true);

-- Only admins can read custom orders
create policy "Admins can read custom orders"
  on public.custom_orders for select
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Only admins can update custom order status
create policy "Admins can update custom orders"
  on public.custom_orders for update
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );
