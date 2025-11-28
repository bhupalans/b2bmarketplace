

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
            This is a placeholder Privacy Policy. You should replace this text with your own policy. This placeholder is not legally binding. It is crucial to consult with a legal professional to draft a privacy policy that complies with all applicable laws and regulations for your business and jurisdiction.
          </p>
          
          <h2>2. Information We Collect</h2>
          <h3>2.1 Information You Provide</h3>
          <p>We collect personal information you provide directly to us when you create an account, update your profile, or communicate with us. This may include your name, email address, phone number, company details, and any other information you choose to provide.</p>

          <h3>2.2 Information We Collect Automatically</h3>
          <p>When you access or use our Services, we automatically collect certain information, including:</p>
          <ul>
              <li><strong>Log Information:</strong> We log information about your use of the Services, including the type of browser you use, access times, pages viewed, and your IP address.</li>
              <li><strong>IP Address and Geolocation:</strong> We use your IP address to infer your approximate location. We use a third-party service, ip-api.com, to determine your country from your IP address. This is used solely for the purpose of setting a default currency to enhance your browsing experience.</li>
          </ul>

          <h2>3. Cookies and Tracking Technologies</h2>
          <p>We use various technologies to collect information, and this may include sending cookies to your computer or mobile device.</p>
          <ul>
              <li><strong>What are cookies?</strong> Cookies are small data files stored on your hard drive or in device memory that help us improve our Services and your experience.</li>
              <li><strong>Essential Cookies:</strong> Some cookies are strictly necessary for the site to function, such as the session cookie used to keep you logged in. These are created when you perform an explicit action like logging into your account.</li>
              <li><strong>Preference Cookies:</strong> We use other non-essential cookies to remember your preferences, such as the state of the sidebar (expanded or collapsed). We will only set these cookies if you provide your consent via our cookie consent banner.</li>
          </ul>

          <h2>4. How We Use Collected Information</h2>
          <p>
            Explain the purposes for which you collect and use personal information. This may include to improve customer service, to personalize user experience, to process payments, to send periodic emails, etc.
          </p>
          <h2>5. Sharing Your Personal Information</h2>
          <p>
            Clarify your policy on selling, trading, or renting users' personal identification information to others. Detail the circumstances under which you might share aggregated demographic information not linked to any personal identification information with your business partners, trusted affiliates, and advertisers. Specifically mention any third-party services you use, like the GeoIP provider.
          </p>
          <h2>6. Your Acceptance of These Terms</h2>
          <p>
            By using this Site, you signify your acceptance of this policy. If you do not agree to this policy, please do not use our Site. Your continued use of the Site following the posting of changes to this policy will be deemed your acceptance of those changes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
