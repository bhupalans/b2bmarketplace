
'use client';

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { findUserByUsername } from "@/lib/database";
import { User } from "@/lib/types";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import Image from "next/image";
import { Checkbox } from "./ui/checkbox";
import { PasswordStrengthIndicator } from "./password-strength-indicator";

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {
  mode: "login" | "signup";
}

const loginSchema = z.object({
  loginId: z.string().min(1, { message: "This field is required." }),
  password: z
    .string()
    .min(1, { message: "Password is required." }),
});

const signupSchema = z.object({
  name: z.string().min(1, { message: "Full name is required."}),
  username: z.string().min(3, { message: "Username must be at least 3 characters."}).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores.'),
  companyName: z.string().min(1, { message: "Company name is required." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." }),
  confirmPassword: z.string(),
  role: z.enum(["buyer", "seller"]),
  terms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions.",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});


export function UserAuthForm({ className, mode, ...props }: UserAuthFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [redirectUrl, setRedirectUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    // This runs only on the client, after the component mounts
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect");
      if (redirect) {
        setRedirectUrl(redirect);
      }
    }
  }, []);

  const form = useForm({
    resolver: zodResolver(mode === 'login' ? loginSchema : signupSchema),
    defaultValues: {
      loginId: "",
      name: "",
      username: "",
      companyName: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "buyer",
      terms: false,
    },
  });
  
  const watchedPassword = form.watch("password");

  async function onSubmit(values: z.infer<typeof loginSchema> | z.infer<typeof signupSchema>) {
    setIsLoading(true);
    try {
      if (mode === "signup") {
        const signupValues = values as z.infer<typeof signupSchema>;

        const existingUser = await findUserByUsername(signupValues.username);
        if (existingUser) {
            form.setError("username", { type: "manual", message: "This username is already taken." });
            setIsLoading(false);
            return;
        }

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          signupValues.email,
          signupValues.password
        );
        const user = userCredential.user;
        
        const userProfile: Omit<User, "id"> = {
          uid: user.uid,
          name: signupValues.name,
          username: signupValues.username.toLowerCase(),
          companyName: signupValues.companyName,
          email: signupValues.email,
          role: signupValues.role,
          avatar: '',
          verificationStatus: 'unverified',
          createdAt: new Date().toISOString(),
        };

        await setDoc(doc(db, "users", user.uid), userProfile);
        
        await sendEmailVerification(user);
        
        toast({
          title: "Account Created",
          description: "Please check your inbox to verify your email address.",
        });
        
      } else { // Login mode
        const loginValues = values as z.infer<typeof loginSchema>;
        let emailToLogin = loginValues.loginId;
        
        if (!emailToLogin.includes('@')) {
            const user = await findUserByUsername(emailToLogin);
            if (user) {
                emailToLogin = user.email;
            } else {
                throw new Error("auth/invalid-credential");
            }
        }
        await signInWithEmailAndPassword(auth, emailToLogin, loginValues.password);
        toast({
          title: "Signed In",
          description: "You have successfully signed in.",
        });
      }
      router.push(redirectUrl || "/");
    } catch (error: any) {
      console.error("Authentication Error:", error.code, error.message);
      
      let title = "Authentication Failed";
      let description = "An unexpected error occurred.";

      if (error.code === 'auth/invalid-credential' || error.message === 'auth/invalid-credential') {
        description = "The username/email or password you entered is incorrect.";
      } else if (error.code === 'auth/operation-not-allowed' || (error.message && error.message.includes('identitytoolkit'))) {
        title = "Sign-In Method Disabled";
        description = "Email/Password sign-in is not enabled for this project. Please enable it in the Firebase console under Authentication > Sign-in method. You may also need to enable the Identity Toolkit API in Google Cloud.";
      } else if (error.code === 'auth/email-already-in-use') {
        description = "This email address is already in use by another account."
      }

      toast({
        variant: "destructive",
        title: title,
        description: description,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
           {mode === "signup" && (
            <>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Jane Doe"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., janedoe"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Acme Inc."
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder='name@example.com'
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          </>
          )}
          { mode === "login" && (
             <FormField
              control={form.control}
              name="loginId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email or Username</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='name@example.com or username'
                      type="text"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect="off"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  {mode === 'login' && (
                    <Link
                      href="/forgot-password"
                      className="text-sm font-medium text-muted-foreground hover:text-primary"
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           {mode === "signup" && (
            <>
              <PasswordStrengthIndicator password={watchedPassword} />
              <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                      <Input
                          type="password"
                          placeholder="••••••••"
                          disabled={isLoading}
                          {...field}
                      />
                      </FormControl>
                      <FormMessage />
                  </FormItem>
                  )}
              />
            </>
           )}
          {mode === "signup" && (
            <>
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>I am a...</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="buyer">Buyer</SelectItem>
                        <SelectItem value="seller">Seller</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal text-muted-foreground">
                        I agree to the{" "}
                        <Link
                          href="/terms"
                          target="_blank"
                          className="underline hover:text-primary"
                        >
                          Terms and Conditions
                        </Link>{" "}
                        and{" "}
                        <Link
                          href="/privacy"
                          target="_blank"
                          className="underline hover:text-primary"
                        >
                          Privacy Policy
                        </Link>
                        .
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </>
          )}
          <Button disabled={isLoading} className="w-full">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "login" ? "Sign In" : "Create Account"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
