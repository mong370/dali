import { useQuery } from '@tanstack/react-query';
import {
  CircleCheck,
  CircleX,
  Clock,
  PackageCheck,
  PackageOpen,
  Plus,
  Search,
  Truck,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { BasketSearchAnimation } from '../../components/BasketSearchAnimation';
import type { AdminCategory, OrderStatus } from '../../lib/types';

export const ORDER_STATUS_ICONS: Record<OrderStatus, { icon: LucideIcon; tone: string }> = {
  pending: { icon: Clock, tone: 'bg-amber-100 text-amber-700' },
  confirmed: { icon: CircleCheck, tone: 'bg-blue-100 text-blue-700' },
  processing: { icon: PackageOpen, tone: 'bg-indigo-100 text-indigo-700' },
  shipped: { icon: Truck, tone: 'bg-purple-100 text-purple-700' },
  delivered: { icon: PackageCheck, tone: 'bg-green-100 text-green-700' },
  cancelled: { icon: CircleX, tone: 'bg-neutral-200 text-neutral-700' },
  returned: { icon: Undo2, tone: 'bg-red-100 text-red-700' },
};

export function useAdminCategories() {
  return useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: async () => (await api.get<{ items: AdminCategory[] }>('/categories/admin/list')).data.items,
  });
}

/** Shows a category with its parent, e.g. "Fashion › Watches". */
export function categoryLabel(category: AdminCategory, all: AdminCategory[]) {
  const parent = all.find((item) => item._id === category.parent);
  return parent ? `${parent.name} › ${category.name}` : category.name;
}

/** After deleting the only row on the last page, moves to the page before it. */
export function useClampPage(rawPage: number, pages: number | undefined, goToPage: (page: number) => void) {
  useEffect(() => {
    if (pages && rawPage > pages) goToPage(pages);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- goToPage is rebuilt on every render
  }, [rawPage, pages]);
}

export const PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;
const DEFAULT_PER_PAGE = PER_PAGE_OPTIONS[0];

/** Search, filters, page and page size for an admin list, all kept in the address bar. */
export function useListParams(filterKeys: string[]) {
  const [params, setParams] = useSearchParams();
  // Held locally so fast typing never waits on the address bar, which updates a moment later.
  const [q, setQ] = useState(params.get('q') ?? '');

  const chosenPerPage = Number(params.get('perPage'));
  const perPage = PER_PAGE_OPTIONS.find((option) => option === chosenPerPage) ?? DEFAULT_PER_PAGE;
  const rawPage = Math.max(1, Number(params.get('page')) || 1);
  const hasFilters = ['q', ...filterKeys].some((key) => params.has(key));

  const keepPerPage = () => {
    const next = new URLSearchParams();
    const chosen = params.get('perPage');
    if (chosen) next.set('perPage', chosen);
    return next;
  };
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next, { replace: true });
  };

  return {
    q,
    rawPage,
    perPage,
    hasFilters,
    get: (key: string) => params.get(key) ?? '',
    setFilter,
    setSearch: (value: string) => {
      setQ(value);
      setFilter('q', value);
    },
    /** A count card shows one group at a time, and tapping it again clears it. */
    toggle: (key: string, value: string) => {
      const next = keepPerPage();
      if (params.get(key) !== value) next.set(key, value);
      setQ('');
      setParams(next, { replace: true });
    },
    clear: () => {
      setQ('');
      setParams(keepPerPage(), { replace: true });
    },
    goToPage: (page: number) => {
      const next = new URLSearchParams(params);
      if (page > 1) next.set('page', String(page));
      else next.delete('page');
      setParams(next);
      window.scrollTo({ top: 0 });
    },
    changePerPage: (value: number) => {
      const next = new URLSearchParams(params);
      next.delete('page');
      if (value === DEFAULT_PER_PAGE) next.delete('perPage');
      else next.set('perPage', String(value));
      setParams(next, { replace: true });
    },
  };
}

