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
                backgroundColor: Colors.systemGroupedBackground,
            }}>
                <ActivityIndicator size="large" color={Colors.epitechBlue} />
            </View>
        );
    }

    const menuItems = [
        {
            icon: 'person.circle',
            label: 'Informations personnelles',
            description: 'Nom, email, campus',
            color: Colors.systemBlue,
            bg: 'rgba(59, 130, 246, 0.15)',
        },
        {
            icon: 'shield.checkered',
            label: 'Sécurité',
            description: 'Mot de passe, biométrie',
            color: Colors.systemGreen,
            bg: 'rgba(16, 185, 129, 0.15)',
        },
        {
            icon: 'bell.badge.fill',
            label: 'Notifications',
            description: 'Gérer vos alertes',
            color: Colors.systemOrange,
            bg: 'rgba(245, 158, 11, 0.15)',
        },
        {
            icon: 'questionmark.circle',
            label: 'Aide & Support',
            description: 'FAQ, contact',
            color: Colors.systemPurple,
            bg: 'rgba(139, 92, 246, 0.15)',
        },
    ];

    return (
        <ScrollView 
            contentInsetAdjustmentBehavior="automatic"
            style={{
                flex: 1,
                backgroundColor: Colors.systemGroupedBackground,
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
            }}>
                <View style={{ alignItems: 'center' }}>
                    <View style={{
                        width: 96,
                        height: 96,
                        backgroundColor: '#fff',
                        borderRadius: 48,
                        borderCurve: 'continuous',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        marginBottom: 16,
                    }}>
                        <Text style={{
                            color: Colors.epitechBlue,
                            fontSize: 40,
                            fontWeight: '700',
                        }}>
                            {profile?.full_name?.charAt(0) || '?'}
                        </Text>
                    </View>
                    <Text style={{
                        color: '#fff',
                        fontSize: 28,
                        fontWeight: '700',
                        marginBottom: 4,
                    }}>
                        {profile?.full_name}
                    </Text>
                    <Text style={{
                        color: 'rgba(255, 255, 255, 0.75)',
                        fontSize: 15,
                        marginBottom: 12,
                    }}>
                        {profile?.email}
                    </Text>
                    <View style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        paddingHorizontal: 16,
                        paddingVertical: 6,
                        borderRadius: 16,
                        borderCurve: 'continuous',
                    }}>
                        <Text style={{
                            color: '#fff',
                            fontWeight: '600',
                            fontSize: 14,
                        }}>
                            📍 Campus {profile?.campus}
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
                    backgroundColor: Colors.secondarySystemGroupedBackground,
                    borderRadius: 16,
                    borderCurve: 'continuous',
                    padding: 24,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                }}>
                    <Text style={{
                        color: Colors.secondaryLabel,
                        fontSize: 13,
                        marginBottom: 4,
                    }}>
                        Solde disponible
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <Text style={{
                            fontSize: 40,
                            fontWeight: '700',
                            color: Colors.label,
                            fontVariant: ['tabular-nums'],
                        }}>
                            {profile?.balance?.toFixed(2)}
                        </Text>
                        <Text style={{
                            color: Colors.epitechBlue,
                            fontWeight: '700',
                            fontSize: 20,
                            marginLeft: 8,
                        }}>
                            EPC
                        </Text>
                    </View>
                </View>
            </View>

            {/* Menu items */}
            <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
                <Text style={{
                    color: Colors.secondaryLabel,
                    fontSize: 13,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    marginBottom: 12,
                    letterSpacing: 0.5,
                }}>
                    Paramètres
                </Text>
                <View style={{
                    backgroundColor: Colors.secondarySystemGroupedBackground,
                    borderRadius: 16,
                    borderCurve: 'continuous',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                }}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={item.label}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                padding: 16,
                                borderBottomWidth: index < menuItems.length - 1 ? 1 : 0,
                                borderBottomColor: Colors.separator,
                            }}
                        >
                            <View style={{
                                backgroundColor: item.bg,
                                padding: 12,
                                borderRadius: 20,
                                borderCurve: 'continuous',
                                marginRight: 16,
                            }}>
                                <SymbolView 
                                    name={item.icon as any} 
                                    size={22}
                                    tintColor={item.color}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{
                                    fontWeight: '600',
                                    color: Colors.label,
                                    fontSize: 16,
                                    marginBottom: 2,
                                }}>
                                    {item.label}
                                </Text>
                                <Text style={{
                                    color: Colors.tertiaryLabel,
                                    fontSize: 13,
                                }}>
                                    {item.description}
                                </Text>
                            </View>
                            <SymbolView 
                                name="chevron.right" 
                                size={14}
                                tintColor={Colors.quaternaryLabel}
                            />
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Admin access (si admin) */}
            {profile?.is_admin && (
                <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
                    <Text style={{
                        color: Colors.secondaryLabel,
                        fontSize: 13,
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        marginBottom: 12,
                        letterSpacing: 0.5,
                    }}>
                        Administration
                    </Text>
                    <TouchableOpacity
                        style={{
                            backgroundColor: Colors.secondarySystemGroupedBackground,
                            borderRadius: 16,
                            borderCurve: 'continuous',
                            padding: 16,
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                            flexDirection: 'row',
                            alignItems: 'center',
                        }}
                        onPress={() => router.push('/admin')}
                    >
                        <View style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            padding: 12,
                            borderRadius: 20,
                            borderCurve: 'continuous',
                            marginRight: 16,
                        }}>
                            <SymbolView 
                                name="gearshape.fill" 
                                size={22}
                                tintColor={Colors.systemRed}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{
                                fontWeight: '600',
                                color: Colors.label,
                                fontSize: 16,
                                marginBottom: 2,
                            }}>
                                Panel Administrateur
                            </Text>
                            <Text style={{
                                color: Colors.tertiaryLabel,
                                fontSize: 13,
                            }}>
                                Gérer l'écosystème EpiCoin
                            </Text>
                        </View>
                        <SymbolView 
                            name="chevron.right" 
                            size={14}
                            tintColor={Colors.quaternaryLabel}
                        />
                    </TouchableOpacity>
                </View>
            )}

            {/* Déconnexion */}
            <View style={{ paddingHorizontal: 24, marginBottom: 48 }}>
                <TouchableOpacity
                    style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderWidth: 1,
                        borderColor: 'rgba(239, 68, 68, 0.3)',
                        borderRadius: 16,
                        borderCurve: 'continuous',
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    onPress={handleSignOut}
                >
                    <SymbolView 
                        name="rectangle.portrait.and.arrow.right" 
                        size={22}
                        tintColor={Colors.systemRed}
                    />
                    <Text style={{
                        color: Colors.systemRed,
                        fontWeight: '700',
                        marginLeft: 8,
                        fontSize: 16,
                    }}>
                        Se déconnecter
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Version */}
            <View style={{ alignItems: 'center', paddingBottom: 32 }}>
                <Text style={{
                    color: Colors.quaternaryLabel,
                    fontSize: 13,
                }}>
                    EpiPay v1.0.0
                </Text>
            </View>
        </ScrollView>
    );
}
