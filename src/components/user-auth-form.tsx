
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { findUserByUsername } from "@/lib/database";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
  name: z.string().min(1, { message: "Name is required."}),
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
  role: z.enum(["buyer", "seller"]),
});


export function UserAuthForm({ className, mode, ...props }: UserAuthFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const form = useForm({
    resolver: zodResolver(mode === 'login' ? loginSchema : signupSchema),
    defaultValues: {
      loginId: "",
      name: "",
      email: "",
      password: "",
      role: "buyer",
    },
  });
  
  async function onSubmit(values: z.infer<typeof loginSchema> | z.infer<typeof signupSchema>) {
    setIsLoading(true);
    try {
      if (mode === "signup") {
        const signupValues = values as z.infer<typeof signupSchema>;
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          signupValues.email,
          signupValues.password
        );
        const user = userCredential.user;
        
        const userProfile = {
          uid: user.uid,
          name: signupValues.name,
          email: signupValues.email,
          role: signupValues.role,
          avatar: `https://i.pravatar.cc/150?u=${user.uid}`,
          username: signupValues.name.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 1000)
        };

        await setDoc(doc(db, "users", user.uid), userProfile);
        
        toast({
          title: "Account Created",
          description: "You have been successfully signed up.",
        });
        
      } else { // Login mode
        const loginValues = values as z.infer<typeof loginSchema>;
        let emailToLogin = loginValues.loginId;
        
        // If loginId doesn't contain "@", assume it's a username and find the corresponding email.
        if (!emailToLogin.includes('@')) {
            const user = await findUserByUsername(emailToLogin);
            if (user) {
                emailToLogin = user.email;
            } else {
                // If the username is not found, we throw an error to be caught by the catch block.
                // This makes the logic consistent with a failed password attempt.
                throw new Error("auth/invalid-credential");
            }
        }
        await signInWithEmailAndPassword(auth, emailToLogin, loginValues.password);
        toast({
          title: "Signed In",
          description: "You have successfully signed in.",
        });
      }
      router.push("/");
    } catch (error: any) {
      console.error("Authentication Error:", error.code, error.message);
      
      let title = "Authentication Failed";
      let description = "An unexpected error occurred.";

      // This logic now correctly handles modern Firebase auth errors for login.
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
                  <FormLabel>Full Name or Company</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Acme Inc."
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
                <FormLabel>Password</FormLabel>
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
