import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, FolderTree, House, Layers, ListTree, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../../api/client';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { AdminPageSkeleton } from '../../components/Skeletons';
import { CategoryIcon, ErrorState, StatusBadge, TablePagination } from '../../components/ui';
import type { AdminCategory } from '../../lib/types';
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
  useAdminCategories,
  useBackState,
  useListParams,
} from './listKit';

/** Parents followed by their subcategories, so the list reads as a tree. */
function asTree(categories: AdminCategory[]) {
  return categories
    .filter((category) => !category.parent)
    .flatMap((top) => [top, ...categories.filter((child) => child.parent === top._id)]);
}

export default function CategoriesPage() {
  useTitle('Categories');
  const client = useQueryClient();
  const list = useListParams(['status', 'type', 'placement']);
  const back = useBackState();
  const { data: categories, error, isPending, refetch } = useAdminCategories();
  const [deleting, setDeleting] = useState<AdminCategory | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSettled: () => setDeleting(null),
    onSuccess: () => {
      toast.success('Category deleted');
      client.invalidateQueries({ queryKey: ['admin', 'categories'] });
      client.invalidateQueries({ queryKey: ['categories'] });
      client.invalidateQueries({ queryKey: ['home'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (isPending) return <AdminPageSkeleton stats={6} />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const status = list.get('status');
  const type = list.get('type');
  const placement = list.get('placement');

  const nameOf = (id: string | null) => categories.find((category) => category._id === id)?.name ?? '';
  const needle = list.q.trim().toLowerCase();
  const rows = asTree(categories).filter((category) => {
    if (needle && !`${category.name} ${nameOf(category.parent)}`.toLowerCase().includes(needle)) return false;
    if (status === 'visible' && !category.isActive) return false;
    if (status === 'hidden' && category.isActive) return false;
    if (type === 'top' && category.parent) return false;
    if (type === 'sub' && !category.parent) return false;
    if (placement === 'nav' && !category.showInNav) return false;
    if (placement === 'home' && !category.homeShowcase) return false;
    return true;
  });

  // Clamped, so deleting the last row on the last page lands on the page before it.
  const pages = Math.max(1, Math.ceil(rows.length / list.perPage));
  const page = Math.min(list.rawPage, pages);
  const pageRows = rows.slice((page - 1) * list.perPage, page * list.perPage);

  const count = (test: (category: AdminCategory) => boolean) => categories.filter(test).length;
  const homeCards = count((category) => category.homeShowcase);

  return (
    <div className="space-y-4">
      <ListHeader title="Categories" addTo="/admin/categories/new" addLabel="Add category" back={back} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="All categories" value={categories.length} icon={Layers} tone="bg-pink-100 text-brand-dark" active={!list.hasFilters} onClick={list.clear} />
        <StatCard label="Top level" value={count((category) => !category.parent)} icon={FolderTree} tone="bg-indigo-100 text-indigo-700" active={type === 'top'} onClick={() => list.toggle('type', 'top')} />
        <StatCard label="Subcategories" value={count((category) => Boolean(category.parent))} icon={ListTree} tone="bg-blue-100 text-blue-700" active={type === 'sub'} onClick={() => list.toggle('type', 'sub')} />
        <StatCard label="Visible in store" value={count((category) => category.isActive)} icon={Eye} tone="bg-green-100 text-green-700" active={status === 'visible'} onClick={() => list.toggle('status', 'visible')} />
        <StatCard label="Hidden" value={count((category) => !category.isActive)} icon={EyeOff} tone="bg-neutral-200 text-neutral-700" active={status === 'hidden'} onClick={() => list.toggle('status', 'hidden')} />
        <StatCard label="On homepage" value={homeCards} icon={House} tone="bg-amber-100 text-amber-700" active={placement === 'home'} onClick={() => list.toggle('placement', 'home')} />
      </div>

      {homeCards > 4 && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="status">
          {homeCards} categories are set as homepage cards, but only the first 4 in category order will show.
        </p>
      )}

      <ListToolbar q={list.q} onSearch={list.setSearch} placeholder="Search categories" hasFilters={list.hasFilters} onClear={list.clear}>
        <FilterSelect label="Filter by status" value={status} onChange={(value) => list.setFilter('status', value)}
          options={[['', 'All statuses'], ['visible', 'Visible'], ['hidden', 'Hidden']]} />
        <FilterSelect label="Filter by type" value={type} onChange={(value) => list.setFilter('type', value)}
          options={[['', 'All types'], ['top', 'Top level'], ['sub', 'Subcategories']]} />
        <FilterSelect label="Filter by placement" value={placement} onChange={(value) => list.setFilter('placement', value)}
          options={[['', 'All placements'], ['nav', 'Header navigation'], ['home', 'Homepage card']]} />
      </ListToolbar>

      {rows.length === 0 ? (
        <NoResults noun="categories" />
      ) : (
        <div className="card md:overflow-x-auto">
          <table className="responsive-table w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs text-neutral-600">
              <tr>
                <th className="p-3 font-medium">Category</th>
                <th className="font-medium">Parent</th>
                <th className="font-medium">Products</th>
                <th className="font-medium">Shown in</th>
                <th className="font-medium">Status</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {pageRows.map((category) => (
                <tr key={category._id}>
                  <td className="p-3">
                    <Link to={`/admin/categories/${category._id}`} state={back} className={`flex items-center gap-2.5 font-medium hover:text-brand ${category.parent ? 'md:pl-6' : ''}`}>
                      <CategoryIcon category={category} className="flex size-7 shrink-0 items-center justify-center text-xl leading-none" />
                      {category.name}
                    </Link>
                  </td>
                  <td data-label="Parent" className="whitespace-nowrap text-neutral-700">{nameOf(category.parent) || 'Top level'}</td>
                  <td data-label="Products" className="tabular-nums">{category.productCount}</td>
                  <td data-label="Shown in">
                    <span className="flex flex-wrap justify-end gap-1 md:justify-start">
                      {category.showInNav && <StatusBadge status="confirmed" label="Header" />}
                      {category.homeShowcase && <StatusBadge status="pending" label="Homepage" />}
                      {!category.showInNav && !category.homeShowcase && <span className="text-neutral-500">None</span>}
                    </span>
                  </td>
                  <td data-label="Status"><StatusBadge status={category.isActive ? 'delivered' : 'cancelled'} label={category.isActive ? 'Visible' : 'Hidden'} /></td>
                  <td className="pr-3">
                    <RowActions>
                      <IconLink to={`/admin/categories/${category._id}`} state={back} title="Edit" label={`Edit ${category.name}`} icon={Pencil} />
                      <IconButton title="Delete" label={`Delete ${category.name}`} icon={Trash2} onClick={() => setDeleting(category)} />
                    </RowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {deleting && (() => {
        const subcategories = count((category) => category.parent === deleting._id);
        const reasons = [
          subcategories > 0 && `${subcategories} ${subcategories === 1 ? 'subcategory' : 'subcategories'}`,
          deleting.productCount > 0 && `${deleting.productCount} ${deleting.productCount === 1 ? 'product' : 'products'}`,
        ].filter(Boolean);
        return reasons.length > 0 ? (
          <ConfirmDialog title={`“${deleting.name}” can't be deleted yet`} onClose={() => setDeleting(null)}>
            It still has {reasons.join(' and ')}. Move or delete {reasons.length > 1 || subcategories + deleting.productCount > 1 ? 'them' : 'it'} first.
          </ConfirmDialog>
        ) : (
          <ConfirmDialog
            title={`Delete “${deleting.name}”?`}
            pending={remove.isPending}
            onConfirm={() => remove.mutate(deleting._id)}
            onClose={() => setDeleting(null)}
          >
            This category will be removed permanently. This can't be undone.
          </ConfirmDialog>
        );
      })()}

      {rows.length > 0 && (
        <TablePagination
          page={page} perPage={list.perPage}
          total={rows.length}
          perPageOptions={PER_PAGE_OPTIONS}
          noun={rows.length === categories.length ? 'categories' : `matching categories (${categories.length} in total)`}
          onPage={list.goToPage}
          onPerPage={list.changePerPage}
        />
      )}
    </div>
  );
}
