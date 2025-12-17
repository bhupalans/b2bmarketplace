
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ReturnsPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Cancellation & Refund Policy</CardTitle>
          <CardDescription>Last Updated: {new Date().toLocaleDateString()}</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-lg dark:prose-invert">
          <h2>1. Scope of This Policy</h2>
          <p>
            This policy outlines the guidelines for cancellations and refunds on our B2B Marketplace. It clarifies the distinction between platform subscription fees and transactions for goods between users.
          </p>
          <h2>2. Platform Subscription Fees</h2>
          <p>
            This section applies to fees paid directly to our platform for subscription plans (e.g., Seller Pro, Buyer Premium).
          </p>
          <ul>
            <li><strong>Fixed Term:</strong> Our yearly subscription plans are for a fixed one-year term and are paid via a one-time fee.</li>
            <li><strong>No Automatic Renewal:</strong> Subscriptions do not automatically renew. Your premium access will expire at the end of your paid term, at which point you may purchase a new subscription.</li>
            <li><strong>Refunds:</strong> All subscription fees paid to the platform are final and non-refundable.</li>
          </ul>
          <h2>3. Transactions Between Buyers and Sellers</h2>
          <p>
            This section applies to the actual purchase of goods between users of the platform. Our platform is not a party to these transactions.
          </p>
           <ul>
            <li><strong>Seller's Responsibility:</strong> Each Seller is responsible for creating, communicating, and managing their own individual policy for order cancellations, returns, and refunds. This policy should be made clear to the Buyer before a transaction is completed.</li>
            <li><strong>Buyer's Responsibility:</strong> Buyers are responsible for reading and understanding the Seller's specific policies before committing to a purchase.</li>
            <li><strong>Disputes:</strong> All disputes regarding returns, cancellations, refunds, or product warranties must be resolved directly between the Buyer and the Seller. We do not mediate these disputes or process refunds on behalf of users.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
