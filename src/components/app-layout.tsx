
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building, Home, MessageSquare, PanelLeft, Loader2, LayoutDashboard } from "lucide-react";
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
} from "@/components/ui/sidebar";
import { Button } from "./ui/button";
import { UserNav } from "./user-nav";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Define protected routes and seller-only routes
    const protectedRoutes = ['/messages', '/dashboard'];
    const sellerOnlyRoutes = ['/dashboard'];

    // Find if the current path is one of the protected routes
    const isProtectedRoute = protectedRoutes.some(path => pathname.startsWith(path));
    const isSellerOnlyRoute = sellerOnlyRoutes.some(path => pathname.startsWith(path));

    if (!loading) {
      if (!firebaseUser && isProtectedRoute) {
        // If not logged in and trying to access a protected route, redirect to login
        router.push("/login");
      } else if (firebaseUser && isSellerOnlyRoute && user?.role !== 'seller') {
        // If logged in, but not a seller, and trying to access a seller-only route, redirect to home
        router.push("/");
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

  // While loading or if redirection is pending, we might show a loader or nothing
  const isProtectedRoute = ['/messages', '/dashboard'].some(path => pathname.startsWith(path));
  if (isProtectedRoute && !firebaseUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (pathname.startsWith('/dashboard') && user?.role !== 'seller') {
      return (
        <div className="flex h-screen items-center justify-center">
            <p>Access Denied. Redirecting...</p>
            <Loader2 className="ml-2 h-8 w-8 animate-spin" />
        </div>
    );
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
                tooltip="Products"
              >
                <Link href="/">
                  <Home />
                  <span className="sr-only">Products</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             {user?.role === 'seller' && (
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
            )}
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
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <UserNav />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <SidebarTrigger className="sm:hidden" />
          <div className="flex-1" />
          <div className="hidden sm:block">
            <UserNav />
          </div>
        </header>
        <main className="flex-1 p-4 sm:px-6 sm:py-0">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
