import Icon from '@/components/Icon';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/constants/NativeColors';
import { useAccessibility } from '@/lib/AccessibilityContext';

export default function NotificationsScreen() {
    const router = useRouter();
    const { adaptiveColors } = useAccessibility();

    const NOTIFICATION_PREFS = [
        {
            key: 'transactions',
            icon: 'arrow.left.arrow.right',
            label: 'TRANSACTIONS',
            description: 'Alertes pour les transferts entrants et sortants',
            color: adaptiveColors.primary,
        },
        {
            key: 'purchases',
            icon: 'bag.fill',
            label: 'ACHATS',
            description: 'Alertes quand vous achetez un produit',
            color: adaptiveColors.success,
        },
        {
            key: 'topups',
            icon: 'plus.circle.fill',
            label: 'RECHARGEMENTS',
            description: 'Alertes quand vous rechargez votre solde',
            color: adaptiveColors.warning,
        },
        {
            key: 'security',
            icon: 'shield.fill',
            label: 'ALERTES DE SÉCURITÉ',
            description: 'Activité suspecte détectée sur votre compte',
            color: adaptiveColors.accent,
        },
        {
            key: 'promotions',
            icon: 'tag.fill',
            label: 'PROMOTIONS',
            description: 'Nouveaux produits, offres et bons plans',
            color: adaptiveColors.warning,
        },
    ];
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
        <View style={{ flex: 1 }}>
        <View style={{ backgroundColor: adaptiveColors.primary, position: 'absolute', top: 0, left: 0, right: 0, height: 200 }} />
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
                paddingBottom: 48,
                backgroundColor: Colors.white,
            }}
        >
            {/* Header */}
            <View style={{
                backgroundColor: adaptiveColors.primary,
                paddingTop: 70,
                paddingBottom: 32,
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
                        <Icon
                            name="bell.badge.fill"
                            size={32}
                            color={adaptiveColors.primary}
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
                                <Icon
                                    name={item.icon}
                                    size={22}
                                    color={item.color}
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
                                    true: adaptiveColors.primary,
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
                <Icon
                    name="info.circle.fill"
                    size={18}
                    color={Colors.mediumGray}
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
        </View>
    );
}
