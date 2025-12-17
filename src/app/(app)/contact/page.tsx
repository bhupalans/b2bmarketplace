
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CallbackRequestForm } from '@/components/callback-request-form';

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Contact Us</CardTitle>
          <CardDescription>We're here to help.</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-lg dark:prose-invert max-w-full space-y-4">
          <p>
            If you have any questions, concerns, or feedback, please don't hesitate to reach out. Our team is available to assist you with any inquiries you may have.
          </p>
          <div>
            <strong>General & Support Inquiries:</strong>
            <br />
            Email: support@example.com
          </div>
           <div>
            <strong>Business Inquiries:</strong>
            <br />
            Email: business@example.com
          </div>
          <p>
            Our office hours are Monday to Friday, 9:00 AM to 5:00 PM (EST). We strive to respond to all inquiries within 24 business hours.
          </p>
          <div className="not-prose border-t pt-6">
            <h3 className="text-xl font-semibold mb-2">Need to speak with someone?</h3>
            <p className="text-muted-foreground mb-4">Request a callback and a member of our team will get in touch with you at your convenience.</p>
            <CallbackRequestForm />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
