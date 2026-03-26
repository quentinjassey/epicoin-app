import Icon from '@/components/Icon';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { supabase } from '../../lib/supabase';
import { Colors } from '@/constants/NativeColors';
import { useAccessibility } from '@/lib/AccessibilityContext';

export default function AdminDashboard() {
    const { adaptiveColors } = useAccessibility();
    const [exporting, setExporting] = useState(false);

    async function exportFullLogs() {
        setExporting(true);
        try {
            const [txResult, alertsResult, usersResult, productsResult] = await Promise.all([
                supabase.from('transactions').select('*').order('created_at', { ascending: false }),
                supabase.from('fraud_alerts').select('*').order('created_at', { ascending: false }),
                supabase.from('profiles').select('id, email, full_name, campus, balance, is_admin, created_at'),
                supabase.from('products').select('*'),
            ]);

            const transactions = txResult.data || [];
            const alerts = alertsResult.data || [];
            const users = usersResult.data || [];
            const products = productsResult.data || [];

            // Calculer les stats
            const totalVolume = transactions.reduce((s: number, t: any) => s + parseFloat(t.amount || '0'), 0);
            const activeUsers = new Set(transactions.map((t: any) => t.sender_id).filter(Boolean)).size;
            const fraudAlerts = alerts.filter((a: any) => a.status === 'pending').length;
            const blockedTx = transactions.filter((t: any) => t.status === 'failed' && t.fraud_score > 50);

            const exportData = {
                export_info: {
                    date: new Date().toISOString(),
                    app: 'EpiPay',
                    version: '1.0.0',
                    format: 'JSON',
                },
                summary: {
                    total_users: users.length,
                    active_users: activeUsers,
                    total_transactions: transactions.length,
                    total_volume_epc: totalVolume,
                    total_products: products.length,
                    fraud_alerts_total: alerts.length,
                    fraud_alerts_pending: fraudAlerts,
                    blocked_transactions: blockedTx.length,
                    blocked_volume_epc: blockedTx.reduce((s: number, t: any) => s + parseFloat(t.amount || '0'), 0),
                    total_balance_circulation: users.reduce((s: number, u: any) => s + parseFloat(u.balance || '0'), 0),
                },
                users,
                products,
                transactions,
                fraud_alerts: alerts,
            };

            const fileName = `epipay_full_export_${new Date().toISOString().split('T')[0]}.json`;
            const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
            await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(exportData, null, 2));

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, {
                    mimeType: 'application/json',
                    dialogTitle: 'Export complet EpiPay',
                    UTI: 'public.json',
                });
            } else {
                Alert.alert('Export', `Fichier enregistre: ${fileName}`);
            }
        } catch (error: any) {
            Alert.alert('Erreur', error.message);
        } finally {
            setExporting(false);
        }
    }
    const MENU_ITEMS = [
        {
            title: 'Gestion des produits',
            icon: 'cube.fill',
            route: '/admin/products',
            color: adaptiveColors.primary,
            description: 'Ajouter, modifier ou supprimer les articles.'
        },
        {
            title: 'Gestion des utilisateurs',
            icon: 'person.3.fill',
            route: '/admin/users',
            color: adaptiveColors.success,
            description: 'Voir les profils et les soldes des étudiants.'
        },
        {
            title: 'Journal des transactions',
            icon: 'list.bullet.rectangle',
            route: '/admin/transactions',
            color: adaptiveColors.accent,
            description: 'Surveiller toutes les transactions du système.'
        },
        {
            title: 'Alertes de fraude',
            icon: 'exclamationmark.triangle.fill',
            route: '/admin/fraud',
            color: adaptiveColors.error,
            description: 'Examiner les transactions suspectes.'
        },
        {
            title: 'Configuration fraude',
            icon: 'slider.horizontal.3',
            route: '/admin/fraud-config',
            color: adaptiveColors.accent,
            description: 'Personnaliser les seuils et poids de détection.'
        },
        {
            title: 'Métriques & Export',
            icon: 'chart.bar.fill',
            route: '/admin/metrics',
            color: adaptiveColors.warning,
            description: 'Statistiques opérationnelles et export des logs.'
        },
    ];

    return (
        <View style={{ flex: 1 }}>
        <View style={{ backgroundColor: adaptiveColors.primary, position: 'absolute', top: 0, left: 0, right: 0, height: 200 }} />
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={{ flex: 1, backgroundColor: Colors.white }}
            contentContainerStyle={{ padding: 24, backgroundColor: Colors.white }}
        >
            <View style={{
                backgroundColor: adaptiveColors.primary,
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
                        <Icon name="checkmark.shield.fill" size={24} color={Colors.white} />
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
                        <Icon name="xmark" size={18} color={Colors.white} />
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
                            <Icon name={item.icon} size={24} color={item.color} />
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
                        <Icon name="chevron.right" size={14} color={Colors.black} />
                    </TouchableOpacity>
                ))}
            </View>

            {/* Export complet */}
            <Text style={{
                color: Colors.black,
                fontSize: 13,
                fontWeight: '900',
                textTransform: 'uppercase',
                marginTop: 24,
                marginBottom: 12,
                letterSpacing: 2,
            }}>
                Export
            </Text>

            <TouchableOpacity
                style={{
                    backgroundColor: adaptiveColors.primary,
                    padding: 18,
                    borderWidth: 2,
                    borderColor: Colors.black,
                    shadowColor: Colors.black,
                    shadowOffset: { width: 3, height: 3 },
                    shadowOpacity: 1,
                    shadowRadius: 0,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                }}
                onPress={exportFullLogs}
                disabled={exporting}
            >
                {exporting ? (
                    <ActivityIndicator color={Colors.white} />
                ) : (
                    <>
                        <Icon name="square.and.arrow.up" size={22} color={Colors.white} />
                        <Text style={{
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: '900',
                            marginLeft: 10,
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                        }}>
                            Export complet (JSON)
                        </Text>
                    </>
                )}
            </TouchableOpacity>

            <View style={{
                backgroundColor: Colors.offWhite,
                borderWidth: 2,
                borderColor: Colors.black,
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 24,
            }}>
                <Icon name="info.circle.fill" size={16} color={Colors.mediumGray} />
                <Text style={{
                    color: Colors.mediumGray,
                    fontSize: 12,
                    fontWeight: '700',
                    marginLeft: 10,
                    flex: 1,
                }}>
                    Exporte utilisateurs, transactions, produits, alertes de fraude et KPIs au format JSON.
                </Text>
            </View>
        </ScrollView>
        </View>
    );
}
