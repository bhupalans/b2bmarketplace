
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";
import { auth, getNotificationsClient } from "@/lib/firebase";
import { AppNotification } from "@/lib/types";
import { signOut } from "firebase/auth";
import { CreditCard, LogOut, Settings, User, LayoutDashboard, Package, MessageSquare, ShieldCheck, FileText, Handshake, Bell, Gem, List } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";


export function UserNav() {
  const { user, firebaseUser } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      const unsubscribe = getNotificationsClient(user.uid, (notifications: AppNotification[]) => {
        const unread = notifications.filter(n => !n.read).length;
        setUnreadCount(unread);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (!firebaseUser) {
    return (
       <Button asChild>
          <Link href="/login">Log In / Sign Up</Link>
       </Button>
    )
  }

  if (!user) {
    return null; // Still loading user profile
  }
  
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" className="relative h-9 w-9" asChild>
        <Link href="/notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
              {unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user.name}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {user.role === 'seller' && (
              <DropdownMenuItem asChild>
                <Link href={`/sellers/${user.id}`}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Public Profile</span>
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <Settings className="mr-2 h-4 w-4" />
                <span>My Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/profile/verification">
                <ShieldCheck className="mr-2 h-4 w-4" />
                <span>Verification</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
                <Link href="/profile/subscription">
                    <Gem className="mr-2 h-4 w-4" />
                    <span>Subscription</span>
                    {user.subscriptionPlan?.name && (
                        <span className="ml-auto text-xs tracking-widest opacity-60">{user.subscriptionPlan.name}</span>
                    )}
                </Link>
            </DropdownMenuItem>
            {user.role === 'seller' && (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/my-products">
                    <Package className="mr-2 h-4 w-4" />
                    <span>My Products</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/sourcing">
                    <Handshake className="mr-2 h-4 w-4" />
                    <span>Browse Buy Leads</span>
                  </Link>
                </DropdownMenuItem>
              </>
            )}
            {user.role === 'buyer' && (
              <DropdownMenuItem asChild>
                <Link href="/sourcing/create">
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Post Sourcing Request</span>
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href="/messages">
                <MessageSquare className="mr-2 h-4 w-4" />
                <span>Messages</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
