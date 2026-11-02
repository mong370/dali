import { Heart, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { useToggleWishlist, useWishlist } from '../api/wishlist';
import { money } from '../lib/format';
import type { Product } from '../lib/types';
import { useCart } from '../store/cart';
import { SmartImage } from './SmartImage';

function AddToCartButton({ product }: { product: Product }) {
  const navigate = useNavigate();
  const [only] = product.variants;
  const hasOptions = product.variants.length > 1;
  const soldOut = product.totalStock < product.minOrderQty;

  const handleClick = () => {
    // Products with sizes or other options need a choice, which the product page offers.
    if (hasOptions) {
      navigate(`/products/${product.slug}`);
      return;
    }
    if (!only) return;
    const cart = useCart.getState();
    const inCart = cart.items.find((item) => item.variant === only._id)?.quantity ?? 0;
    if (inCart + product.minOrderQty > only.stock) {
      toast.error(`Only ${only.stock} available`);
      return;
    }
    cart.add({ product: product._id, variant: only._id, quantity: product.minOrderQty });
    toast.success('Added to cart');
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={soldOut}
      aria-label={hasOptions ? `Choose options for ${product.name}` : `Add ${product.name} to cart`}
      className="absolute bottom-2 right-2 rounded-full bg-white/80 p-1.5 text-brand backdrop-blur transition hover:scale-110 disabled:cursor-not-allowed disabled:text-neutral-400 disabled:hover:scale-100"
    >
      <ShoppingCart className="size-5" />
    </button>
  );
}

function WishlistButton({ product }: { product: Product }) {
  const { data: wishlist } = useWishlist();
  const toggle = useToggleWishlist();
  const saved = wishlist?.ids.includes(product._id) ?? false;
  return (
    <button
      type="button"
      onClick={() => toggle(product._id, saved)}
      aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
      aria-pressed={saved}
      className="absolute right-2 top-2 rounded-full bg-white/80 p-1.5 text-brand backdrop-blur transition hover:scale-110"
    >
      <Heart className="size-5" fill={saved ? 'currentColor' : 'none'} />
    </button>
  );
}

export function ProductCard({ product, showWishlist = false }: { product: Product; showWishlist?: boolean }) {
  const soldOut = product.totalStock <= 0;

  return (
    <article className="group relative flex h-full flex-col bg-white">
      <div className="relative aspect-square overflow-hidden rounded-md bg-neutral-100">
        <Link to={`/products/${product.slug}`} tabIndex={-1} aria-hidden className="block size-full">
          <SmartImage src={product.images[0]} loading="lazy" className="size-full" imgClassName="group-hover:scale-105" />
        </Link>
        {soldOut && (
          <span className="absolute left-2 top-2 rounded bg-neutral-900/80 px-2 py-0.5 text-xs font-medium text-white">
            Sold out
          </span>
        )}
        {showWishlist && <WishlistButton product={product} />}
        <AddToCartButton product={product} />
      </div>
      <div className="px-1 pb-2 pt-2 sm:px-2">
        <h3 className="line-clamp-2 min-h-[2.5em] text-[13px] font-medium leading-tight text-neutral-800">
          <Link to={`/products/${product.slug}`} className="hover:text-brand">
            {product.name}
          </Link>
        </h3>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-1 text-[13px]">
          <span className="font-semibold text-brand">
            {money(product.priceMin)}
            {product.priceMax > product.priceMin && `–${money(product.priceMax)}`}
          </span>
          {product.compareAtPrice > product.priceMin && (
            <s className="text-[11px] text-neutral-500">{money(product.compareAtPrice)}</s>
          )}
          {product.discountPercent > 0 && (
            <span className="text-[11px] text-deal">({product.discountPercent}% OFF)</span>
          )}
        </p>
      </div>
    </article>
  );
}

export function ProductGrid({
  products,
  className = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
  showWishlist = false,
}: {
  products: Product[];
  className?: string;
  showWishlist?: boolean;
}) {
  return (
    <div className={`grid gap-1.5 ${className}`}>
      {products.map((product) => (
        <ProductCard key={product._id} product={product} showWishlist={showWishlist} />
      ))}
    </div>
  );
}
