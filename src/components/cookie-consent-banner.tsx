
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Cookie } from 'lucide-react';

const CONSENT_KEY = 'b2b_cookie_consent';

export function CookieConsentBanner() {
  const [consent, setConsent] = useState<'granted' | 'denied' | 'pending'>('pending');

  useEffect(() => {
    const storedConsent = localStorage.getItem(CONSENT_KEY);
    if (storedConsent === 'granted' || storedConsent === 'denied') {
      setConsent(storedConsent);
    } else {
      setConsent('pending');
    }
  }, []);

  const handleConsent = (decision: 'granted' | 'denied') => {
    localStorage.setItem(CONSENT_KEY, decision);
    setConsent(decision);
  };
  
  if (consent !== 'pending') {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
        <Card className="w-full max-w-4xl mx-auto shadow-2xl">
            <CardHeader className="flex flex-row items-start gap-4">
                 <Cookie className="h-8 w-8 text-primary mt-1" />
                 <div>
                    <CardTitle>About Your Privacy</CardTitle>
                    <CardDescription>
                        We use cookies and process data like your IP address to personalize your experience. This includes setting your currency and remembering your preferences. By clicking "Accept", you agree to our use of these technologies.
                    </CardDescription>
                 </div>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                <p className="text-sm text-muted-foreground flex-grow">
                    You can learn more by reading our <Link href="/privacy" className="underline hover:text-primary">Privacy Policy</Link>.
                </p>
                <div className="flex gap-2 flex-shrink-0">
                    <Button variant="ghost" onClick={() => handleConsent('denied')}>
                        Decline
                    </Button>
                    <Button onClick={() => handleConsent('granted')}>
                        Accept
                    </Button>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
