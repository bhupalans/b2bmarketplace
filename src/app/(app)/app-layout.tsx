
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building, Home, PanelLeft, Loader2, LayoutDashboard, Package, Shield, FileText, FolderTree, MessageSquare, MessagesSquare, Gavel, CheckSquare, Settings, ShieldCheck, Database, Search, Handshake, Gem } from "lucide-react";
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
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Button } from "./ui/button";
import { UserNav } from "./user-nav";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { cn } from "@/lib/utils";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // Wait until authentication status is resolved

    const authRoutes = ['/login', '/signup', '/seed-database'];
    if (firebaseUser && authRoutes.includes(pathname)) {
        router.push('/');
        return;
    }
    
    // Define routes and their required roles
    const routes: { [key: string]: 'seller' | 'buyer' | 'admin' | 'any' } = {
        '/dashboard': 'seller',
        '/my-products': 'seller',
        '/sourcing/create': 'buyer',
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
            // If user is not logged in, redirect to login
            router.push('/login');
            return;
        }
        
        // If the user is logged in, check their role
        if (user) {
             if (requiredRole !== 'any' && user.role !== requiredRole) {
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
              <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith("/sourcing/create")}
                    tooltip="Post a Sourcing Request"
                  >
                    <Link href="/sourcing/create">
                      <FileText />
                      <span className="sr-only">Post a Request</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
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
                                        <Link href="/admin/approvals">Approvals</Link>
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
                            </SidebarMenuSub>
                        </CollapsibleContent>
                    </SidebarMenuItem>
                </Collapsible>
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <UserNav />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className={cn("sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6", isMessagesPage && "hidden", pathname !== '/' && 'sm:hidden')}>
          <SidebarTrigger className="sm:hidden" />
          <div className="flex-1" />
          <div className="hidden sm:block">
            <UserNav />
          </div>
        </header>
        <main className={cn("flex-1", isMessagesPage ? 'p-0' : "p-4 sm:px-6 sm:py-0", pathname === '/' && 'p-0 sm:p-0')}>{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
