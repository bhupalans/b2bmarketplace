
'use server';

import { adminDb } from '@/lib/firebase-admin';
import { Offer, SourcingRequest } from '@/lib/types';

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

export async function getBuyerDashboardData(buyerId: string) {
  try {
    const requestsSnapshot = await adminDb.collection("sourcingRequests").where("buyerId", "==", buyerId).get();
    const offersSnapshot = await adminDb.collection("offers").where("buyerId", "==", buyerId).where("status", "==", "accepted").get();
    
    const sourcingRequests = requestsSnapshot.docs.map(doc => doc.data() as SourcingRequest);
    const acceptedOffers = offersSnapshot.docs.map(doc => doc.data() as any); // Use any to handle legacy type

    let totalSpend = 0;
    acceptedOffers.forEach(offer => {
        // Handle both new and legacy offer price structures
        const priceObject = offer.price || { baseAmount: offer.pricePerUnit || 0, baseCurrency: 'USD' };
        if (priceObject.baseAmount > 0 && priceObject.baseCurrency) {
          const usdValue = convertToUSD(priceObject.baseAmount, priceObject.baseCurrency);
          totalSpend += (offer.quantity || 0) * usdValue;
        }
    });

    const statusCounts: Record<SourcingRequest['status'], number> = {
      pending: 0,
      active: 0,
      closed: 0,
      expired: 0,
    };
    sourcingRequests.forEach(req => {
        if (statusCounts.hasOwnProperty(req.status)) {
            statusCounts[req.status]++;
        }
    });
    
    const chartData = [
        { status: 'Active', count: statusCounts.active },
        { status: 'Pending', count: statusCounts.pending },
        { status: 'Closed', count: statusCounts.closed },
        { status: 'Expired', count: statusCounts.expired },
    ];

    return {
      success: true,
      data: {
        totalRequests: sourcingRequests.length,
        activeRequests: statusCounts.active,
        totalSpend, // This is now always in USD
        acceptedOffersCount: acceptedOffers.length,
        requestStatusData: chartData,
      }
    };
  } catch (error: any) {
    console.error("Error fetching buyer dashboard data:", error);
    return { success: false, error: error.message };
  }
}
