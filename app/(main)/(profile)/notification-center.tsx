import Icon from '@/components/Icon';
import { Colors } from '@/constants/NativeColors';
import { useAccessibility } from '@/lib/AccessibilityContext';
import { useNotifications, AppNotification } from '@/lib/NotificationContext';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import React from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

function getNotifIcon(type: string): { icon: string; color: string } {
    switch (type) {
        case 'transfer_received': return { icon: 'arrow.down.circle.fill', color: 'success' };
        case 'transfer_sent': return { icon: 'arrow.up.circle.fill', color: 'primary' };
        case 'purchase': return { icon: 'cart.fill', color: 'accent' };
        case 'topup': return { icon: 'plus.circle.fill', color: 'success' };
        case 'fraud_alert': return { icon: 'exclamationmark.triangle.fill', color: 'error' };
        case 'fraud_resolved': return { icon: 'checkmark.shield.fill', color: 'success' };
        case 'welcome': return { icon: 'person.fill', color: 'primary' };
        default: return { icon: 'bell.badge.fill', color: 'primary' };
    }
}

export default function NotificationCenterScreen() {
    const router = useRouter();
    const { adaptiveColors } = useAccessibility();
    const { notifications, unreadCount, loading, refresh, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
    const [refreshing, setRefreshing] = React.useState(false);

    async function onRefresh() {
        setRefreshing(true);
        await refresh();
        setRefreshing(false);
    }

    function getColor(colorKey: string): string {
        return (adaptiveColors as any)[colorKey] || adaptiveColors.primary;
    }

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.white }}>
                <ActivityIndicator size="large" color={adaptiveColors.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <View style={{ backgroundColor: adaptiveColors.primary, position: 'absolute', top: 0, left: 0, right: 0, height: 200 }} />
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 48, backgroundColor: Colors.white }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.white} />}
            >
                {/* Header */}
                <View style={{
                    backgroundColor: adaptiveColors.primary,
                    paddingTop: 70,
                    paddingBottom: 24,
                    paddingHorizontal: 24,
                    borderBottomWidth: 3,
                    borderBottomColor: Colors.black,
                }}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}
                    >
                        <Icon name="chevron.left" size={20} color={Colors.white} />
                        <Text style={{ color: Colors.white, fontWeight: '800', fontSize: 15, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Retour</Text>
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{
                                backgroundColor: Colors.white,
                                padding: 10,
                                borderWidth: 2,
                                borderColor: Colors.black,
                                marginRight: 14,
                                shadowColor: Colors.black,
                                shadowOffset: { width: 3, height: 3 },
                                shadowOpacity: 1,
                                shadowRadius: 0,
                            }}>
                                <Icon name="bell.badge.fill" size={24} color={adaptiveColors.primary} />
                            </View>
                            <View>
                                <Text style={{ color: Colors.white, fontSize: 20, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>
                                    Notifications
                                </Text>
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
                                    {unreadCount} non lue{unreadCount !== 1 ? 's' : ''}
                                </Text>
                            </View>
                        </View>
                        {unreadCount > 0 && (
                            <TouchableOpacity
                                onPress={markAllAsRead}
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderWidth: 1,
                                    borderColor: Colors.white,
                                }}
                            >
                                <Text style={{ color: Colors.white, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Tout lire
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Notifications list */}
                <View style={{ padding: 16 }}>
                    {notifications.length === 0 ? (
                        <View style={{
                            alignItems: 'center',
                            paddingVertical: 60,
                        }}>
                            <View style={{
                                backgroundColor: Colors.offWhite,
                                padding: 20,
                                borderWidth: 2,
                                borderColor: Colors.black,
                                marginBottom: 16,
                                shadowColor: Colors.black,
                                shadowOffset: { width: 3, height: 3 },
                                shadowOpacity: 1,
                                shadowRadius: 0,
                            }}>
                                <Icon name="bell.badge.fill" size={40} color={Colors.mediumGray} />
                            </View>
                            <Text style={{
                                color: Colors.black,
                                fontSize: 16,
                                fontWeight: '900',
                                textTransform: 'uppercase',
                                letterSpacing: 1,
                            }}>
                                Aucune notification
                            </Text>
                            <Text style={{
                                color: Colors.mediumGray,
                                fontSize: 13,
                                fontWeight: '600',
                                marginTop: 8,
                                textAlign: 'center',
                            }}>
                                Vos notifications apparaitront ici
                            </Text>
                        </View>
                    ) : (
                        <View style={{ gap: 10 }}>
                            {notifications.map((notif) => {
                                const { icon, color } = getNotifIcon(notif.type);
                                const iconColor = getColor(color);
                                return (
                                    <TouchableOpacity
                                        key={notif.id}
                                        onPress={() => markAsRead(notif.id)}
                                        style={{
                                            backgroundColor: notif.read ? Colors.white : Colors.offWhite,
                                            borderWidth: 2,
                                            borderColor: notif.read ? Colors.lightGray : Colors.black,
                                            padding: 14,
                                            flexDirection: 'row',
                                            alignItems: 'flex-start',
                                            ...(notif.read ? {} : {
                                                shadowColor: Colors.black,
                                                shadowOffset: { width: 2, height: 2 },
                                                shadowOpacity: 1,
                                                shadowRadius: 0,
                                            }),
                                        }}
                                    >
                                        <View style={{
                                            backgroundColor: notif.read ? Colors.offWhite : Colors.white,
                                            padding: 8,
                                            borderWidth: 2,
                                            borderColor: notif.read ? Colors.lightGray : iconColor,
                                            marginRight: 12,
                                        }}>
                                            <Icon name={icon} size={18} color={iconColor} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={{
                                                    fontWeight: notif.read ? '700' : '900',
                                                    color: Colors.black,
                                                    fontSize: 14,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: 0.5,
                                                    flex: 1,
                                                }}>
                                                    {notif.title}
                                                </Text>
                                                {!notif.read && (
                                                    <View style={{
                                                        width: 8,
                                                        height: 8,
                                                        backgroundColor: adaptiveColors.primary,
                                                        marginLeft: 8,
                                                    }} />
                                                )}
                                            </View>
                                            <Text style={{
                                                color: Colors.mediumGray,
                                                fontSize: 13,
                                                fontWeight: '600',
                                                marginTop: 4,
                                                lineHeight: 18,
                                            }}>
                                                {notif.body}
                                            </Text>
                                            <Text style={{
                                                color: Colors.quaternaryLabel,
                                                fontSize: 11,
                                                fontWeight: '700',
                                                marginTop: 6,
                                                textTransform: 'uppercase',
                                                letterSpacing: 0.5,
                                            }}>
                                                {format(new Date(notif.created_at), "d MMM 'a' HH:mm", { locale: fr })}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => deleteNotification(notif.id)}
                                            style={{ padding: 4, marginLeft: 8 }}
                                        >
                                            <Icon name="xmark" size={14} color={Colors.mediumGray} />
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
