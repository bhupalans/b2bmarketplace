
'use server';

import { adminDb } from '@/lib/firebase-admin';
import { Offer, Lead, Conversation, Message, Product } from '@/lib/types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

// Internal, server-side only function to send a message.
// This avoids calling the client-side `sendMessage` from a server action.
async function sendMessageAsAdmin(
    conversationId: string,
    senderId: string,
    text: string,
    options?: { offerId?: string; isQuoteRequest?: boolean }
): Promise<void> {
    const batch = adminDb.batch();
    const conversationRef = adminDb.collection('conversations').doc(conversationId);
    const messageRef = conversationRef.collection('messages').doc();

    const newMessage: Omit<Message, 'id'> = {
        conversationId,
        senderId,
        text,
        timestamp: FieldValue.serverTimestamp() as Timestamp,
    };

    if (options?.offerId) {
        newMessage.offerId = options.offerId;
    }
    if (options?.isQuoteRequest) {
        newMessage.isQuoteRequest = true;
    }

    const lastMessageUpdate = {
        lastMessage: {
            text,
            senderId,
            timestamp: FieldValue.serverTimestamp(),
        }
    };

    batch.set(messageRef, newMessage);
    batch.update(conversationRef, lastMessageUpdate);

    await batch.commit();
}


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
      
      const conversationData: Omit<Conversation, 'id' | 'lastMessage'> = {
        participantIds: [lead.buyerId, sellerId],
        productId: lead.productId,
        productTitle: lead.productTitle,
        productImage: lead.productImage || '',
        productSellerId: sellerId,
        createdAt: FieldValue.serverTimestamp() as Timestamp,
      };
      
      const conversationRef = adminDb.collection('conversations').doc();
      batch.set(conversationRef, conversationData);

      // Now call the server-side message sender
      const formattedMessage = `<b>New Quote Request</b><br/><b>Product:</b> ${lead.productTitle}<br/><b>Quantity:</b> ${lead.quantity}<br/><br/><b>Buyer's Message:</b><br/>${lead.requirements}`;
      await sendMessageAsAdmin(conversationRef.id, lead.buyerId, formattedMessage, { isQuoteRequest: true });

      // Finally, delete the lead in the same batch
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
