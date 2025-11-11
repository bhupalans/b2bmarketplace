
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Script from "next/script";
import { getBrandingSettings } from "@/lib/database";

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
        <Providers>{children}</Providers>
        <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      </body>
    </html>
  );
}
