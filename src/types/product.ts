// DB-aligned product type — matches public.products + categories join
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  price: number;
  compare_at_price: number | null;  // strikethrough price
  category_id: string | null;
  images: string[];                 // Supabase Storage public URLs
  tags: string[];
  materials: string[];
  care_instructions: string[];
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  is_coming_soon: boolean;
  rating: number;
  review_count: number;
  display_order: number;
  created_at: string;
  updated_at: string;
  // joined from categories table
  categories: { name: string; slug: string } | null;
}

// Minimal shape used inside the cart
export interface CartProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  stock: number;
}
