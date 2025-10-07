
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsAndConditionsPage() {
  return (
    <div className="max-w-4xl mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Terms and Conditions</CardTitle>
          <CardDescription>Last Updated: {new Date().toLocaleDateString()}</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-lg dark:prose-invert">
          <h2>1. Introduction</h2>
          <p>
            Welcome to our B2B Marketplace. This is a placeholder for your Terms and Conditions. You must replace this content with your own legally-vetted terms. This placeholder text is not legally binding.
          </p>
          <h2>2. User Accounts</h2>
          <p>
            To use certain features of the site, you must register for an account. You must provide accurate and complete information and keep your account information updated. You are responsible for all activities that occur under your account.
          </p>
          <h2>3. Marketplace Role</h2>
          <p>
            Our platform serves as a venue to allow users to offer, sell, and buy goods. We are not directly involved in the transaction between buyers and sellers. As a result, we have no control over the quality, safety, morality, or legality of any aspect of the items listed, the truth or accuracy of the listings, the ability of sellers to sell items, or the ability of buyers to pay for items.
          </p>
          <h2>4. Prohibited Conduct</h2>
          <p>
            You agree not to engage in any of the following prohibited activities: (i) copying, distributing, or disclosing any part of the service in any medium; (ii) using any automated system, including "robots," "spiders," "offline readers," etc., to access the service; (iii) transmitting spam, chain letters, or other unsolicited email; (iv) attempting to interfere with, compromise the system integrity or security or decipher any transmissions to or from the servers running the service.
          </p>
          <h2>5. Disclaimers and Limitation of Liability</h2>
          <p>
            The service is provided on an "as is" and "as available" basis. To the fullest extent permitted by applicable law, we disclaim all warranties, express or implied. We will not be liable for any damages of any kind arising from the use of this site.
          </p>
          <h2>6. Governing Law</h2>
          <p>
            These Terms shall be governed by the laws of your state/country, without respect to its conflict of laws principles.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
