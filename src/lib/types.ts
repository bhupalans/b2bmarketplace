
import type { FieldValue, Timestamp } from "firebase/firestore";

export type BrandingSettings = {
  companyName?: string;
  headline?: string;
  subhead?: string;
}

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
  jobTitle?: string; // Buyer-specific
  companyWebsite?: string; // Buyer-specific
  
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
  scopedVerificationIds?: { [key: string]: string }; // For country-scoped unique ID checks e.g., { "gstn-IN": "..." }

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
  
  // Subscription Fields
  subscriptionPlanId?: string;
  subscriptionPlan?: SubscriptionPlan; // Denormalized plan data for client-side use
  stripeCustomerId?: string;
  subscriptionExpiryDate?: string;
  renewalCancelled?: boolean;
};

export type SubscriptionInvoice = {
  id: string;
  userId: string;
  invoiceNumber: string;
  invoiceDate: string; // ISO string date
  planName: string;
  amount: number; // Stored in the primary currency unit (e.g., dollars, not cents)
  currency: string; // e.g., 'usd', 'inr'
  status: 'paid' | 'void';
  paymentId: string;
  provider: 'stripe' | 'razorpay';
  // Denormalized user details for the invoice
  billedTo: {
    name: string;
    email: string;
    address: {
      line1: string;
      city: string;
      state: string | null;
      postal_code: string;
      country: string;
    }
  };
  pdfUrl?: string; // URL to the generated PDF invoice in storage
};

export type PaymentGateway = {
  id: string; // e.g., 'stripe'
  name: string; // e.g., 'Stripe'
  logoUrl: string; // e.g., '/stripe-logo.svg'
  enabled: boolean;
};

export type Category = {
  id: string;
  name:string;
  parentId: string | null;
  status: 'active' | 'inactive';
  specTemplateId?: string;
  iconName?: string;
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

export type SubscriptionPlan = {
  id: string;
  name: string;
  price: number; // Default price in smallest unit (e.g., cents)
  currency: string; // Default currency (e.g., USD)
  pricing?: RegionalPrice[]; // Optional regional overrides
  type: 'seller' | 'buyer';
  productLimit?: number; 
  sourcingRequestLimit?: number; 
  hasAnalytics: boolean;
  isFeatured: boolean;
  status: 'active' | 'archived';
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
  razorpayPlanId?: string;
};

export type RegionalPrice = {
    country: string; // ISO 2-letter code
    price: number;
    currency: string; // ISO 3-letter code
}


export type Product = {
  id: string;
  title: string;
  description: string;
  images: string[];
  price: {
      baseAmount: number;
      baseCurrency: string;
  };
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
  unansweredQuestions?: number;
};

export type SourcingRequest = {
  id: string;
  title: string;
  buyerId: string;
  buyerName: string; // Denormalized
  buyerCountry: string; // Denormalized
  categoryId: string;
  description: string;
  quantity: number;
  quantityUnit: string;
  targetPrice?: {
      baseAmount: number;
      baseCurrency: string;
  };
  status: 'pending' | 'active' | 'closed' | 'expired';
  createdAt: Timestamp | string;
  expiresAt: Timestamp | string;
  rejectionReason?: string;
};

export type Offer = {
  id: string;
  productId: string;
  quantity: number;
  price: {
    baseAmount: number;
    baseCurrency: string;
  };
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
    productId?: string;
    productTitle?: string;
    productImage?: string;
    productSellerId?: string; // Keep track of the seller for the product
    sourcingRequestId?: string;
    sourcingRequestTitle?: string;
    createdAt: Timestamp;
    lastMessage: {
        text: string;
        senderId: string;
        timestamp: Timestamp;
    } | null;
    unreadCounts?: {
        [userId: string]: number;
    };
    // For client-side use
    otherParticipant?: User;
}


export type OfferSuggestion = {
  productId?: string;
  quantity?: number;
  pricePerUnit?: number;
}

export type Answer = {
  text: string;
  sellerId: string;
  sellerName: string;
  answeredAt: Timestamp | string;
};

export type Question = {
  id: string;
  productId: string;
  buyerId: string;
  buyerName: string; // denormalized
  text: string;
  createdAt: Timestamp | string;
  answer?: Answer;
};

export type AppNotification = {
  id: string;
  userId: string; // The user who should receive the notification
  message: string;
  link: string; // URL to navigate to when clicked
  read: boolean;
  createdAt: string;
};
