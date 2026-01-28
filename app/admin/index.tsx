import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/constants/NativeColors';

export default function AdminDashboard() {
    const MENU_ITEMS = [
        {
            title: 'Gestion des produits',
            icon: 'cube.fill',
            route: '/admin/products',
            color: 'rgba(59, 130, 246, 0.15)',
            iconColor: Colors.systemBlue,
            description: 'Ajouter, modifier ou supprimer les articles.'
        },
        {
            title: 'Gestion des utilisateurs',
            icon: 'person.3.fill',
            route: '/admin/users',
            color: 'rgba(16, 185, 129, 0.15)',
            iconColor: Colors.systemGreen,
            description: 'Voir les profils et les soldes des étudiants.'
        },
        {
            title: 'Journal des transactions',
            icon: 'list.bullet.rectangle',
            route: '/admin/transactions',
            color: 'rgba(139, 92, 246, 0.15)',
            iconColor: Colors.systemPurple,
            description: 'Surveiller toutes les transactions du système.'
        },
        {
            title: 'Alertes de fraude',
            icon: 'exclamationmark.triangle.fill',
            route: '/admin/fraud',
            color: 'rgba(239, 68, 68, 0.15)',
            iconColor: Colors.systemRed,
            description: 'Examiner les transactions suspectes.'
        },
        {
            title: 'Configuration fraude',
            icon: 'slider.horizontal.3',
            route: '/admin/fraud-config',
            color: 'rgba(139, 92, 246, 0.15)',
            iconColor: Colors.systemPurple,
            description: 'Personnaliser les seuils et poids de détection.'
        },
        {
            title: 'Métriques & Export',
            icon: 'chart.bar.fill',
            route: '/admin/metrics',
            color: 'rgba(245, 158, 11, 0.15)',
            iconColor: Colors.systemOrange,
            description: 'Statistiques opérationnelles et export des logs.'
        },
    ];

    return (
        <ScrollView 
            contentInsetAdjustmentBehavior="automatic"
            style={{ flex: 1, backgroundColor: Colors.systemGroupedBackground }}
            contentContainerStyle={{ padding: 24 }}
        >
            <View style={{
                backgroundColor: Colors.epitechBlue,
                borderRadius: 16,
                borderCurve: 'continuous',
                padding: 24,
                marginBottom: 24,
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <SymbolView name="checkmark.shield.fill" size={24} tintColor="#fff" />
                        <Text style={{
                            color: '#fff',
                            fontWeight: '700',
                            fontSize: 20,
                            marginLeft: 8,
                        }}>
                            Administration
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            padding: 8,
                            borderRadius: 20,
                            borderCurve: 'continuous',
                        }}
                    >
                        <SymbolView name="xmark" size={18} tintColor="#fff" />
                    </TouchableOpacity>
                </View>
                <Text style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: 15 }}>
                    Gérez l'écosystème EpiPay depuis ce panel.
                </Text>
            </View>

            <Text style={{
                color: Colors.secondaryLabel,
                fontSize: 13,
                fontWeight: '600',
                textTransform: 'uppercase',
                marginBottom: 12,
                letterSpacing: 0.5,
            }}>
                Menu
            </Text>
            
            <View style={{ gap: 12 }}>
                {MENU_ITEMS.map((item) => (
                    <TouchableOpacity
                        key={item.title}
                        style={{
                            backgroundColor: Colors.secondarySystemGroupedBackground,
                            padding: 20,
                            borderRadius: 16,
                            borderCurve: 'continuous',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                            flexDirection: 'row',
                            alignItems: 'center',
                        }}
                        onPress={() => router.push(item.route as any)}
                    >
                        <View style={{
                            padding: 16,
                            borderRadius: 12,
                            borderCurve: 'continuous',
                            backgroundColor: item.color,
                            marginRight: 16,
                        }}>
                            <SymbolView name={item.icon as any} size={24} tintColor={item.iconColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{
                                fontSize: 17,
                                fontWeight: '700',
                                color: Colors.label,
                                marginBottom: 2,
                            }}>
                                {item.title}
                            </Text>
                            <Text style={{
                                color: Colors.secondaryLabel,
                                fontSize: 13,
                            }}>
                                {item.description}
                            </Text>
                        </View>
                        <SymbolView name="chevron.right" size={14} tintColor={Colors.quaternaryLabel} />
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );
}
