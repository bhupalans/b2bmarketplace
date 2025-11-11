
import { UserAuthForm } from "@/components/user-auth-form";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import Link from "next/link";
import { Building } from "lucide-react";
import { getBrandingSettings } from "@/lib/database";

export default async function LoginPage() {
  const branding = await getBrandingSettings();
  const companyName = branding.companyName || "B2B Marketplace";

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center">
          <Building className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">{companyName}</CardTitle>
        <CardDescription>Welcome back! Sign in to your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <UserAuthForm mode="login" />
        <p className="mt-4 px-8 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="underline underline-offset-4 hover:text-primary"
          >
            Sign Up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
