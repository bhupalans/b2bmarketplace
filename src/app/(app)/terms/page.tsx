
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsAndConditionsPage() {
  return (
    <div className="max-w-4xl mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Terms and Conditions</CardTitle>
          <CardDescription>Last Updated: {new Date().toLocaleDateString()}</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-lg dark:prose-invert max-w-full">
          <h2>1. Introduction & Acceptance of Terms</h2>
          <p>
            Welcome to our B2B Marketplace. These Terms and Conditions ("Terms") govern your access to and use of our platform, including any content, functionality, and services offered. By registering for an account or by using the platform in any manner, you agree to be bound by these Terms.
          </p>

          <h2>2. The Role of the Marketplace</h2>
          <p>
            You acknowledge and agree that our platform is a neutral venue that connects business-to-business buyers ("Buyers") and sellers ("Sellers"). We are not directly involved in the transaction between Buyers and Sellers. We do not handle shipping, guarantee product quality, inspect goods, or process payments for the actual goods being sold. As such, we have no control over the quality, safety, legality, or accuracy of listings, the ability of Sellers to sell items, or the ability of Buyers to pay for items. All transactions are conducted at the users' own risk.
          </p>

          <h2>3. User Accounts and Obligations</h2>
          <p>
            <strong>3.1. Account Registration:</strong> To access most features, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate.
          </p>
          <p>
            <strong>3.2. Account Security:</strong> You are responsible for safeguarding your password and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.
          </p>
          <p>
            <strong>3.3. User Roles:</strong> The platform offers distinct "Buyer" and "Seller" roles. These roles have different permissions and capabilities. You agree to use the platform only in a manner consistent with your designated role.
          </p>

          <h2>4. User Verification</h2>
          <p>
            Our platform offers a verification process where users may submit business documents. A "Verified" status indicates only that a user has completed this process. It is not an endorsement, guarantee, or warranty of the user's identity, credibility, quality, or reliability. We strongly encourage all users to conduct their own due diligence before entering into any transaction.
          </p>

          <h2>5. Platform Subscription Services</h2>
          <p>
            <strong>5.1. Fees:</strong> Access to certain premium features for Buyers and Sellers requires an active, paid subscription. All subscription fees are for the use of the platform's features and are separate from any costs associated with the purchase of goods.
          </p>
          <p>
            <strong>5.2. Billing & Term:</strong> Subscriptions are for a fixed term (e.g., one year) and are paid via a one-time fee. Your subscription does not automatically renew. Upon expiration, your account will revert to the free plan, and you will need to purchase a new subscription to regain access to premium features.
          </p>
          <p>
            <strong>5.3. Cancellations & Refunds:</strong> Subscription payments are non-refundable. Since subscriptions do not automatically renew, no cancellation is necessary. Your premium access will continue until the end of your paid term.
          </p>

          <h2>6. User Content and Code of Conduct</h2>
          <p>
            <strong>6.1. User-Generated Content:</strong> You are solely responsible for any content you post, including product listings, sourcing requests, questions, answers, and messages ("User Content"). You grant us a non-exclusive, worldwide, royalty-free license to use, display, and distribute your User Content in connection with operating the platform.
          </p>
          <p>
            <strong>6.2. Prohibited Conduct:</strong> You agree not to post User Content that is fraudulent, misleading, illegal, harassing, or infringing on any third-party rights. You are strictly prohibited from sharing direct contact information (email addresses, phone numbers, website URLs, social media profiles) in public listings or initial messages to circumvent the platform's communication and transaction flow.
          </p>
          <p>
            <strong>6.3. Moderation:</strong> We reserve the right, but not the obligation, to monitor, moderate, or remove any User Content that we believe violates these Terms, without notice. This includes the use of automated systems to filter content.
          </p>
          
          <h2>7. Limitation of Liability</h2>
          <p>
            The platform is provided on an "as is" and "as available" basis. To the fullest extent permitted by law, we disclaim all warranties, express or implied. We will not be liable for any damages of any kind (including, but not limited to, direct, indirect, incidental, or consequential damages) arising from the use of this site or from any interactions or transactions between users.
          </p>

          <h2>8. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which our company is registered, without regard to its conflict of law provisions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
