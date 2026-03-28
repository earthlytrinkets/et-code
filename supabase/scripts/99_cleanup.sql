-- ============================================================================
-- EARTHLY TRINKETS — DATABASE CLEANUP SCRIPT
-- ============================================================================
-- Run sections individually in Supabase SQL Editor (Dashboard → SQL Editor).
-- Copy-paste the section you need. DO NOT run the entire file at once
-- unless you want a full reset.
-- ============================================================================


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 1: Delete all orders + order items                            ║
-- ║  (Keeps users, products, addresses intact)                             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

DELETE FROM order_items;
DELETE FROM orders;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 2: Delete all reviews                                         ║
-- ║  (Resets product ratings — you may want to reset rating/review_count)  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

DELETE FROM reviews;

-- Reset rating and review_count on all products
UPDATE products SET rating = 0, review_count = 0;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 3: Delete all addresses                                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

DELETE FROM addresses;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 4: Delete all custom orders                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

DELETE FROM custom_orders;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 5: Delete all coupons                                         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

DELETE FROM coupons;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 6: Delete all products + categories                           ║
-- ║  (Also clears order_items and reviews that reference products)         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

DELETE FROM order_items;
DELETE FROM reviews;
DELETE FROM products;
DELETE FROM categories;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 7: Delete all users (profiles, roles, addresses, auth users)  ║
-- ║  ⚠️  This deletes ALL user accounts from Supabase Auth too!            ║
-- ║  ⚠️  Run sections 1-4 FIRST to clear orders/reviews/addresses         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Clear user-related data first
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM reviews;
DELETE FROM addresses;
DELETE FROM user_roles;
DELETE FROM profiles;

-- Delete all users from Supabase Auth
-- (must be done via auth.users — requires service_role or SQL Editor)
DELETE FROM auth.users;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 8: Reset product stock to a default value                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Set all products back to 50 stock (change 50 to your preferred default)
UPDATE products SET stock = 50;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 9: Clear product images from storage                          ║
-- ║  ⚠️  Run this in SQL Editor — deletes ALL files in product-images      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

DELETE FROM storage.objects WHERE bucket_id = 'product-images';


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 10: FULL RESET — Nuke everything                             ║
-- ║  ⚠️  Deletes ALL data including auth users and storage                 ║
-- ║  ⚠️  Categories will need to be re-seeded after this                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Data tables (order matters due to foreign keys)
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM reviews;
DELETE FROM custom_orders;
DELETE FROM coupons;
DELETE FROM addresses;
DELETE FROM user_roles;
DELETE FROM profiles;
DELETE FROM products;
DELETE FROM categories;

-- Auth users
DELETE FROM auth.users;

-- Storage
DELETE FROM storage.objects WHERE bucket_id = 'product-images';

-- Re-seed categories (update these if your categories have changed)
INSERT INTO categories (name, slug) VALUES
  ('Jewellery', 'jewellery'),
  ('Pendants', 'pendants'),
  ('Paperweights', 'paperweights'),
  ('Home Decor', 'home-decor');
