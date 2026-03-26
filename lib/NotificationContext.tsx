import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export type AppNotification = {
    id: string;
    type: string;
    title: string;
    body: string;
    data: any;
    read: boolean;
    created_at: string;
};

type NotificationContextType = {
    notifications: AppNotification[];
    unreadCount: number;
    loading: boolean;
    refresh: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType>({
    notifications: [],
    unreadCount: 0,
    loading: true,
    refresh: async () => {},
    markAsRead: async () => {},
    markAllAsRead: async () => {},
    deleteNotification: async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    // Get user and register push token on mount
    useEffect(() => {
        async function setup() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                await registerPushToken(user.id);
                await fetchNotifications(user.id);
            } else {
                setLoading(false);
            }
        }
        setup();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                setUserId(session.user.id);
                await registerPushToken(session.user.id);
                await fetchNotifications(session.user.id);
            } else {
                setUserId(null);
                setNotifications([]);
                setUnreadCount(0);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Realtime subscription for new notifications
    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel('notifications-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const newNotif = payload.new as AppNotification;
                    setNotifications(prev => [newNotif, ...prev]);
                    setUnreadCount(prev => prev + 1);

                    // Show local push notification
                    Notifications.scheduleNotificationAsync({
                        content: {
                            title: newNotif.title,
                            body: newNotif.body,
                            data: newNotif.data,
                        },
                        trigger: null, // immediate
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    async function registerPushToken(uid: string) {
        if (!Device.isDevice) return; // Skip on simulator

        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') return;

            const tokenData = await Notifications.getExpoPushTokenAsync();
            const token = tokenData.data;

            // Save token to Supabase
            await supabase.from('push_tokens').upsert({
                user_id: uid,
                token,
                platform: Platform.OS,
            }, { onConflict: 'token' });
        } catch (error) {
            console.warn('[Notifications] Push token registration failed:', error);
        }
    }

    async function fetchNotifications(uid: string) {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', uid)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            setNotifications(data || []);
            setUnreadCount(data?.filter(n => !n.read).length || 0);
        } catch (error) {
            console.error('[Notifications] Fetch error:', error);
        } finally {
            setLoading(false);
        }
    }

    const refresh = useCallback(async () => {
        if (userId) {
            await fetchNotifications(userId);
        }
    }, [userId]);

    const markAsRead = useCallback(async (id: string) => {
        await supabase.from('notifications').update({ read: true }).eq('id', id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    }, []);

    const markAllAsRead = useCallback(async () => {
        if (!userId) return;
        await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    }, [userId]);

    const deleteNotification = useCallback(async (id: string) => {
        const notif = notifications.find(n => n.id === id);
        await supabase.from('notifications').delete().eq('id', id);
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (notif && !notif.read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
    }, [notifications]);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            loading,
            refresh,
            markAsRead,
            markAllAsRead,
            deleteNotification,
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    return useContext(NotificationContext);
}
