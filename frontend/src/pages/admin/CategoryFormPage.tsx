import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, errorMessage } from '../../api/client';
import { CategoryIcon, EmptyState, ErrorState } from '../../components/ui';
import type { AdminCategory } from '../../lib/types';
import { useTitle } from '../../lib/useTitle';
import { ImageDropzone } from './ImageField';
import { FormActions, useAdminCategories, useBackUrl } from './listKit';
import { FormSkeleton } from '../../components/Skeletons';

function CategoryForm({ category, categories }: { category?: AdminCategory; categories: AdminCategory[] }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const listUrl = useBackUrl('/admin/categories');
  const [form, setForm] = useState({
    name: category?.name ?? '',
    icon: category?.icon ?? '🛍️',
    image: category?.image ?? '',
    parent: category?.parent ?? '',
    sortOrder: category?.sortOrder ?? 0,
    showInNav: category?.showInNav ?? false,
    homeShowcase: category?.homeShowcase ?? false,
    isActive: category?.isActive ?? true,
  });

  const save = useMutation({
    mutationFn: () => {
      const payload = { ...form, parent: form.parent || null, image: form.image || null };
      return category ? api.patch(`/categories/${category._id}`, payload) : api.post('/categories', payload);
    },
    onSuccess: () => {
      toast.success(category ? 'Category updated' : 'Category saved');
      client.invalidateQueries({ queryKey: ['admin', 'categories'] });
      client.invalidateQueries({ queryKey: ['categories'] });
      client.invalidateQueries({ queryKey: ['home'] });
      navigate(listUrl);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const parents = categories.filter((item) => !item.parent && item._id !== category?._id);
  const toggles = [
    ['isActive', 'Visible in store', 'Hidden categories do not appear to customers.'],
    ['showInNav', 'Show in header navigation', 'Adds it to the pills under the search bar.'],
    ['homeShowcase', 'Show product card on homepage', 'Up to 4 categories can appear as cards.'],
  ] as const;

  return (
    <form
      className="space-y-4"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <h1 className="text-2xl font-semibold">{category ? 'Edit category' : 'Add category'}</h1>

      <div className="grid items-start gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-4">
          <section className="card grid gap-3 p-4 sm:grid-cols-2">
            <h2 className="font-semibold sm:col-span-2">Details</h2>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="name">Name</label>
              <input id="name" required minLength={2} maxLength={80} className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="parent">Parent category</label>
              <select id="parent" className="input" value={form.parent} onChange={(event) => setForm({ ...form, parent: event.target.value })}>
                <option value="">None (top level)</option>
                {parents.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="sortOrder">Position</label>
              <input id="sortOrder" type="number" className="input" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} />
              <p className="mt-1 text-xs text-neutral-600">Lower numbers appear first.</p>
            </div>
          </section>

          <section className="card divide-y divide-neutral-100 px-4 py-1">
            <h2 className="py-3 font-semibold">Where it shows</h2>
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
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Icon image</h2>
            {form.image && (
              <button type="button" className="px-1.5 py-1 text-xs font-medium text-red-600 hover:underline" onClick={() => setForm({ ...form, image: '' })}>
                Remove image
              </button>
            )}
          </div>
          <ImageDropzone folder="categories" value={form.image} onChange={(image) => setForm((current) => ({ ...current, image }))} />
          <p className="text-xs text-neutral-600">A square PNG or WebP with a transparent background looks best.</p>
          <div className="flex items-center gap-3 border-t border-neutral-100 pt-3">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50">
              <CategoryIcon category={form} className="flex size-10 items-center justify-center text-3xl leading-none" />
            </span>
            <div className="min-w-0 flex-1">
              <label className="label" htmlFor="icon">Emoji</label>
              <input id="icon" maxLength={16} className="input" value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })} />
            </div>
          </div>
          <p className="text-xs text-neutral-600">The emoji shows when there is no image. The preview shows what customers will see.</p>
        </section>
      </div>

      <FormActions isEdit={Boolean(category)} pending={save.isPending} backTo={listUrl} />
    </form>
  );
}

export default function CategoryFormPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  useTitle(isNew ? 'Add category' : 'Edit category');
  const { data: categories, error, isPending, refetch } = useAdminCategories();

  if (isPending) return <FormSkeleton className="w-full" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const category = categories.find((item) => item._id === id);
  if (!isNew && !category) {
    return (
      <EmptyState icon="🗂️" title="Category not found">
        <Link to="/admin/categories" className="btn-primary mt-3">Back to categories</Link>
      </EmptyState>
    );
  }
  return <CategoryForm key={id} category={category} categories={categories} />;
}
