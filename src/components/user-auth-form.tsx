
'use client';

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  createUserWithEmailAndPassword,
  FacebookAuthProvider,
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithPopup,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { User } from "@/lib/types";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
import { Checkbox } from "./ui/checkbox";
import { PasswordStrengthIndicator } from "./password-strength-indicator";

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {
  mode: "login" | "signup";
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21.35 11.1H12v2.98h5.35c-.23 1.52-1.75 4.45-5.35 4.45-3.22 0-5.85-2.67-5.85-5.96S8.78 6.6 12 6.6c1.83 0 3.05.78 3.75 1.45l2.56-2.48C16.67 4.06 14.55 3.2 12 3.2 6.98 3.2 2.9 7.3 2.9 12.35S6.98 21.5 12 21.5c6.92 0 8.62-4.86 8.62-7.37 0-.5-.05-.86-.12-1.23Z"
        fill="#4285F4"
      />
      <path
        d="M2.9 7.3l3.46 2.54c.94-1.86 2.89-3.24 5.64-3.24 1.83 0 3.05.78 3.75 1.45l2.56-2.48C16.67 4.06 14.55 3.2 12 3.2 8.07 3.2 4.68 5.44 2.9 7.3Z"
        fill="#EA4335"
      />
      <path
        d="M12 21.5c2.48 0 4.56-.81 6.08-2.2l-2.81-2.3c-.75.53-1.75.9-3.27.9-3.58 0-5.1-2.86-5.36-4.32L3.2 16.22C4.96 19.7 8.2 21.5 12 21.5Z"
        fill="#34A853"
      />
      <path
        d="M21.35 11.1H12v2.98h5.35a4.7 4.7 0 0 1-2.08 2.82l2.81 2.3c1.63-1.5 2.54-3.72 2.54-6.35 0-.5-.05-.86-.12-1.23Z"
        fill="#FBBC05"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.02 4.39 11.01 10.12 11.93v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.79-4.69 4.54-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.88v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.08 24 18.09 24 12.07Z"
        fill="#1877F2"
      />
    </svg>
  );
}

