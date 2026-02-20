
"use client";

import React, { useState, useEffect } from 'react';
import { getBrandingSettingsClient } from "@/lib/firebase";
import { AppLayoutClient } from "./app-layout-client";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import Image from 'next/image';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [companyName, setCompanyName] = useState("B2B Marketplace");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBranding() {
      try {
        const branding = await getBrandingSettingsClient();
        setCompanyName(branding.companyName || "B2B Marketplace");
      } catch (error) {
        console.error("Failed to fetch branding settings:", error);
        // Use default name on error
      } finally {
        setLoading(false);
      }
    }
    fetchBranding();
  }, []);
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center space-y-4 text-center">
          <Image
            src="/Veloglobal.png"
            alt="VBuySell Logo"
            width={80}
            height={80}
            className="animate-pulse"
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">VBuySell</h1>
            <p className="text-muted-foreground">
              Connecting global suppliers & buyers...
            </p>
          </div>
      </div>
     </div>
    );
  }

  return (
    <>
      <AppLayoutClient companyName={companyName}>
        {children}
      </AppLayoutClient>
      <CookieConsentBanner />
    </>
  );
}
