import { useQuery } from '@tanstack/react-query';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import heroBasket from '../assets/hero-basket.png';
import { ProductGrid } from '../components/ProductCard';
import { CategoryIcon, ErrorState } from '../components/ui';
import { money } from '../lib/format';
import type { Banner, Category, HomeData, Product } from '../lib/types';
import { HomeSkeleton } from '../components/Skeletons';
import { SmartImage } from '../components/SmartImage';

function SectionHeading({ children, to }: { children: string; to?: string }) {
  return (
    <div className="mb-1 mt-5 flex items-end justify-between">
      <h2 className="font-heading text-2xl font-bold text-neutral-900">{children}</h2>
      {to && (
        <Link to={to} className="text-sm font-medium text-brand hover:underline">
          View all
        </Link>
      )}
    </div>
  );
}

function ShopByCategory({ categories }: { categories: Category[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  return (
    <section aria-labelledby="shop-by-category" className="relative">
      <h2 id="shop-by-category" className="mb-3 mt-3 font-heading text-2xl font-bold text-neutral-900">
        Shop By Category
      </h2>
      <div ref={scroller} className="scrollbar-none flex gap-2 overflow-x-auto scroll-smooth">
        {categories.map((category) => (
          <Link
            key={category._id}
            to={`/products?category=${category.slug}`}
            className="group flex w-[88px] shrink-0 flex-col items-center gap-2 lg:w-auto lg:flex-1"
          >
            <CategoryIcon
              category={category}
              className="flex size-12 items-center justify-center text-[42px] leading-none transition group-hover:scale-110"
            />
            <span className="whitespace-nowrap text-xs font-semibold text-navy">{category.name}</span>
          </Link>
        ))}
      </div>
      <button
        onClick={() => scroller.current?.scrollBy({ left: 300 })}
        aria-label="More categories"
        className="absolute right-0 top-[52px] rounded-full border border-neutral-800 bg-white p-1 lg:hidden"
      >
        <ChevronRight className="size-4" />
      </button>
    </section>
  );
}

function BrandCard() {
  return (
    <div className="flex h-36 items-center overflow-hidden rounded-2xl bg-hero sm:h-full sm:min-w-[320px] sm:max-w-[330px] sm:flex-1 sm:flex-col">
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2 pl-3.5 sm:flex-none sm:items-center sm:gap-5 sm:px-3 sm:pt-7">
        <Link
          to="/products"
          className="rounded-full bg-sun px-5 py-1.5 text-sm font-semibold text-neutral-900 transition hover:brightness-95 sm:px-10 sm:py-2.5 sm:text-xl"
        >
          Explore
        </Link>
        <p className="text-sm font-semibold leading-snug text-neutral-900 sm:text-center sm:text-lg">
          Make your life more easy.
        </p>
      </div>
      <SmartImage src={heroBasket} alt="A shopping basket full of products with the Dali logo. Everything in One Basket." tone="hero" className="aspect-[323/232] w-[56%] shrink-0 self-end sm:mt-auto sm:w-full" />
    </div>
  );
}

function HeroBanner({ banner }: { banner: Banner }) {
  const text = banner.dark ? 'text-white' : 'text-neutral-900';
  return (
    <Link
      to={banner.link}
      className={`relative block h-full w-[260px] shrink-0 snap-start overflow-hidden rounded-lg sm:w-[300px] ${text}`}
      aria-label={`${banner.title}: ${banner.cta}`}
    >
      <SmartImage src={banner.image} tone={banner.dark ? 'dark' : 'soft'} className="absolute inset-0 size-full" />
      <div className="relative p-3">
        <p className="text-[11px] font-semibold">{banner.eyebrow}</p>
        <p className="mt-0.5 max-w-52 font-heading text-xl font-bold leading-tight">{banner.title}</p>
        <p className="mt-2 text-[10px] underline">{banner.cta}</p>
      </div>
      {banner.fromPrice > 0 && (
        <p className="absolute bottom-3 left-3 text-white drop-shadow">
          <span className="block text-[10px] font-semibold">From</span>
          <span className="text-xl font-bold leading-none">{money(banner.fromPrice)}</span>
        </p>
      )}
    </Link>
  );
}

function scrollCarousel(element: HTMLElement | null, direction: 1 | -1) {
  if (!element) return;
  const atEnd = element.scrollLeft + element.clientWidth >= element.scrollWidth - 4;
  const atStart = element.scrollLeft <= 4;
  if (direction === 1 && atEnd) element.scrollTo({ left: 0, behavior: 'smooth' });
  else if (direction === -1 && atStart) element.scrollTo({ left: element.scrollWidth, behavior: 'smooth' });
  else element.scrollBy({ left: direction * 310, behavior: 'smooth' });
}

function HeroCarousel({ banners }: { banners: Banner[] }) {
  const track = useRef<HTMLDivElement>(null);
  // With no pause button, it holds still while someone is hovering over or tabbing through it.
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (held || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => scrollCarousel(track.current, 1), 5000);
    return () => clearInterval(timer);
  }, [held]);

  const control =
    'absolute top-1/2 -translate-y-1/2 rounded-full bg-white p-1.5 text-neutral-800 shadow-md transition hover:bg-neutral-100';
  return (
    <div
      className="relative min-w-0 flex-1"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured offers"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      <div ref={track} className="scrollbar-none flex h-[300px] snap-x gap-2 overflow-x-auto sm:h-full">
        {banners.map((banner) => (
          <HeroBanner key={banner._id} banner={banner} />
        ))}
      </div>
      <button className={`${control} left-2`} onClick={() => scrollCarousel(track.current, -1)} aria-label="Previous offers">
        <ChevronLeft className="size-5" />
      </button>
      <button className={`${control} right-2`} onClick={() => scrollCarousel(track.current, 1)} aria-label="Next offers">
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}

const TRUST = [
  { icon: '💵', label: 'Cash On Delivery' },
  { icon: '📦', label: 'Instant Return' },
  { icon: '🚚', label: 'Delivery Within ', highlight: '48hrs' },
  { icon: '🏷️', label: 'Best Price Deal' },
];

function TrustBar() {
  return (
    <section aria-label="Why shop with Dali" className="mt-3 grid grid-cols-2 gap-2 bg-brand-soft p-2 md:grid-cols-4 md:gap-3">
      {TRUST.map((item) => (
        <div key={item.label} className="flex items-center justify-center gap-2 rounded bg-white px-2 py-3 text-xs font-medium shadow-sm">
          <span aria-hidden className="text-lg leading-none">
            {item.icon}
          </span>
          <span>
            {item.label}
            {item.highlight && <span className="text-brand">{item.highlight}</span>}
          </span>
        </div>
      ))}
    </section>
  );
}

function ProductStrip({
  title,
  points,
  section,
  products,
}: {
  title: string;
  points: string[];
  section: string;
  products: Product[];
}) {
  if (products.length === 0) return null;
  const headingId = `strip-${section}`;
  return (
    <section
      aria-labelledby={headingId}
      className="mt-5 flex flex-col gap-2 rounded-sm bg-hero p-1.5 md:flex-row"
    >
      <div className="flex shrink-0 flex-col justify-center px-4 py-3 text-neutral-900 md:w-[260px]">
        <h2 id={headingId} className="text-xl font-semibold">
          {title}
        </h2>
        <ul className="mt-3 space-y-1 text-xs font-medium">
          {points.map((point) => (
            <li key={point} className="flex items-center gap-1.5">
              <Check className="size-3.5 shrink-0 rounded-full bg-white p-0.5 text-brand" /> {point}
            </li>
          ))}
        </ul>
        <Link
          to={`/products?section=${section}`}
          className="mt-4 w-fit rounded-full bg-white px-4 py-1.5 text-xs font-medium text-neutral-900 hover:bg-brand-soft"
        >
          Explore now
        </Link>
      </div>
      <ul className="scrollbar-none flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
        {products.map((product) => (
          <li key={product._id} className="w-[120px] shrink-0 overflow-hidden rounded-md bg-white lg:w-auto lg:flex-1 lg:basis-0">
            <Link to={`/products/${product.slug}`} aria-label={product.name}>
              <SmartImage src={product.images[0]} loading="lazy" className="aspect-square w-full" />
              <div className="p-1.5">
                <p className="text-[13px] font-semibold">{money(product.priceMin)}</p>
                <p className="text-[11px] text-neutral-600">MOQ: {product.minOrderQty}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const PROMISES = ['Cash on delivery', 'Delivery within 48hrs', 'Easy returns'];

function DaliPromo() {
  return (
    <section
      aria-labelledby="dali-promo"
      className="mt-5 flex flex-col overflow-hidden rounded-2xl border border-brand-line bg-gradient-to-br from-brand-soft via-white to-[#fff3e4] md:flex-row"
    >
      <div className="flex-1 px-5 py-6 sm:px-8 sm:py-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">Why shop with Dali</p>
        <h2 id="dali-promo" className="mt-2 font-heading text-2xl font-bold leading-tight text-neutral-900 sm:text-[34px]">
          One store for <span className="text-brand">everything you need.</span>
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-700">
          Fashion, grocery, beauty, tech and more, all in one place. Order what you need and pay in
          cash when it reaches your door.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {PROMISES.map((promise) => (
            <li
              key={promise}
              className="flex items-center gap-1.5 rounded-full border border-brand-line bg-white px-3 py-1.5 text-xs font-medium text-neutral-800"
            >
              <Check className="size-3.5 text-brand" /> {promise}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-2 sm:gap-3">
          <Link to="/products" className="btn-primary rounded-full px-5">
            Start shopping
          </Link>
          <Link to="/categories" className="btn-outline rounded-full px-5">
            Browse categories
          </Link>
        </div>
      </div>
      <div className="flex items-end justify-center bg-hero pt-3 md:w-[40%] md:rounded-l-[72px] md:pl-4 md:pt-6">
        <SmartImage src={heroBasket} loading="lazy" tone="hero" className="-mb-1.5 aspect-[323/232] w-full max-w-[250px] md:max-w-sm" />
      </div>
    </section>
  );
}

function CategoryShowcases({ showcases }: { showcases: HomeData['categoryShowcases'] }) {
  if (showcases.length === 0) return null;
  return (
    <section aria-label="Shop by category" className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {showcases.map(({ category, products }) => (
        <div key={category.slug} className="rounded-lg border border-neutral-200 p-2">
          <Link to={`/products?category=${category.slug}`} className="mb-1.5 flex items-center justify-between gap-2 hover:text-brand">
            <h2 className="font-heading text-sm font-bold">{category.name}</h2>
            <span className="flex shrink-0 items-center text-xs font-medium text-brand">
              View all <ChevronRight className="size-4" />
            </span>
          </Link>
          <div className="grid grid-cols-2 gap-2">
            {products.map((product) => (
              <Link key={product._id} to={`/products/${product.slug}`} className="group min-w-0">
                <SmartImage src={product.images[0]} loading="lazy" className="aspect-square w-full rounded-md" imgClassName="group-hover:brightness-95" />
                <span className="mt-1 block truncate text-[11px] text-neutral-700 group-hover:text-brand">{product.name}</span>
                <span className="block text-xs font-semibold text-brand">{money(product.priceMin)}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function ProductRow({ title, products, section }: { title: string; products: Product[]; section: string }) {
  if (products.length === 0) return null;
  return (
    <section>
      <SectionHeading to={`/products?section=${section}`}>{title}</SectionHeading>
      <div className="rounded-sm border border-brand-line p-1">
        <ProductGrid products={products} />
      </div>
    </section>
  );
}

export default function HomePage() {
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['home'],
    queryFn: async () => (await api.get<HomeData>('/content/home')).data,
  });

  if (isPending) return <HomeSkeleton />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const { sections } = data;
  return (
    <div className="container-page pb-4">
      <ShopByCategory categories={data.categories} />
      <section className="mt-4 flex flex-col gap-2 sm:h-[400px] sm:flex-row" aria-label="Highlights">
        <BrandCard />
        <HeroCarousel banners={data.heroBanners} />
      </section>
      <TrustBar />
      <ProductRow title="Customer Favorites" products={sections.customerFavorites} section="customer-favorites" />
      <ProductRow title="For You" products={sections.forYou} section="for-you" />
      <ProductStrip
        title="Featured Products"
        points={['Top picks from Dali', 'Cash on delivery']}
        section="featured"
        products={sections.featured}
      />
      <ProductRow title="Trending Now" products={sections.trending} section="trending" />
      <ProductRow title="Best Deal" products={sections.bestDeal} section="best-deal" />
      <ProductStrip
        title="First order deal"
        points={['Low MOQ', 'FREE shipping capped at ৳200, code FREESHIP']}
        section="first-order-deal"
        products={sections.firstOrderDeal}
      />
      <DaliPromo />
      <CategoryShowcases showcases={data.categoryShowcases} />
    </div>
  );
}
