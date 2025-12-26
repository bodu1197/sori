'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useProducts, useAddToCart, useCart } from '@/hooks/useCommerce';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Search,
  ShoppingCart,
  Package,
  Music2,
  Ticket,
  Download,
  Filter,
} from 'lucide-react';
import type { ProductType } from '@/lib/api/commerce';

const productTypes: { value: ProductType | 'all'; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All Products', icon: <Package className="h-4 w-4" /> },
  { value: 'physical', label: 'Physical', icon: <Package className="h-4 w-4" /> },
  { value: 'digital', label: 'Digital', icon: <Download className="h-4 w-4" /> },
  { value: 'ticket', label: 'Tickets', icon: <Ticket className="h-4 w-4" /> },
  { value: 'subscription', label: 'Subscriptions', icon: <Music2 className="h-4 w-4" /> },
];

export default function ShopPage() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [type, setType] = useState<ProductType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'price_high'>('newest');

  const { data, isLoading } = useProducts(
    {
      type: type === 'all' ? undefined : type,
      search: search || undefined,
    },
    40
  );

  const { data: cart } = useCart();
  const addToCartMutation = useAddToCart();

  const handleSearch = () => {
    setSearch(searchInput);
  };

  const handleAddToCart = async (productId: string) => {
    try {
      await addToCartMutation.mutateAsync({ productId });
      toast.success('Added to cart!');
    } catch {
      toast.error('Failed to add to cart');
    }
  };

  // Sort products
  const sortedProducts = [...(data?.products || [])].sort((a, b) => {
    if (sortBy === 'price_low') return (a.sale_price || a.price) - (b.sale_price || b.price);
    if (sortBy === 'price_high') return (b.sale_price || b.price) - (a.sale_price || a.price);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const cartItemCount = cart?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Shop</h1>
          <p className="text-muted-foreground">Official merchandise and digital content</p>
        </div>
        <Link href="/shop/cart">
          <Button variant="outline" className="relative">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Cart
            {cartItemCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">
                {cartItemCount}
              </Badge>
            )}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>
        <Select value={type} onValueChange={(v) => setType(v as ProductType | 'all')}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {productTypes.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                <div className="flex items-center gap-2">
                  {t.icon}
                  {t.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price_low">Price: Low to High</SelectItem>
            <SelectItem value="price_high">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {productTypes.map((t) => (
          <Button
            key={t.value}
            variant={type === t.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setType(t.value)}
            className="flex-shrink-0"
          >
            {t.icon}
            <span className="ml-1">{t.label}</span>
          </Button>
        ))}
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="aspect-square" />
              <CardContent className="pt-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sortedProducts.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {sortedProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden group">
              <Link href={`/shop/${product.id}`}>
                <div className="relative aspect-square bg-muted">
                  {product.images?.[0] ? (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  {product.sale_price && (
                    <Badge className="absolute top-2 left-2 bg-red-500">
                      Sale
                    </Badge>
                  )}
                  {product.featured && (
                    <Badge className="absolute top-2 right-2">
                      Featured
                    </Badge>
                  )}
                </div>
              </Link>
              <CardContent className="pt-4">
                <Link href={`/shop/${product.id}`}>
                  <h3 className="font-semibold line-clamp-1 hover:underline">{product.name}</h3>
                </Link>
                {product.artist && (
                  <p className="text-sm text-muted-foreground">{product.artist.name}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  {product.sale_price ? (
                    <>
                      <span className="font-bold">${product.sale_price.toFixed(2)}</span>
                      <span className="text-sm text-muted-foreground line-through">
                        ${product.price.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="font-bold">${product.price.toFixed(2)}</span>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => handleAddToCart(product.id)}
                  disabled={addToCartMutation.isPending || product.stock === 0}
                >
                  {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No products found</p>
            <p className="text-muted-foreground">Try adjusting your filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
