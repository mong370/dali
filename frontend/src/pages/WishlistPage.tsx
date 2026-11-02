import { Link } from 'react-router-dom';
import { useWishlist } from '../api/wishlist';
import { ProductGrid } from '../components/ProductCard';
import { EmptyState, ErrorState } from '../components/ui';
import { useTitle } from '../lib/useTitle';
import { ProductGridSkeleton } from '../components/Skeletons';

export default function WishlistPage() {
  useTitle('Wishlist');
  const { data, error, isPending, refetch } = useWishlist();
  if (isPending) return <div className="container-page py-6"><ProductGridSkeleton count={6} /></div>;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  return (
    <div className="container-page py-6">
      <h1 className="mb-4 font-heading text-2xl font-bold">My Wishlist</h1>
      {data.items.length === 0 ? (
        <EmptyState icon="💖" title="Nothing saved yet">
          Tap the heart on a product's page to save it. <Link to="/products" className="text-brand underline">Browse products</Link>
        </EmptyState>
      ) : (
        <ProductGrid products={data.items} showWishlist />
      )}
    </div>
  );
}
