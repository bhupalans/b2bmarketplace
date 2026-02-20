
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

export default function SignupPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center">
        <Link href="/">
            <Image src="/Veloglobal.png" alt="Company Logo" width={48} height={48} />
          </Link>
        </div>
        <CardTitle className="text-2xl">Create an account</CardTitle>
        <CardDescription>
          Enter your details to join the marketplace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <UserAuthForm mode="signup" />
        <p className="mt-4 px-8 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="underline underline-offset-4 hover:text-primary"
          >
            Log In
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
