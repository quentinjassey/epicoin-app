import { SymbolView } from 'expo-symbols';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { Colors } from '@/constants/NativeColors';

type Profile = {
    id: string;
    email: string;
    full_name: string;
    campus: string;
    balance: number;
    is_admin: boolean;
    created_at: string;
};

export default function ProfileScreen() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            fetchProfile();
        }, [])
    );

    async function fetchProfile() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            setProfile(data);
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSignOut() {
        Alert.alert(
            'Déconnexion',
            'Êtes-vous sûr de vouloir vous déconnecter ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Déconnexion',
                    style: 'destructive',
                    onPress: async () => {
                        await supabase.auth.signOut();
                        router.replace('/(auth)/sign-in');
                    }
                }
            ]
        );
    }

    if (loading) {
        return (
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: Colors.white,
            }}>
                <ActivityIndicator size="large" color={Colors.epitechBlue} />
            </View>
        );
    }

    const menuItems = [
        {
            icon: 'person.circle',
            label: 'INFORMATIONS PERSONNELLES',
            description: 'Nom, email, campus',
            color: Colors.epitechBlue,
            bg: Colors.offWhite,
            route: '/(main)/(profile)/personal-info' as const,
        },
        {
            icon: 'shield.checkered',
            label: 'SÉCURITÉ',
            description: 'Mot de passe, biométrie',
            color: Colors.neonGreen,
            bg: Colors.offWhite,
            route: '/(main)/(profile)/security' as const,
        },
        {
            icon: 'bell.badge.fill',
            label: 'NOTIFICATIONS',
            description: 'Gérer vos alertes',
            color: Colors.accentOrange,
            bg: Colors.offWhite,
            route: '/(main)/(profile)/notifications' as const,
        },
        {
            icon: 'questionmark.circle',
            label: 'AIDE & SUPPORT',
            description: 'FAQ, contact',
            color: Colors.accentMagenta,
            bg: Colors.offWhite,
            route: '/(main)/(profile)/help' as const,
        },
    ];

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={{
                flex: 1,
                backgroundColor: Colors.white,
            }}
            contentContainerStyle={{
                paddingBottom: 32,
            }}
        >
            {/* Header avec avatar */}
            <View style={{
                backgroundColor: Colors.epitechBlue,
                paddingTop: 100,
                paddingBottom: 96,
                paddingHorizontal: 24,
                borderBottomWidth: 3,
                borderBottomColor: Colors.black,
            }}>
                <View style={{ alignItems: 'center' }}>
                    <View style={{
                        width: 96,
                        height: 96,
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
                        <Text style={{
                            color: Colors.epitechBlue,
                            fontSize: 40,
                            fontWeight: '900',
                            letterSpacing: 2,
                        }}>
                            {profile?.full_name?.charAt(0) || '?'}
                        </Text>
                    </View>
                    <Text style={{
                        color: Colors.white,
                        fontSize: 28,
                        fontWeight: '900',
                        marginBottom: 4,
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                    }}>
                        {profile?.full_name}
                    </Text>
                    <Text style={{
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: '700',
                        marginBottom: 12,
                        opacity: 0.8,
                    }}>
                        {profile?.email}
                    </Text>
                    <View style={{
                        backgroundColor: Colors.white,
                        paddingHorizontal: 16,
                        paddingVertical: 6,
                        borderRadius: 0,
                        borderWidth: 2,
                        borderColor: Colors.black,
                    }}>
                        <Text style={{
                            color: Colors.black,
                            fontWeight: '800',
                            fontSize: 14,
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                        }}>
                            CAMPUS {profile?.campus}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Card solde */}
            <View style={{
                marginHorizontal: 24,
                marginTop: -48,
                marginBottom: 24,
            }}>
                <View style={{
                    backgroundColor: Colors.white,
                    borderRadius: 0,
                    padding: 24,
                    borderWidth: 3,
                    borderColor: Colors.black,
                    shadowColor: Colors.black,
                    shadowOffset: { width: 4, height: 4 },
                    shadowOpacity: 1,
                    shadowRadius: 0,
                }}>
                    <Text style={{
                        color: Colors.mediumGray,
                        fontSize: 13,
                        fontWeight: '800',
                        marginBottom: 4,
                        textTransform: 'uppercase',
                        letterSpacing: 1.5,
                    }}>
                        SOLDE DISPONIBLE
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <Text style={{
                            fontSize: 40,
                            fontWeight: '900',
                            color: Colors.black,
                            fontVariant: ['tabular-nums'],
                        }}>
                            {profile?.balance?.toFixed(2)}
                        </Text>
                        <Text style={{
                            color: Colors.epitechBlue,
                            fontWeight: '900',
                            fontSize: 20,
                            marginLeft: 8,
                            letterSpacing: 2,
                        }}>
                            EPC
                        </Text>
                    </View>
                </View>
            </View>

            {/* Menu items */}
            <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
                <Text style={{
                    color: Colors.black,
                    fontSize: 13,
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    marginBottom: 12,
                    letterSpacing: 2,
                }}>
                    PARAMÈTRES
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
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={item.label}
                            onPress={() => item.route && router.push(item.route)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                padding: 16,
                                borderBottomWidth: index < menuItems.length - 1 ? 2 : 0,
                                borderBottomColor: Colors.black,
                            }}
                        >
                            <View style={{
                                backgroundColor: item.bg,
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
                            <SymbolView
                                name="chevron.right"
                                size={14}
                                tintColor={Colors.black}
                            />
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Admin access (si admin) */}
            {profile?.is_admin && (
                <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
                    <Text style={{
                        color: Colors.black,
                        fontSize: 13,
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        marginBottom: 12,
                        letterSpacing: 2,
                    }}>
                        ADMINISTRATION
                    </Text>
                    <TouchableOpacity
                        style={{
                            backgroundColor: Colors.white,
                            borderRadius: 0,
                            padding: 16,
                            borderWidth: 3,
                            borderColor: Colors.black,
                            shadowColor: Colors.black,
                            shadowOffset: { width: 4, height: 4 },
                            shadowOpacity: 1,
                            shadowRadius: 0,
                            flexDirection: 'row',
                            alignItems: 'center',
                        }}
                        onPress={() => router.push('/admin')}
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
                                name="gearshape.fill"
                                size={22}
                                tintColor={Colors.accentOrange}
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
                                PANEL ADMINISTRATEUR
                            </Text>
                            <Text style={{
                                color: Colors.mediumGray,
                                fontSize: 13,
                                fontWeight: '700',
                            }}>
                                Gérer l'écosystème EpiCoin
                            </Text>
                        </View>
                        <SymbolView
                            name="chevron.right"
                            size={14}
                            tintColor={Colors.black}
                        />
                    </TouchableOpacity>
                </View>
            )}

            {/* Déconnexion */}
            <View style={{ paddingHorizontal: 24, marginBottom: 48 }}>
                <TouchableOpacity
                    style={{
                        backgroundColor: Colors.white,
                        borderWidth: 3,
                        borderColor: Colors.accentOrange,
                        borderRadius: 0,
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: Colors.black,
                        shadowOffset: { width: 4, height: 4 },
                        shadowOpacity: 1,
                        shadowRadius: 0,
                    }}
                    onPress={handleSignOut}
                >
                    <SymbolView
                        name="rectangle.portrait.and.arrow.right"
                        size={22}
                        tintColor={Colors.accentOrange}
                    />
                    <Text style={{
                        color: Colors.accentOrange,
                        fontWeight: '900',
                        marginLeft: 8,
                        fontSize: 16,
                        textTransform: 'uppercase',
                        letterSpacing: 1.5,
                    }}>
                        SE DÉCONNECTER
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Version */}
            <View style={{ alignItems: 'center', paddingBottom: 32 }}>
                <Text style={{
                    color: Colors.mediumGray,
                    fontSize: 13,
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                }}>
                    EPIPAY V1.0.0
                </Text>
            </View>
        </ScrollView>
    );
}
