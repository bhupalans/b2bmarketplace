
'use server';

import { getSellerProducts } from '@/lib/database';
import { adminDb } from '@/lib/firebase-admin';
import { Offer } from '@/lib/types';

export async function getSellerDashboardData(sellerId: string) {
  try {
    const [sellerProducts, offersSnapshot] = await Promise.all([
        getSellerProducts(sellerId),
        adminDb.collection("offers").where("sellerId", "==", sellerId).get()
    ]);
    
    const offers = offersSnapshot.docs.map(doc => doc.data() as Offer);

    let totalRevenue = 0;
    const acceptedOffers = offers.filter(offer => offer.status === 'accepted');
    
    acceptedOffers.forEach(offer => {
        totalRevenue += offer.quantity * offer.pricePerUnit;
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
        totalRevenue,
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
