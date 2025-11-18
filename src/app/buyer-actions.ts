
'use server';

import { adminDb } from '@/lib/firebase-admin';
import { Offer, SourcingRequest } from '@/lib/types';

export async function getBuyerDashboardData(buyerId: string) {
  try {
    const requestsSnapshot = await adminDb.collection("sourcingRequests").where("buyerId", "==", buyerId).get();
    const offersSnapshot = await adminDb.collection("offers").where("buyerId", "==", buyerId).where("status", "==", "accepted").get();
    
    const sourcingRequests = requestsSnapshot.docs.map(doc => doc.data() as SourcingRequest);
    const acceptedOffers = offersSnapshot.docs.map(doc => doc.data() as Offer);

    let totalSpend = 0;
    acceptedOffers.forEach(offer => {
        totalSpend += offer.quantity * offer.pricePerUnit;
    });

    const statusCounts = sourcingRequests.reduce((acc, req) => {
        acc[req.status] = (acc[req.status] || 0) + 1;
        return acc;
    }, {} as Record<SourcingRequest['status'], number>);
    
    const chartData = [
        { status: 'Active', count: statusCounts.active || 0 },
        { status: 'Pending', count: statusCounts.pending || 0 },
        { status: 'Closed', count: statusCounts.closed || 0 },
        { status: 'Expired', count: statusCounts.expired || 0 },
    ];


    return {
      success: true,
      data: {
        totalRequests: sourcingRequests.length,
        activeRequests: statusCounts.active || 0,
        totalSpend,
        acceptedOffersCount: acceptedOffers.length,
        requestStatusData: chartData,
      }
    };
  } catch (error: any) {
    console.error("Error fetching buyer dashboard data:", error);
    return { success: false, error: error.message };
  }
}

    