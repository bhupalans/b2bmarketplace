
"use client";

import { useAuth } from "@/contexts/auth-context";
import { Loader2 } from "lucide-react";
import { VerificationClientPage } from "./client-page";
import { VerificationTemplate } from "@/lib/types";
import { getVerificationTemplatesClient } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function VerificationPage() {
  const { user, loading: authLoading } = useAuth();
  const [templates, setTemplates] = useState<VerificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchTemplates() {
        if (!user) {
            setLoading(false);
            return;
        }
      try {
        const fetchedTemplates = await getVerificationTemplatesClient();
        setTemplates(fetchedTemplates);
      } catch (error) {
        console.error("Failed to fetch verification templates:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load verification requirements.",
        });
      } finally {
          setLoading(false);
      }
    }
    
    if (!authLoading) {
      fetchTemplates();
    }
  }, [user, authLoading, toast]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-10">
        Please log in to access the verification center.
      </div>
    );
  }

  return <VerificationClientPage user={user} verificationTemplates={templates} />;
}
