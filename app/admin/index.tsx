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
            color: Colors.epitechBlue,
            description: 'Ajouter, modifier ou supprimer les articles.'
        },
        {
            title: 'Gestion des utilisateurs',
            icon: 'person.3.fill',
            route: '/admin/users',
            color: Colors.success,
            description: 'Voir les profils et les soldes des étudiants.'
        },
        {
            title: 'Journal des transactions',
            icon: 'list.bullet.rectangle',
            route: '/admin/transactions',
            color: Colors.accentMagenta,
            description: 'Surveiller toutes les transactions du système.'
        },
        {
            title: 'Alertes de fraude',
            icon: 'exclamationmark.triangle.fill',
            route: '/admin/fraud',
            color: Colors.accentOrange,
            description: 'Examiner les transactions suspectes.'
        },
        {
            title: 'Configuration fraude',
            icon: 'slider.horizontal.3',
            route: '/admin/fraud-config',
            color: Colors.accentMagenta,
            description: 'Personnaliser les seuils et poids de détection.'
        },
        {
            title: 'Métriques & Export',
            icon: 'chart.bar.fill',
            route: '/admin/metrics',
            color: Colors.systemOrange,
            description: 'Statistiques opérationnelles et export des logs.'
        },
    ];

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={{ flex: 1, backgroundColor: Colors.white }}
            contentContainerStyle={{ padding: 24 }}
        >
            <View style={{
                backgroundColor: Colors.epitechBlue,
                borderRadius: 0,
                padding: 24,
                marginBottom: 24,
                borderWidth: 2,
                borderColor: Colors.black,
                shadowColor: Colors.black,
                shadowOffset: { width: 3, height: 3 },
                shadowOpacity: 1,
                shadowRadius: 0,
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <SymbolView name="checkmark.shield.fill" size={24} tintColor={Colors.white} />
                        <Text style={{
                            color: Colors.white,
                            fontWeight: '900',
                            fontSize: 20,
                            marginLeft: 8,
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                        }}>
                            Administration
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            padding: 8,
                            borderRadius: 0,
                            borderWidth: 2,
                            borderColor: Colors.white,
                        }}
                    >
                        <SymbolView name="xmark" size={18} tintColor={Colors.white} />
                    </TouchableOpacity>
                </View>
                <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 15, fontWeight: '700' }}>
                    Gérez l'écosystème EpiPay depuis ce panel.
                </Text>
            </View>

            <Text style={{
                color: Colors.black,
                fontSize: 13,
                fontWeight: '900',
                textTransform: 'uppercase',
                marginBottom: 12,
                letterSpacing: 2,
            }}>
                Menu
            </Text>

            <View style={{ gap: 12 }}>
                {MENU_ITEMS.map((item) => (
                    <TouchableOpacity
                        key={item.title}
                        style={{
                            backgroundColor: Colors.white,
                            padding: 20,
                            borderRadius: 0,
                            borderWidth: 2,
                            borderColor: Colors.black,
                            shadowColor: Colors.black,
                            shadowOffset: { width: 3, height: 3 },
                            shadowOpacity: 1,
                            shadowRadius: 0,
                            flexDirection: 'row',
                            alignItems: 'center',
                        }}
                        onPress={() => router.push(item.route as any)}
                    >
                        <View style={{
                            padding: 16,
                            borderRadius: 0,
                            backgroundColor: Colors.offWhite,
                            marginRight: 16,
                            borderWidth: 2,
                            borderColor: Colors.black,
                        }}>
                            <SymbolView name={item.icon as any} size={24} tintColor={item.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{
                                fontSize: 17,
                                fontWeight: '800',
                                color: Colors.black,
                                marginBottom: 2,
                            }}>
                                {item.title}
                            </Text>
                            <Text style={{
                                color: Colors.secondaryLabel,
                                fontSize: 13,
                                fontWeight: '700',
                            }}>
                                {item.description}
                            </Text>
                        </View>
                        <SymbolView name="chevron.right" size={14} tintColor={Colors.black} />
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );
}
