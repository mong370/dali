import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, errorMessage } from '../../api/client';
import { FormSkeleton } from '../../components/Skeletons';
import { EmptyState, ErrorState } from '../../components/ui';
import { toPoisha, toTaka } from '../../lib/format';
import type { Coupon } from '../../lib/types';
import { useTitle } from '../../lib/useTitle';
import { useAdminCoupons } from './CouponsPage';
import { FormActions, useBackUrl } from './listKit';

/** The calendar date in Bangladesh, for the date input. */
const dhakaDate = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });

function CouponForm({ coupon }: { coupon?: Coupon }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const backTo = useBackUrl('/admin/coupons');
  const [form, setForm] = useState({
    code: coupon?.code ?? '',
    description: coupon?.description ?? '',
    type: coupon?.type ?? ('percent' as Coupon['type']),
    value: coupon ? (coupon.type === 'fixed' ? toTaka(coupon.value) : coupon.value) : 10,
    maxDiscount: coupon ? toTaka(coupon.maxDiscount) : 0,
    minSubtotal: coupon ? toTaka(coupon.minSubtotal) : 0,
    usageLimit: coupon?.usageLimit ?? 0,
    expiresAt: coupon?.expiresAt ? dhakaDate(coupon.expiresAt) : '',
    firstOrderOnly: coupon?.firstOrderOnly ?? false,
    isActive: coupon?.isActive ?? true,
  });

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        code: form.code,
        description: form.description,
        type: form.type,
        // A percentage stays as entered; taka amounts are stored in poisha.
        value: form.type === 'fixed' ? toPoisha(form.value) : form.type === 'percent' ? form.value : 0,
        maxDiscount: form.type === 'fixed' ? 0 : toPoisha(form.maxDiscount),
        minSubtotal: toPoisha(form.minSubtotal),
        usageLimit: form.usageLimit,
        firstOrderOnly: form.firstOrderOnly,
        isActive: form.isActive,
        // The code works until the end of the chosen day in Bangladesh.
        expiresAt: form.expiresAt ? `${form.expiresAt}T23:59:59+06:00` : null,
      };
      return coupon ? api.patch(`/coupons/${coupon._id}`, payload) : api.post('/coupons', payload);
    },
    onSuccess: () => {
      toast.success(coupon ? 'Coupon updated' : 'Coupon saved');
      client.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      navigate(backTo);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const number = (key: 'value' | 'maxDiscount' | 'minSubtotal' | 'usageLimit', label: string, help?: string) => (
    <div>
      <label className="label" htmlFor={key}>{label}</label>
      <input id={key} type="number" min={0} step={key === 'usageLimit' || (key === 'value' && form.type === 'percent') ? 1 : 'any'} max={key === 'value' && form.type === 'percent' ? 100 : undefined} className="input" value={form[key]} onChange={(event) => setForm({ ...form, [key]: Number(event.target.value) })} />
      {help && <p className="mt-1 text-xs text-neutral-600">{help}</p>}
    </div>
  );

  const toggles = [
    ['isActive', 'Turned on', 'Customers can use this code while it is on.'],
    ['firstOrderOnly', 'First order only', 'Only customers with no earlier orders can use it.'],
  ] as const;

  return (
    <form
      className="space-y-4"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <h1 className="text-2xl font-semibold">{coupon ? 'Edit coupon' : 'Add coupon'}</h1>

      <div className="grid items-start gap-4 lg:grid-cols-[3fr_2fr]">
        <section className="card grid gap-3 p-4 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">Details</h2>
          <div>
            <label className="label" htmlFor="code">Code</label>
            <input id="code" required minLength={3} maxLength={40} className="input uppercase" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="type">Type</label>
            <select id="type" className="input" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as Coupon['type'] })}>
              <option value="percent">Percentage off</option>
              <option value="fixed">Fixed amount off</option>
              <option value="free_shipping">Free shipping</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="description">Description</label>
            <input id="description" maxLength={200} className="input" placeholder="10% off your first order" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </div>
          {form.type !== 'free_shipping' && number('value', form.type === 'percent' ? 'Percent' : 'Amount (৳)')}
          {form.type !== 'fixed' && number('maxDiscount', 'Maximum discount (৳)', '0 means no maximum.')}
        </section>

        <div className="space-y-4">
          <section className="card grid gap-3 p-4 sm:grid-cols-2">
            <h2 className="font-semibold sm:col-span-2">Limits</h2>
            {number('minSubtotal', 'Minimum order (৳)')}
            {number('usageLimit', 'Usage limit', '0 means unlimited.')}
            <div className="sm:col-span-2">
              <label className="label" htmlFor="expiresAt">Expires on (optional)</label>
              <input id="expiresAt" type="date" className="input" value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} />
            </div>
            {coupon && <p className="text-xs text-neutral-600 sm:col-span-2">Used {coupon.usedCount} {coupon.usedCount === 1 ? 'time' : 'times'} so far.</p>}
          </section>

          <section className="card divide-y divide-neutral-100 px-4 py-1">
            {toggles.map(([key, label, help]) => (
              <label key={key} className="flex cursor-pointer items-start gap-3 py-3 text-sm">
                <input type="checkbox" className="mt-0.5 size-4 accent-brand" checked={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.checked })} />
                <span>
                  <span className="block font-medium">{label}</span>
                  <span className="block text-xs text-neutral-600">{help}</span>
                </span>
              </label>
            ))}
          </section>
        </div>
      </div>

      <FormActions isEdit={Boolean(coupon)} pending={save.isPending} backTo={backTo} />
    </form>
  );
}

export default function CouponFormPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  useTitle(isNew ? 'Add coupon' : 'Edit coupon');
  const { data: coupons, error, isPending, refetch } = useAdminCoupons();

  if (isPending) return <FormSkeleton className="w-full" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const coupon = coupons.find((item) => item._id === id);
  if (!isNew && !coupon) {
    return (
      <EmptyState icon="🎟️" title="Coupon not found">
        <Link to="/admin/coupons" className="btn-primary mt-3">Back to coupons</Link>
      </EmptyState>
    );
  }
  return <CouponForm key={id} coupon={coupon} />;
}
