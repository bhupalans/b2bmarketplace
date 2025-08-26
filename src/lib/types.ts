
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
};

export type Message = {
  id: string;
  text: string;
  timestamp: number;
  senderId: string;
  recipientId: string;
  offerId?: string;
};

export type OfferSuggestion = {
  productId?: string;
  quantity?: number;
  pricePerUnit?: number;
}
