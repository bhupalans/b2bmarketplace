export function FxAuditFilters({ searchParams }: any) {
  return (
    <form className="mb-6 flex gap-4 items-end">

      <div>
        <label className="block text-xs text-gray-500 mb-1">
          Search
        </label>
        <input
          type="text"
          name="query"
          defaultValue={searchParams?.query}
          placeholder="Offer ID / Buyer / Seller"
          className="border rounded-lg px-3 py-2 text-sm w-64"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">
          Currency
        </label>
        <select
          name="currency"
          defaultValue={searchParams?.currency}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="ZAR">ZAR</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="INR">INR</option>
        </select>
      </div>

      <button
        type="submit"
        className="bg-black text-white px-4 py-2 rounded-lg text-sm"
      >
        Apply
      </button>

    </form>
  );
}
