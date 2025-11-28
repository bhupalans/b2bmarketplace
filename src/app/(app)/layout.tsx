

import { getBrandingSettings } from "@/lib/database";
import { AppLayoutClient } from "./app-layout-client";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const branding = await getBrandingSettings();
  const companyName = branding.companyName || "B2B Marketplace";

  return (
    <>
      <AppLayoutClient companyName={companyName}>
        {children}
      </AppLayoutClient>
      <CookieConsentBanner />
    </>
  );
}
