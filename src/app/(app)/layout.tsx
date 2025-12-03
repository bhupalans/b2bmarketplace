
"use client";

import React, { useState, useEffect } from 'react';
import { getBrandingSettingsClient } from "@/lib/firebase";
import { AppLayoutClient } from "./app-layout-client";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { Loader2 } from 'lucide-react';

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
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
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
