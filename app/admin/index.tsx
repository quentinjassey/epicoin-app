import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function AdminDashboard() {
    const MENU_ITEMS = [
        {
            title: 'Gestion des produits',
            icon: 'cube-outline' as const,
            route: '/admin/products',
            color: 'bg-blue-100',
            iconColor: '#2563eb',
            description: 'Ajouter, modifier ou supprimer les articles.'
        },
        {
            title: 'Gestion des utilisateurs',
            icon: 'people-outline' as const,
            route: '/admin/users',
            color: 'bg-green-100',
            iconColor: '#16a34a',
            description: 'Voir les profils et les soldes des étudiants.'
        },
        {
            title: 'Journal des transactions',
            icon: 'list-outline' as const,
            route: '/admin/transactions',
            color: 'bg-purple-100',
            iconColor: '#9333ea',
            description: 'Surveiller toutes les transactions du système.'
        },
        {
            title: 'Alertes de fraude',
            icon: 'warning-outline' as const,
            route: '/admin/fraud',
            color: 'bg-red-100',
            iconColor: '#dc2626',
            description: 'Examiner les transactions suspectes.'
        },
        {
            title: 'Configuration fraude',
            icon: 'settings-outline' as const,
            route: '/admin/fraud-config',
            color: 'bg-purple-100',
            iconColor: '#9333ea',
            description: 'Personnaliser les seuils et poids de détection.'
        },
        {
            title: 'Métriques & Export',
            icon: 'stats-chart-outline' as const,
            route: '/admin/metrics',
            color: 'bg-orange-100',
            iconColor: '#ea580c',
            description: 'Statistiques opérationnelles et export des logs.'
        },
    ];

    return (
        <ScrollView className="flex-1 bg-gray-50">
            <View className="p-6">
                <View className="bg-epitech-blue rounded-2xl p-6 mb-6">
                    <View className="flex-row items-center mb-2">
                        <Ionicons name="shield-checkmark" size={24} color="white" />
                        <Text className="text-white font-bold text-xl ml-2">Administration</Text>
                    </View>
                    <Text className="text-blue-100">
                        Gérez l'écosystème EpiPay depuis ce panel.
                    </Text>
                </View>

                <Text className="text-gray-500 text-sm font-medium uppercase mb-3">Menu</Text>
                
                <View className="gap-3">
                    {MENU_ITEMS.map((item) => (
                        <TouchableOpacity
                            key={item.title}
                            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex-row items-center active:bg-gray-50"
                            onPress={() => router.push(item.route as any)}
                        >
                            <View className={`p-4 rounded-xl ${item.color} mr-4`}>
                                <Ionicons name={item.icon} size={24} color={item.iconColor} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-lg font-bold text-gray-900">{item.title}</Text>
                                <Text className="text-gray-500 text-sm mt-0.5">{item.description}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </ScrollView>
    );
}
