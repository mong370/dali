import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

const SHOP = [
  ['All Products', '/products'],
  ['All Categories', '/categories'],
  ['Featured Products', '/products?section=featured'],
  ['Trending Now', '/products?section=trending'],
  ['Best Deals', '/products?section=best-deal'],
] as const;

const ACCOUNT = [
  ['Track Your Order', '/track'],
  ['My Account', '/account'],
  ['My Orders', '/account/orders'],
  ['Wishlist', '/wishlist'],
  ['Cart', '/cart'],
] as const;

const POLICIES = [
  ['Return & Refund', '/policies/returns'],
  ['Exchange', '/policies/exchange'],
  ['Shipping & Delivery', '/policies/shipping'],
  ['Cancellation', '/policies/cancellation'],
  ['Privacy Policy', '/policies/privacy'],
  ['Terms & Conditions', '/policies/terms'],
] as const;

// Add each page's address here. Entries without one stay hidden, and so does the column if all are empty.
const SOCIAL: { label: string; url: string }[] = [
  { label: 'Facebook', url: '' },
  { label: 'Instagram', url: '' },
  { label: 'TikTok', url: '' },
  { label: 'YouTube', url: '' },
  { label: 'WhatsApp', url: '' },
];

export function Footer() {
  const social = SOCIAL.filter(({ url }) => url);
  return (
    <footer className="mt-10 border-t-2 border-brand-line">
      <div className="container-page grid grid-cols-2 gap-8 py-8 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div className="col-span-2 md:col-span-1">
          <Logo className="h-14" />
          <p className="mt-3 text-lg font-semibold">Everything in One Basket.</p>
        </div>
        <LinkColumn title="Shop" links={SHOP} />
        <LinkColumn title="My Dali" links={ACCOUNT} />
        <LinkColumn title="Policies" links={POLICIES} />
        {social.length > 0 && (
          <FooterColumn title="Follow Us">
            {social.map(({ label, url }) => (
              <li key={label}>
                <a href={url} target="_blank" rel="noreferrer" className="hover:text-brand">
                  {label}
                </a>
              </li>
            ))}
          </FooterColumn>
        )}
      </div>
      <p className="border-t border-brand-line py-3 text-center text-sm text-neutral-600">
        © {new Date().getFullYear()} Dali
      </p>
    </footer>
  );
}

function LinkColumn({ title, links }: { title: string; links: readonly (readonly [string, string])[] }) {
  return (
    <FooterColumn title={title}>
      {links.map(([label, to]) => (
        <li key={to}>
          <Link to={to} className="hover:text-brand">
            {label}
          </Link>
        </li>
      ))}
    </FooterColumn>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <ul className="space-y-2 text-xs text-neutral-700">{children}</ul>
    </div>
  );
}
