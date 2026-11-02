import type { ReactNode } from 'react';
import { DaliMark } from './SmartImage';

function Bone({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-neutral-200 ${className}`} />;
}

function ImageBone({ className = '' }: { className?: string }) {
  return (
    <div className={`flex animate-pulse items-center justify-center overflow-hidden bg-brand-soft ${className}`}>
      <DaliMark className="aspect-square h-1/2 max-h-20 max-w-[60%] opacity-60" />
    </div>
  );
}

/** Announces loading once to screen readers and hides the placeholder shapes from them. */
function Loading({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div role="status" aria-label="Loading" aria-busy="true" className={className}>
      <div aria-hidden="true" className="contents">
        {children}
      </div>
    </div>
  );
}

function CardBone() {
  return (
    <div>
      <ImageBone className="aspect-square rounded-md" />
      <div className="space-y-1.5 px-1 pt-2 sm:px-2">
        <Bone className="h-3 w-full" />
        <Bone className="h-3 w-2/3" />
        <Bone className="h-3.5 w-1/2" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({
  count = 12,
  className = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
}: {
  count?: number;
  className?: string;
}) {
  return (
    <Loading className={`grid gap-1.5 ${className}`}>
      {Array.from({ length: count }, (_, index) => <CardBone key={index} />)}
    </Loading>
  );
}

export function HomeSkeleton() {
  return (
    <Loading className="container-page block pb-4">
      <Bone className="mb-3 mt-3 h-7 w-52" />
      <div className="flex gap-4 overflow-hidden lg:justify-between">
        {Array.from({ length: 12 }, (_, index) => (
          <div key={index} className="flex w-[72px] shrink-0 flex-col items-center gap-2">
            <Bone className="size-12 rounded-full" />
            <Bone className="h-2.5 w-14" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:h-[400px] sm:flex-row">
        <ImageBone className="h-36 rounded-2xl sm:h-full sm:w-[330px] sm:shrink-0" />
        <div className="flex h-[300px] min-w-0 gap-2 overflow-hidden sm:h-full sm:flex-1">
          {[0, 1, 2].map((index) => <ImageBone key={index} className="h-full w-[260px] shrink-0 rounded-lg sm:w-[300px]" />)}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        {[0, 1, 2, 3].map((index) => <Bone key={index} className="h-11" />)}
      </div>
      {[0, 1].map((row) => (
        <div key={row}>
          <Bone className="mb-2 mt-6 h-7 w-48" />
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }, (_, index) => <CardBone key={index} />)}
          </div>
        </div>
      ))}
    </Loading>
  );
}

export function ProductDetailSkeleton() {
  return (
    <Loading className="container-page block py-5">
      <Bone className="mb-4 h-3 w-48" />
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <ImageBone className="aspect-square rounded-xl" />
          <div className="mt-2 flex gap-2">
            {[0, 1].map((index) => <ImageBone key={index} className="size-16 rounded-lg" />)}
          </div>
        </div>
        <div className="space-y-4">
          <Bone className="h-3 w-24" />
          <Bone className="h-7 w-5/6" />
          <Bone className="h-9 w-40" />
          <div className="flex gap-2">
            {[0, 1, 2].map((index) => <Bone key={index} className="h-9 w-16 rounded-lg" />)}
          </div>
          <Bone className="h-10 w-36 rounded-lg" />
          <div className="flex gap-3">
            <Bone className="h-11 flex-1 rounded-lg" />
            <Bone className="h-11 flex-1 rounded-lg" />
          </div>
          <Bone className="h-28 rounded-xl" />
        </div>
      </div>
    </Loading>
  );
}

export function CartSkeleton() {
  return (
    <Loading className="container-page block py-6">
      <Bone className="mb-4 h-7 w-40" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card divide-y divide-neutral-200">
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex gap-3 p-3 sm:gap-4">
              <ImageBone className="size-20 shrink-0 rounded-lg sm:size-24" />
              <div className="flex-1 space-y-2">
                <Bone className="h-3.5 w-3/4" />
                <Bone className="h-3 w-1/3" />
                <Bone className="h-8 w-28 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
        <div className="card h-fit space-y-3 p-4">
          <Bone className="h-5 w-32" />
          <Bone className="h-3.5" />
          <Bone className="h-3.5" />
          <Bone className="h-5" />
          <Bone className="h-10 rounded-lg" />
        </div>
      </div>
    </Loading>
  );
}

export function OrderListSkeleton() {
  return (
    <Loading className="container-page block max-w-3xl py-6">
      <Bone className="mb-4 h-7 w-40" />
      <div className="space-y-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="card space-y-2 p-4">
            <div className="flex justify-between">
              <Bone className="h-4 w-36" />
              <Bone className="h-5 w-20 rounded-full" />
            </div>
            <Bone className="h-3 w-3/4" />
            <Bone className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    </Loading>
  );
}

export function DetailPanelsSkeleton({ className = 'container-page max-w-3xl py-6' }: { className?: string }) {
  return (
    <Loading className={`block space-y-4 ${className}`}>
      <div className="flex justify-between">
        <div className="space-y-2">
          <Bone className="h-7 w-52" />
          <Bone className="h-3 w-32" />
        </div>
        <Bone className="h-5 w-20 rounded-full" />
      </div>
      <div className="card divide-y divide-neutral-200">
        {[0, 1].map((index) => (
          <div key={index} className="flex gap-3 p-3">
            <ImageBone className="size-16 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Bone className="h-3.5 w-3/4" />
              <Bone className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((index) => (
          <div key={index} className="card space-y-2 p-4">
            <Bone className="h-4 w-32" />
            <Bone className="h-3" />
            <Bone className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    </Loading>
  );
}

export function CategoriesSkeleton() {
  return (
    <Loading className="container-page block py-5">
      <Bone className="mb-4 h-7 w-44" />
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="card space-y-2 p-3">
            <div className="flex items-center gap-3">
              <Bone className="size-10 rounded-full" />
              <Bone className="h-4 w-32" />
            </div>
            <div className="flex gap-1.5">
              <Bone className="h-7 w-24 rounded-full" />
              <Bone className="h-7 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </Loading>
  );
}

export function PageSkeleton() {
  return (
    <div className="container-page py-5">
      <Bone className="mb-4 h-7 w-44" />
      <ProductGridSkeleton count={6} />
    </div>
  );
}

function StatCardsBone({ count, className }: { count: number; className: string }) {
  return (
    <div className={`grid gap-3 ${className}`}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="card flex items-center gap-3 p-3">
          <Bone className="size-10 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <Bone className="h-5 w-10" />
            <Bone className="h-2.5 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

function RowsBone({ rows = 8 }: { rows?: number }) {
  return (
    <div className="card divide-y divide-neutral-100">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 p-3">
          <ImageBone className="size-10 shrink-0 rounded" />
          <Bone className="h-3.5 flex-1" />
          <Bone className="hidden h-3.5 w-24 md:block" />
          <Bone className="hidden h-3.5 w-16 md:block" />
          <Bone className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** The table or card list inside an admin page that already shows its own heading. */
export function AdminTableSkeleton({ rows }: { rows?: number }) {
  return (
    <Loading className="block">
      <RowsBone rows={rows} />
    </Loading>
  );
}

/** A whole admin list page, before its heading has rendered. */
export function AdminPageSkeleton({ stats = 0 }: { stats?: number }) {
  return (
    <Loading className="block space-y-4">
      <div className="flex items-center justify-between">
        <Bone className="h-8 w-40" />
        <Bone className="h-10 w-32 rounded-lg" />
      </div>
      {stats > 0 && <StatCardsBone count={stats} className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6" />}
      <Bone className="h-11 rounded-lg" />
      <RowsBone />
    </Loading>
  );
}

export function DashboardSkeleton() {
  return (
    <Loading className="block space-y-5">
      <Bone className="h-32 rounded-2xl" />
      <StatCardsBone count={4} className="grid-cols-2 lg:grid-cols-4" />
      <StatCardsBone count={7} className="grid-cols-2 sm:grid-cols-4 xl:grid-cols-7" />
      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <RowsBone rows={5} />
        <RowsBone rows={4} />
      </div>
    </Loading>
  );
}

export function FormSkeleton({ sections = 2, className = 'max-w-3xl' }: { sections?: number; className?: string }) {
  return (
    <Loading className={`block space-y-4 ${className}`}>
      <Bone className="h-8 w-44" />
      {Array.from({ length: sections }, (_, section) => (
        <div key={section} className="card grid gap-3 p-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="space-y-1.5">
              <Bone className="h-3 w-24" />
              <Bone className="h-10 rounded-lg" />
            </div>
          ))}
        </div>
      ))}
    </Loading>
  );
}

/** A few short lines, for smaller areas such as reviews or header navigation. */
export function LinesSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <Loading className="block space-y-3 py-3">
      {Array.from({ length: lines }, (_, index) => (
        <div key={index} className="space-y-1.5">
          <Bone className="h-3 w-40" />
          <Bone className="h-3 w-3/4" />
        </div>
      ))}
    </Loading>
  );
}

export function NavPillsSkeleton() {
  return (
    <Loading className="flex min-w-0 gap-2 overflow-hidden">
      {[0, 1, 2, 3, 4, 5].map((index) => <Bone key={index} className="h-8 w-32 shrink-0 rounded-full" />)}
    </Loading>
  );
}
