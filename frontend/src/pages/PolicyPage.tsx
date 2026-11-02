import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../components/ui';
import { useTitle } from '../lib/useTitle';

// Starter wording that matches how the store currently works. Have it reviewed before launch.
const POLICIES: Record<string, { title: string; body: string[] }> = {
  returns: {
    title: 'Return & Refund Policy',
    body: [
      'You can ask to return a product that arrives damaged, faulty or different from what you ordered.',
      'Contact us with your order number. Once the return is received and checked, we will refund the amount you paid.',
    ],
  },
  exchange: {
    title: 'Exchange Policy',
    body: ['If you received the wrong size or variant, contact us with your order number and we will arrange an exchange, subject to availability.'],
  },
  shipping: {
    title: 'Shipping & Delivery Policy',
    body: [
      'Delivery costs ৳60 inside Dhaka and ৳120 outside Dhaka. Orders of ৳5,000 or more are delivered free.',
      'We aim to deliver within 48 hours. Remote areas and busy periods may take longer.',
    ],
  },
  cancellation: {
    title: 'Cancellation Policy',
    body: ['You can cancel your order from your account until it starts processing. After that, please contact us.'],
  },
  privacy: {
    title: 'Privacy Policy',
    body: [
      'We collect the details needed to run your account and deliver your orders: your name, email, phone number and address.',
      'We use a sign-in cookie to keep you signed in. We share your delivery details only with those who deliver your order.',
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    body: ['By using Dali you agree to provide accurate information and to pay for your orders on delivery. Prices and availability can change until an order is placed.'],
  },
  product: {
    title: 'Product Policy',
    body: ['Illegal, counterfeit and unsafe products are not allowed on Dali.'],
  },
};

export default function PolicyPage() {
  const { slug } = useParams();
  const policy = slug ? POLICIES[slug] : undefined;
  useTitle(policy?.title);

  if (!policy) {
    return (
      <EmptyState icon="📄" title="Page not found">
        <Link to="/" className="text-brand underline">Back to home</Link>
      </EmptyState>
    );
  }
  return (
    <article className="container-page max-w-2xl py-8">
      <h1 className="font-heading text-2xl font-bold">{policy.title}</h1>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-neutral-700">
        {policy.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
    </article>
  );
}
