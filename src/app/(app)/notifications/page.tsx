
"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getNotificationsClient, markNotificationAsReadClient } from '@/lib/firebase';
import { AppNotification } from '@/lib/types';
import { Loader2, Bell, BellOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

const NotificationItem = ({ notification, onMarkAsRead }: { notification: AppNotification, onMarkAsRead: (id: string) => void }) => {
    const router = useRouter();

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        onMarkAsRead(notification.id);
        router.push(notification.link);
    }
    return (
        <Link 
            href={notification.link} 
            onClick={handleClick}
            className={cn(
                "block p-4 border-b last:border-b-0 hover:bg-muted/50",
                !notification.read && "bg-primary/5"
            )}
        >
            <div className="flex items-start gap-4">
                {!notification.read && <div className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                <div className={cn("flex-1", notification.read && "pl-4")}>
                    <p className="font-medium">{notification.message}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                </div>
            </div>
        </Link>
    )
}


export default function NotificationsPage() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            const unsubscribe = getNotificationsClient(user.uid, (newNotifications) => {
                setNotifications(newNotifications);
                setLoading(false);
            });
            return () => unsubscribe();
        } else {
            setLoading(false);
        }
    }, [user]);

    const handleMarkAsRead = async (id: string) => {
        try {
            // Find the notification first to see if it's already read
            const notification = notifications.find(n => n.id === id);
            // Only mark as read if it's currently unread to avoid unnecessary Firestore writes
            if (notification && !notification.read) {
                await markNotificationAsReadClient(id);
                // Optimistically update the UI
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            }
        } catch (error) {
            console.error("Failed to mark notification as read", error);
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
                <p className="text-muted-foreground">
                    Your latest updates and alerts from the marketplace.
                </p>
            </div>
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <BellOff className="h-12 w-12 text-muted-foreground" />
                            <p className="mt-4 font-semibold">No notifications yet</p>
                            <p className="text-sm text-muted-foreground">We'll let you know when something important happens.</p>
                        </div>
                    ) : (
                        notifications.map(n => (
                            <NotificationItem key={n.id} notification={n} onMarkAsRead={handleMarkAsRead} />
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
