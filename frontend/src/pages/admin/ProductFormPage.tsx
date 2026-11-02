import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star, Trash2, X } from 'lucide-react';
import { useEffect } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { api, errorMessage } from '../../api/client';
import { FormSkeleton } from '../../components/Skeletons';
import { SmartImage } from '../../components/SmartImage';
import { toPoisha, toTaka } from '../../lib/format';
import type { Product } from '../../lib/types';
import { useTitle } from '../../lib/useTitle';
import { ImagesDropzone } from './ImageField';
import { FormActions, categoryLabel, useAdminCategories, useBackUrl } from './listKit';

const MAX_IMAGES = 10;

const SECTIONS = [
  ['customer-favorites', 'Customer Favorites'],
  ['for-you', 'For You'],
  ['featured', 'Featured Products'],
  ['trending', 'Trending Now'],
  ['best-deal', 'Best Deal'],
  ['first-order-deal', 'First Order Deal'],
] as const;

interface VariantValues {
  _id?: string;
  sku: string;
  options: string;
  price: number;
  compareAtPrice?: number | '';
  stock: number;
}

interface FormValues {
  name: string;
  brand: string;
  description: string;
  category: string;
  status: 'active' | 'draft';
  minOrderQty: number;
  sections: string[];
  images: string[];
  attributes: string;
  tags: string;
  variants: VariantValues[];
}

const EMPTY_VARIANT: VariantValues = { sku: '', options: '', price: 0, compareAtPrice: '', stock: 0 };

/** Parses "Size: M, Colour: Red" style text into name and value pairs. */
function parsePairs(text: string, separator: RegExp) {
  return text
    .split(separator)
    .map((pair) => pair.split(':').map((part) => part.trim()))
    .filter(([name, value]) => name && value)
    .map(([name, ...rest]) => ({ name: name as string, value: rest.join(': ') }));
}

function toFormValues(product: Product): FormValues {
  return {
    name: product.name,
    brand: product.brand,
    description: product.description ?? '',
    category: product.category,
    status: product.status,
    minOrderQty: product.minOrderQty,
    sections: product.sections,
    images: product.images,
    tags: (product.tags ?? []).join(', '),
    attributes: (product.attributes ?? []).map(({ name, value }) => `${name}: ${value}`).join('\n'),
    variants: product.variants.map((variant) => ({
      _id: variant._id,
      sku: variant.sku ?? '',
      options: Object.entries(variant.options).map(([name, value]) => `${name}: ${value}`).join(', '),
      price: toTaka(variant.price),
      compareAtPrice: variant.compareAtPrice ? toTaka(variant.compareAtPrice) : '',
      stock: variant.stock,
    })),
  };
}

function toPayload(values: FormValues) {
  return {
    name: values.name,
    brand: values.brand,
    description: values.description,
    category: values.category,
    status: values.status,
    minOrderQty: Number(values.minOrderQty),
    sections: values.sections,
    images: values.images,
    tags: values.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    attributes: parsePairs(values.attributes, /\n/),
    variants: values.variants.map((variant) => ({
      ...(variant._id && { _id: variant._id }),
      sku: variant.sku,
      options: Object.fromEntries(parsePairs(variant.options, /,/).map(({ name, value }) => [name, value])),
      price: toPoisha(Number(variant.price)),
      ...(variant.compareAtPrice ? { compareAtPrice: toPoisha(Number(variant.compareAtPrice)) } : {}),
      stock: Number(variant.stock),
    })),
  };
}

