import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { View } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import InAppNotification from '@/components/InAppNotification';

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

type BannerState = {
    visible: boolean;
    title: string;
    body: string;
    type: string;
};

type NotificationContextType = {
    notifications: AppNotification[];
    unreadCount: number;
    loading: boolean;
    banner: BannerState;
    dismissBanner: () => void;
    refresh: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType>({
    notifications: [],
    unreadCount: 0,
    loading: true,
    banner: { visible: false, title: '', body: '', type: '' },
    dismissBanner: () => {},
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
    const [banner, setBanner] = useState<{ visible: boolean; title: string; body: string; type: string }>({
        visible: false, title: '', body: '', type: '',
    });

    // Get user and register push token on mount
    useEffect(() => {
        async function setup() {
            try {
                const { data: { user }, error } = await supabase.auth.getUser();
                if (error || !user) {
                    setLoading(false);
                    return;
                }
                setUserId(user.id);
                await registerPushToken(user.id);
                await fetchNotifications(user.id);
            } catch {
                setLoading(false);
            }
        }
        setup();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            try {
                if (session?.user) {
                    setUserId(session.user.id);
                    await registerPushToken(session.user.id);
                    await fetchNotifications(session.user.id);
                } else {
                    setUserId(null);
                    setNotifications([]);
                    setUnreadCount(0);
                    setLoading(false);
                }
            } catch {
                setLoading(false);
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

                    // Show in-app banner
                    setBanner({
                        visible: true,
                        title: newNotif.title,
                        body: newNotif.body,
                        type: newNotif.type,
                    });

                    // Also trigger local notification for iOS banner
                    Notifications.scheduleNotificationAsync({
                        content: {
                            title: newNotif.title,
                            body: newNotif.body,
                            data: newNotif.data,
                            sound: true,
                        },
                        trigger: null,
                    }).catch(() => {});
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    // Polling fallback — check for new notifications every 10s
    useEffect(() => {
        if (!userId) return;

        let lastCount = notifications.length;

        const interval = setInterval(async () => {
            try {
                const { data } = await supabase
                    .from('notifications')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (data && data.length > lastCount) {
                    // New notifications arrived
                    const newOnes = data.slice(0, data.length - lastCount);
                    setNotifications(data);
                    setUnreadCount(data.filter(n => !n.read).length);

                    // Show banner for the latest new notification
                    if (newOnes.length > 0) {
                        const latest = newOnes[0];
                        setBanner({
                            visible: true,
                            title: latest.title,
                            body: latest.body,
                            type: latest.type,
                        });

                        Notifications.scheduleNotificationAsync({
                            content: {
                                title: latest.title,
                                body: latest.body,
                                data: latest.data,
                                sound: true,
                            },
                            trigger: null,
                        }).catch(() => {});
                    }
                }
                lastCount = data?.length || lastCount;
            } catch {}
        }, 10000);

        return () => clearInterval(interval);
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

    const dismissBanner = useCallback(() => {
        setBanner(prev => ({ ...prev, visible: false }));
    }, []);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            loading,
            banner,
            dismissBanner,
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
