import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Review = {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  verified_buyer: boolean;
  profiles: { full_name: string | null } | null;
};

// All reviews for a product (with reviewer name + verified buyer flag)
export const useReviews = (productId: string) =>
  useQuery({
    queryKey: ["reviews", productId],
    queryFn: async () => {
      // Fetch reviews and verified buyers independently so one failure doesn't block the other
      const reviewsResult = await supabase
        .from("reviews" as never)
        .select("*, profiles(full_name)")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

      if (reviewsResult.error) {
        console.error("Reviews fetch error:", reviewsResult.error);
        // Fall back to fetching without profiles join
        const fallback = await supabase
          .from("reviews" as never)
          .select("*")
          .eq("product_id", productId)
          .order("created_at", { ascending: false });
        if (fallback.error) throw fallback.error;
        return (fallback.data as Omit<Review, "verified_buyer">[]).map((r) => ({
          ...r,
          profiles: null,
          verified_buyer: false,
        })) as Review[];
      }

      // Best-effort: get verified buyer IDs (don't throw if RPC not available)
      const buyersResult = await supabase.rpc("get_verified_buyers", { p_product_id: productId });

      const verifiedSet = new Set(
        (buyersResult.data ?? []).map((r: { user_id: string }) => r.user_id)
      );

      return (reviewsResult.data as Omit<Review, "verified_buyer">[]).map((r) => ({
        ...r,
        verified_buyer: verifiedSet.has(r.user_id),
      })) as Review[];
    },
    enabled: !!productId,
  });

// Current user's review for a product (null if none)
export const useMyReview = (productId: string, userId: string | undefined) =>
  useQuery({
    queryKey: ["my-review", productId, userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews" as never)
        .select("*")
        .eq("product_id", productId)
        .eq("user_id", userId!)
        .maybeSingle();
      return data as Review | null;
    },
    enabled: !!productId && !!userId,
  });

// Upsert (create or update) a review
export const useSubmitReview = (productId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, rating, comment }: { userId: string; rating: number; comment: string }) => {
      const { error } = await supabase
        .from("reviews" as never)
        .upsert(
          { product_id: productId, user_id: userId, rating, comment },
          { onConflict: "product_id,user_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews", productId] });
      qc.invalidateQueries({ queryKey: ["my-review", productId] });
      qc.invalidateQueries({ queryKey: ["product"] });       // refresh rating on product
    },
  });
};

// Delete current user's review
export const useDeleteReview = (productId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from("reviews" as never)
        .delete()
        .eq("id", reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews", productId] });
      qc.invalidateQueries({ queryKey: ["my-review", productId] });
      qc.invalidateQueries({ queryKey: ["product"] });
    },
  });
};
