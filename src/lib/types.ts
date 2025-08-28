
import type { FieldValue, Timestamp } from "firebase/firestore";

export type User = {
  id: string; // This is the Firestore document ID, which is the same as the uid
  uid: string; // This is the Firebase Auth UID
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
  sellerId: string; // This should be the seller's UID
  categoryId: string;
  status: 'pending' | 'approved' | 'rejected';
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
  senderId: string; // UID of the sender
  recipientId: string; // UID of the recipient
  participants: string[]; // Array of participant UIDs
  offerId?: string;
  isSystemMessage?: boolean;
};

export type OfferSuggestion = {
  productId?: string;
  quantity?: number;
  pricePerUnit?: number;
}
