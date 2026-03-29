import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

  try {
    await reserveCouponUsage(coupon?.code ?? null);
  } catch (error) {
    await supabase.from("orders").delete().eq("id", order.id);
    throw error;
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

  return {
    subtotal,
    discountAmount,
    total: subtotal - discountAmount,
    couponCode: coupon?.code ?? null,
  };
};

