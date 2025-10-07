
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Privacy Policy</CardTitle>
          <CardDescription>Last Updated: {new Date().toLocaleDateString()}</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-lg dark:prose-invert">
          <h2>1. Introduction</h2>
          <p>
            This is a placeholder Privacy Policy. You should replace this text with your own policy. This placeholder is not legally binding. It is crucial to consult with a legal professional to draft a privacy policy that complies with all applicable laws and regulations for your business and jurisdiction.
          </p>
          <h2>2. Information We Collect</h2>
          <p>
            This section should detail the types of information you collect from users, such as personal identification information (name, email address, phone number, etc.), non-personal identification information (browser name, type of computer, etc.), and payment details.
          </p>
          <h2>3. How We Use Collected Information</h2>
          <p>
            Explain the purposes for which you collect and use personal information. This may include to improve customer service, to personalize user experience, to process payments, to send periodic emails, etc.
          </p>
          <h2>4. How We Protect Your Information</h2>
          <p>
            Describe the security measures you have in place to protect against unauthorized access, alteration, disclosure, or destruction of personal information, transaction information, and data stored on your site.
          </p>
          <h2>5. Sharing Your Personal Information</h2>
          <p>
            Clarify your policy on selling, trading, or renting users' personal identification information to others. Detail the circumstances under which you might share aggregated demographic information not linked to any personal identification information with your business partners, trusted affiliates, and advertisers.
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
