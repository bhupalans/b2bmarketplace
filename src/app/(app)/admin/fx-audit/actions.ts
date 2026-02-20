'use server';

import { adminDb } from '@/lib/firebase-admin';

export async function getFxAuditData(
  query?: string,
  currency?: string
) {

  const snapshot = await adminDb
    .collection('offers')
    .where('status', '==', 'accepted')
    .orderBy('pricing.convertedAt', 'desc')
    .limit(20)
    .get();

  const offers = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const data = doc.data();

      const buyerSnap = await adminDb.collection('users').doc(data.buyerId).get();
      const sellerSnap = await adminDb.collection('users').doc(data.sellerId).get();

      const buyer = buyerSnap.data();
      const seller = sellerSnap.data();

      return {
        id: doc.id,
        acceptedDate: data.updatedAt?.toDate?.() || null,

        buyerName: buyer?.name || 'Unknown',
        buyerCurrency: data.pricing?.original?.currency,

        sellerName: seller?.name || 'Unknown',
        sellerCurrency: data.pricing?.original?.currency,

        originalTotal:
          data.pricing?.original?.amountPerUnit *
          data.pricing?.quantity,

        originalCurrency: data.pricing?.original?.currency,

        exchangeRateUsed: data.pricing?.exchangeRateUsed,

        frozenUSD: data.pricing?.usd?.total,

        convertedAt: data.pricing?.convertedAt?.toDate?.() || null,
      };
    })
  );

  // 🔎 Apply Search Filter
  let filtered = offers;

  if (query) {
    filtered = filtered.filter((o) =>
      o.id.includes(query) ||
      o.buyerName.toLowerCase().includes(query.toLowerCase()) ||
      o.sellerName.toLowerCase().includes(query.toLowerCase())
    );
  }

  // 🎯 Apply Currency Filter
  if (currency) {
    filtered = filtered.filter(
      (o) => o.originalCurrency === currency
    );
  }

  return filtered;
}
