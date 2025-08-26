export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'buyer' | 'seller' | 'admin';
};

export type Category = {
  id: string;
  name: string;
  parentId: string | null;
};

export type Product = {
  id: string;
  title: string;
  description: string;
  image: string;
  priceUSD: number;
  sellerId: string;
  categoryId: string;
  specifications?: { name: string; value: string }[];
};

export type Message = {
  id: string;
  text: string;
  timestamp: number;
  senderId: string;
  recipientId: string;
};
