
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building, Home, PanelLeft, Loader2, LayoutDashboard, Package, Shield, FileText, FolderTree, MessageSquare, Handshake, Gem, List, ShieldCheck, Bug, Receipt, MailWarning } from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarMenuBadge,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/user-nav";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { AppFooter } from "@/components/app-footer";
import { CurrencySwitcher } from "@/components/currency-switcher";
import { streamConversations } from "@/lib/firebase";
import { Conversation } from "@/lib/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { sendEmailVerification } from "firebase/auth";

function EmailVerificationBanner() {
  const { firebaseUser } = useAuth();
  const [isSending, startResendTransition] = useTransition();
  const { toast } = useToast();
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResend = () => {
    if (!firebaseUser || resendCooldown > 0) return;

    startResendTransition(async () => {
      try {
        await sendEmailVerification(firebaseUser);
        toast({
          title: "Verification Email Sent",
          description: "Please check your inbox (and spam folder).",
        });
        setResendCooldown(60); // Start 60-second cooldown
      } catch (error) {
        console.error("Failed to resend verification email:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not send verification email. Please try again later.",
        });
      }
    });
  };

  if (firebaseUser?.emailVerified) {
    return null;
  }
  
  const isButtonDisabled = isSending || resendCooldown > 0;
  
  return (
      <Alert className="rounded-none border-x-0 border-t-0 border-b border-yellow-300 bg-yellow-100/80 text-yellow-900 dark:border-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-100 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-300">
        <MailWarning className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Please verify your email address to get full access.</span>
          <Button variant="link" onClick={handleResend} disabled={isButtonDisabled} className="text-yellow-900 dark:text-yellow-100 h-auto p-0">
             {isSending ? <Loader2 className="h-4 w-4 animate-spin"/> : 
              resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Email'}
          </Button>
        </AlertDescription>
      </Alert>
  )
}

