
import { UserAuthForm } from "@/components/user-auth-form";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";

export default async function LoginPage() {
  let companyName = "B2B Marketplace";
  try {
    const { getBrandingSettings } = await import("@/lib/database");
    const branding = await getBrandingSettings();
    companyName = branding.companyName || companyName;
  } catch {
    // Keep fallback in environments without Firebase Admin credentials.
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center">
        <Link href="/">
            <Image src="/Veloglobal.png" alt="Company Logo" width={48} height={48} />
          </Link>
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
