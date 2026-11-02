export interface SeedCategory {
  key: string;
  name: string;
  icon: string;
  homeShowcase?: boolean;
  children?: { key: string; name: string; icon: string; showInNav?: boolean; sort?: number }[];
}

export const CATEGORIES: SeedCategory[] = [
  {
    key: 'grocery',
    name: 'Grocery',
    icon: '🧺',
    children: [
      { key: 'staples', name: 'Rice, Oil & Staples', icon: '🍚' },
      { key: 'snacks', name: 'Snacks & Drinks', icon: '🍪' },
    ],
  },
  {
    key: 'household',
    name: 'Household',
    icon: '🧹',
    children: [{ key: 'cleaning', name: 'Cleaning Supplies', icon: '🧽' }],
  },
  {
    key: 'fashion',
    homeShowcase: true,
    name: 'Fashion',
    icon: '👜',
    children: [
      { key: 'women', name: "Women's & Girls' Fashion", icon: '👗', showInNav: true, sort: 0 },
      { key: 'men', name: "Men's & Boys' Fashion", icon: '👔', showInNav: true, sort: 1 },
      { key: 'watches', name: 'Watches', icon: '⌚' },
    ],
  },
  {
    key: 'beauty',
    homeShowcase: true,
    name: 'Beauty',
    icon: '💄',
    children: [{ key: 'makeup', name: 'Makeup', icon: '💋' }],
  },
  {
    key: 'home',
    homeShowcase: true,
    name: 'Home',
    icon: '🪴',
    children: [
      { key: 'appliances', name: 'TV & Home Appliances', icon: '📺', showInNav: true, sort: 3 },
      { key: 'decor', name: 'Bedding & Decor', icon: '🛏️' },
    ],
  },
  {
    key: 'tech',
    homeShowcase: true,
    name: 'Tech',
    icon: '🖥️',
    children: [
      { key: 'accessories', name: 'Electronic Accessories', icon: '🎧', showInNav: true, sort: 2 },
      { key: 'devices', name: 'Electronics Device', icon: '📱', showInNav: true, sort: 4 },
    ],
  },
  {
    key: 'auto',
    name: 'Auto',
    icon: '🛞',
    children: [{ key: 'car-care', name: 'Automotive', icon: '🚗', showInNav: true, sort: 6 }],
  },
  {
    key: 'baby',
    name: 'Baby',
    icon: '🍼',
    children: [{ key: 'mother-baby', name: 'Mother & Baby', icon: '🤱', showInNav: true, sort: 5 }],
  },
  { key: 'toys', name: 'Toys', icon: '🧸' },
  { key: 'wellness', name: 'Wellness', icon: '💊' },
  { key: 'pets', name: 'Pets', icon: '🐶' },
  { key: 'personal-care', name: 'Personal Care', icon: '🧴' },
];

type Section =
  | 'customer-favorites'
  | 'for-you'
  | 'trending'
  | 'best-deal'
  | 'first-order-deal'
  | 'featured';

export interface SeedProduct {
  name: string;
  brand: string;
  category: string;
  /** Prices in taka; the seed converts them to poisha. */
  price: number;
  compareAt?: number;
  emoji: string;
  colors: [string, string];
  sections?: Section[];
  /** One option name with values. Each value becomes a variant; `step` adds taka per value. */
  option?: { name: string; values: string[]; step?: number };
  attributes?: Record<string, string>;
  minOrderQty?: number;
  stock?: number;
}

const PINK: [string, string] = ['#ffe3ef', '#ffc2da'];
const BLUE: [string, string] = ['#e2efff', '#bcd8ff'];
const GREEN: [string, string] = ['#e4f7e6', '#bfe8c6'];
const AMBER: [string, string] = ['#fff4d9', '#ffdf9e'];
const LILAC: [string, string] = ['#f0e7ff', '#d9c6ff'];
const SLATE: [string, string] = ['#e9edf3', '#cbd4e1'];

const CLOTHES = { name: 'Size', values: ['S', 'M', 'L', 'XL'] };
const KIDS = { name: 'Age', values: ['2-3 Years', '4-5 Years', '6-7 Years'], step: 90 };
const SHOES = { name: 'Size', values: ['18', '19', '20', '21'] };