export default function ProductFormPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  useTitle(isNew ? 'Add product' : 'Edit product');
  const navigate = useNavigate();
  const client = useQueryClient();
  const backTo = useBackUrl('/admin/products');
  const { data: categories = [], isPending: categoriesLoading } = useAdminCategories();

  const { data: product, isPending } = useQuery({
    queryKey: ['admin', 'product', id],
    enabled: !isNew,
    queryFn: async () => (await api.get<{ product: Product }>(`/products/admin/${id}`)).data.product,
  });

  const { register, control, handleSubmit, reset, setValue, getValues, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      name: '', brand: '', description: '', category: '', status: 'active', minOrderQty: 1,
      sections: [], images: [], attributes: '', tags: '', variants: [EMPTY_VARIANT],
    },
  });
  const variants = useFieldArray({ control, name: 'variants' });
  const images = useWatch({ control, name: 'images' });

  // Categories load separately, so wait for them or the select cannot show its value.
  useEffect(() => {
    if (product && categories.length > 0) reset(toFormValues(product));
  }, [product, categories.length, reset]);

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = toPayload(values);
      return isNew ? api.post('/products', payload) : api.patch(`/products/${id}`, payload);
    },
    onSuccess: () => {
      toast.success(isNew ? 'Product saved' : 'Product updated');
      client.invalidateQueries({ queryKey: ['admin'] });
      client.invalidateQueries({ queryKey: ['products'] });
      client.invalidateQueries({ queryKey: ['product'] });
      client.invalidateQueries({ queryKey: ['home'] });
      navigate(backTo);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if ((!isNew && isPending) || categoriesLoading) return <FormSkeleton sections={3} className="w-full" />;

  return (
    <form noValidate onSubmit={handleSubmit((values) => save.mutate(values))} className="space-y-4">
      <h1 className="text-2xl font-semibold">{isNew ? 'Add product' : 'Edit product'}</h1>

      <div className="grid items-start gap-4 xl:grid-cols-[3fr_2fr]">
        <div className="min-w-0 space-y-4">
          <section className="card space-y-3 p-4">
            <h2 className="font-semibold">Details</h2>
            <div>
              <label className="label" htmlFor="name">Name</label>
              <input id="name" className="input" {...register('name', { required: 'Name is required' })} aria-invalid={!!errors.name} />
              {errors.name && <p className="mt-1 text-xs text-red-600" role="alert">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label" htmlFor="description">Description</label>
              <textarea id="description" rows={5} className="input" {...register('description')} />
            </div>
          </section>

          <section className="card p-4">
            <h2 className="font-semibold">Variants and pricing</h2>
            <p className="mb-3 text-xs text-neutral-600">Add one row per version you sell. Leave options empty if there is only one version. Prices are in taka.</p>
            <div className="space-y-3">
              {variants.fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-2 items-end gap-2 rounded-lg bg-neutral-50 p-3 lg:grid-cols-[1fr_1.4fr_0.8fr_0.8fr_0.6fr_auto]">
                  <div className="col-span-2 lg:col-span-1">
                    <label className="label text-xs" htmlFor={`sku-${index}`}>SKU</label>
                    <input id={`sku-${index}`} className="input py-2" {...register(`variants.${index}.sku`, { required: 'SKU is required' })} aria-invalid={!!errors.variants?.[index]?.sku} />
                  </div>
                  <div className="col-span-2 lg:col-span-1">
                    <label className="label text-xs" htmlFor={`options-${index}`}>Options</label>
                    <input id={`options-${index}`} className="input py-2" placeholder="Size: M, Colour: Red" {...register(`variants.${index}.options`)} />
                  </div>
                  <div>
                    <label className="label text-xs" htmlFor={`price-${index}`}>Price (৳)</label>
                    <input id={`price-${index}`} type="number" min={0} step="0.01" className="input py-2" {...register(`variants.${index}.price`, { required: true, min: 0 })} />
                  </div>
                  <div>
                    <label className="label text-xs" htmlFor={`compare-${index}`}>Was (৳)</label>
                    <input id={`compare-${index}`} type="number" min={0} step="0.01" className="input py-2" {...register(`variants.${index}.compareAtPrice`)} />
                  </div>
                  <div>
                    <label className="label text-xs" htmlFor={`stock-${index}`}>Stock</label>
                    <input id={`stock-${index}`} type="number" min={0} className="input py-2" {...register(`variants.${index}.stock`, { required: true, min: 0 })} />
                  </div>
                  <button type="button" aria-label={`Remove variant ${index + 1}`} title="Remove" className="justify-self-end p-2 text-neutral-500 hover:text-red-600 disabled:opacity-30"
                    disabled={variants.fields.length === 1} onClick={() => variants.remove(index)}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
            {errors.variants && <p className="mt-2 text-xs text-red-600" role="alert">Each variant needs a SKU, a price and a stock number.</p>}
            <button type="button" className="btn-outline mt-3 py-2" onClick={() => variants.append(EMPTY_VARIANT)}>Add variant</button>
          </section>

          <section className="card grid gap-3 p-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="attributes">Specifications</label>
              <textarea id="attributes" rows={4} className="input" placeholder={'Material: Cotton\nWarranty: 1 year'} {...register('attributes')} />
              <p className="mt-1 text-xs text-neutral-600">One per line, as Name: Value</p>
            </div>
            <div>
              <label className="label" htmlFor="tags">Search tags</label>
              <input id="tags" className="input" placeholder="summer, gift" {...register('tags')} />
              <p className="mt-1 text-xs text-neutral-600">Separate with commas</p>
            </div>
          </section>
        </div>

        <div className="min-w-0 space-y-4">
          <section className="card space-y-3 p-4">
            <h2 className="font-semibold">Images</h2>
            {images.length < MAX_IMAGES && (
              <ImagesDropzone folder="products" room={MAX_IMAGES - images.length} onAdded={(url) => setValue('images', [...getValues('images'), url])} />
            )}
            {images.length > 0 && (
              <>
                <ul className="flex flex-wrap gap-2">
                  {images.map((src, index) => (
                    <li key={src} className="relative">
                      <SmartImage src={src} className={`size-20 rounded-lg border-2 ${index === 0 ? 'border-brand' : 'border-transparent'}`} />
                      {index === 0 ? (
                        <span className="absolute bottom-1 left-1 rounded bg-brand px-1 text-[10px] font-semibold text-white">Main</span>
                      ) : (
                        <button type="button" title="Make main image" aria-label={`Make image ${index + 1} the main image`} className="absolute bottom-1 left-1 rounded-full bg-white/90 p-1 text-brand shadow"
                          onClick={() => setValue('images', [src, ...images.filter((image) => image !== src)])}>
                          <Star className="size-3" />
                        </button>
                      )}
                      <button type="button" title="Remove" aria-label={`Remove image ${index + 1}`} className="absolute -right-1.5 -top-1.5 rounded-full bg-neutral-900 p-1 text-white"
                        onClick={() => setValue('images', images.filter((image) => image !== src))}>
                        <X className="size-3" />
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-neutral-600">{images.length} of {MAX_IMAGES} images. The main image shows on product cards.</p>
              </>
            )}
          </section>

          <section className="card grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <h2 className="font-semibold sm:col-span-full">Organise</h2>
            <div>
              <label className="label" htmlFor="category">Category</label>
              <select id="category" className="input" {...register('category', { required: 'Choose a category' })} aria-invalid={!!errors.category}>
                <option value="">Choose…</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>{categoryLabel(category, categories)}</option>
                ))}
              </select>
              {errors.category && <p className="mt-1 text-xs text-red-600" role="alert">{errors.category.message}</p>}
            </div>
            <div>
              <label className="label" htmlFor="brand">Brand</label>
              <input id="brand" className="input" {...register('brand')} />
            </div>
            <div>
              <label className="label" htmlFor="status">Status</label>
              <select id="status" className="input" {...register('status')}>
                <option value="active">Active (visible in store)</option>
                <option value="draft">Draft (hidden)</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="minOrderQty">Minimum order quantity</label>
              <input id="minOrderQty" type="number" min={1} className="input" {...register('minOrderQty')} />
            </div>
          </section>

          <section className="card p-4">
            <fieldset>
              <legend className="font-semibold">Show on homepage</legend>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                {SECTIONS.map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" value={value} className="size-4 accent-brand" {...register('sections')} /> {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </section>
        </div>
      </div>

      <FormActions isEdit={!isNew} pending={save.isPending} backTo={backTo} />
    </form>
  );
}
