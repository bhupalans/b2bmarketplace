
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building, Home, PanelLeft, Loader2, LayoutDashboard, Package, Shield, FileText, FolderTree, MessageSquare, MessagesSquare, Gavel, CheckSquare } from "lucide-react";
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
    const protectedRoutes = ['/dashboard', '/my-products', '/admin', '/messages'];
    const sellerOnlyRoutes = ['/dashboard', '/my-products'];
    const adminOnlyRoutes = ['/admin'];

    const isProtectedRoute = protectedRoutes.some(path => pathname.startsWith(path));
    const isSellerOnlyRoute = sellerOnlyRoutes.some(path => pathname.startsWith(path));
    const isAdminOnlyRoute = adminOnlyRoutes.some(path => pathname.startsWith(path));

    if (!loading) {
      if (!firebaseUser && isProtectedRoute) {
        router.push("/login");
      } else if (firebaseUser) {
        if (isSellerOnlyRoute && user?.role !== 'seller') {
          router.push("/");
        }
        if (isAdminOnlyRoute && user?.role !== 'admin') {
          router.push("/");
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
  if (isMessagesPage && !firebaseUser) {
      return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )
  }


  const isProtectedRoute = ['/dashboard', '/my-products', '/admin'].some(path => pathname.startsWith(path));
  if (isProtectedRoute && !firebaseUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if ((pathname.startsWith('/dashboard') && user?.role !== 'seller') || (pathname.startsWith('/admin') && user?.role !== 'admin')) {
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
            {user && (
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
        <header className={cn("sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6", isMessagesPage && "hidden")}>
          <SidebarTrigger className="sm:hidden" />
          <div className="flex-1" />
          <div className="hidden sm:block">
            <UserNav />
          </div>
        </header>
        <main className={cn("flex-1", isMessagesPage ? 'p-0' : "p-4 sm:px-6 sm:py-0")}>{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
