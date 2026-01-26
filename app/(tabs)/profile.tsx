import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

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
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#0091D3" />
            </View>
        );
    }

    const menuItems = [
        {
            icon: 'person-outline',
            label: 'Informations personnelles',
            description: 'Nom, email, campus',
            color: '#0091D3',
            bg: 'bg-blue-100',
        },
        {
            icon: 'shield-checkmark-outline',
            label: 'Sécurité',
            description: 'Mot de passe, biométrie',
            color: '#16a34a',
            bg: 'bg-green-100',
        },
        {
            icon: 'notifications-outline',
            label: 'Notifications',
            description: 'Gérer vos alertes',
            color: '#f59e0b',
            bg: 'bg-amber-100',
        },
        {
            icon: 'help-circle-outline',
            label: 'Aide & Support',
            description: 'FAQ, contact',
            color: '#8b5cf6',
            bg: 'bg-purple-100',
        },
    ];

    return (
        <ScrollView className="flex-1 bg-gray-50">
            {/* Header avec avatar */}
            <View className="bg-epitech-blue pt-16 pb-24 px-6">
                <View className="items-center">
                    <View className="w-24 h-24 bg-white rounded-full items-center justify-center shadow-lg mb-4">
                        <Text className="text-epitech-blue text-4xl font-bold">
                            {profile?.full_name?.charAt(0) || '?'}
                        </Text>
                    </View>
                    <Text className="text-white text-2xl font-bold">{profile?.full_name}</Text>
                    <Text className="text-blue-100 mt-1">{profile?.email}</Text>
                    <View className="bg-white/20 px-4 py-1.5 rounded-full mt-3">
                        <Text className="text-white font-medium">📍 Campus {profile?.campus}</Text>
                    </View>
                </View>
            </View>

            {/* Card solde */}
            <View className="mx-6 -mt-12 mb-6">
                <View className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                    <Text className="text-gray-500 text-sm mb-1">Solde disponible</Text>
                    <View className="flex-row items-baseline">
                        <Text className="text-4xl font-bold text-gray-900">
                            {profile?.balance?.toFixed(2)}
                        </Text>
                        <Text className="text-epitech-blue font-bold text-xl ml-2">EPC</Text>
                    </View>
                </View>
            </View>

            {/* Menu items */}
            <View className="px-6 mb-6">
                <Text className="text-gray-500 text-sm font-medium uppercase mb-3">Paramètres</Text>
                <View className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={item.label}
                            className={`flex-row items-center p-4 ${index < menuItems.length - 1 ? 'border-b border-gray-100' : ''}`}
                        >
                            <View className={`${item.bg} p-3 rounded-full mr-4`}>
                                <Ionicons name={item.icon as any} size={22} color={item.color} />
                            </View>
                            <View className="flex-1">
                                <Text className="font-semibold text-gray-900">{item.label}</Text>
                                <Text className="text-gray-400 text-sm">{item.description}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Admin access (si admin) */}
            {profile?.is_admin && (
                <View className="px-6 mb-6">
                    <Text className="text-gray-500 text-sm font-medium uppercase mb-3">Administration</Text>
                    <TouchableOpacity
                        className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex-row items-center"
                        onPress={() => router.push('/admin')}
                    >
                        <View className="bg-red-100 p-3 rounded-full mr-4">
                            <Ionicons name="settings" size={22} color="#dc2626" />
                        </View>
                        <View className="flex-1">
                            <Text className="font-semibold text-gray-900">Panel Administrateur</Text>
                            <Text className="text-gray-400 text-sm">Gérer l'écosystème EpiCoin</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Déconnexion */}
            <View className="px-6 mb-12">
                <TouchableOpacity
                    className="bg-red-50 border border-red-200 rounded-2xl p-4 flex-row items-center justify-center"
                    onPress={handleSignOut}
                >
                    <Ionicons name="log-out-outline" size={22} color="#dc2626" />
                    <Text className="text-red-600 font-bold ml-2">Se déconnecter</Text>
                </TouchableOpacity>
            </View>

            {/* Version */}
            <View className="items-center pb-8">
                <Text className="text-gray-300 text-sm">EpiPay v1.0.0</Text>
            </View>
        </ScrollView>
    );
}


