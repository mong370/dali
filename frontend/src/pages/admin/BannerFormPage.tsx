import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, errorMessage } from '../../api/client';
import { FormSkeleton } from '../../components/Skeletons';
import { EmptyState, ErrorState } from '../../components/ui';
import { toPoisha, toTaka } from '../../lib/format';
import type { Banner } from '../../lib/types';
import { useTitle } from '../../lib/useTitle';
import { useAdminBanners } from './ContentPage';
import { ImageDropzone } from './ImageField';
import { FormActions, useBackUrl } from './listKit';

function BannerForm({ banner }: { banner?: Banner }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const backTo = useBackUrl('/admin/content');
  const [imageMissing, setImageMissing] = useState(false);
  const [form, setForm] = useState({
    eyebrow: banner?.eyebrow ?? '',
    title: banner?.title ?? '',
    subtitle: banner?.subtitle ?? '',
    image: banner?.image ?? '',
    link: banner?.link ?? '/products',
    cta: banner?.cta ?? 'Shop now',
    fromPrice: banner ? toTaka(banner.fromPrice) : 0,
    sortOrder: banner?.sortOrder ?? 0,
    dark: banner?.dark ?? true,
    isActive: banner?.isActive ?? true,
  });

  const save = useMutation({
    mutationFn: () => {
      const payload = { ...form, placement: 'hero', fromPrice: toPoisha(form.fromPrice) };
      return banner ? api.patch(`/content/banners/${banner._id}`, payload) : api.post('/content/banners', payload);
    },
    onSuccess: () => {
      toast.success(banner ? 'Banner updated' : 'Banner saved');
      client.invalidateQueries({ queryKey: ['admin', 'content'] });
      client.invalidateQueries({ queryKey: ['home'] });
      navigate(backTo);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const text = (key: 'eyebrow' | 'title' | 'subtitle' | 'link' | 'cta', label: string, wide = false) => (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <label className="label" htmlFor={`banner-${key}`}>{label}</label>
      <input id={`banner-${key}`} className="input" required={key === 'title'} minLength={key === 'title' ? 2 : undefined} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
    </div>
  );
  const toggles = [
    ['isActive', 'Live on homepage', 'Hidden banners do not appear in the carousel.'],
    ['dark', 'White text', 'Turn on for dark images, off for light ones.'],
  ] as const;

  return (
    <form
      className="space-y-4"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        if (!form.image) {
          setImageMissing(true);
          return;
        }
        save.mutate();
      }}
    >
      <h1 className="text-2xl font-semibold">{banner ? 'Edit banner' : 'Add banner'}</h1>

      <div className="grid items-start gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-4">
          <section className="card grid gap-3 p-4 sm:grid-cols-2">
            <h2 className="font-semibold sm:col-span-2">Details</h2>
            {text('title', 'Title', true)}
            {text('eyebrow', 'Small heading')}
            {text('subtitle', 'Subtitle')}
            {text('link', 'Link')}
            {text('cta', 'Link text')}
            <div>
              <label className="label" htmlFor="fromPrice">“From” price (৳)</label>
              <input id="fromPrice" type="number" min={0} step="any" className="input" value={form.fromPrice} onChange={(event) => setForm({ ...form, fromPrice: Number(event.target.value) })} />
              <p className="mt-1 text-xs text-neutral-600">0 hides the price.</p>
            </div>
            <div>
              <label className="label" htmlFor="sortOrder">Position</label>
              <input id="sortOrder" type="number" className="input" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} />
              <p className="mt-1 text-xs text-neutral-600">Lower numbers appear first.</p>
            </div>
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

        <section className="card space-y-3 p-4">
          <h2 className="font-semibold">Banner image</h2>
          <ImageDropzone
            folder="banners"
            value={form.image}
            fit="cover"
            onChange={(image) => {
              setImageMissing(false);
              setForm((current) => ({ ...current, image }));
            }}
          />
          {imageMissing && <p className="text-xs font-medium text-red-600" role="alert">Add an image before saving.</p>}
          <p className="text-xs text-neutral-600">A tall image works best, about 3 wide by 4 high.</p>
        </section>
      </div>

      <FormActions isEdit={Boolean(banner)} pending={save.isPending} backTo={backTo} />
    </form>
  );
}

export default function BannerFormPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  useTitle(isNew ? 'Add banner' : 'Edit banner');
  const { data: banners, error, isPending, refetch } = useAdminBanners();

  if (isPending) return <FormSkeleton className="w-full" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const banner = banners.find((item) => item._id === id);
  if (!isNew && !banner) {
    return (
      <EmptyState icon="🖼️" title="Banner not found">
        <Link to="/admin/content" className="btn-primary mt-3">Back to banners</Link>
      </EmptyState>
    );
  }
  return <BannerForm key={id} banner={banner} />;
}
