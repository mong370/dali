import { Minus, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuote } from '../api/quote';
import { EmptyState, ErrorState } from '../components/ui';
import { money } from '../lib/format';
import { useTitle } from '../lib/useTitle';
import { useCart } from '../store/cart';
import { CartSkeleton } from '../components/Skeletons';
import { SmartImage } from '../components/SmartImage';

export default function CartPage() {
  useTitle('Cart');
  const { items, setQuantity, remove } = useCart();
  const { data: quote, error, isPending, refetch } = useQuote(items);

  if (items.length === 0) {
    return (
      <div className="animate-slide-in-right">
        <EmptyState icon="🧺" title="Your basket is empty">
          <Link to="/products" className="btn-primary mt-3">Start shopping</Link>
        </EmptyState>
      </div>
    );
  }
  if (isPending) return <CartSkeleton />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const blocked = quote.unavailable.length > 0 || quote.lines.some((line) => line.issue);

  return (
    <div className="container-page animate-slide-in-right py-6">
      <h1 className="mb-4 font-heading text-2xl font-bold">Your Cart</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <ul className="card divide-y divide-neutral-200">
          {quote.lines.map((line) => (
            <li key={line.variant} className="flex gap-3 p-3 sm:gap-4">
              <Link to={`/products/${line.slug}`} className="shrink-0">
                <SmartImage src={line.image} className="size-20 rounded-lg sm:size-24" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/products/${line.slug}`} className="line-clamp-2 text-sm font-medium hover:text-brand">{line.name}</Link>
                {Object.keys(line.options).length > 0 && (
                  <p className="mt-0.5 text-xs text-neutral-600">
                    {Object.entries(line.options).map(([name, value]) => `${name}: ${value}`).join(', ')}
                  </p>
                )}
                <p className="mt-1 text-sm font-semibold text-brand">{money(line.unitPrice)}</p>
                {line.issue && <p className="mt-1 text-xs font-medium text-red-600" role="alert">{line.issue}</p>}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center rounded-lg border border-neutral-300">
                    <button className="p-1.5 disabled:opacity-40" aria-label={`Decrease quantity of ${line.name}`}
                      disabled={line.quantity <= Math.max(1, line.minOrderQty)}
                      onClick={() => setQuantity(line.product, line.variant, line.quantity - 1)}>
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm">{line.quantity}</span>
                    <button className="p-1.5 disabled:opacity-40" aria-label={`Increase quantity of ${line.name}`}
                      disabled={line.quantity >= line.stock}
                      onClick={() => setQuantity(line.product, line.variant, line.quantity + 1)}>
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <span className="text-sm font-semibold">{money(line.lineTotal)}</span>
                  <button className="p-1.5 text-neutral-500 hover:text-red-600" aria-label={`Remove ${line.name}`}
                    onClick={() => remove(line.product, line.variant)}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
          {quote.unavailable.map((line) => (
            <li key={line.variant} className="flex items-center justify-between gap-3 p-3 text-sm">
              <span className="text-red-600" role="alert">{line.issue}</span>
              <button className="btn-outline py-1" onClick={() => remove(line.product, line.variant)}>Remove</button>
            </li>
          ))}
        </ul>

        <aside className="card h-fit p-4">
          <h2 className="font-semibold">Order Summary</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(quote.subtotal)}</dd></div>
            <div className="flex justify-between">
              <dt>Delivery (inside Dhaka)</dt>
              <dd>{quote.shippingFee ? money(quote.shippingFee) : 'Free'}</dd>
            </div>
            <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-semibold">
              <dt>Total</dt><dd className="text-brand">{money(quote.total)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-neutral-600">Coupons and the delivery fee for your address are applied at checkout.</p>
          {blocked && <p className="mt-3 text-xs font-medium text-red-600">Please fix the highlighted items to continue.</p>}
          <Link to="/checkout" aria-disabled={blocked}
            className={`btn-primary mt-3 w-full ${blocked ? 'pointer-events-none opacity-50' : ''}`}>
            Proceed to Checkout
          </Link>
          <Link to="/products" className="mt-2 block text-center text-sm text-brand hover:underline">Continue shopping</Link>
        </aside>
      </div>
    </div>
  );
}
