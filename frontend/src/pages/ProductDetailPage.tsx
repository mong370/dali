import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, Heart, Minus, Plus, RotateCcw, Star, Truck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import { useToggleWishlist, useWishlist } from '../api/wishlist';
import { ProductGrid } from '../components/ProductCard';
import { ErrorState, Pagination } from '../components/ui';
import { money, shortDate } from '../lib/format';
import type { Paginated, Product, Review, Variant } from '../lib/types';
import { useTitle } from '../lib/useTitle';
import { useAuth } from '../store/auth';
import { useCart } from '../store/cart';
import { LinesSkeleton, ProductDetailSkeleton } from '../components/Skeletons';
import { SmartImage } from '../components/SmartImage';

interface ProductResponse {
  product: Product;
  breadcrumb: { name: string; slug: string }[];
  related: Product[];
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className="size-4 text-amber-400" fill={star <= Math.round(value) ? 'currentColor' : 'none'} />
      ))}
    </span>
  );
}

function optionGroups(variants: Variant[]) {
  const groups = new Map<string, string[]>();
  for (const variant of variants) {
    for (const [name, value] of Object.entries(variant.options)) {
      const values = groups.get(name) ?? [];
      if (!values.includes(value)) values.push(value);
      groups.set(name, values);
    }
  }
  return [...groups.entries()];
}

function firstAvailable(variants: Variant[]) {
  return variants.find((variant) => variant.stock > 0) ?? variants[0];
}