export const PRODUCTS: SeedProduct[] = [
  // Women's and girls' fashion
  { name: 'Floral Appliqué Puff Sleeve Party Dress', brand: 'Dali Kids', category: 'women', price: 2102, compareAt: 2560, emoji: '👗', colors: PINK, sections: ['customer-favorites'], option: KIDS, attributes: { Material: 'Soft tulle and cotton lining', Care: 'Hand wash cold' } },
  { name: 'Embroidered Chiffon Three-Piece Suit', brand: 'Rangdhonu', category: 'women', price: 7731, compareAt: 9150, emoji: '🥻', colors: BLUE, sections: ['customer-favorites', 'trending'], option: CLOTHES, attributes: { Material: 'Chiffon', Set: 'Kameez, dupatta and trouser' } },
  { name: 'Flying Sleeve Floral Princess Dress', brand: 'Dali Kids', category: 'women', price: 1132, compareAt: 2000, emoji: '👚', colors: GREEN, sections: ['customer-favorites'], option: KIDS },
  { name: 'Hand-Embroidered Unstitched Lawn Set', brand: 'Rangdhonu', category: 'women', price: 8319, compareAt: 8850, emoji: '🧣', colors: AMBER, sections: ['customer-favorites'], attributes: { Material: 'Premium lawn', Type: 'Unstitched' } },
  { name: 'Watercolour Brush Print Sleeveless Dress', brand: 'Dali Kids', category: 'women', price: 1285, compareAt: 2000, emoji: '👗', colors: LILAC, sections: ['for-you'], option: KIDS },
  { name: 'Unstitched Luxury Chiffon Collection', brand: 'Rangdhonu', category: 'women', price: 7731, compareAt: 9150, emoji: '🥻', colors: AMBER, sections: ['for-you'] },
  { name: 'Knitted Floral Lavender Winter Set', brand: 'Dali Kids', category: 'women', price: 1375, compareAt: 2000, emoji: '🧥', colors: LILAC, sections: ['best-deal'], option: KIDS },
  { name: 'Casual Peach Sleeveless Frock', brand: 'Dali Kids', category: 'women', price: 799, compareAt: 1449, emoji: '👗', colors: AMBER, sections: ['best-deal'], option: KIDS },
  { name: 'Hand-Crafted Cotton Kameez & Pajama Set', brand: 'Rangdhonu', category: 'women', price: 621, compareAt: 849, emoji: '👘', colors: PINK, sections: ['best-deal'], option: KIDS },
  { name: 'Red Bow Fashion Frock', brand: 'Dali Kids', category: 'women', price: 1669, compareAt: 2099, emoji: '🎀', colors: PINK, sections: ['best-deal'], option: KIDS },
  { name: 'Quilted Leather-Look Tote Bag', brand: 'Rangdhonu', category: 'women', price: 1890, compareAt: 2400, emoji: '👜', colors: AMBER, sections: ['featured'], option: { name: 'Colour', values: ['Tan', 'Black', 'Maroon'] } },

  // Men's and boys' fashion
  { name: 'Premium Cotton Panjabi', brand: 'Nogor', category: 'men', price: 1468, compareAt: 2200, emoji: '👕', colors: AMBER, sections: ['for-you'], option: { name: 'Size', values: ['40', '42', '44', '46'] }, attributes: { Material: '100% cotton', Fit: 'Regular' } },
  { name: 'Cartoon Print Casual T-Shirt & Pant Set', brand: 'Dali Kids', category: 'men', price: 780, compareAt: 880, emoji: '🩳', colors: LILAC, sections: ['best-deal'], option: KIDS },
  { name: 'Classic Slim Fit Denim Jeans', brand: 'Nogor', category: 'men', price: 1590, compareAt: 2100, emoji: '👖', colors: BLUE, option: { name: 'Waist', values: ['30', '32', '34', '36'] } },
  { name: 'Formal Striped Oxford Shirt', brand: 'Nogor', category: 'men', price: 1250, compareAt: 1700, emoji: '👔', colors: SLATE, option: CLOTHES },
  { name: 'Embroidered Snapback Cap', brand: 'Nogor', category: 'men', price: 499, compareAt: 599, emoji: '🧢', colors: GREEN, sections: ['best-deal'] },

  // Baby
  { name: 'Soft Sole Cadet Grey Baby Shoes', brand: 'Dali Kids', category: 'mother-baby', price: 630, compareAt: 1000, emoji: '👟', colors: SLATE, sections: ['customer-favorites'], option: SHOES },
  { name: 'Leopard Print Baby Loafers', brand: 'Dali Kids', category: 'mother-baby', price: 630, compareAt: 1000, emoji: '🥿', colors: AMBER, sections: ['for-you'], option: SHOES },
  { name: 'Floral Bubble Top & Shorts', brand: 'Dali Kids', category: 'mother-baby', price: 1635, compareAt: 2500, emoji: '👶', colors: PINK, sections: ['for-you'], option: KIDS },
  { name: 'Grey Goose Soft Baby Shoes', brand: 'Dali Kids', category: 'mother-baby', price: 630, compareAt: 1000, emoji: '👟', colors: BLUE, sections: ['trending'], option: SHOES },
  { name: 'Striped Long-Sleeve Winter Baby Dress', brand: 'Dali Kids', category: 'mother-baby', price: 1240, compareAt: 1690, emoji: '🧒', colors: BLUE, sections: ['trending'], option: KIDS },
  { name: 'Anti-Colic Feeding Bottle 250 ml', brand: 'Little Nest', category: 'mother-baby', price: 450, compareAt: 620, emoji: '🍼', colors: BLUE },
  { name: 'Gentle Baby Wipes (Pack of 3)', brand: 'Little Nest', category: 'baby', price: 390, compareAt: 480, emoji: '🧻', colors: GREEN },

  // Watches
  { name: 'Quartz Stainless Steel Watch for Men', brand: 'Chrono BD', category: 'watches', price: 1700, compareAt: 2500, emoji: '⌚', colors: BLUE, sections: ['customer-favorites'], attributes: { Movement: 'Quartz', 'Water resistance': '3 ATM' } },
  { name: 'Rose Gold Luxury Ladies Watch', brand: 'Chrono BD', category: 'watches', price: 1560, compareAt: 2090, emoji: '⌚', colors: PINK, sections: ['for-you'] },
  { name: 'Premium Luminous Hands Ladies Watch', brand: 'Chrono BD', category: 'watches', price: 1470, compareAt: 2490, emoji: '⌚', colors: AMBER, sections: ['trending'] },
  { name: 'Silver & Green Dial Sport Watch', brand: 'Chrono BD', category: 'watches', price: 1315, compareAt: 1990, emoji: '⌚', colors: GREEN, sections: ['trending'] },

  // Beauty
  { name: 'All-In-One Professional Makeup Set', brand: 'Glow Theory', category: 'makeup', price: 3630, compareAt: 5380, emoji: '💄', colors: PINK, sections: ['trending'], attributes: { Includes: 'Eyeshadow, blush, lipstick, brushes' } },
  { name: 'Hydrating Lip Gloss Trio', brand: 'Glow Theory', category: 'makeup', price: 2979.67, compareAt: 3400, emoji: '💋', colors: PINK, sections: ['first-order-deal'], minOrderQty: 5 },
  { name: 'Vitamin C Brightening Face Serum', brand: 'Glow Theory', category: 'beauty', price: 931.15, compareAt: 1250, emoji: '🧪', colors: AMBER, sections: ['first-order-deal'], minOrderQty: 3 },
  { name: 'Radiance Skincare Gift Box', brand: 'Glow Theory', category: 'beauty', price: 3600.43, compareAt: 4300, emoji: '🎁', colors: PINK, sections: ['first-order-deal'] },
  { name: 'Clear Skin Complete Routine Kit', brand: 'Glow Theory', category: 'beauty', price: 4345.35, compareAt: 5200, emoji: '🧴', colors: BLUE, sections: ['first-order-deal'] },
  { name: 'Velvet Matte Lipstick', brand: 'Glow Theory', category: 'makeup', price: 690, compareAt: 850, emoji: '💄', colors: PINK, option: { name: 'Shade', values: ['Rose', 'Coral', 'Berry'] } },
  { name: 'Soft Bristle Makeup Brush Set', brand: 'Glow Theory', category: 'makeup', price: 1090, compareAt: 1500, emoji: '🖌️', colors: LILAC },

  // Wellness and personal care
  { name: 'Daily Multivitamin Gummies', brand: 'Pure Roots', category: 'wellness', price: 458.13, compareAt: 590, emoji: '🍯', colors: AMBER, sections: ['first-order-deal'] },
  { name: 'Whey Protein Vanilla 1 kg', brand: 'Pure Roots', category: 'wellness', price: 3200, compareAt: 3800, emoji: '🥤', colors: BLUE },
  { name: 'Digital Blood Pressure Monitor', brand: 'Pure Roots', category: 'wellness', price: 2450, compareAt: 2990, emoji: '🩺', colors: SLATE },
  { name: 'Herbal Hair Oil 200 ml', brand: 'Pure Roots', category: 'personal-care', price: 3600.43, compareAt: 4100, emoji: '🌿', colors: GREEN, sections: ['first-order-deal'] },
  { name: 'Whitening Herbal Toothpaste Family Pack', brand: 'Pure Roots', category: 'personal-care', price: 4345.35, compareAt: 4900, emoji: '🪥', colors: BLUE, sections: ['first-order-deal'] },
  { name: 'Aloe Vera Face Wash 150 ml', brand: 'Pure Roots', category: 'personal-care', price: 340, compareAt: 420, emoji: '🧴', colors: GREEN },
  { name: 'Rechargeable Beard Trimmer', brand: 'Nogor', category: 'personal-care', price: 1490, compareAt: 1950, emoji: '🪒', colors: SLATE },

  // Grocery
  { name: 'Premium Miniket Rice', brand: 'Khet Fresh', category: 'staples', price: 390, compareAt: 430, emoji: '🍚', colors: AMBER, option: { name: 'Weight', values: ['5 kg', '10 kg', '25 kg'], step: 380 }, attributes: { Origin: 'Bangladesh', 'Storage': 'Keep in a cool, dry place' } },
  { name: 'Pure Soybean Oil', brand: 'Khet Fresh', category: 'staples', price: 860, compareAt: 920, emoji: '🫗', colors: AMBER, option: { name: 'Volume', values: ['2 L', '5 L'], step: 980 } },
  { name: 'Roasted Moong Dal 1 kg', brand: 'Khet Fresh', category: 'staples', price: 175, emoji: '🫘', colors: GREEN },
  { name: 'Assorted Butter Cookies Tin', brand: 'Khet Fresh', category: 'snacks', price: 520, compareAt: 650, emoji: '🍪', colors: AMBER },
  { name: 'Premium Tea Leaves 500 g', brand: 'Khet Fresh', category: 'snacks', price: 290, compareAt: 330, emoji: '🍵', colors: GREEN },
  { name: 'Fresh Fruit Gift Basket', brand: 'Khet Fresh', category: 'grocery', price: 1450, compareAt: 1700, emoji: '🧺', colors: GREEN },

  // Household
  { name: 'Lemon Dishwashing Liquid 1 L', brand: 'Shubho', category: 'cleaning', price: 210, compareAt: 260, emoji: '🧼', colors: AMBER },
  { name: 'Multi-Surface Floor Cleaner 2 L', brand: 'Shubho', category: 'cleaning', price: 480, compareAt: 590, emoji: '🧹', colors: BLUE },
  { name: 'Reusable Storage Basket Set', brand: 'Shubho', category: 'household', price: 950, compareAt: 1200, emoji: '🧺', colors: AMBER },

  // Home and appliances
  { name: 'Quilted Cotton Bedsheet Set', brand: 'Ghor', category: 'decor', price: 2190, compareAt: 2900, emoji: '🛏️', colors: PINK, sections: ['featured'], option: { name: 'Bed size', values: ['Single', 'Double', 'King'], step: 450 } },
  { name: 'Scented Soy Candle Trio', brand: 'Ghor', category: 'decor', price: 890, compareAt: 1100, emoji: '🕯️', colors: AMBER },
  { name: 'Indoor Plant with Ceramic Pot', brand: 'Ghor', category: 'home', price: 750, compareAt: 900, emoji: '🪴', colors: GREEN },
  { name: '43-Inch 4K Smart LED TV', brand: 'Volta', category: 'appliances', price: 38900, compareAt: 45000, emoji: '📺', colors: SLATE, attributes: { Resolution: '3840 x 2160', Warranty: '2 years' } },
  { name: 'Wireless Soundbar with Subwoofer', brand: 'Volta', category: 'appliances', price: 9500, compareAt: 12000, emoji: '🔊', colors: SLATE, sections: ['featured'] },
  { name: '1.5 L Electric Kettle', brand: 'Volta', category: 'appliances', price: 1350, compareAt: 1700, emoji: '🫖', colors: BLUE },

  // Tech
  { name: 'Noise-Cancelling Wireless Headphones', brand: 'Volta', category: 'accessories', price: 3490, compareAt: 4800, emoji: '🎧', colors: LILAC, sections: ['featured'], option: { name: 'Colour', values: ['Black', 'White', 'Blue'] } },
  { name: '20,000 mAh Fast-Charge Power Bank', brand: 'Volta', category: 'accessories', price: 1890, compareAt: 2500, emoji: '🔋', colors: SLATE, sections: ['featured'] },
  { name: 'Wireless Ergonomic Mouse', brand: 'Volta', category: 'accessories', price: 750, compareAt: 990, emoji: '🖱️', colors: BLUE },
  { name: '6.7-Inch Smartphone 128 GB', brand: 'Volta', category: 'devices', price: 21900, compareAt: 25000, emoji: '📱', colors: BLUE, sections: ['featured'], option: { name: 'Storage', values: ['128 GB', '256 GB'], step: 4000 }, attributes: { Display: '6.7-inch AMOLED', Battery: '5000 mAh', Warranty: '1 year' } },
  { name: '14-Inch Everyday Laptop', brand: 'Volta', category: 'devices', price: 52900, compareAt: 58000, emoji: '💻', colors: SLATE },
  { name: '10-Inch Family Tablet', brand: 'Volta', category: 'tech', price: 17500, compareAt: 19900, emoji: '📱', colors: LILAC },

  // Auto, toys, pets
  { name: 'Portable Car Vacuum Cleaner', brand: 'RoadMate', category: 'car-care', price: 1950, compareAt: 2500, emoji: '🚗', colors: SLATE },
  { name: 'Motorcycle Helmet with Visor', brand: 'RoadMate', category: 'auto', price: 2600, compareAt: 3200, emoji: '🪖', colors: AMBER, option: { name: 'Size', values: ['M', 'L', 'XL'] } },
  { name: 'Giant Plush Teddy Bear', brand: 'Khela', category: 'toys', price: 1290, compareAt: 1700, emoji: '🧸', colors: AMBER, sections: ['featured'] },
  { name: 'Remote Control Racing Car', brand: 'Khela', category: 'toys', price: 1650, compareAt: 2100, emoji: '🏎️', colors: BLUE },
  { name: 'Building Blocks 500 Pieces', brand: 'Khela', category: 'toys', price: 1150, compareAt: 1400, emoji: '🧩', colors: PINK },
  { name: 'Adult Dog Food 3 kg', brand: 'Happy Paws', category: 'pets', price: 1480, compareAt: 1650, emoji: '🐶', colors: AMBER },
  { name: 'Clumping Cat Litter 10 L', brand: 'Happy Paws', category: 'pets', price: 890, compareAt: 1050, emoji: '🐱', colors: SLATE },
];

export const HERO_BANNERS = [
  { key: 'guest-room', eyebrow: 'Bedding, decor & more', title: 'Guest room glow-up', link: '/products?category=decor', fromPrice: 1700, emojis: ['🛏️', '🕯️', '🪴', '🖼️', '🛋️'], colors: ['#b5564c', '#7c3a33'] as const, dark: true },
  { key: 'denim', eyebrow: 'Jeans & more', title: 'The Denim Shop', link: '/products?q=denim', fromPrice: 0, emojis: ['👖', '🧥', '🧢', '👟', '👜'], colors: ['#33424f', '#8c99a6'] as const, dark: true },
  { key: 'decor', eyebrow: 'The merriest house', title: 'Dazzling decor', link: '/products?category=home', fromPrice: 0, emojis: ['🎄', '🎁', '🔔', '⭐', '🕯️'], colors: ['#f1e6d5', '#dcc7a8'] as const, dark: false },
  { key: 'tech', eyebrow: 'Latest gadgets', title: 'Tech that travels', link: '/products?category=tech', fromPrice: 750, emojis: ['🎧', '📱', '🔋', '💻', '⌚'], colors: ['#31206b', '#7a3fb0'] as const, dark: true },
];
