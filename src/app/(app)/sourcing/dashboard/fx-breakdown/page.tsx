import { adminDb } from "@/lib/firebase-admin";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function BuyerFxBreakdownPage({
  searchParams,
}: {
  searchParams: Promise<{ buyerId?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const buyerId = resolvedSearchParams.buyerId;

  if (!buyerId) return notFound();

  const snapshot = await adminDb
    .collection("offers")
    .where("buyerId", "==", buyerId)
    .where("status", "==", "accepted")
    .orderBy("pricing.convertedAt", "desc")
    .limit(20)
    .get();

  const offers = snapshot.docs.map((doc) => {
    const data = doc.data();

    const original = Number(
      data.pricing?.original?.total ?? 0
    );

    const originalCurrency =
      data.pricing?.original?.currency ?? "";

    const frozenUSD = Number(
      data.pricing?.usd?.total ?? 0
    );

    const exchangeRate =
      data.pricing?.exchangeRates?.originalToUSD ?? null;

    return {
      id: doc.id,
      productId: data.productId,
      productTitle: data.productTitle,
      original,
      originalCurrency,
      exchangeRate,
      frozenUSD,
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
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-left">Original</th>
              <th className="px-4 py-3 text-left">FX Used</th>
              <th className="px-4 py-3 text-left">Frozen USD</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="px-4 py-3 text-sm">
                  <Link
                    href={`/products/${o.productId}`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {o.productTitle}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {o.original?.toLocaleString()} {o.originalCurrency}
                </td>
                <td className="px-4 py-3">
                  1 {o.originalCurrency} ={" "}{Number(o.exchangeRate).toFixed(6)} USD
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
