import Image from 'next/image';
import Link from 'next/link';
import { Building } from 'lucide-react';

export function AppFooter({ companyName }: { companyName: string }) {
  return (
    <footer className="mt-auto border-t bg-background">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h4 className="font-semibold mb-2">About Us</h4>
            <div className="space-y-1">
                <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary">Contact Us</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2">For Buyers</h4>
             <div className="space-y-1">
                <Link href="/products" className="text-sm text-muted-foreground hover:text-primary">Browse Products</Link>
                <br />
                <Link href="/sourcing/create" className="text-sm text-muted-foreground hover:text-primary">Post Sourcing Request</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2">For Sellers</h4>
             <div className="space-y-1">
                <Link href="/profile/subscription" className="text-sm text-muted-foreground hover:text-primary">Subscription Plans</Link>
                 <br />
                <Link href="/signup" className="text-sm text-muted-foreground hover:text-primary">Create an Account</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Policies</h4>
            <div className="space-y-1">
                <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary">Terms & Conditions</Link>
                 <br />
                <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary">Privacy Policy</Link>
                 <br />
                <Link href="/shipping" className="text-sm text-muted-foreground hover:text-primary">Shipping Policy</Link>
                 <br />
                <Link href="/returns" className="text-sm text-muted-foreground hover:text-primary">Returns & Cancellations</Link>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t pt-4 flex justify-between items-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {companyName}. All rights reserved.</p>
          <div className="flex items-center gap-2">
          <Image src="/Veloglobal.png" alt="Company Logo" width={36} height={16} />
            <span>{companyName}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
