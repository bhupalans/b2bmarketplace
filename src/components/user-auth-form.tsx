
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

const formSchema = z.object({
  name: z.string().optional(),
  loginId: z.string().min(1, { message: "This field is required." }),
  email: z.string().email({ message: "Please enter a valid email." }).optional(),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
  role: z.enum(["buyer", "seller"]).optional(),
});

const signupSchema = formSchema.refine(
  (data) => {
    return !!data.name && !!data.role && !!data.email;
  },
  {
    message: "Name, a valid email, and role are required for signup.",
    path: ["name"], 
  }
).refine(data => data.loginId.includes('@'), {
    message: "For signup, please use your email address.",
    path: ['loginId']
});


export function UserAuthForm({ className, mode, ...props }: UserAuthFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const finalSchema = mode === 'signup' ? signupSchema : formSchema;

  const form = useForm<z.infer<typeof finalSchema>>({
    resolver: zodResolver(finalSchema),
    defaultValues: {
      name: "",
      loginId: "",
      email: "",
      password: "",
      role: "buyer",
    },
  });
  
  const loginIdValue = form.watch("loginId");
  React.useEffect(() => {
    if (mode === 'signup' && loginIdValue?.includes('@')) {
      form.setValue('email', loginIdValue);
    }
  }, [loginIdValue, mode, form]);

  async function onSubmit(values: z.infer<typeof finalSchema>) {
    setIsLoading(true);
    try {
      if (mode === "signup") {
        if (!values.name || !values.role || !values.email) {
            throw new Error("Name, email, and role are required for signup.");
        }
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          values.email,
          values.password
        );
        const user = userCredential.user;
        
        const userProfile = {
          uid: user.uid,
          name: values.name,
          email: values.email,
          role: values.role,
          avatar: `https://i.pravatar.cc/150?u=${user.uid}`,
          username: values.name.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 1000)
        };

        await setDoc(doc(db, "users", user.uid), userProfile);
        
        toast({
          title: "Account Created",
          description: "You have been successfully signed up.",
        });
        
      } else { // Login mode
        let emailToLogin = values.loginId;
        if (!emailToLogin.includes('@')) {
            const user = await findUserByUsername(emailToLogin);
            if (user) {
                emailToLogin = user.email;
            } else {
                throw new Error("User not found.");
            }
        }
        await signInWithEmailAndPassword(auth, emailToLogin, values.password);
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

      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.message === 'User not found.') {
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
          )}
          <FormField
            control={form.control}
            name="loginId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{mode === 'login' ? 'Email or Username' : 'Email'}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={mode === 'login' ? 'name@example.com or username' : 'name@example.com'}
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
