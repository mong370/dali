export interface Category {
  _id: string;
  name: string;
  slug: string;
  parent: string | null;
  ancestors: string[];
  icon: string;
  image?: string | null;
  sortOrder: number;
  showInNav: boolean;
  homeShowcase: boolean;
  isActive: boolean;
}

export interface AdminCategory extends Category {
  productCount: number;
}

export interface Variant {
  _id: string;
  sku?: string;
  options: Record<string, string>;
  price: number;
  compareAtPrice?: number;
  stock: number;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  brand: string;
  category: string;
  images: string[];
  tags?: string[];
  attributes?: { name: string; value: string }[];
  variants: Variant[];
  minOrderQty: number;
  sections: string[];
  status: 'draft' | 'active';
  priceMin: number;
  priceMax: number;
  compareAtPrice: number;
  discountPercent: number;
  totalStock: number;
  ratingAvg: number;
  ratingCount: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface Address {
  _id: string;
  label: string;
  fullName: string;
  phone: string;
  district: string;
  area: string;
  line1: string;
  isDefault: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'admin';
  addresses: Address[];
}

export interface CartItem {
  product: string;
  variant: string;
  quantity: number;
}

export interface QuoteLine extends CartItem {
  name: string;
  slug: string;
  image?: string;
  sku: string;
  options: Record<string, string>;
  unitPrice: number;
  compareAtPrice?: number;
  stock: number;
  minOrderQty: number;
  lineTotal: number;
  issue?: string;
}

export interface Quote {
  lines: QuoteLine[];
  unavailable: { product: string; variant: string; issue: string }[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  couponCode?: string;
  couponError?: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export interface OrderItem {
  _id: string;
  product: string;
  variant: string;
  name: string;
  slug: string;
  image?: string;
  sku: string;
  options: Record<string, string>;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  shippingAddress: Omit<Address, '_id' | 'label' | 'isDefault'>;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  couponCode?: string;
  paymentMethod: 'cod';
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  status: OrderStatus;
  statusHistory: { status: OrderStatus; note?: string; at: string }[];
  note?: string;
  createdAt: string;
  user?: { _id: string; name: string; email: string; phone?: string };
}

export interface Review {
  _id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Banner {
  _id: string;
  placement: 'hero';
  eyebrow: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  cta: string;
  fromPrice: number;
  dark: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface HomeData {
  categories: Category[];
  navCategories: Category[];
  heroBanners: Banner[];
  categoryShowcases: { category: { name: string; slug: string }; products: Product[] }[];
  sections: {
    customerFavorites: Product[];
    forYou: Product[];
    trending: Product[];
    bestDeal: Product[];
    firstOrderDeal: Product[];
    featured: Product[];
  };
}

export interface Coupon {
  _id: string;
  code: string;
  description: string;
  type: 'percent' | 'fixed' | 'free_shipping';
  value: number;
  maxDiscount: number;
  minSubtotal: number;
  firstOrderOnly: boolean;
  usageLimit: number;
  usedCount: number;
  expiresAt?: string | null;
  isActive: boolean;
}
