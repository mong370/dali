import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, CircleCheck, CircleX, ExternalLink, FilePen, Pencil, Star, Trash2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../../api/client';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { AdminPageSkeleton } from '../../components/Skeletons';
import { SmartImage } from '../../components/SmartImage';
import { ErrorState, StatusBadge, TablePagination } from '../../components/ui';
import { money } from '../../lib/format';
import type { Paginated, Product } from '../../lib/types';
import { useTitle } from '../../lib/useTitle';
import {
  FilterSelect,
  IconButton,
  IconLink,
  ListHeader,
  ListToolbar,
  NoResults,
  PER_PAGE_OPTIONS,
  RowActions,
  StatCard,
  categoryLabel,
  useAdminCategories,
  useBackState,
  useClampPage,
  useDebounced,
  useListParams,
} from './listKit';

type Row = Omit<Product, 'category'> & { category?: { name: string } };
interface ProductList extends Paginated<Row> {
  stats: { all: number; active: number; draft: number; low: number; out: number; featured: number };
}

export default function ProductsPage() {
  useTitle('Products');
  const client = useQueryClient();
  const list = useListParams(['status', 'stock', 'category', 'section', 'sort']);
  const back = useBackState();
  const q = useDebounced(list.q);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const { data: categories = [] } = useAdminCategories();

  const filters = {
    status: list.get('status') || undefined,
    stock: list.get('stock') || undefined,
    category: list.get('category') || undefined,
    section: list.get('section') || undefined,
    sort: list.get('sort') || undefined,
    q: q || undefined,
    page: list.rawPage,
    limit: list.perPage,
  };
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ['admin', 'products', filters],
    placeholderData: keepPreviousData,
    queryFn: async () => (await api.get<ProductList>('/products/admin/list', { params: filters })).data,
  });
  useClampPage(list.rawPage, data?.pages, list.goToPage);

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSettled: () => setDeleting(null),
    onSuccess: () => {
      toast.success('Product deleted');
      client.invalidateQueries({ queryKey: ['admin'] });
      client.invalidateQueries({ queryKey: ['products'] });
      client.invalidateQueries({ queryKey: ['home'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (isPending) return <AdminPageSkeleton stats={6} />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const { stats } = data;
  return (
    <div className="space-y-4">
      <ListHeader title="Products" addTo="/admin/products/new" addLabel="Add product" back={back} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="All products" value={stats.all} icon={Boxes} tone="bg-pink-100 text-brand-dark" active={!list.hasFilters} onClick={list.clear} />
        <StatCard label="Active" value={stats.active} icon={CircleCheck} tone="bg-green-100 text-green-700" active={list.get('status') === 'active'} onClick={() => list.toggle('status', 'active')} />
        <StatCard label="Drafts" value={stats.draft} icon={FilePen} tone="bg-neutral-200 text-neutral-700" active={list.get('status') === 'draft'} onClick={() => list.toggle('status', 'draft')} />
        <StatCard label="Low stock" value={stats.low} icon={TriangleAlert} tone="bg-amber-100 text-amber-700" active={list.get('stock') === 'low'} onClick={() => list.toggle('stock', 'low')} />
        <StatCard label="Out of stock" value={stats.out} icon={CircleX} tone="bg-red-100 text-red-700" active={list.get('stock') === 'out'} onClick={() => list.toggle('stock', 'out')} />
        <StatCard label="Featured" value={stats.featured} icon={Star} tone="bg-indigo-100 text-indigo-700" active={list.get('section') === 'featured'} onClick={() => list.toggle('section', 'featured')} />
      </div>

      <ListToolbar q={list.q} onSearch={list.setSearch} placeholder="Search by name or brand" hasFilters={list.hasFilters} onClear={list.clear}>
        <FilterSelect label="Filter by category" value={list.get('category')} onChange={(value) => list.setFilter('category', value)}
          options={[['', 'All categories'], ...categories.map((category) => [category._id, categoryLabel(category, categories)] as const)]} />
        <FilterSelect label="Filter by homepage section" value={list.get('section')} onChange={(value) => list.setFilter('section', value)}
          options={[
            ['', 'All homepage sections'],
            ['customer-favorites', 'Customer Favorites'],
            ['for-you', 'For You'],
            ['featured', 'Featured Products'],
            ['trending', 'Trending Now'],
            ['best-deal', 'Best Deal'],
            ['first-order-deal', 'First Order Deal'],
          ]} />
        <FilterSelect label="Filter by status" value={list.get('status')} onChange={(value) => list.setFilter('status', value)}
          options={[['', 'All statuses'], ['active', 'Active'], ['draft', 'Draft']]} />
        <FilterSelect label="Filter by stock" value={list.get('stock')} onChange={(value) => list.setFilter('stock', value)}
          options={[['', 'All stock'], ['in', 'In stock'], ['low', 'Low stock'], ['out', 'Out of stock']]} />
        <FilterSelect label="Sort products" value={list.get('sort')} onChange={(value) => list.setFilter('sort', value)}
          options={[['', 'Newest first'], ['name', 'Name A–Z'], ['price-asc', 'Price: low to high'], ['price-desc', 'Price: high to low'], ['stock-asc', 'Stock: low to high']]} />
      </ListToolbar>

      {data.items.length === 0 ? (
        <NoResults noun="products" />
      ) : (
        <div className={`card transition-opacity md:overflow-x-auto ${isFetching ? 'opacity-70' : ''}`}>
          <table className="responsive-table w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs text-neutral-600">
              <tr>
                <th className="p-3 font-medium">Product</th>
                <th className="font-medium">Category</th>
                <th className="font-medium">Price</th>
                <th className="font-medium">Stock</th>
                <th className="font-medium">Status</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {data.items.map((product) => (
                <tr key={product._id}>
                  <td className="p-3">
                    <Link to={`/admin/products/${product._id}`} state={back} className="flex items-center gap-3 hover:text-brand">
                      <SmartImage src={product.images[0]} className="size-11 shrink-0 rounded-lg" />
                      <span className="min-w-0">
                        <span className="line-clamp-2 font-medium md:min-w-48">{product.name}</span>
                        {product.brand && <span className="block text-xs text-neutral-600">{product.brand}</span>}
                      </span>
                    </Link>
                  </td>
                  <td data-label="Category" className="whitespace-nowrap pr-3">{product.category?.name ?? 'None'}</td>
                  <td data-label="Price" className="whitespace-nowrap pr-3 tabular-nums">
                    {money(product.priceMin)}{product.priceMax > product.priceMin && `–${money(product.priceMax)}`}
                  </td>
                  <td data-label="Stock" className="pr-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${product.totalStock === 0 ? 'bg-red-100 text-red-700' : product.totalStock <= 5 ? 'bg-amber-100 text-amber-800' : 'text-neutral-800'}`}>
                      {product.totalStock === 0 ? 'Out' : product.totalStock}
                    </span>
                  </td>
                  <td data-label="Status"><StatusBadge status={product.status === 'active' ? 'delivered' : 'cancelled'} label={product.status === 'active' ? 'Active' : 'Draft'} /></td>
                  <td className="pr-3">
                    <RowActions>
                      {product.status === 'active' && (
                        <IconLink to={`/products/${product.slug}`} newTab title="View in store" label={`View ${product.name} in store`} icon={ExternalLink} tone="neutral" />
                      )}
                      <IconLink to={`/admin/products/${product._id}`} state={back} title="Edit" label={`Edit ${product.name}`} icon={Pencil} />
                      <IconButton title="Delete" label={`Delete ${product.name}`} icon={Trash2} onClick={() => setDeleting(product)} />
                    </RowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.total > 0 && (
        <TablePagination page={Math.min(list.rawPage, data.pages)} perPage={list.perPage} total={data.total} perPageOptions={PER_PAGE_OPTIONS}
          noun={data.total === stats.all ? 'products' : `matching products (${stats.all} in total)`} onPage={list.goToPage} onPerPage={list.changePerPage} />
      )}

      {deleting && (
        <ConfirmDialog title={`Delete “${deleting.name}”?`} pending={remove.isPending} onConfirm={() => remove.mutate(deleting._id)} onClose={() => setDeleting(null)}>
          This product will be removed from the store permanently. Past orders keep their own copy of its details.
        </ConfirmDialog>
      )}
    </div>
  );
}
