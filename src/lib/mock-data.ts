import type { User, Product, Message } from './types';

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

export const mockProducts: Product[] = [
  {
    id: 'prod-1',
    title: 'Industrial Grade Widgets',
    description: 'High-quality widgets for all your industrial needs. Made from reinforced steel.',
    image: 'https://picsum.photos/600/400?random=1',
    priceUSD: 1200.50,
    sellerId: 'user-2',
  },
  {
    id: 'prod-2',
    title: 'Precision Cog Set',
    description: 'A set of 12 precision-engineered cogs for high-performance machinery.',
    image: 'https://picsum.photos/600/400?random=2',
    priceUSD: 850.00,
    sellerId: 'user-2',
  },
  {
    id: 'prod-3',
    title: 'Bulk Organic Cotton',
    description: '1000kg of premium, ethically sourced organic cotton bales.',
    image: 'https://picsum.photos/600/400?random=3',
    priceUSD: 5500.00,
    sellerId: 'user-3',
  },
  {
    id: 'prod-4',
    title: 'Advanced Circuit Boards (100-pack)',
    description: 'Pack of 100 multi-layer circuit boards for complex electronics manufacturing.',
    image: 'https://picsum.photos/600/400?random=4',
    priceUSD: 3200.75,
    sellerId: 'user-3',
  },
  {
    id: 'prod-5',
    title: 'Automated Conveyor System',
    description: 'A 10-meter modular conveyor belt system with variable speed control.',
    image: 'https://picsum.photos/600/400?random=5',
    priceUSD: 15000.00,
    sellerId: 'user-2',
  },
  {
    id: 'prod-6',
    title: 'Titanium Alloy Rods (50-pack)',
    description: 'High-tensile strength titanium alloy rods, 1-meter length.',
    image: 'https://picsum.photos/600/400?random=6',
    priceUSD: 7800.00,
    sellerId: 'user-3',
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
