import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { errorMessage } from '../api/client';
import { SmartImage } from './SmartImage';

/** Shows a category's uploaded image, or its emoji if it has none. */
export function CategoryIcon({
  category,
  className = '',
}: {
  category: { icon: string; image?: string | null };
  className?: string;
}) {
  if (category.image) {
    return <SmartImage src={category.image} fit="contain" tone="none" className={className} />;
  }
  return (
    <span aria-hidden className={className}>
      {category.icon}
    </span>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="py-16 text-center" role="alert">
      <p className="mb-4 text-neutral-600">{errorMessage(error)}</p>
      {onRetry && (
        <button className="btn-outline" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="py-16 text-center">
      <div className="mb-3 text-5xl" aria-hidden>
        {icon}
      </div>
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <div className="text-sm text-neutral-600">{children}</div>
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs text-red-600" role="alert">
      {message}
    </p>
  );
}

export function Pagination({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Pagination">
      <button
        className="btn-outline px-3"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="text-sm text-neutral-600">
        Page {page} of {pages}
      </span>
      <button
        className="btn-outline px-3"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}

/** First, last and the pages around the current one, with gaps marked by null. */
export function pageNumbers(page: number, pages: number): (number | null)[] {
  const wanted = [...new Set([1, page - 1, page, page + 1, pages])]
    .filter((number) => number >= 1 && number <= pages)
    .sort((a, b) => a - b);
  const result: (number | null)[] = [];
  wanted.forEach((number, index) => {
    const previous = wanted[index - 1];
    if (previous !== undefined && number - previous === 2) result.push(previous + 1);
    else if (previous !== undefined && number - previous > 2) result.push(null);
    result.push(number);
  });
  return result;
}

/** The row below an admin list: what is showing, how many per page, and numbered pages. */
export function TablePagination({
  page,
  perPage,
  total,
  perPageOptions,
  noun,
  onPage,
  onPerPage,
}: {
  page: number;
  perPage: number;
  total: number;
  perPageOptions: readonly number[];
  noun: string;
  onPage: (page: number) => void;
  onPerPage: (perPage: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  const first = (page - 1) * perPage + 1;
  const last = Math.min(page * perPage, total);
  const step = 'flex size-9 items-center justify-center rounded-lg border text-sm transition disabled:cursor-not-allowed disabled:opacity-40';
  const idle = 'border-neutral-300 bg-white hover:border-brand hover:text-brand';

  return (
    <div className="flex flex-col items-center gap-3 md:flex-row md:justify-between">
      <p className="text-sm text-neutral-600" aria-live="polite">
        Showing {first}–{last} of {total} {noun}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          Show
          <select className="input w-auto py-1.5" value={perPage} onChange={(event) => onPerPage(Number(event.target.value))}>
            {perPageOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          per page
        </label>
        {pages > 1 && (
          <nav className="flex items-center gap-1" aria-label="Pagination">
            <button type="button" className={`${step} ${idle}`} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
              <ChevronLeft className="size-4" />
            </button>
            {pageNumbers(page, pages).map((number, index) =>
              number === null ? (
                <span key={`gap-${index}`} aria-hidden className="w-6 text-center text-sm text-neutral-500">…</span>
              ) : (
                <button
                  key={number}
                  type="button"
                  aria-label={`Page ${number}`}
                  aria-current={number === page ? 'page' : undefined}
                  onClick={() => onPage(number)}
                  className={`${step} ${number === page ? 'border-brand bg-brand font-semibold text-white' : idle}`}
                >
                  {number}
                </button>
              ),
            )}
            <button type="button" className={`${step} ${idle}`} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
              <ChevronRight className="size-4" />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-neutral-200 text-neutral-700',
  returned: 'bg-red-100 text-red-800',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status] ?? 'bg-neutral-100 text-neutral-700'}`}
    >
      {label ?? status}
    </span>
  );
}
