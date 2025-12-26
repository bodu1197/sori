'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commerceApi, ProductFilters, ShippingAddress } from '@/lib/api/commerce';

// Query keys
export const commerceKeys = {
  all: ['commerce'] as const,
  products: (filters: ProductFilters) => [...commerceKeys.all, 'products', filters] as const,
  product: (id: string) => [...commerceKeys.all, 'product', id] as const,
  cart: () => [...commerceKeys.all, 'cart'] as const,
  orders: () => [...commerceKeys.all, 'orders'] as const,
  order: (id: string) => [...commerceKeys.all, 'order', id] as const,
};

/**
 * Hook for getting products
 */
export function useProducts(filters: ProductFilters = {}, limit = 20, offset = 0) {
  return useQuery({
    queryKey: commerceKeys.products(filters),
    queryFn: () => commerceApi.getProducts(filters, limit, offset),
  });
}

/**
 * Hook for getting a single product
 */
export function useProduct(productId: string) {
  return useQuery({
    queryKey: commerceKeys.product(productId),
    queryFn: () => commerceApi.getProduct(productId),
    enabled: !!productId,
  });
}

/**
 * Hook for getting cart
 */
export function useCart() {
  return useQuery({
    queryKey: commerceKeys.cart(),
    queryFn: () => commerceApi.getCart(),
  });
}

/**
 * Hook for adding to cart
 */
export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, quantity, variantId }: { productId: string; quantity?: number; variantId?: string }) =>
      commerceApi.addToCart(productId, quantity, variantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commerceKeys.cart() });
    },
  });
}

/**
 * Hook for updating cart item
 */
export function useUpdateCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      commerceApi.updateCartItem(itemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commerceKeys.cart() });
    },
  });
}

/**
 * Hook for removing from cart
 */
export function useRemoveFromCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => commerceApi.removeFromCart(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commerceKeys.cart() });
    },
  });
}

/**
 * Hook for creating an order
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shippingAddress?: ShippingAddress) => commerceApi.createOrder(shippingAddress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commerceKeys.cart() });
      queryClient.invalidateQueries({ queryKey: commerceKeys.orders() });
    },
  });
}

/**
 * Hook for getting orders
 */
export function useOrders(limit = 20) {
  return useQuery({
    queryKey: commerceKeys.orders(),
    queryFn: () => commerceApi.getOrders(limit),
  });
}

/**
 * Hook for getting a single order
 */
export function useOrder(orderId: string) {
  return useQuery({
    queryKey: commerceKeys.order(orderId),
    queryFn: () => commerceApi.getOrder(orderId),
    enabled: !!orderId,
  });
}
