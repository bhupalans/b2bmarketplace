
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Privacy Policy</CardTitle>
          <CardDescription>Last Updated: {new Date().toLocaleDateString()}</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-lg dark:prose-invert max-w-full">
          <h2>1. Introduction</h2>
          <p>
            Welcome to our B2B Marketplace. We are committed to protecting your privacy and handling your data in an open and transparent manner. This privacy policy sets out how we collect, use, and protect your personal information in connection with your use of our platform.
          </p>
          
          <h2>2. Information We Collect</h2>
          <p>We collect information to provide and improve our services. The type of information we collect depends on how you use our platform.</p>

          <h3>2.1 Information You Provide to Us</h3>
          <ul>
            <li><strong>Account Information:</strong> When you register, we collect your full name, email address, company name, desired username, and your role (Buyer or Seller).</li>
            <li><strong>Profile Information:</strong> To build your profile, you may provide additional details such as your business address, shipping and billing addresses, phone number, job title, company website, company description, and tax/VAT ID.</li>
            <li><strong>Verification Documents:</strong> If you choose to undergo our verification process, we collect the documents you upload, which may include business registration certificates, proof of address (like utility bills), and government-issued photo IDs. These are stored securely.</li>
            <li><strong>Communications:</strong> We collect the content of messages, questions, answers, and quote requests that you send and receive through our platform's messaging system.</li>
          </ul>

          <h3>2.2 Information We Collect Automatically</h3>
          <ul>
            <li><strong>Log and Usage Data:</strong> Like most websites, we collect information that your browser sends whenever you visit our site. This may include your IP address, browser type, pages you visit, and the time and date of your visit.</li>
            <li><strong>GeoIP Information:</strong> For anonymous users, we use your IP address to perform a one-time lookup via a third-party service (ip-api.com) to determine your country. We use this solely to set a default currency and for regional pricing to enhance your browsing experience. We do not store this specific location data.</li>
            <li><strong>Cookies and Similar Technologies:</strong> We use cookies to operate and administer our site. See our "Cookies and Tracking Technologies" section for more details.</li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          <p>We use the information we collect for the following purposes:</p>
          <ul>
            <li>To operate, maintain, and improve our platform and services.</li>
            <li>To create and manage your account, and to verify your identity.</li>
            <li>To facilitate communications and transactions between buyers and sellers.</li>
            <li>To process your subscription payments through our third-party payment gateways (Stripe and Razorpay) and to generate invoices.</li>
            <li>To personalize your experience, such as by displaying prices in your local currency.</li>
            <li>To send you important transactional emails, such as security notices, payment confirmations, and notifications about activity on your account (e.g., new messages or answered questions).</li>
            <li>To monitor for and prevent fraudulent or prohibited activity, including the use of AI tools to moderate content.</li>
          </ul>

          <h2>4. How We Share Your Information</h2>
          <p>We do not sell or rent your personal information to third parties for their marketing purposes. We only share information in the following circumstances:</p>
          <ul>
            <li><strong>With Other Platform Users:</strong> To facilitate trade, some of your information is shared publicly on your profile page. This includes your name, company name, country, verification status, and featured status.</li>
            <li><strong>With Service Providers:</strong> We share information with third-party vendors and service providers who perform services on our behalf. This includes:
              <ul>
                <li>Payment processors (Stripe, Razorpay) to handle subscription payments.</li>
                <li>Cloud hosting and database providers (Google Cloud / Firebase) to store your data securely.</li>
                <li>Email delivery services (Resend) to send you transactional emails.</li>
                <li>AI service providers (Google AI / Genkit) to moderate user-generated content.</li>
              </ul>
            </li>
            <li><strong>For Legal Reasons:</strong> We may disclose your information if required to do so by law or in response to a valid request from a law enforcement or governmental authority.</li>
          </ul>
          
          <h2>5. Cookies and Tracking Technologies</h2>
          <ul>
              <li><strong>Essential Cookies:</strong> These are strictly necessary for the site to function, such as the session cookie used to keep you logged in. They are created when you log into your account.</li>
              <li><strong>Preference Cookies:</strong> We may use other non-essential cookies to remember your preferences, such as the state of the sidebar (expanded or collapsed). We will only set these cookies if you provide your consent via our cookie consent banner. You can manage your preferences at any time.</li>
          </ul>

          <h2>6. Data Security</h2>
          <p>
            We take reasonable technical and administrative measures to protect your personal information from loss, misuse, and unauthorized access. Verification documents are stored in a secure cloud environment with restricted access. However, no internet transmission is ever completely secure, and we cannot guarantee the absolute security of your data.
          </p>
          
          <h2>7. Your Rights and Choices</h2>
          <p>You have certain rights regarding your personal information. You can review and update most of your profile information at any time by logging into your account and visiting your profile page. You can also manage your cookie preferences via the consent banner.</p>

          <h2>8. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on this page and updating the "Last Updated" date.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
