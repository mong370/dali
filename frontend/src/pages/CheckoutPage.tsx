import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Banknote } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { api, errorMessage } from '../api/client';
import { useQuote } from '../api/quote';
import { FieldError } from '../components/ui';
import { DISTRICTS } from '../lib/districts';
import { money } from '../lib/format';
import type { Order, User } from '../lib/types';
import { useTitle } from '../lib/useTitle';
import { useAuth } from '../store/auth';
import { useCart } from '../store/cart';
import { CartSkeleton } from '../components/Skeletons';

const schema = z.object({
  fullName: z.string().trim().min(2, 'Please enter the full name'),
  phone: z.string().trim().regex(/^(\+?88)?01[3-9]\d{8}$/, 'Enter a valid mobile number, e.g. 01712345678'),
  district: z.enum(DISTRICTS, 'Please choose a district'),
  area: z.string().trim().min(2, 'Please enter the area'),
  line1: z.string().trim().min(5, 'Please enter the full address'),
  note: z.string().trim().max(500).optional(),
  save: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

/** Works on plain HTTP too, where crypto.randomUUID is unavailable. */
function newKey() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export default function CheckoutPage() {
  useTitle('Checkout');
  const navigate = useNavigate();
  const client = useQueryClient();
  const user = useAuth((state) => state.user);
  const setUser = useAuth((state) => state.setUser);
  const { items, clear } = useCart();
  const saved = user?.addresses ?? [];
  const initial = saved.find((address) => address.isDefault) ?? saved[0];

  // One key per visit: if the response is lost and the customer retries, no second order is made.
  const [idempotencyKey] = useState(newKey);
  const placed = useRef(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponCode, setCouponCode] = useState<string>();
  const [selected, setSelected] = useState(initial?._id ?? 'new');

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: initial?.fullName ?? user?.name ?? '',
      phone: initial?.phone ?? user?.phone ?? '',
      district: (initial?.district as FormValues['district']) ?? 'Dhaka',
      area: initial?.area ?? '',
      line1: initial?.line1 ?? '',
      note: '',
      save: saved.length === 0,
    },
  });
  const district = useWatch({ control, name: 'district' });
  const { data: quote, isPending } = useQuote(items, { couponCode, district: district || undefined });

  const placeOrder = useMutation({
    mutationFn: async ({ save, note, ...address }: FormValues) => {
      const { data } = await api.post<{ order: Order }>('/orders', {
        idempotencyKey,
        items,
        shippingAddress: address,
        couponCode,
        note,
        paymentMethod: 'cod',
      });
      if (save && selected === 'new') {
        // The order already exists, so a failure to save the address must not surface as a checkout error.
        await api
          .post<{ user: User }>('/users/me/addresses', { ...address, label: 'Home' })
          .then((response) => setUser(response.data.user))
          .catch(() => undefined);
      }
      return data.order;
    },
    onSuccess: (order) => {
      placed.current = true;
      clear();
      client.invalidateQueries({ queryKey: ['orders'] });
      navigate(`/account/orders/${order._id}?placed=1`, { replace: true });
    },
    onError: (error) => {
      toast.error(errorMessage(error));
      client.invalidateQueries({ queryKey: ['quote'] });
    },
  });

  const chooseAddress = (id: string) => {
    setSelected(id);
    const address = saved.find((item) => item._id === id);
    reset({
      fullName: address?.fullName ?? user?.name ?? '',
      phone: address?.phone ?? user?.phone ?? '',
      district: (address?.district as FormValues['district']) ?? 'Dhaka',
      area: address?.area ?? '',
      line1: address?.line1 ?? '',
      note: '',
      save: !address,
    });
  };

  if (items.length === 0 && !placed.current && !placeOrder.isPending) return <Navigate to="/cart" replace />;
  if (isPending || !quote) return <CartSkeleton />;

  const blocked = quote.unavailable.length > 0 || quote.lines.some((line) => line.issue);

  return (
    <div className="container-page py-6">
      <h1 className="mb-4 font-heading text-2xl font-bold">Checkout</h1>
      <form noValidate onSubmit={handleSubmit((values) => placeOrder.mutate(values))} className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <section className="card p-4">
            <h2 className="mb-3 font-semibold">Delivery Address</h2>
            {saved.length > 0 && (
              <div className="mb-4 space-y-2">
                {saved.map((address) => (
                  <label key={address._id} className="flex cursor-pointer gap-2 rounded-lg border border-neutral-200 p-2.5 text-sm has-checked:border-brand has-checked:bg-brand-soft">
                    <input type="radio" name="address" className="mt-1 accent-brand" checked={selected === address._id} onChange={() => chooseAddress(address._id)} />
                    <span><strong>{address.label}</strong>: {address.fullName}, {address.line1}, {address.area}, {address.district}</span>
                  </label>
                ))}
                <label className="flex cursor-pointer gap-2 rounded-lg border border-neutral-200 p-2.5 text-sm has-checked:border-brand has-checked:bg-brand-soft">
                  <input type="radio" name="address" className="accent-brand" checked={selected === 'new'} onChange={() => chooseAddress('new')} />
                  Use a new address
                </label>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="fullName">Full name</label>
                <input id="fullName" autoComplete="name" className="input" {...register('fullName')} aria-invalid={!!errors.fullName} />
                <FieldError message={errors.fullName?.message} />
              </div>
              <div>
                <label className="label" htmlFor="phone">Mobile number</label>
                <input id="phone" type="tel" autoComplete="tel" className="input" placeholder="01712345678" {...register('phone')} aria-invalid={!!errors.phone} />
                <FieldError message={errors.phone?.message} />
              </div>
              <div>
                <label className="label" htmlFor="district">District</label>
                <select id="district" className="input" {...register('district')} aria-invalid={!!errors.district}>
                  {DISTRICTS.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
                <FieldError message={errors.district?.message} />
              </div>
              <div>
                <label className="label" htmlFor="area">Area / Thana</label>
                <input id="area" className="input" {...register('area')} aria-invalid={!!errors.area} />
                <FieldError message={errors.area?.message} />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="line1">Full address</label>
                <input id="line1" autoComplete="street-address" className="input" placeholder="House, road, landmark" {...register('line1')} aria-invalid={!!errors.line1} />
                <FieldError message={errors.line1?.message} />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="note">Delivery note (optional)</label>
                <textarea id="note" rows={2} className="input" {...register('note')} />
              </div>
              {selected === 'new' && (
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" className="accent-brand" {...register('save')} /> Save this address to my account
                </label>
              )}
            </div>
          </section>

          <section className="card p-4">
            <h2 className="mb-3 font-semibold">Payment</h2>
            <div className="flex items-center gap-3 rounded-lg border border-brand bg-brand-soft p-3 text-sm">
              <Banknote className="size-5 text-brand" />
              <span><strong>Cash on Delivery.</strong> Pay when your order arrives.</span>
            </div>
          </section>
        </div>

        <aside className="card h-fit p-4">
          <h2 className="font-semibold">Your Order</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {quote.lines.map((line) => (
              <li key={line.variant}>
                <div className="flex justify-between gap-3">
                  <span className="line-clamp-2">{line.name} × {line.quantity}</span>
                  <span className="shrink-0">{money(line.lineTotal)}</span>
                </div>
                {line.issue && <p className="text-xs text-red-600" role="alert">{line.issue}</p>}
              </li>
            ))}
            {quote.unavailable.map((line) => <li key={line.variant} className="text-xs text-red-600" role="alert">{line.issue}</li>)}
          </ul>

          <div className="mt-4 border-t border-neutral-200 pt-3">
            <label className="label" htmlFor="coupon">Coupon code</label>
            <div className="flex gap-2">
              <input id="coupon" className="input py-2 uppercase" value={couponInput} onChange={(event) => setCouponInput(event.target.value)} />
              <button type="button" className="btn-outline py-2" onClick={() => setCouponCode(couponInput.trim() || undefined)}>Apply</button>
            </div>
            {quote.couponError && <FieldError message={quote.couponError} />}
            {quote.couponCode && <p className="mt-1 text-xs text-green-700">Coupon {quote.couponCode} applied.</p>}
          </div>

          <dl className="mt-4 space-y-2 border-t border-neutral-200 pt-3 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(quote.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Delivery</dt><dd>{quote.shippingFee ? money(quote.shippingFee) : 'Free'}</dd></div>
            {quote.discount > 0 && (
              <div className="flex justify-between text-green-700"><dt>Discount</dt><dd>−{money(quote.discount)}</dd></div>
            )}
            <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-semibold">
              <dt>Total</dt><dd className="text-brand">{money(quote.total)}</dd>
            </div>
          </dl>
          <button className="btn-primary mt-4 w-full" disabled={placeOrder.isPending || blocked}>
            {placeOrder.isPending ? 'Placing your order…' : 'Place Order'}
          </button>
          {blocked && <p className="mt-2 text-xs text-red-600">Some items need attention. <Link to="/cart" className="underline">Review cart</Link></p>}
        </aside>
      </form>
    </div>
  );
}
