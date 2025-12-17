
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ShippingPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Shipping Policy</CardTitle>
          <CardDescription>Last Updated: {new Date().toLocaleDateString()}</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-lg dark:prose-invert">
          <h2>1. Marketplace Shipping Policy</h2>
          <p>
            Please note that our B2B Marketplace is a platform that connects buyers and sellers. We do not own, stock, handle, or ship any products listed on the site. All shipping and logistics are arranged and managed directly between the buyer and the seller.
          </p>
          <h2>2. Seller's Responsibility</h2>
          <p>
            All sellers on our platform are responsible for defining and displaying their own shipping policy. When purchasing a product, it is the buyer's responsibility to review the seller's terms. A comprehensive shipping policy provided by a seller should include:
          </p>
          <ul>
            <li>Shipping methods offered (e.g., Sea Freight, Air Freight, Courier).</li>
            <li>Estimated lead and delivery times.</li>
            <li>Shipping costs and who is responsible for them (e.g., FOB, CIF, DDP).</li>
            <li>Information on tracking and insurance.</li>
            <li>Policies regarding customs, duties, and taxes.</li>
          </ul>
          <h2>3. Buyer's Responsibility</h2>
          <p>
            Buyers are responsible for reviewing the seller's shipping policy before making a purchase or entering into an agreement. It is the buyer's responsibility to provide a complete and accurate delivery address and to be aware of and handle any import duties, taxes, or customs clearance procedures in their destination country.
          </p>
          <h2>4. Disputes</h2>
          <p>
            Any disputes related to shipping, delivery, or receipt of goods must be resolved directly between the buyer and the seller. Our platform may provide communication tools to facilitate this process, but we will not act as a mediator or be held liable for any shipping-related issues.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