/** The search text to send to the server, once typing pauses. */
export function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Remembers the list's filters, so the form can return to the same view. */
export function useBackState() {
  return { back: useLocation().search };
}

export function useBackUrl(list: string) {
  const location = useLocation();
  return `${list}${(location.state as { back?: string } | null)?.back ?? ''}`;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`card flex items-center gap-3 p-3 text-left transition hover:border-brand ${active ? 'border-brand ring-1 ring-brand' : ''}`}
    >
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-xl font-semibold leading-tight tabular-nums">{value}</span>
        <span className="block truncate text-xs text-neutral-600">{label}</span>
      </span>
    </button>
  );
}

export function ListHeader({ title, addTo, addLabel, back }: { title: string; addTo?: string; addLabel?: string; back?: object }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {addTo && (
        <Link to={addTo} state={back} className="btn-primary">
          <Plus className="size-4" /> {addLabel}
        </Link>
      )}
    </div>
  );
}

export function ListToolbar({
  q,
  onSearch,
  placeholder,
  hasFilters,
  onClear,
  children,
}: {
  q: string;
  onSearch: (value: string) => void;
  placeholder: string;
  hasFilters: boolean;
  onClear: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="card flex flex-wrap items-center gap-2 p-3">
      <div className="relative min-w-52 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
        <input type="search" aria-label={placeholder} placeholder={placeholder} className="input pl-9" value={q} onChange={(event) => onSearch(event.target.value)} />
      </div>
      {children}
      {hasFilters && (
        <button type="button" className="px-2 py-2 text-sm font-medium text-brand hover:underline" onClick={onClear}>
          Clear
        </button>
      )}
    </div>
  );
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <select aria-label={label} className="input w-auto min-w-0 flex-1 sm:flex-none" value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
    </select>
  );
}

const ICON_TONES = {
  brand: 'text-brand hover:bg-brand-soft',
  red: 'text-red-600 hover:bg-red-50',
  neutral: 'text-neutral-600 hover:bg-neutral-100',
};
const ICON_BASE = 'flex size-9 items-center justify-center rounded-lg transition';

export function IconLink({
  to,
  state,
  title,
  label,
  icon: Icon,
  tone = 'brand',
  newTab = false,
}: {
  to: string;
  state?: object;
  title: string;
  label: string;
  icon: LucideIcon;
  tone?: keyof typeof ICON_TONES;
  newTab?: boolean;
}) {
  return (
    <Link to={to} state={state} title={title} aria-label={label} target={newTab ? '_blank' : undefined} rel={newTab ? 'noreferrer' : undefined} className={`${ICON_BASE} ${ICON_TONES[tone]}`}>
      <Icon className="size-4" />
    </Link>
  );
}

export function IconButton({
  title,
  label,
  icon: Icon,
  tone = 'red',
  disabled,
  onClick,
}: {
  title: string;
  label: string;
  icon: LucideIcon;
  tone?: keyof typeof ICON_TONES;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" title={title} aria-label={label} disabled={disabled} onClick={onClick} className={`${ICON_BASE} ${ICON_TONES[tone]} disabled:cursor-not-allowed disabled:opacity-40`}>
      <Icon className="size-4" />
    </button>
  );
}

export function RowActions({ children }: { children: ReactNode }) {
  return <span className="flex justify-end gap-1">{children}</span>;
}

export function NoResults({ noun }: { noun: string }) {
  return (
    <div className="card flex flex-col items-center p-6 text-center" role="status">
      <BasketSearchAnimation className="w-40" />
      <p className="mt-2 font-semibold">No {noun} match</p>
      <p className="text-sm text-neutral-600">Try a different search or clear the filters.</p>
    </div>
  );
}

export function FormActions({ isEdit, pending, backTo }: { isEdit: boolean; pending: boolean; backTo: string }) {
  return (
    <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4">
      <Link to={backTo} className="btn-outline">Cancel</Link>
      <button className="btn-primary min-w-24" disabled={pending}>
        {isEdit ? (pending ? 'Updating…' : 'Update') : pending ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}
