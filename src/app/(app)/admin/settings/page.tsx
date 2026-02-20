
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import { getProductUpdateRulesClient, getPaymentGatewaysClient, getBrandingSettingsClient } from '@/lib/firebase';
import { SettingsClientPage } from './client-page';
import { PaymentGateway, BrandingSettings } from '@/lib/types';

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [initialRules, setInitialRules] = useState<string[]>([]);
  const [paymentGateways, setPaymentGateways] = useState<PaymentGateway[]>([]);
  const [brandingSettings, setBrandingSettings] = useState<BrandingSettings>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (user?.role !== 'admin') {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [rules, gateways, branding] = await Promise.all([
            getProductUpdateRulesClient(),
            getPaymentGatewaysClient(),
            getBrandingSettingsClient()
        ]);
        setInitialRules(rules);
        setPaymentGateways(gateways);
        setBrandingSettings(branding);
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="flex justify-center items-center h-full">
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return <SettingsClientPage 
            initialRules={initialRules} 
            initialPaymentGateways={paymentGateways} 
            initialBranding={brandingSettings}
        />;
}