function Purchase({ product }: { product: Product }) {
  const navigate = useNavigate();
  const add = useCart((state) => state.add);
  const { data: wishlist } = useWishlist();
  const toggleWishlist = useToggleWishlist();
  const saved = wishlist?.ids.includes(product._id) ?? false;

  const [selected, setSelected] = useState(() => firstAvailable(product.variants)?.options ?? {});
  const [quantity, setQuantity] = useState(product.minOrderQty);
  const groups = optionGroups(product.variants);
  const matches = (variant: Variant, options: Record<string, string>) =>
    Object.entries(options).every(([name, value]) => variant.options[name] === value);
  const variant = product.variants.find((item) => matches(item, selected));

  const inStock = (variant?.stock ?? 0) >= product.minOrderQty;
  const maxQuantity = Math.max(product.minOrderQty, variant?.stock ?? 1);

  const addToCart = () => {
    if (!variant) return false;
    add({ product: product._id, variant: variant._id, quantity });
    return true;
  };

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-3xl font-bold text-brand">{money(variant?.price ?? product.priceMin)}</span>
        {variant?.compareAtPrice && variant.compareAtPrice > variant.price && (
          <>
            <s className="text-neutral-500">{money(variant.compareAtPrice)}</s>
            <span className="text-sm font-medium text-deal">
              ({Math.round(((variant.compareAtPrice - variant.price) / variant.compareAtPrice) * 100)}% OFF)
            </span>
          </>
        )}
      </div>

      {groups.map(([name, values]) => (
        <fieldset key={name} className="mt-5">
          <legend className="mb-2 text-sm font-medium">
            {name}: <span className="font-normal text-neutral-600">{selected[name]}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {values.map((value) => {
              const next = { ...selected, [name]: value };
              const available = product.variants.some((item) => matches(item, next) && item.stock > 0);
              const active = selected[name] === value;
              return (
                <button key={value} type="button" aria-pressed={active}
                  onClick={() => {
                    setSelected(next);
                    setQuantity(product.minOrderQty);
                  }}
                  className={`rounded-lg border px-3.5 py-1.5 text-sm transition ${active ? 'border-brand bg-brand-soft font-medium text-brand' : 'border-neutral-300 hover:border-brand'} ${available ? '' : 'text-neutral-400 line-through'}`}>
                  {value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="mt-5 flex items-center gap-4">
        <div className="flex items-center rounded-lg border border-neutral-300">
          <button type="button" className="p-2.5 disabled:opacity-40" aria-label="Decrease quantity"
            disabled={quantity <= product.minOrderQty} onClick={() => setQuantity(quantity - 1)}>
            <Minus className="size-4" />
          </button>
          <span className="w-10 text-center text-sm font-medium" aria-live="polite" aria-label="Quantity">{quantity}</span>
          <button type="button" className="p-2.5 disabled:opacity-40" aria-label="Increase quantity"
            disabled={quantity >= maxQuantity} onClick={() => setQuantity(quantity + 1)}>
            <Plus className="size-4" />
          </button>
        </div>
        <p className={`text-sm ${inStock ? 'text-green-700' : 'text-red-600'}`}>
          {!inStock ? 'Out of stock' : variant && variant.stock <= 5 ? `Only ${variant.stock} left` : 'In stock'}
        </p>
      </div>
      {product.minOrderQty > 1 && (
        <p className="mt-2 text-xs text-neutral-600">Minimum order quantity: {product.minOrderQty}</p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button className="btn-outline min-w-36 flex-1 border-brand text-brand" disabled={!inStock}
          onClick={() => {
            if (addToCart()) toast.success('Added to cart');
          }}>
          Add to Cart
        </button>
        <button className="btn-primary min-w-36 flex-1" disabled={!inStock}
          onClick={() => {
            if (addToCart()) navigate('/checkout');
          }}>
          Buy Now
        </button>
        <button className="btn-outline px-3" aria-pressed={saved}
          aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
          onClick={() => toggleWishlist(product._id, saved)}>
          <Heart className="size-5 text-brand" fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      <ul className="mt-6 space-y-2 rounded-xl bg-brand-soft p-4 text-sm">
        <li className="flex items-center gap-2"><Banknote className="size-4 text-brand" /> Cash on delivery available</li>
        <li className="flex items-center gap-2"><Truck className="size-4 text-brand" /> Delivery within 48 hours</li>
        <li className="flex items-center gap-2"><RotateCcw className="size-4 text-brand" /> Easy returns. <Link to="/policies/returns" className="underline">See policy</Link></li>
      </ul>
    </div>
  );
}

function Reviews({ product }: { product: Product }) {
  const client = useQueryClient();
  const user = useAuth((state) => state.user);
  const [page, setPage] = useState(1);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const { data } = useQuery({
    queryKey: ['reviews', product._id, page],
    queryFn: async () =>
      (await api.get<Paginated<Review>>(`/reviews/product/${product._id}`, { params: { page, limit: 10 } })).data,
  });

  const submit = useMutation({
    mutationFn: () => api.post('/reviews', { product: product._id, rating, comment }),
    onSuccess: () => {
      toast.success('Thanks for your review!');
      setComment('');
      client.invalidateQueries({ queryKey: ['reviews', product._id] });
      client.invalidateQueries({ queryKey: ['product', product.slug] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <section className="mt-10" aria-labelledby="reviews">
      <h2 id="reviews" className="font-heading text-xl font-bold">
        Reviews {product.ratingCount > 0 && `(${product.ratingCount})`}
      </h2>
      {user ? (
        <form className="card mt-3 max-w-xl space-y-3 p-4"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            submit.mutate();
          }}>
          <p className="text-xs text-neutral-600">You can review products that have been delivered to you.</p>
          <label className="block">
            <span className="label">Your rating</span>
            <select className="input w-auto" value={rating} onChange={(event) => setRating(Number(event.target.value))}>
              {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}
            </select>
          </label>
          <label className="block">
            <span className="label">Your review</span>
            <textarea className="input" rows={3} maxLength={2000} value={comment} onChange={(event) => setComment(event.target.value)} />
          </label>
          <button className="btn-primary" disabled={submit.isPending}>Submit review</button>
        </form>
      ) : (
        <p className="mt-2 text-sm text-neutral-600"><Link to="/login" className="text-brand underline">Sign in</Link> to review products you have bought.</p>
      )}
      {!data && <LinesSkeleton />}
      <ul className="mt-4 divide-y divide-neutral-200">
        {data?.items.map((review) => (
          <li key={review._id} className="py-3">
            <div className="flex items-center gap-2 text-sm">
              <Stars value={review.rating} />
              <span className="font-medium">{review.userName}</span>
              <span className="text-xs text-neutral-500">{shortDate(review.createdAt)}</span>
            </div>
            {review.comment && <p className="mt-1 text-sm text-neutral-700">{review.comment}</p>}
          </li>
        ))}
        {data?.items.length === 0 && <li className="py-3 text-sm text-neutral-600">No reviews yet.</li>}
      </ul>
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </section>
  );
}

export default function ProductDetailPage() {
  const { slug } = useParams();
  const [image, setImage] = useState(0);
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => (await api.get<ProductResponse>(`/products/${slug}`)).data,
  });
  useTitle(data?.product.name);

  if (isPending) return <ProductDetailSkeleton />;
  if (error) return <div className="container-page"><ErrorState error={error} onRetry={refetch} /></div>;

  const { product, breadcrumb, related } = data;
  return (
    <div className="container-page py-5">
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap gap-1.5 text-xs text-neutral-600">
        <Link to="/" className="hover:text-brand">Home</Link>
        {breadcrumb.map((crumb) => (
          <span key={crumb.slug} className="flex gap-1.5">
            <span aria-hidden>/</span>
            <Link to={`/products?category=${crumb.slug}`} className="hover:text-brand">{crumb.name}</Link>
          </span>
        ))}
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-xl bg-neutral-100">
            <SmartImage src={product.images[image]} alt={product.name} className="size-full" />
          </div>
          {product.images.length > 1 && (
            <div className="mt-2 flex gap-2">
              {product.images.map((src, index) => (
                <button key={src} onClick={() => setImage(index)} aria-label={`Show image ${index + 1}`} aria-current={index === image}
                  className={`size-16 overflow-hidden rounded-lg border-2 ${index === image ? 'border-brand' : 'border-transparent'}`}>
                  <SmartImage src={src} className="size-full" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          {product.brand && (
            <Link to={`/products?brand=${encodeURIComponent(product.brand)}`} className="text-sm text-neutral-600 hover:text-brand">{product.brand}</Link>
          )}
          <h1 className="mt-1 text-2xl font-semibold leading-snug">{product.name}</h1>
          {product.ratingCount > 0 && (
            <p className="mt-1 flex items-center gap-2 text-sm text-neutral-600">
              <Stars value={product.ratingAvg} /> {product.ratingAvg} ({product.ratingCount})
            </p>
          )}
          <div className="mt-4"><Purchase key={product._id} product={product} /></div>
        </div>
      </div>

      <section className="mt-10 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="font-heading text-xl font-bold">Description</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-neutral-700">{product.description}</p>
        </div>
        {(product.attributes?.length ?? 0) > 0 && (
          <div>
            <h2 className="font-heading text-xl font-bold">Specifications</h2>
            <dl className="mt-2 divide-y divide-neutral-200 text-sm">
              {product.attributes?.map((attribute) => (
                <div key={attribute.name} className="flex gap-4 py-2">
                  <dt className="w-36 shrink-0 text-neutral-600">{attribute.name}</dt>
                  <dd>{attribute.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </section>

      <Reviews product={product} />

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-2 font-heading text-xl font-bold">You may also like</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
