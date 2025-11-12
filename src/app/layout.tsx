
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Script from "next/script";
import { getBrandingSettings } from "@/lib/database";
import { cookies, headers } from 'next/headers';
import { adminAuth } from "@/lib/firebase-admin";
import { getUser } from "@/lib/database";
import { CURRENCY_MAP } from "@/lib/geography-data";

async function getDefaultCurrency(): Promise<string> {
    try {
        // 1. Check for logged-in user
        const session = cookies().get('session')?.value;
        if (session) {
            const decodedToken = await adminAuth.verifySessionCookie(session, true);
            const user = await getUser(decodedToken.uid);
            if (user?.address?.country && CURRENCY_MAP[user.address.country]) {
                return CURRENCY_MAP[user.address.country];
            }
        }
        
        // 2. Fallback to GeoIP for anonymous users
        const ipCountry = headers().get('x-vercel-ip-country') || headers().get('x-country'); // Vercel or other providers
        if (ipCountry && CURRENCY_MAP[ipCountry]) {
            return CURRENCY_MAP[ipCountry];
        }

    } catch (error) {
        // This can happen if the session cookie is invalid or for other auth errors.
        // We can safely ignore it and proceed to the fallback.
        console.warn("Could not determine currency from user session or GeoIP, falling back to USD.", error);
    }

    // 3. Final fallback
    return 'USD';
}

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBrandingSettings();
  const companyName = branding.companyName || "B2B Marketplace";
  
  return {
    title: {
      default: companyName,
      template: `%s | ${companyName}`,
    },
    description: `A B2B marketplace for buyers and sellers, powered by ${companyName}.`,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const defaultCurrency = await getDefaultCurrency();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <Providers defaultCurrency={defaultCurrency}>{children}</Providers>
        <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      </body>
    </html>
  );
}
