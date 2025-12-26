// Commerce API functions using Supabase
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/client';

const db = () => createClient() as any;

export type ProductType = 'physical' | 'digital' | 'subscription' | 'ticket';
export type ProductStatus = 'draft' | 'active' | 'sold_out' | 'archived';
export type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export interface Product {
  id: string;
  seller_id: string;
  artist_id: string | null;
  type: ProductType;
  name: string;
  name_i18n: Record<string, string>;
  description: string | null;
  description_i18n: Record<string, string>;
  images: string[];
  price: number;
  sale_price: number | null;
  currency: string;
  stock: number | null;
  variants: ProductVariant[];
  digital_content_url: string | null;
  status: ProductStatus;
  featured: boolean;
  tags: string[];
  created_at: string;
  seller?: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  artist?: {
    name: string;
    thumbnail_url: string | null;
  };
}

export interface ProductVariant {
  id: string;
  name: string;
  price_modifier: number;
  stock: number | null;
}

export interface CartItem {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  product?: Product;
}

export interface Order {
  id: string;
  user_id: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shipping_cost: number;
  tax: number;
  total: number;
  currency: string;
  shipping_address: ShippingAddress | null;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  product_id: string;
  variant_id: string | null;
  quantity: number;
  price: number;
  product_name: string;
  product_image: string;
}

export interface ShippingAddress {
  name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone?: string;
}

export interface ProductFilters {
  type?: ProductType;
  artistId?: string;
  sellerId?: string;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  search?: string;
  featured?: boolean;
}

export const commerceApi = {
  /**
   * Get products with filters
   */
  getProducts: async (
    filters: ProductFilters = {},
    limit = 20,
    offset = 0
  ): Promise<{ products: Product[]; total: number }> => {
    const supabase = db();

    let query = supabase
      .from('products')
      .select(`
        *,
        seller:profiles!products_seller_id_fkey(username, display_name, avatar_url),
        artist:artists!products_artist_id_fkey(name, thumbnail_url)
      `, { count: 'exact' })
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.artistId) {
      query = query.eq('artist_id', filters.artistId);
    }
    if (filters.sellerId) {
      query = query.eq('seller_id', filters.sellerId);
    }
    if (filters.minPrice !== undefined) {
      query = query.gte('price', filters.minPrice);
    }
    if (filters.maxPrice !== undefined) {
      query = query.lte('price', filters.maxPrice);
    }
    if (filters.featured) {
      query = query.eq('featured', true);
    }
    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      products: data || [],
      total: count || 0,
    };
  },

  /**
   * Get single product
   */
  getProduct: async (productId: string): Promise<Product | null> => {
    const supabase = db();

    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        seller:profiles!products_seller_id_fkey(username, display_name, avatar_url),
        artist:artists!products_artist_id_fkey(name, thumbnail_url)
      `)
      .eq('id', productId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  },

  /**
   * Get user's cart
   */
  getCart: async (): Promise<CartItem[]> => {
    const supabase = db();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        product:products!cart_items_product_id_fkey(*)
      `)
      .eq('user_id', user.id);

    if (error) throw error;
    return data || [];
  },

  /**
   * Add item to cart
   */
  addToCart: async (productId: string, quantity = 1, variantId?: string): Promise<void> => {
    const supabase = db();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    // Check if item already exists in cart
    const { data: existing } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .eq('variant_id', variantId || null)
      .single();

    if (existing) {
      // Update quantity
      await supabase
        .from('cart_items')
        .update({ quantity: existing.quantity + quantity })
        .eq('id', existing.id);
    } else {
      // Add new item
      await supabase
        .from('cart_items')
        .insert({
          user_id: user.id,
          product_id: productId,
          variant_id: variantId || null,
          quantity,
        });
    }
  },

  /**
   * Update cart item quantity
   */
  updateCartItem: async (itemId: string, quantity: number): Promise<void> => {
    const supabase = db();

    if (quantity <= 0) {
      await supabase.from('cart_items').delete().eq('id', itemId);
    } else {
      await supabase.from('cart_items').update({ quantity }).eq('id', itemId);
    }
  },

  /**
   * Remove item from cart
   */
  removeFromCart: async (itemId: string): Promise<void> => {
    const supabase = db();
    await supabase.from('cart_items').delete().eq('id', itemId);
  },

  /**
   * Clear cart
   */
  clearCart: async (): Promise<void> => {
    const supabase = db();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from('cart_items').delete().eq('user_id', user.id);
  },

  /**
   * Create order from cart
   */
  createOrder: async (shippingAddress?: ShippingAddress): Promise<Order> => {
    const supabase = db();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const cart = await commerceApi.getCart();
    if (cart.length === 0) throw new Error('Cart is empty');

    const items: OrderItem[] = cart.map((item) => ({
      product_id: item.product_id,
      variant_id: item.variant_id,
      quantity: item.quantity,
      price: item.product?.sale_price || item.product?.price || 0,
      product_name: item.product?.name || '',
      product_image: item.product?.images?.[0] || '',
    }));

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingCost = 0; // Free shipping for now
    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + shippingCost + tax;

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        status: 'pending',
        items,
        subtotal,
        shipping_cost: shippingCost,
        tax,
        total,
        currency: 'USD',
        shipping_address: shippingAddress || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Clear cart after order
    await commerceApi.clearCart();

    return order;
  },

  /**
   * Get user's orders
   */
  getOrders: async (limit = 20): Promise<Order[]> => {
    const supabase = db();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  /**
   * Get single order
   */
  getOrder: async (orderId: string): Promise<Order | null> => {
    const supabase = db();

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  },
};
