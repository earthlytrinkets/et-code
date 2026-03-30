import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Verify Supabase JWT from Authorization header and return the authenticated user ID.
// Ensures the userId in the request body matches the token's owner.
export const authenticateRequest = async (req) => {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const token = authHeader?.replace("Bearer ", "");
  if (!token) throw new Error("Missing authentication token.");

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error("Invalid or expired authentication token.");

  const { userId } = req.body || {};
  if (userId && userId !== user.id) {
    throw new Error("User ID mismatch.");
  }

  return user.id;
};

const normalizeCode = (code) => code?.trim().toUpperCase() || null;

const sanitizeItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Your cart is empty.");
  }

  return items.map((item) => {
    const quantity = Number(item.quantity);
    if (!item.product_id || !Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Invalid cart items.");
    }
    return { product_id: item.product_id, quantity };
  });
};

const loadProducts = async (items) => {
  const ids = [...new Set(items.map((item) => item.product_id))];
  const { data, error } = await supabase
    .from("products")
    .select("id, name, price, images, stock, is_active, is_coming_soon")
    .in("id", ids);

  if (error) throw new Error("Failed to load products.");

  const byId = new Map((data ?? []).map((product) => [product.id, product]));
  return items.map((item) => {
    const product = byId.get(item.product_id);
    if (!product) throw new Error("One or more products could not be found.");
    if (!product.is_active || product.is_coming_soon) {
      throw new Error(`${product.name} is not currently available.`);
    }
    if (product.stock < item.quantity) {
      throw new Error(`Only ${product.stock} unit(s) of ${product.name} are available right now.`);
    }
    return {
      product_id: product.id,
      product_name: product.name,
      product_image: product.images?.[0] ?? null,
      price: Number(product.price),
      quantity: item.quantity,
    };
  });
};

const validateCoupon = async ({ couponCode, userId, subtotal }) => {
  const normalized = normalizeCode(couponCode);
  if (!normalized) return null;

  const { data, error } = await supabase.rpc("validate_coupon_code", {
    p_code: normalized,
    p_user_id: userId ?? null,
    p_subtotal: subtotal,
  });

  if (error) throw new Error(error.message || "Invalid coupon code.");

  const coupon = Array.isArray(data) ? data[0] : data;
  if (!coupon) throw new Error("Invalid coupon code.");
  return coupon;
};

const reserveCouponUsage = async (couponCode) => {
  if (!couponCode) return;

  const { data, error } = await supabase.rpc("adjust_coupon_usage", {
    p_code: couponCode,
    p_delta: 1,
  });

  if (error || !data) {
    throw new Error("This coupon is no longer available.");
  }
};

export const createOrderWithPricing = async ({
  userId,
  rawItems,
  shippingAddress,
  paymentMethod,
  couponCode,
  razorpay_order_id = null,
  razorpay_payment_id = null,
}) => {
  const items = sanitizeItems(rawItems);
  const orderItems = await loadProducts(items);
  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const coupon = await validateCoupon({ couponCode, userId, subtotal });
  const discountAmount = coupon ? Number(coupon.discount_amount) : 0;
  const total = subtotal - discountAmount;

  if (total <= 0) {
    throw new Error("Invalid order total.");
  }

  // Reserve coupon BEFORE inserting order to prevent race conditions
  try {
    await reserveCouponUsage(coupon?.code ?? null);
  } catch (error) {
    throw error;
  }

  // Decrement stock server-side (atomic, prevents overselling)
  for (const item of orderItems) {
    const { data: ok, error: stockErr } = await supabase.rpc("decrement_product_stock", {
      p_product_id: item.product_id,
      p_quantity: item.quantity,
    });
    if (stockErr || !ok) {
      // Release coupon if stock fails
      if (coupon?.code) {
        await supabase.rpc("adjust_coupon_usage", { p_code: coupon.code, p_delta: -1 }).catch(() => {});
      }
      // Restore stock for already-decremented items
      for (const prev of orderItems) {
        if (prev.product_id === item.product_id) break;
        await supabase.rpc("increment_product_stock", {
          p_product_id: prev.product_id,
          p_quantity: prev.quantity,
        }).catch(() => {});
      }
      throw new Error(`Insufficient stock for ${item.product_name}.`);
    }
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: userId,
      status: "confirmed",
      subtotal,
      discount_amount: discountAmount,
      coupon_code: coupon?.code ?? null,
      shipping_fee: 0,
      total,
      payment_method: paymentMethod,
      razorpay_order_id,
      razorpay_payment_id,
      shipping_address: shippingAddress,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    // Restore stock + coupon on order failure
    for (const item of orderItems) {
      await supabase.rpc("increment_product_stock", {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      }).catch(() => {});
    }
    if (coupon?.code) {
      await supabase.rpc("adjust_coupon_usage", { p_code: coupon.code, p_delta: -1 }).catch(() => {});
    }
    throw new Error("Failed to create order.");
  }

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(
      orderItems.map((item) => ({
        order_id: order.id,
        ...item,
      }))
    );

  if (itemsError) {
    await supabase.from("orders").delete().eq("id", order.id);
    throw new Error("Failed to save order items.");
  }

  return {
    orderId: order.id,
    subtotal,
    discountAmount,
    total,
    couponCode: coupon?.code ?? null,
  };
};

export const getOrderAmount = async ({ userId, rawItems, couponCode }) => {
  const items = sanitizeItems(rawItems);
  const orderItems = await loadProducts(items);
  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const coupon = await validateCoupon({ couponCode, userId, subtotal });
  const discountAmount = coupon ? Number(coupon.discount_amount) : 0;

  const total = subtotal - discountAmount;
  return {
    subtotal,
    discountAmount,
    total: total > 0 ? total : 0,
    couponCode: coupon?.code ?? null,
  };
};

