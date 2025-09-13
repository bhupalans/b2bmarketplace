
"use client";

import { useAuth } from "@/contexts/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, ShieldAlert } from "lucide-react";
import { ProfileForm } from "./profile-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";

export default function ProfilePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-10">
        Please log in to view your profile.
      </div>
    );
  }

  const isUnverifiedUser = user.verificationStatus !== 'verified';


  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">
          Keep your business and contact information up-to-date.
        </p>
      </div>

       {isUnverifiedUser && (
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Verification Required</AlertTitle>
          <AlertDescription>
            Your account is not yet verified. Please complete the verification process to gain full access and build trust. 
            <Link href="/profile/verification" className="font-semibold text-primary hover:underline ml-1">
              Go to Verification Center
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <ProfileForm user={user} />
    </div>
  );
}
