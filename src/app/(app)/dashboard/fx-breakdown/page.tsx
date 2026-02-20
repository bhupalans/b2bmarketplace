import { adminDb } from "@/lib/firebase-admin";
import { getAuth } from "@/lib/auth"; // if you have helper, else skip
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function SellerFxBreakdownPage({
  searchParams,
}: {
  searchParams: Promise<{ sellerId?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const sellerId = resolvedSearchParams.sellerId;

  if (!sellerId) return notFound();

  const snapshot = await adminDb
    .collection("offers")
    .where("sellerId", "==", sellerId)
    .where("status", "==", "accepted")
    .orderBy("pricing.convertedAt", "desc")
    .limit(20)
    .get();

  const offers = snapshot.docs.map(doc => {
    const data = doc.data();

    const original = Number(
        data.pricing?.original?.total ?? 0
    );

    const originalCurrency =
    data.pricing?.original?.currency ?? "";

    return {
  		id: doc.id,
  		productId: data.productId,
  		productTitle: data.productTitle,
  		quantity: data.quantity,
  		original,
  		originalCurrency,
  		exchangeRate:
    		data.pricing?.exchangeRates?.originalToUSD,
  		frozenUSD: data.pricing?.usd?.total,
    };
  });

  return (
    <div className="p-6 space-y-6">
     <h1 className="text-2xl font-bold">FX Breakdown</h1>
     <p className="text-sm text-gray-500">Showing {offers.length} accepted offers</p>

	<div className="flex justify-between items-center">
  		
  		<span className="text-sm text-gray-500">
    		Sorted by Most Recent
  		</span>
	</div>

       <div className="bg-white rounded-xl border shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Offer</th>
              <th className="px-4 py-3 text-left">Original</th>
              <th className="px-4 py-3 text-left">FX Used</th>
              <th className="px-4 py-3 text-left">Frozen USD</th>
            </tr>
          </thead>
          <tbody>
            {offers.map(o => (
              <tr key={o.id} className="border-t">
                <td className="px-4 py-3 text-sm">
		<Link href={`/products/${o.productId}`} className="text-blue-600 hover:underline font-medium">
    		{o.productTitle}
  		</Link>

		</td>
                <td className="px-4 py-3">
                  {o.original?.toLocaleString()} {o.originalCurrency}
                </td>
                <td className="px-4 py-3">
                    1 {o.originalCurrency} ={" "}{Number(o.exchangeRate).toFixed(4)} USD
                </td>
                <td className="px-4 py-3 font-semibold text-green-600">
                  ${o.frozenUSD?.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
