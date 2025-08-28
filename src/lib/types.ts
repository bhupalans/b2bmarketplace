
import type { FieldValue, Timestamp } from "firebase/firestore";

export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'buyer' | 'seller' | 'admin';
  businessType?: 'Manufacturer' | 'Distributor' | 'Trading Company' | 'Agent';
  location?: string;
  memberSince?: number;
  certifications?: string[];
  companyDescription?: string;
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
  images: string[];
  priceUSD: number;
  sellerId: string;
  categoryId: string;
  specifications?: { name: string; value: string }[];
};

export type Offer = {
  id: string;
  productId: string;
  quantity: number;
  pricePerUnit: number;
  notes: string;
  status: 'pending' | 'accepted' | 'declined';
  sellerId: string;
  buyerId: string;
};

export type Message = {
  id: string;
  text: string;
  timestamp: number | FieldValue | Timestamp;
  senderId: string;
  recipientId: string;
  participants: string[]; // Added for efficient querying
  offerId?: string;
  isSystemMessage?: boolean;
};

export type OfferSuggestion = {
  productId?: string;
  quantity?: number;
  pricePerUnit?: number;
}
