import { SymbolView } from 'expo-symbols';
import React, { useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { Colors } from '@/constants/NativeColors';

type NotificationPref = {
    key: string;
    icon: string;
    label: string;
    description: string;
    color: string;
};

const NOTIFICATION_PREFS: NotificationPref[] = [
    {
        key: 'transactions',
        icon: 'arrow.left.arrow.right',
        label: 'TRANSACTIONS',
        description: 'Alertes pour les transferts entrants et sortants',
        color: Colors.epitechBlue,
    },
    {
        key: 'purchases',
        icon: 'bag.fill',
        label: 'ACHATS',
        description: 'Alertes quand vous achetez un produit',
        color: Colors.success,
    },
    {
        key: 'topups',
        icon: 'plus.circle.fill',
        label: 'RECHARGEMENTS',
        description: 'Alertes quand vous rechargez votre solde',
        color: Colors.accentOrange,
    },
    {
        key: 'security',
        icon: 'shield.fill',
        label: 'ALERTES DE SÉCURITÉ',
        description: 'Activité suspecte détectée sur votre compte',
        color: Colors.accentMagenta,
    },
    {
        key: 'promotions',
        icon: 'tag.fill',
        label: 'PROMOTIONS',
        description: 'Nouveaux produits, offres et bons plans',
        color: Colors.accentOrange,
    },
];

export default function NotificationsScreen() {
    const [prefs, setPrefs] = useState<Record<string, boolean>>({
        transactions: true,
        purchases: true,
        topups: true,
        security: true,
        promotions: false,
    });

    function togglePref(key: string) {
        setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    }

    const enabledCount = Object.values(prefs).filter(Boolean).length;

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={{
                flex: 1,
                backgroundColor: Colors.white,
            }}
            contentContainerStyle={{
                paddingBottom: 48,
            }}
        >
            {/* Header */}
            <View style={{
                backgroundColor: Colors.epitechBlue,
                paddingTop: 100,
                paddingBottom: 32,
                paddingHorizontal: 24,
                borderBottomWidth: 3,
                borderBottomColor: Colors.black,
            }}>
                <View style={{ alignItems: 'center' }}>
                    <View style={{
                        width: 72,
                        height: 72,
                        backgroundColor: Colors.white,
                        borderRadius: 0,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 3,
                        borderColor: Colors.black,
                        shadowColor: Colors.black,
                        shadowOffset: { width: 4, height: 4 },
                        shadowOpacity: 1,
                        shadowRadius: 0,
                        marginBottom: 16,
                    }}>
                        <SymbolView
                            name="bell.badge.fill"
                            size={32}
                            tintColor={Colors.epitechBlue}
                        />
                    </View>
                    <Text style={{
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: '900',
                        letterSpacing: 2,
                        textTransform: 'uppercase',
                        marginBottom: 4,
                    }}>
                        NOTIFICATIONS
                    </Text>
                    <Text style={{
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: '700',
                        opacity: 0.8,
                    }}>
                        {enabledCount} / {NOTIFICATION_PREFS.length} alertes activées
                    </Text>
                </View>
            </View>

            {/* Toggle list */}
            <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
                <Text style={{
                    color: Colors.black,
                    fontSize: 13,
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    marginBottom: 12,
                    letterSpacing: 2,
                }}>
                    PRÉFÉRENCES
                </Text>
                <View style={{
                    backgroundColor: Colors.white,
                    borderRadius: 0,
                    overflow: 'hidden',
                    borderWidth: 3,
                    borderColor: Colors.black,
                    shadowColor: Colors.black,
                    shadowOffset: { width: 4, height: 4 },
                    shadowOpacity: 1,
                    shadowRadius: 0,
                }}>
                    {NOTIFICATION_PREFS.map((item, index) => (
                        <View
                            key={item.key}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                padding: 16,
                                borderBottomWidth: index < NOTIFICATION_PREFS.length - 1 ? 2 : 0,
                                borderBottomColor: Colors.black,
                            }}
                        >
                            <View style={{
                                backgroundColor: Colors.offWhite,
                                padding: 12,
                                borderRadius: 0,
                                marginRight: 16,
                                borderWidth: 2,
                                borderColor: Colors.black,
                            }}>
                                <SymbolView
                                    name={item.icon as any}
                                    size={22}
                                    tintColor={item.color}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{
                                    fontWeight: '800',
                                    color: Colors.black,
                                    fontSize: 14,
                                    marginBottom: 2,
                                    letterSpacing: 0.5,
                                    textTransform: 'uppercase',
                                }}>
                                    {item.label}
                                </Text>
                                <Text style={{
                                    color: Colors.mediumGray,
                                    fontSize: 13,
                                    fontWeight: '700',
                                }}>
                                    {item.description}
                                </Text>
                            </View>
                            <Switch
                                value={prefs[item.key]}
                                onValueChange={() => togglePref(item.key)}
                                trackColor={{
                                    false: Colors.lightGray,
                                    true: Colors.epitechBlue,
                                }}
                                thumbColor={Colors.white}
                            />
                        </View>
                    ))}
                </View>
            </View>

            {/* Local save notice */}
            <View style={{
                marginHorizontal: 24,
                marginTop: 24,
                backgroundColor: Colors.offWhite,
                borderRadius: 0,
                padding: 16,
                borderWidth: 2,
                borderColor: Colors.black,
                flexDirection: 'row',
                alignItems: 'center',
            }}>
                <SymbolView
                    name="info.circle.fill"
                    size={18}
                    tintColor={Colors.mediumGray}
                />
                <Text style={{
                    color: Colors.mediumGray,
                    fontSize: 13,
                    fontWeight: '700',
                    marginLeft: 10,
                    flex: 1,
                }}>
                    Les préférences sont sauvegardées localement sur cet appareil.
                </Text>
            </View>
        </ScrollView>
    );
}
