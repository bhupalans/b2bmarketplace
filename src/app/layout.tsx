
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
        // 1. Check for logged-in user's profile setting
        const session = (await cookies()).get('session')?.value;
        if (session) {
            const decodedToken = await adminAuth.verifySessionCookie(session, true);
            const user = await getUser(decodedToken.uid);
            // Check both primary address and shipping address for a country
            const userCountry = user?.address?.country || user?.shippingAddress?.country;
            if (userCountry && CURRENCY_MAP[userCountry]) {
                return CURRENCY_MAP[userCountry];
            }
        }
        
        // 2. Fallback to Accept-Language header for anonymous users
        const acceptLanguage = headers().get('accept-language');
        if (acceptLanguage) {
            const languages = parse(acceptLanguage);
            for (const lang of languages) {
                if (lang.region && CURRENCY_MAP[lang.region]) {
                    return CURRENCY_MAP[lang.region];
                }
            }
        }

    } catch (error) {
        // This can happen if the session cookie is invalid or for other auth errors.
        // We can safely ignore it and proceed to the fallback.
        console.warn("Could not determine currency from user session or language header, falling back to USD.", error);
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
