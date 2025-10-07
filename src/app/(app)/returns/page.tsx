
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
          <h2>1. General Policy</h2>
          <p>
            This is a placeholder for your Cancellation and Refund Policy. You must replace this content with your actual business policies. This text is for demonstration purposes only and carries no legal weight.
          </p>
          <h2>2. Subscription Services</h2>
          <p>
            This section should detail the terms of your subscription services. For example, subscriptions may be billed on a monthly or annual basis. You can cancel your subscription at any time from your account dashboard. Cancellations will take effect at the end of the current billing cycle.
          </p>
          <h2>3. Refunds</h2>
          <p>
            Specify your refund policy. For instance, "We do not offer refunds for partial subscription periods or unused services. Once a payment is made, it is non-refundable." Or, you might offer a pro-rated refund under certain circumstances. Be clear and specific.
          </p>
          <h2>4. Disputes Between Buyers and Sellers</h2>
          <p>
            As a B2B marketplace, transactions for goods occur directly between buyers and sellers. Our platform is not a party to these transactions. Therefore, all cancellations, returns, and refunds for products purchased must be handled directly between the buyer and the seller according to the seller's individual policies. We encourage both parties to communicate clearly and resolve any disputes amicably.
          </p>
          <h2>5. Changes to This Policy</h2>
          <p>
            We reserve the right to modify this cancellation and refund policy at any time, so please review it frequently. Changes and clarifications will take effect immediately upon their posting on the website.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