type AuthFormValues = {
  loginId: string;
  name: string;
  username: string;
  companyName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: "buyer" | "seller";
  terms: boolean;
};

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
  const [loadingAction, setLoadingAction] = React.useState<"credentials" | "google" | "facebook" | null>(null);
  const [redirectUrl, setRedirectUrl] = React.useState<string | null>(null);
  const isLoading = loadingAction !== null;

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

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(mode === 'login' ? loginSchema : signupSchema) as never,
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
  const googleProvider = React.useMemo(() => new GoogleAuthProvider(), []);
  const facebookProvider = React.useMemo(() => new FacebookAuthProvider(), []);

  const findUserByUsernameClient = React.useCallback(async (username: string): Promise<User | null> => {
    const normalized = username.trim().toLowerCase();
    if (!normalized) return null;
    const usersRef = collection(db, "users");
    const snap = await getDocs(query(usersRef, where("username", "==", normalized), limit(1)));
    if (snap.empty) return null;
    const userDoc = snap.docs[0];
    return { id: userDoc.id, uid: userDoc.id, ...userDoc.data() } as User;
  }, []);

  const normalizeUsername = React.useCallback((value: string): string => {
    const normalized = value.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
    return normalized.length >= 3 ? normalized : `user_${Math.floor(1000 + Math.random() * 9000)}`;
  }, []);

  const generateUniqueUsername = React.useCallback(async (seed: string): Promise<string> => {
    const base = normalizeUsername(seed);
    let candidate = base;
    let suffix = 0;
    while (true) {
      const existing = await findUserByUsernameClient(candidate);
      if (!existing) return candidate;
      suffix += 1;
      candidate = `${base}_${suffix}`;
    }
  }, [findUserByUsernameClient, normalizeUsername]);

  const ensureSocialUserProfile = React.useCallback(async (firebaseUid: string, email: string | null, displayName: string | null, role: "buyer" | "seller") => {
    const userRef = doc(db, "users", firebaseUid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) return;

    const name = displayName?.trim() || (email ? email.split("@")[0] : "New User");
    const usernameSeed = email ? email.split("@")[0] : name;
    const username = await generateUniqueUsername(usernameSeed);

    const userProfile: Omit<User, "id"> = {
      uid: firebaseUid,
      name,
      username,
      companyName: "",
      email: email || "no-email@provided.com",
      role,
      avatar: "",
      verificationStatus: "unverified",
      createdAt: new Date().toISOString(),
    };

    await setDoc(userRef, userProfile);
  }, [generateUniqueUsername]);

  const handleGoogleAuth = React.useCallback(async () => {
    if (mode === "signup" && !form.getValues("terms")) {
      form.setError("terms", { type: "manual", message: "You must accept the terms and conditions." });
      return;
    }

    setLoadingAction("google");
    try {
      const role = mode === "signup" ? form.getValues("role") : "buyer";
      const credential = await signInWithPopup(auth, googleProvider);
      const firebaseUser = credential.user;
      await ensureSocialUserProfile(
        firebaseUser.uid,
        firebaseUser.email,
        firebaseUser.displayName,
        role
      );

      toast({
        title: "Signed In",
        description: "Google authentication successful.",
      });
      router.push(redirectUrl || "/");
    } catch (error: any) {
      console.error("Google Authentication Error:", error?.code, error?.message);
      toast({
        variant: "destructive",
        title: "Google Authentication Failed",
        description: error?.message || "Could not sign in with Google.",
      });
    } finally {
      setLoadingAction(null);
    }
  }, [ensureSocialUserProfile, form, googleProvider, mode, redirectUrl, router, toast]);

  const handleFacebookAuth = React.useCallback(async () => {
    if (mode === "signup" && !form.getValues("terms")) {
      form.setError("terms", { type: "manual", message: "You must accept the terms and conditions." });
      return;
    }

    setLoadingAction("facebook");
    try {
      const role = mode === "signup" ? form.getValues("role") : "buyer";
      const credential = await signInWithPopup(auth, facebookProvider);
      const firebaseUser = credential.user;
      await ensureSocialUserProfile(
        firebaseUser.uid,
        firebaseUser.email,
        firebaseUser.displayName,
        role
      );

      toast({
        title: "Signed In",
        description: "Facebook authentication successful.",
      });
      router.push(redirectUrl || "/");
    } catch (error: any) {
      console.error("Facebook Authentication Error:", error?.code, error?.message);
      toast({
        variant: "destructive",
        title: "Facebook Authentication Failed",
        description: error?.message || "Could not sign in with Facebook.",
      });
    } finally {
      setLoadingAction(null);
    }
  }, [ensureSocialUserProfile, facebookProvider, form, mode, redirectUrl, router, toast]);

  async function onSubmit(values: AuthFormValues) {
    setLoadingAction("credentials");
    try {
      if (mode === "signup") {
        const signupValues = signupSchema.parse(values);

        const existingUser = await findUserByUsernameClient(signupValues.username);
        if (existingUser) {
            form.setError("username", { type: "manual", message: "This username is already taken." });
            setLoadingAction(null);
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
        const loginValues = loginSchema.parse(values);
        let emailToLogin = loginValues.loginId;
        
        if (!emailToLogin.includes('@')) {
            const user = await findUserByUsernameClient(emailToLogin);
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
      setLoadingAction(null);
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
                        onCheckedChange={(checked) => field.onChange(checked === true)}
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
            {loadingAction === "credentials" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "login" ? "Sign In" : "Create Account"}
          </Button>
        </form>
      </Form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={handleGoogleAuth}
        disabled={isLoading}
      >
        {loadingAction === "google" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {loadingAction !== "google" && <GoogleIcon />}
        Continue with Google
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={handleFacebookAuth}
        disabled={isLoading}
      >
        {loadingAction === "facebook" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {loadingAction !== "facebook" && <FacebookIcon />}
        Continue with Facebook
      </Button>
    </div>
  );
}


