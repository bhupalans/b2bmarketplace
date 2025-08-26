import type { User, Product, Message, Category } from './types';

export const mockUsers: Record<string, User> = {
  'user-1': {
    id: 'user-1',
    name: 'Alice Buyer',
    email: 'alice@example.com',
    avatar: 'https://i.pravatar.cc/150?u=user-1',
    role: 'buyer',
  },
  'user-2': {
    id: 'user-2',
    name: 'Bob Seller',
    email: 'bob@example.com',
    avatar: 'https://i.pravatar.cc/150?u=user-2',
    role: 'seller',
  },
  'user-3': {
    id: 'user-3',
    name: 'Charlie Corp',
    email: 'charlie@example.com',
    avatar: 'https://i.pravatar.cc/150?u=user-3',
    role: 'seller',
  }
};

export const mockCategories: Category[] = [
  // Level 1
  { id: 'cat-1', name: 'Industrial Supplies', parentId: null },
  { id: 'cat-2', name: 'Raw Materials', parentId: null },
  { id: 'cat-3', name: 'Electronics', parentId: null },

  // Level 2
  { id: 'cat-1-1', name: 'Mechanical Components', parentId: 'cat-1' },
  { id: 'cat-1-2', name: 'Conveying Systems', parentId: 'cat-1' },

  { id: 'cat-2-1', name: 'Textiles', parentId: 'cat-2' },
  { id: 'cat-2-2', name: 'Metals & Alloys', parentId: 'cat-2' },
  
  { id: 'cat-3-1', name: 'Electronic Components', parentId: 'cat-3' },

  // Level 3
  { id: 'cat-1-1-1', name: 'Widgets', parentId: 'cat-1-1' },
  { id: 'cat-1-1-2', name: 'Gears & Cogs', parentId: 'cat-1-1' },
  { id: 'cat-1-2-1', name: 'Belt Conveyors', parentId: 'cat-1-2' },

  { id: 'cat-2-1-1', name: 'Cotton', parentId: 'cat-2-1' },
  { id: 'cat-2-2-1', name: 'Titanium', parentId: 'cat-2-2' },

  { id: 'cat-3-1-1', name: 'Printed Circuit Boards (PCBs)', parentId: 'cat-3-1' },
];

export const mockProducts: Product[] = [
  {
    id: 'prod-1',
    title: 'Industrial Grade Widgets',
    description: 'High-quality widgets for all your industrial needs. Made from reinforced steel.',
    image: 'https://picsum.photos/600/400?random=1',
    priceUSD: 1200.50,
    sellerId: 'user-2',
    categoryId: 'cat-1-1-1',
    specifications: [
        { name: 'Material', value: 'Reinforced Steel' },
        { name: 'Weight', value: '15.5 kg' },
        { name: 'SKU', value: 'WID-IND-001' },
    ]
  },
  {
    id: 'prod-2',
    title: 'Precision Cog Set',
    description: 'A set of 12 precision-engineered cogs for high-performance machinery.',
    image: 'https://picsum.photos/600/400?random=2',
    priceUSD: 850.00,
    sellerId: 'user-2',
    categoryId: 'cat-1-1-2',
    specifications: [
        { name: 'Material', value: 'Hardened Brass' },
        { name: 'Units per Set', value: '12' },
        { name: 'Tolerance', value: '±0.01mm' },
        { name: 'SKU', value: 'COG-PRE-012' },
    ]
  },
  {
    id: 'prod-3',
    title: 'Bulk Organic Cotton',
    description: '1000kg of premium, ethically sourced organic cotton bales.',
    image: 'https://picsum.photos/600/400?random=3',
    priceUSD: 5500.00,
    sellerId: 'user-3',
    categoryId: 'cat-2-1-1',
    specifications: [
        { name: 'Material', value: 'Organic Cotton' },
        { name: 'Weight per Bale', value: '1000 kg' },
        { name: 'Certification', value: 'GOTS Certified' },
    ]
  },
  {
    id: 'prod-4',
    title: 'Advanced Circuit Boards (100-pack)',
    description: 'Pack of 100 multi-layer circuit boards for complex electronics manufacturing.',
    image: 'https://picsum.photos/600/400?random=4',
    priceUSD: 3200.75,
    sellerId: 'user-3',
    categoryId: 'cat-3-1-1',
    specifications: [
        { name: 'Layers', value: '4' },
        { name: 'Material', value: 'FR-4' },
        { name: 'Quantity', value: '100 boards' },
    ]
  },
  {
    id: 'prod-5',
    title: 'Automated Conveyor System',
    description: 'A 10-meter modular conveyor belt system with variable speed control.',
    image: 'https://picsum.photos/600/400?random=5',
    priceUSD: 15000.00,
    sellerId: 'user-2',
    categoryId: 'cat-1-2-1',
    specifications: [
        { name: 'Length', value: '10 meters' },
        { name: 'Speed', value: '0-2 m/s' },
        { name: 'Motor', value: '2 HP Brushless DC' },
    ]
  },
  {
    id: 'prod-6',
    title: 'Titanium Alloy Rods (50-pack)',
    description: 'High-tensile strength titanium alloy rods, 1-meter length.',
    image: 'https://picsum.photos/600/400?random=6',
    priceUSD: 7800.00,
    sellerId: 'user-3',
    categoryId: 'cat-2-2-1',
    specifications: [
        { name: 'Alloy', value: 'Ti-6Al-4V' },
        { name: 'Length', value: '1 meter' },
        { name: 'Quantity', value: '50 rods' },
    ]
  },
];

export const mockMessages: Message[] = [
    {
        id: 'msg-1',
        text: 'Hello, I am interested in the Industrial Grade Widgets. Can you provide the spec sheet?',
        timestamp: Date.now() - 1000 * 60 * 5,
        senderId: 'user-1',
        recipientId: 'user-2',
    },
    {
        id: 'msg-2',
        text: 'Of course, I am attaching it now. Let me know if you have any more questions.',
        timestamp: Date.now() - 1000 * 60 * 3,
        senderId: 'user-2',
        recipientId: 'user-1',
    }
];

export const loggedInUser = mockUsers['user-1'];
