import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/types/product";

// Select all columns including joined category name/slug
const PRODUCT_SELECT = "*, categories(name, slug)";

// All active products — used by Shop page
export const useProducts = (filters?: { categorySlug?: string; search?: string }) => {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (filters?.categorySlug) {
        // join filter: match categories.slug
        const { data: cat } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", filters.categorySlug)
          .maybeSingle();
        if (cat) query = query.eq("category_id", cat.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
  });
};

// Featured products — used by Home page
export const useFeaturedProducts = () => {
  return useQuery({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("is_active", true)
        .eq("is_featured", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });
};

// Single product by slug — used by ProductDetail page
export const useProduct = (slug: string) => {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data as Product | null;
    },
    enabled: !!slug,
  });
};

// All products (including inactive) — used by Admin panel
export const useAllProducts = () => {
  return useQuery({
    queryKey: ["products", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });
};

// All categories — used by Shop filters + Admin
export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string; slug: string }[];
    },
  });
};
