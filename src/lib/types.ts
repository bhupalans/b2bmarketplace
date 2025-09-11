
import type { FieldValue, Timestamp } from "firebase/firestore";

export type User = {
  id: string; // This is the Firestore document ID, which is the same as the uid
  uid: string; // This is the Firebase Auth UID
  name: string; // This can now be the person's name, or a fallback.
  email: string;
  username?: string;
  avatar: string;
  role: 'buyer' | 'seller' | 'admin';
  createdAt?: string;
  
  // New production-ready fields
  companyName?: string;
  phoneNumber?: string;
  
  // Address fields. `address` is generic, while shipping/billing are specific.
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  
  billingSameAsShipping?: boolean; // Persist the checkbox state

  taxId?: string; // e.g., VAT ID, EIN for sellers
  verificationDetails?: { [key: string]: string }; // For dynamic verification fields

  // Existing fields
  verified?: boolean; // This will now represent the overall verified status
  businessType?: 'Manufacturer' | 'Distributor' | 'Trading Company' | 'Agent';
  exportScope?: string[]; // 'domestic' | 'international'
  location?: string; // This might become redundant with address, but let's keep it for now.
  memberSince?: number;
  certifications?: string[];
  companyDescription?: string;

  // New Verification Fields
  verificationStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  verificationDocuments?: {
      [fieldName: string]: { // For dynamic business docs like 'gstn', 'abn'
          url: string;
          fileName: string;
      } | undefined;
      addressProof?: { // For single-file proofs like utility bills
        url: string;
        fileName: string;
      };
      addressProof_front?: { // For card-based proofs
        url: string;
        fileName: string;
      };
      addressProof_back?: { // For card-based proofs
        url: string;
        fileName: string;
      };
      idProof?: {
        url: string;
        fileName: string;
      };
  };
  verificationRejectionReason?: string;
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
  type: 'text' | 'select' | 'radio' | 'switch' | 'checkbox';
  options?: string[]; // Comma-separated string of options for select/radio
}

export type SpecTemplate = {
  id: string;
  name: string;
  fields: SpecTemplateField[]; // e.g., ['Material', 'Weight', 'SKU']
};

export type VerificationField = {
    name: string; // e.g., "gstn"
    label: string; // e.g., "GSTN"
    type: 'text' | 'file'; // File type might not be used, but good to have
    required: 'always' | 'international' | 'never';
    validationRegex?: string;
    helperText?: string;
}

export type VerificationTemplate = {
    id: string; // Country code, e.g., "IN"
    countryName: string;
    fields: VerificationField[];
}


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
  
  // New common fields
  countryOfOrigin: string;
  stockAvailability: 'in_stock' | 'out_of_stock' | 'made_to_order';
  moq: number; // Minimum Order Quantity
  moqUnit: string; // Unit for MOQ, e.g., "pieces", "kg"
  sku?: string; // Stock Keeping Unit / Model Number
  leadTime?: string; // e.g., "5-7 business days"
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
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
  // Denormalized data for easier display
  productTitle: string;
  productImage: string;
  conversationId: string;
};

export type OfferStatusUpdate = {
    offerId: string;
    status: 'accepted' | 'declined';
}

export type Message = {
  id: string;
  conversationId: string;
  text: string;
  senderId: string;
  timestamp: Timestamp;
  offerId?: string; // Link to an offer
  isQuoteRequest?: boolean; // Flag for quote requests
  offerStatusUpdate?: OfferStatusUpdate; // For displaying status changes
};

export type Conversation = {
    id: string;
    participantIds: string[];
    productId: string;
    productTitle: string;
    productImage: string;
    productSellerId: string; // Keep track of the seller for the product
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
