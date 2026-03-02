
'use server';

import { adminDb } from '@/lib/firebase-admin';
import { Offer, Product } from '@/lib/types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { enhanceProductDescription as enhanceDescriptionFlow } from '@/ai/flows/enhance-product-description-flow';

// A simplified, server-side rates object. In a real-world app, this would be
// fetched periodically and cached from an API.
const rates: { [key: string]: number } = {
  USD: 1,
  EUR: 0.92,
  INR: 83.45,
  GBP: 0.79,
  CAD: 1.37,
  AUD: 1.51,
  JPY: 157.25,
};


const convertToUSD = (amount: number, currency: string) => {
    const rate = rates[currency] || 1; // Default to 1 if rate is not found
    return amount / rate;
}

export async function getSellerDashboardData(sellerId: string) {
  try {
    const [sellerProducts, offersSnapshot] = await Promise.all([
        getSellerProducts(sellerId),
        adminDb.collection("offers").where("sellerId", "==", sellerId).get()
    ]);
    
    const offers = offersSnapshot.docs.map(doc => doc.data() as any); // Use any to handle legacy type

    let totalRevenue = 0;
    const acceptedOffers = offers.filter(offer => offer.status === 'accepted');
    
    acceptedOffers.forEach(offer => {
        // Handle both new and legacy offer price structures
        const priceObject = offer.price || { baseAmount: offer.pricePerUnit || 0, baseCurrency: 'USD' };
        if (priceObject.baseAmount > 0 && priceObject.baseCurrency) {
          const usdValue = convertToUSD(priceObject.baseAmount, priceObject.baseCurrency);
          totalRevenue += (offer.quantity || 0) * usdValue;
        }
    });

    const offerCountsByProductId = new Map<string, number>();
    offers.forEach(offer => {
        offerCountsByProductId.set(
            offer.productId,
            (offerCountsByProductId.get(offer.productId) || 0) + 1
        );
    });

    const productsWithOfferCounts = sellerProducts.map(product => ({
        ...product,
        offerCount: offerCountsByProductId.get(product.id) || 0,
    })).sort((a, b) => b.offerCount - a.offerCount);

    return {
      success: true,
      data: {
        totalRevenue, // This is now always in USD
        acceptedOffersCount: acceptedOffers.length,
        totalProducts: sellerProducts.length,
        productsWithOfferCounts,
      }
    };
  } catch (error: any) {
    console.error("Error fetching seller dashboard data:", error);
    return { success: false, error: error.message };
  }
}

// This function is defined in `database.ts` but needed for `getSellerDashboardData`
async function getSellerProducts(sellerId: string): Promise<any[]> {
    const querySnapshot = await adminDb.collection("products").where("sellerId", "==", sellerId).get();
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        const serializableData = {
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        };
        return { id: doc.id, ...serializableData };
    });
}

export async function enhanceProductDescriptionAction(
  title: string,
  description: string
): Promise<{ success: true; enhancedDescription: string } | { success: false; error: string }> {
  if (!title || !description) {
    return { success: false, error: 'Product title and description are required.' };
  }
  try {
    const result = await enhanceDescriptionFlow({ title, description });
    return { success: true, enhancedDescription: result.enhancedDescription };
  } catch (error: any) {
    console.error('AI description enhancement failed:', error);
    return { success: false, error: 'Failed to generate a new description from AI.' };
  }
}
