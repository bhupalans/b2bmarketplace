
'use server';

import { getSellerProducts } from '@/lib/database';
import { adminDb } from '@/lib/firebase-admin';
import { Offer, Lead, Conversation } from '@/lib/types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

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


export async function convertLeadsToConversations(sellerId: string): Promise<{ success: boolean; error?: string }> {
  if (!sellerId) {
    return { success: false, error: 'Seller ID is required.' };
  }

  try {
    const leadsRef = adminDb.collection('leads');
    const q = leadsRef.where('sellerId', '==', sellerId);
    const snapshot = await q.get();

    if (snapshot.empty) {
      return { success: true }; // No leads to convert
    }

    const batch = adminDb.batch();

    for (const leadDoc of snapshot.docs) {
      const lead = leadDoc.data() as Lead;

      // --- Create Conversation ---
      const conversationData: Omit<Conversation, 'id'> = {
        participantIds: [lead.buyerId, sellerId],
        productId: lead.productId,
        productTitle: lead.productTitle,
        productImage: lead.productImage || '',
        productSellerId: sellerId,
        createdAt: Timestamp.now(),
        lastMessage: {
            text: lead.requirements,
            senderId: lead.buyerId,
            timestamp: lead.createdAt as Timestamp,
        },
      };
      const conversationRef = adminDb.collection('conversations').doc(); // Auto-generate ID
      batch.set(conversationRef, conversationData);

      // --- Create Message ---
      const messageData = {
          conversationId: conversationRef.id,
          senderId: lead.buyerId,
          text: `<b>New Quote Request</b><br/><b>Product:</b> ${lead.productTitle}<br/><b>Quantity:</b> ${lead.quantity}<br/><br/><b>Buyer's Message:</b><br/>${lead.requirements}`,
          timestamp: lead.createdAt,
          isQuoteRequest: true,
      };
      const messageRef = adminDb.collection('conversations').doc(conversationRef.id).collection('messages').doc();
      batch.set(messageRef, messageData);
      
      // --- Delete Lead ---
      batch.delete(leadDoc.ref);
    }

    await batch.commit();

    revalidatePath('/messages');

    return { success: true };

  } catch (error: any) {
    console.error(`Error converting leads for seller ${sellerId}:`, error);
    return { success: false, error: 'Failed to convert leads to conversations.' };
  }
}
