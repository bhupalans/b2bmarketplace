
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Script from "next/script";
import { getBrandingSettings } from "@/lib/database";
import { cookies, headers } from 'next/headers';
import { adminAuth } from "@/lib/firebase-admin";
import { getUser } from "@/lib/database";
import { CURRENCY_MAP } from "@/lib/geography-data";
import { parse } from 'accept-language-parser';

async function getDefaultCurrency(): Promise<string> {
    try {
        // 1. Check for logged-in user's profile setting (highest priority)
        const session = (await cookies()).get('session')?.value;
        if (session) {
            const decodedToken = await adminAuth.verifySessionCookie(session, true);
            const user = await getUser(decodedToken.uid);
            // Check all relevant address fields for a country
            const userCountry = user?.address?.country || user?.shippingAddress?.country;
            if (userCountry && CURRENCY_MAP[userCountry]) {
                return CURRENCY_MAP[userCountry];
            }
        }
        
        // 2. For anonymous users, perform a GeoIP lookup (server-side only)
        const forwardedFor = (await headers()).get('x-forwarded-for');
        const ip = forwardedFor ? forwardedFor.split(',')[0] : '127.0.0.1';

        // Avoid API calls for local development
        if (ip === '127.0.0.1' || ip === '::1') {
             return 'USD';
        }

        const geoResponse = await fetch(`http://ip-api.com/json/${ip}?fields=status,countryCode`);
        if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            if (geoData.status === 'success' && geoData.countryCode && CURRENCY_MAP[geoData.countryCode]) {
                return CURRENCY_MAP[geoData.countryCode];
            }
        }

    } catch (error) {
        // This can happen if the session cookie is invalid or for other auth/network errors.
        // We can safely ignore it and proceed to the fallback.
        console.warn("Could not determine currency from user session or GeoIP, falling back to USD.", error);
    }

    // 3. Final fallback
    return 'USD';
}

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBrandingSettings();
  const companyName = branding.companyName || "B2B Marketplace";
  const subhead = branding.subhead || "Connect with verified suppliers and source products globally.";
  
  return {
    title: {
      default: `${companyName} - The Global B2B Sourcing Platform`,
      template: `%s | ${companyName}`,
    },
    description: subhead,
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
