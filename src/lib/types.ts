

import type { FieldValue, Timestamp } from "firebase/firestore";

export type User = {
  id: string; // This is the Firestore document ID, which is the same as the uid
  uid: string; // This is the Firebase Auth UID
  name: string;
  email: string;
  username?: string; // Add username as an optional field
  avatar: string;
  role: 'buyer' | 'seller' | 'admin';
  verified?: boolean; // For displaying a "Verified" badge
  businessType?: 'Manufacturer' | 'Distributor' | 'Trading Company' | 'Agent';
  location?: string;
  memberSince?: number;
  certifications?: string[];
  companyDescription?: string;
};

export type Category = {
  id: string;
  name:string;
  parentId: string | null;
  status: 'active' | 'inactive'; // New field for enabling/disabling
  specTemplateId?: string;       // New field to link to a SpecTemplate
};

export type SpecTemplateField = {
  name: string;
  type: 'text' | 'select' | 'radio' | 'switch';
  options?: string[]; // Comma-separated string of options for select/radio
}

export type SpecTemplate = {
  id: string;
  name: string;
  fields: SpecTemplateField[]; // e.g., ['Material', 'Weight', 'SKU']
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
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
};

export type Offer = {
  id: string;
  productId: string;
  quantity: number;
  pricePerUnit: number;
  notes?: string;
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn';
  sellerId: string;
  buyerId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Denormalized data for easier display
  productTitle: string;
  productImage: string;
};

export type Message = {
  id: string;
  conversationId: string;
  text: string;
  senderId: string;
  timestamp: Timestamp;
  offerId?: string; // Link to an offer
  isQuoteRequest?: boolean; // Flag for quote requests
};

export type Conversation = {
    id: string;
    participantIds: string[];
    productId: string;
    productTitle: string;
    productImage: string;
    createdAt: Timestamp;
    lastMessage: {
        text: string;
        senderId: string;
        timestamp: Timestamp;
    } | null;
    // For client-side use
    otherParticipant?: User;
}


export type OfferSuggestion = {
  productId?: string;
  quantity?: number;
  pricePerUnit?: number;
}
