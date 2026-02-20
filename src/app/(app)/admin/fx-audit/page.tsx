import { getFxAuditData } from './actions';
import { FxAuditFilters } from './FxAuditFilters';


export default async function FxAuditPage({
  searchParams,
}: {
  searchParams?: {
    query?: string;
    currency?: string;
  };
}) {

  const offers = await getFxAuditData(
    searchParams?.query,
    searchParams?.currency
  );
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">FX Audit History</h1>
	
      <FxAuditFilters searchParams={searchParams} />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
  <table className="min-w-full text-sm">
    <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wide">
      <tr>
        <th className="px-4 py-3 text-left">Offer</th>
        <th className="px-4 py-3 text-left">Accepted</th>
        <th className="px-4 py-3 text-left">Buyer</th>
        <th className="px-4 py-3 text-left">Seller</th>
        <th className="px-4 py-3 text-left">Original</th>
        <th className="px-4 py-3 text-left">FX Rate</th>
        <th className="px-4 py-3 text-left">Frozen USD</th>
      </tr>
    </thead>

    <tbody className="divide-y divide-gray-100">
      {offers.map((offer) => (
        <tr key={offer.id} className="hover:bg-gray-50 transition">
          
          <td className="px-4 py-4 font-mono text-xs text-gray-500">
            {offer.id}
          </td>

          <td className="px-4 py-4">
            {offer.acceptedDate?.toLocaleString()}
          </td>

          <td className="px-4 py-4">
            <div className="font-medium">{offer.buyerName}</div>
            <div className="text-xs text-gray-500">
              {offer.buyerCurrency}
            </div>
          </td>

          <td className="px-4 py-4">
            <div className="font-medium">{offer.sellerName}</div>
            <div className="text-xs text-gray-500">
              {offer.sellerCurrency}
            </div>
          </td>

          <td className="px-4 py-4 font-medium">
            {offer.originalTotal?.toLocaleString()} {offer.originalCurrency}
          </td>

          <td className="px-4 py-4 text-gray-600">
            1 USD = {offer.exchangeRateUsed} {offer.originalCurrency}
          </td>

          <td className="px-4 py-4 font-semibold text-green-600">
            ${offer.frozenUSD?.toFixed(2)}
          </td>

        </tr>
      ))}
    </tbody>
  </table>
</div>

    </div>
  );
}
