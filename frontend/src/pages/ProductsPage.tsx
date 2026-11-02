import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { BasketSearchAnimation } from '../components/BasketSearchAnimation';
import { ProductGrid } from '../components/ProductCard';
import { CategoryIcon, ErrorState, Pagination } from '../components/ui';
import { useCategories } from '../layouts/Header';
import { toPoisha, toTaka } from '../lib/format';
import type { Paginated, Product } from '../lib/types';
import { useTitle } from '../lib/useTitle';
import { ProductGridSkeleton } from '../components/Skeletons';

interface ProductList extends Paginated<Product> {
  facets: { brands: { name: string; count: number }[] };
}

const SORTS = [
  ['relevance', 'Best match'],
  ['newest', 'Newest'],
  ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'],
  ['discount', 'Biggest discount'],
  ['rating', 'Top rated'],
] as const;

const SECTION_TITLES: Record<string, string> = {
  'customer-favorites': 'Customer Favorites',
  'for-you': 'For You',
  trending: 'Trending Now',
  'best-deal': 'Best Deal',
  'first-order-deal': 'First Order Deal',
  featured: 'Featured Products',
};

export default function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { data: categories = [] } = useCategories();

  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ['products', params.toString()],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const query = Object.fromEntries(params);
      return (await api.get<ProductList>('/products', { params: { limit: 24, ...query } })).data;
    },
  });

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const categorySlug = params.get('category');
  const current = categories.find((category) => category.slug === categorySlug);
  const q = params.get('q');
  const section = params.get('section');
  const title = q
    ? `Results for “${q}”`
    : (current?.name ?? (section && SECTION_TITLES[section]) ?? 'All Products');
  useTitle(title);

  const children = categories.filter((category) =>
    current ? category.parent === current._id : !category.parent,
  );
  const selectedBrands = params.get('brand')?.split(',').filter(Boolean) ?? [];

  const toggleBrand = (brand: string) => {
    const next = selectedBrands.includes(brand)
      ? selectedBrands.filter((item) => item !== brand)
      : [...selectedBrands, brand];
    update({ brand: next.join(',') || null });
  };

  const applyPrice = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const min = Number(form.get('min'));
    const max = Number(form.get('max'));
    update({
      minPrice: min > 0 ? String(toPoisha(min)) : null,
      maxPrice: max > 0 ? String(toPoisha(max)) : null,
    });
    setFiltersOpen(false);
  };

  const hasFilters = ['brand', 'minPrice', 'maxPrice', 'inStock', 'onSale'].some((key) => params.has(key));
  const priceKey = `${params.get('minPrice')}-${params.get('maxPrice')}`;

  const filters = (
    <div className="space-y-6 text-sm">
      {children.length > 0 && (
        <section>
          <h3 className="mb-2 font-semibold">{current ? 'Subcategories' : 'Categories'}</h3>
          <ul className="space-y-1.5">
            {children.map((category) => (
              <li key={category._id}>
                <button onClick={() => update({ category: category.slug })} className="flex items-center gap-1.5 text-left text-neutral-700 hover:text-brand">
                  <CategoryIcon category={category} className="size-5 shrink-0" /> {category.name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form key={priceKey} onSubmit={applyPrice}>
        <h3 className="mb-2 font-semibold">Price (৳)</h3>
        <div className="flex items-center gap-2">
          <input name="min" type="number" min="0" placeholder="Min" aria-label="Minimum price" className="input px-2 py-1.5"
            defaultValue={params.get('minPrice') ? toTaka(Number(params.get('minPrice'))) : ''} />
          <span aria-hidden>–</span>
          <input name="max" type="number" min="0" placeholder="Max" aria-label="Maximum price" className="input px-2 py-1.5"
            defaultValue={params.get('maxPrice') ? toTaka(Number(params.get('maxPrice'))) : ''} />
        </div>
        <button className="btn-outline mt-2 w-full py-1.5">Apply</button>
      </form>

      <section className="space-y-1.5">
        <h3 className="mb-2 font-semibold">Availability</h3>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="accent-brand" checked={params.get('inStock') === 'true'}
            onChange={(event) => update({ inStock: event.target.checked ? 'true' : null })} />
          In stock only
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="accent-brand" checked={params.get('onSale') === 'true'}
            onChange={(event) => update({ onSale: event.target.checked ? 'true' : null })} />
          On sale
        </label>
      </section>

      {(data?.facets.brands.length ?? 0) > 0 && (
        <section>
          <h3 className="mb-2 font-semibold">Brand</h3>
          <ul className="space-y-1.5">
            {data?.facets.brands.map((brand) => (
              <li key={brand.name}>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="accent-brand" checked={selectedBrands.includes(brand.name)} onChange={() => toggleBrand(brand.name)} />
                  <span className="flex-1">{brand.name}</span>
                  <span className="text-xs text-neutral-500">{brand.count}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasFilters && (
        <button className="text-sm font-medium text-brand hover:underline"
          onClick={() => update({ brand: null, minPrice: null, maxPrice: null, inStock: null, onSale: null })}>
          Clear filters
        </button>
      )}
    </div>
  );

  return (
    <div className="container-page py-5">
      <nav aria-label="Breadcrumb" className="mb-2 text-xs text-neutral-600">
        <Link to="/" className="hover:text-brand">Home</Link>
        <span className="mx-1.5" aria-hidden>/</span>
        <span>{title}</span>
      </nav>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">{title}</h1>
          {data && <p className="text-sm text-neutral-600" aria-live="polite">{data.total} products</p>}
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-outline py-2 lg:hidden" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal className="size-4" /> Filters
          </button>
          <label className="flex items-center gap-2 text-sm">
            <span className="hidden sm:inline">Sort by</span>
            <select className="input w-auto py-2" value={params.get('sort') ?? 'relevance'}
              onChange={(event) => update({ sort: event.target.value === 'relevance' ? null : event.target.value })}>
              {SORTS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="flex gap-6">
        <aside className="hidden w-52 shrink-0 lg:block" aria-label="Filters">{filters}</aside>
        {filtersOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
            <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">Filters</h2>
                <button onClick={() => setFiltersOpen(false)} aria-label="Close filters"><X className="size-5" /></button>
              </div>
              {filters}
            </div>
          </div>
        )}

        <div className={`min-w-0 flex-1 transition-opacity ${isFetching ? 'opacity-70' : ''}`}>
          {isPending ? (
            <ProductGridSkeleton className="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5" />
          ) : error ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : data.items.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center" role="status">
              <BasketSearchAnimation />
              <h2 className="mt-3 text-lg font-semibold">No products found</h2>
              <p className="mt-1 max-w-sm break-words text-sm text-neutral-600">
                {q
                  ? `We searched the whole basket for “${q}” but couldn't find it. Try a different word.`
                  : 'We searched the whole basket but found nothing here. Try removing some filters.'}
              </p>
              <Link to="/products" className="btn-primary mt-4 rounded-full px-6">
                Browse all products
              </Link>
            </div>
          ) : (
            <>
              <ProductGrid products={data.items} className="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5" />
              <Pagination page={data.page} pages={data.pages} onChange={(page) => {
                update({ page: String(page) });
                window.scrollTo({ top: 0 });
              }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