export function AppLayoutClient({ 
  children,
  companyName,
 }: { 
  children: React.ReactNode,
  companyName: string
}) {
  const pathname = usePathname();
  const { user, firebaseUser, loading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    if (user) {
        const unsubscribe = streamConversations(user.uid, setConversations);
        return () => unsubscribe();
    }
  }, [user]);

  const unreadMessagesCount = useMemo(() => {
    if (!user) return 0;
    return conversations.reduce((acc, conv) => {
        return acc + (conv.unreadCounts?.[user.uid] || 0);
    }, 0);
  }, [conversations, user]);

  useEffect(() => {
    if (loading) return; // Wait until authentication status is resolved

    const authRoutes = ['/login', '/signup', '/seed-database', '/forgot-password'];
    if (firebaseUser && authRoutes.some(p => pathname.startsWith(p))) {
        router.push('/');
        return;
    }
    
    // Define routes and their required roles
    const routes: { [key: string]: 'seller' | 'buyer' | 'admin' | 'any' } = {
        '/dashboard': 'seller',
        '/my-products': 'seller',
        '/sourcing/create': 'buyer',
        '/sourcing/my-requests': 'buyer',
        '/sourcing/dashboard': 'buyer',
        '/admin': 'admin',
        '/messages': 'any', // any authenticated user
        '/profile': 'any',
        '/notifications': 'any',
    };

    let requiredRole: 'seller' | 'buyer' | 'admin' | 'any' | null = null;
    
    for (const route in routes) {
        if (pathname.startsWith(route)) {
            requiredRole = routes[route];
            break;
        }
    }

    // If a route requires authentication (has a role assigned)
    if (requiredRole) {
        if (!firebaseUser) {
            // If user is not logged in, redirect to login with a redirect parameter
            const redirectUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
            router.push(redirectUrl);
            return;
        }
        
        // If the user is logged in, check their role
        if (user) {
             if (requiredRole !== 'any' && user.role !== requiredRole && user.role !== 'admin') {
                 // If user role doesn't match, redirect to homepage
                 router.push('/');
             }
        }
    }
  }, [firebaseUser, user, loading, router, pathname]);
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  const isMessagesPage = pathname.startsWith('/messages') || pathname.startsWith('/admin/conversations');
  // We don't need this check anymore as the main effect handles it, but it prevents a flash of content
  if (isMessagesPage && !firebaseUser) {
      return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )
  }


  return (
    <SidebarProvider>
      <Sidebar
        className="[--sidebar-background:theme(colors.card)] dark:[--sidebar-background:theme(colors.background)]"
        collapsible="icon"
      >
        <SidebarHeader>
          <Button variant="ghost" size="icon" className="size-9" asChild>
            <Link href="/">
              <Building />
            </Link>
          </Button>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/"}
                tooltip="Home"
              >
                <Link href="/">
                  <Home />
                  <span className="sr-only">Home</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

             <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/products")}
                tooltip="Products"
              >
                <Link href="/products">
                  <Package />
                  <span className="sr-only">Products</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
             <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/categories")}
                tooltip="Categories"
              >
                <Link href="/categories">
                  <FolderTree />
                  <span className="sr-only">Categories</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/sourcing")}
                tooltip="Sourcing Requests"
              >
                <Link href="/sourcing">
                  <Handshake />
                  <span className="sr-only">Sourcing Requests</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {user && (
                 <>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            isActive={pathname.startsWith("/messages")}
                            tooltip="Messages"
                        >
                            <Link href="/messages">
                            <MessageSquare />
                            <span className="sr-only">Messages</span>
                            </Link>
                        </SidebarMenuButton>
                         {unreadMessagesCount > 0 && (
                            <SidebarMenuBadge>{unreadMessagesCount}</SidebarMenuBadge>
                         )}
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            isActive={pathname.startsWith("/profile/verification")}
                            tooltip="Verification"
                        >
                            <Link href="/profile/verification">
                            <ShieldCheck />
                            <span className="sr-only">Verification</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            isActive={pathname.startsWith("/profile/invoices")}
                            tooltip="Invoices"
                        >
                            <Link href="/profile/invoices">
                            <Receipt />
                            <span className="sr-only">Invoices</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                 </>
            )}
             {user?.role === 'seller' && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith("/dashboard")}
                    tooltip="Dashboard"
                  >
                    <Link href="/dashboard">
                      <LayoutDashboard />
                      <span className="sr-only">Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith("/my-products")}
                    tooltip="My Products"
                  >
                    <Link href="/my-products">
                      <Package />
                      <span className="sr-only">My Products</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
            {user?.role === 'buyer' && (
              <Collapsible asChild defaultOpen={pathname.startsWith('/sourcing/create') || pathname.startsWith('/sourcing/my-requests') || pathname.startsWith('/sourcing/dashboard')}>
                  <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                              className="w-full justify-start"
                              variant="ghost"
                              tooltip="Sourcing Tools"
                          >
                              <FileText />
                              <span className="sr-only">Sourcing Tools</span>
                          </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent asChild>
                          <SidebarMenuSub>
                              <SidebarMenuSubItem>
                                  <SidebarMenuSubButton asChild isActive={pathname === '/sourcing/dashboard'}>
                                      <Link href="/sourcing/dashboard">Dashboard</Link>
                                  </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                              <SidebarMenuSubItem>
                                  <SidebarMenuSubButton asChild isActive={pathname === '/sourcing/create'}>
                                      <Link href="/sourcing/create">Post a Request</Link>
                                  </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                              <SidebarMenuSubItem>
                                  <SidebarMenuSubButton asChild isActive={pathname === '/sourcing/my-requests'}>
                                      <Link href="/sourcing/my-requests">My Requests</Link>
                                  </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                          </SidebarMenuSub>
                      </CollapsibleContent>
                  </SidebarMenuItem>
              </Collapsible>
            )}
             {user?.role === 'admin' && (
                <Collapsible asChild defaultOpen={pathname.startsWith('/admin')}>
                    <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                                className="w-full justify-start"
                                variant="ghost"
                                tooltip="Admin"
                            >
                                <Shield />
                                <span className="sr-only">Admin</span>
                            </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent asChild>
                            <SidebarMenuSub>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={pathname === '/admin/approvals'}>
                                        <Link href="/admin/approvals">Product Approvals</Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                 <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={pathname === '/admin/sourcing-approvals'}>
                                        <Link href="/admin/sourcing-approvals">Sourcing Approvals</Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={pathname === '/admin/verifications'}>
                                        <Link href="/admin/verifications">Verifications</Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={pathname === '/admin/conversations'}>
                                        <Link href="/admin/conversations">Conversations</Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={pathname === '/admin/spec-templates'}>
                                        <Link href="/admin/spec-templates">Spec Templates</Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={pathname === '/admin/verification-templates'}>
                                        <Link href="/admin/verification-templates">Verification Templates</Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={pathname === '/admin/categories'}>
                                        <Link href="/admin/categories">Categories</Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={pathname === '/admin/subscriptions'}>
                                        <Link href="/admin/subscriptions">Subscription Plans</Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={pathname === '/admin/settings'}>
                                        <Link href="/admin/settings">Settings</Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={pathname === '/admin/data-tools'}>
                                        <Link href="/admin/data-tools">Data Tools</Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={pathname === '/admin/debug-profile'}>
                                        <Link href="/admin/debug-profile">Debug Profile</Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            </SidebarMenuSub>
                        </CollapsibleContent>
                    </SidebarMenuItem>
                </Collapsible>
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          {/* This is intentionally empty to remove the redundant UserNav from the bottom */}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
         <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
              <div className="flex items-center gap-2">
                <SidebarTrigger />
                <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
                  <Image src="/Veloglobal.png" alt="Company Logo" width="0" height="0" sizes="100vw" className="h-auto w-8" />
                  <span className="hidden sm:inline-block">{companyName}</span>
                </Link>
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-2 md:gap-4">
                <CurrencySwitcher />
                <UserNav />
              </div>
            </header>
            {firebaseUser && <EmailVerificationBanner />}
            <main className="flex-1 p-4 sm:p-6">{children}</main>
            <AppFooter companyName={companyName} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
