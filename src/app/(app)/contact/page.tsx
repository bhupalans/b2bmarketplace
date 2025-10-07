
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Contact Us</CardTitle>
          <CardDescription>We're here to help.</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-lg dark:prose-invert">
          <p>
            If you have any questions, concerns, or feedback, please don't hesitate to reach out. Our team is available to assist you with any inquiries you may have.
          </p>
          <p>
            <strong>Customer Support:</strong>
            <br />
            Email: support@example.com
            <br />
            Phone: +1 (800) 555-0199
          </p>
          <p>
            <strong>Business Inquiries:</strong>
            <br />
            Email: business@example.com
          </p>
          <p>
            Our office hours are Monday to Friday, 9:00 AM to 5:00 PM (EST). We strive to respond to all inquiries within 24 business hours.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
