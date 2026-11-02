import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui';
import { useTitle } from '../lib/useTitle';

export default function NotFoundPage() {
  useTitle('Page not found');
  return (
    <EmptyState icon="🧺" title="We could not find that page">
      <Link to="/" className="btn-primary mt-3">Back to home</Link>
    </EmptyState>
  );
}
