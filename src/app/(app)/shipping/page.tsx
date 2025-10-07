
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
            This is a placeholder Shipping Policy. Please note that our B2B Marketplace is a platform that connects buyers and sellers. We do not directly handle, ship, or take responsibility for the shipping of products.
          </p>
          <h2>2. Seller's Responsibility</h2>
          <p>
            All shipping and logistics are the sole responsibility of the seller. Each seller is expected to define and display their own shipping policy on their product listings or seller profile. This should include, but is not limited to:
          </p>
          <ul>
            <li>Shipping methods offered (e.g., Sea Freight, Air Freight, Courier).</li>
            <li>Estimated lead and delivery times.</li>
            <li>Shipping costs and who is responsible for them (e.g., FOB, CIF).</li>
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
