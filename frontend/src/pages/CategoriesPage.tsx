import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CategoryIcon, ErrorState } from '../components/ui';
import { useCategories } from '../layouts/Header';
import { useTitle } from '../lib/useTitle';
import { CategoriesSkeleton } from '../components/Skeletons';

export default function CategoriesPage() {
  useTitle('Categories');
  const { data: categories, error, isPending, refetch } = useCategories();

  if (isPending) return <CategoriesSkeleton />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="container-page py-5">
      <h1 className="mb-4 font-heading text-2xl font-bold">All Categories</h1>
      <ul className="grid gap-3 md:grid-cols-2">
        {categories
          .filter((category) => !category.parent)
          .map((category) => {
            const children = categories.filter((child) => child.parent === category._id);
            return (
              <li key={category._id} className="card p-3">
                <Link to={`/products?category=${category.slug}`} className="flex items-center gap-3 font-semibold text-navy hover:text-brand">
                  <CategoryIcon category={category} className="flex size-10 shrink-0 items-center justify-center text-3xl leading-none" />
                  <span className="flex-1">{category.name}</span>
                  <ChevronRight className="size-4 text-neutral-500" />
                </Link>
                {children.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {children.map((child) => (
                      <Link
                        key={child._id}
                        to={`/products?category=${child.slug}`}
                        className="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-medium text-neutral-700 hover:text-brand"
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
      </ul>
    </div>
  );
}
