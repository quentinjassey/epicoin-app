import { SymbolView } from 'expo-symbols';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '@/constants/NativeColors';

type FraudStats = {
    period_days: number;
    alerts: {
        pending_count: number;
        approved_count: number;
        rejected_count: number;
        avg_risk_score: number;
        max_risk_score: number;
        total_alerts: number;
    };
    transactions: {
        high_risk_count: number;
        medium_risk_count: number;
        low_risk_count: number;
        avg_fraud_score: number;
    };
};

type DetailedMetrics = {
    total_transactions: number;
    total_volume: number;
    average_transaction: number;
    fraud_rate: number;
    high_risk_count: number;
    medium_risk_count: number;
    low_risk_count: number;
    alerts_pending: number;
    alerts_approved: number;
    alerts_rejected: number;
    avg_fraud_score: number;
    max_fraud_score: number;
};

export default function MetricsScreen() {
    const [metrics, setMetrics] = useState<DetailedMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [period, setPeriod] = useState(7);

    useEffect(() => {
        fetchMetrics();
    }, [period]);

    async function fetchMetrics() {
        try {
            // Récupérer les statistiques de fraude
            const { data: fraudData, error: fraudError } = await supabase.rpc('get_fraud_stats', { days_ago: period });
            if (fraudError) throw fraudError;

            // Récupérer le volume total et nombre de transactions
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - period);

            const { data: transactions, error: txError } = await supabase
                .from('transactions')
                .select('amount, fraud_score')
                .gte('created_at', thirtyDaysAgo.toISOString());

            if (txError) throw txError;

            // Calculer les métriques détaillées
            const totalTransactions = transactions?.length || 0;
            const totalVolume = transactions?.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0) || 0;
            const averageTransaction = totalTransactions > 0 ? totalVolume / totalTransactions : 0;

            const stats = fraudData as FraudStats;
            const totalRiskTransactions = (stats.transactions.high_risk_count || 0) + 
                                         (stats.transactions.medium_risk_count || 0) + 
                                         (stats.transactions.low_risk_count || 0);
            const fraudRate = totalTransactions > 0 ? (totalRiskTransactions / totalTransactions) * 100 : 0;

            setMetrics({
                total_transactions: totalTransactions,
                total_volume: totalVolume,
                average_transaction: averageTransaction,
                fraud_rate: fraudRate,
                high_risk_count: stats.transactions.high_risk_count || 0,
                medium_risk_count: stats.transactions.medium_risk_count || 0,
                low_risk_count: stats.transactions.low_risk_count || 0,
                alerts_pending: stats.alerts.pending_count || 0,
                alerts_approved: stats.alerts.approved_count || 0,
                alerts_rejected: stats.alerts.rejected_count || 0,
                avg_fraud_score: stats.transactions.avg_fraud_score || 0,
                max_fraud_score: stats.alerts.max_risk_score || 0,
            });
        } catch (error: any) {
            Alert.alert('Erreur', error.message);
        } finally {
            setLoading(false);
        }
    }

    async function exportLogs() {
        setExporting(true);
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data: transactions, error: txError } = await supabase
                .from('transactions')
                .select('*')
                .gte('created_at', thirtyDaysAgo.toISOString());

            const { data: fraudAlerts, error: fraudError } = await supabase
                .from('fraud_alerts')
                .select('*')
                .gte('created_at', thirtyDaysAgo.toISOString());

            if (txError || fraudError) throw txError || fraudError;

            const exportData = {
                export_date: new Date().toISOString(),
                period: '30_days',
                transactions: transactions || [],
                fraud_alerts: fraudAlerts || [],
            };

            const fileName = `epipay_export_${Date.now()}.json`;
            const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

            await FileSystem.writeAsStringAsync(
                fileUri,
                JSON.stringify(exportData, null, 2)
            );

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri);
                Alert.alert('Succès', 'Export partagé avec succès');
            } else {
                Alert.alert('Succès', `Export enregistré : ${fileName}`);
            }
        } catch (error: any) {
            Alert.alert('Erreur', error.message);
        } finally {
            setExporting(false);
        }
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

    return (
        <ScrollView 
            contentInsetAdjustmentBehavior="automatic"
            style={{ flex: 1, backgroundColor: Colors.systemGroupedBackground }}
            contentContainerStyle={{ padding: 16 }}
        >
            {/* Sélecteur de période */}
            <View style={{ 
                flexDirection: 'row', 
                gap: 8, 
                marginBottom: 16,
                backgroundColor: Colors.secondarySystemGroupedBackground,
                borderRadius: 10,
                padding: 4,
            }}>
                {[7, 30, 90].map((days) => (
                    <TouchableOpacity
                        key={days}
                        style={{
                            flex: 1,
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                            backgroundColor: period === days ? Colors.epitechBlue : 'transparent',
                        }}
                        onPress={() => setPeriod(days)}
                    >
                        <Text style={{
                            color: period === days ? '#fff' : Colors.label,
                            fontWeight: period === days ? '700' : '500',
                            textAlign: 'center',
                            fontSize: 15,
                        }}>
                            {days}j
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {metrics && (
                <>
                    {/* Métriques principales */}
                    <Text style={{ 
                        fontSize: 13, 
                        fontWeight: '700', 
                        textTransform: 'uppercase',
                        color: Colors.secondaryLabel,
                        marginBottom: 8,
                        marginLeft: 4,
                    }}>
                        Vue d'ensemble
                    </Text>

                    <View style={{ gap: 12, marginBottom: 24 }}>
                        <View style={{
                            backgroundColor: Colors.secondarySystemGroupedBackground,
                            borderRadius: 12,
                            borderCurve: 'continuous',
                            padding: 16,
                        }}>
                            <Text style={{ color: Colors.secondaryLabel, fontSize: 13, marginBottom: 4 }}>
                                Total Transactions
                            </Text>
                            <Text style={{
                                fontSize: 32,
                                fontWeight: '700',
                                color: Colors.label,
                                fontVariant: ['tabular-nums'],
                            }}>
                                {metrics.total_transactions}
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{
                                flex: 1,
                                backgroundColor: Colors.secondarySystemGroupedBackground,
                                borderRadius: 12,
                                borderCurve: 'continuous',
                                padding: 16,
                            }}>
                                <Text style={{ color: Colors.secondaryLabel, fontSize: 13, marginBottom: 4 }}>
                                    Volume Total
                                </Text>
                                <Text style={{
                                    fontSize: 24,
                                    fontWeight: '700',
                                    color: Colors.epitechBlue,
                                    fontVariant: ['tabular-nums'],
                                }}>
                                    {metrics.total_volume.toFixed(0)} EPC
                                </Text>
                            </View>

                            <View style={{
                                flex: 1,
                                backgroundColor: Colors.secondarySystemGroupedBackground,
                                borderRadius: 12,
                                borderCurve: 'continuous',
                                padding: 16,
                            }}>
                                <Text style={{ color: Colors.secondaryLabel, fontSize: 13, marginBottom: 4 }}>
                                    Moyenne/TX
                                </Text>
                                <Text style={{
                                    fontSize: 24,
                                    fontWeight: '700',
                                    color: Colors.label,
                                    fontVariant: ['tabular-nums'],
                                }}>
                                    {metrics.average_transaction.toFixed(0)} EPC
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Métriques de fraude */}
                    <Text style={{ 
                        fontSize: 13, 
                        fontWeight: '700', 
                        textTransform: 'uppercase',
                        color: Colors.secondaryLabel,
                        marginBottom: 8,
                        marginLeft: 4,
                    }}>
                        Détection de fraude
                    </Text>

                    <View style={{ gap: 12, marginBottom: 24 }}>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{
                                flex: 1,
                                backgroundColor: Colors.secondarySystemGroupedBackground,
                                borderRadius: 12,
                                borderCurve: 'continuous',
                                padding: 16,
                            }}>
                                <Text style={{ color: Colors.secondaryLabel, fontSize: 13, marginBottom: 4 }}>
                                    Taux de Fraude
                                </Text>
                                <Text style={{
                                    fontSize: 28,
                                    fontWeight: '700',
                                    color: metrics.fraud_rate > 5 ? Colors.systemRed : Colors.systemGreen,
                                    fontVariant: ['tabular-nums'],
                                }}>
                                    {metrics.fraud_rate.toFixed(1)}%
                                </Text>
                            </View>

                            <View style={{
                                flex: 1,
                                backgroundColor: Colors.secondarySystemGroupedBackground,
                                borderRadius: 12,
                                borderCurve: 'continuous',
                                padding: 16,
                            }}>
                                <Text style={{ color: Colors.secondaryLabel, fontSize: 13, marginBottom: 4 }}>
                                    Score Moyen
                                </Text>
                                <Text style={{
                                    fontSize: 28,
                                    fontWeight: '700',
                                    color: metrics.avg_fraud_score > 50 ? Colors.systemOrange : Colors.systemGreen,
                                    fontVariant: ['tabular-nums'],
                                }}>
                                    {metrics.avg_fraud_score.toFixed(1)}
                                </Text>
                            </View>
                        </View>

                        <View style={{
                            backgroundColor: Colors.secondarySystemGroupedBackground,
                            borderRadius: 12,
                            borderCurve: 'continuous',
                            padding: 16,
                            gap: 12,
                        }}>
                            <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.label, marginBottom: 4 }}>
                                Répartition des risques
                            </Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.systemRed }} />
                                    <Text style={{ color: Colors.secondaryLabel, fontSize: 15 }}>Risque élevé</Text>
                                </View>
                                <Text style={{ fontWeight: '700', color: Colors.systemRed, fontSize: 17, fontVariant: ['tabular-nums'] }}>
                                    {metrics.high_risk_count}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.systemOrange }} />
                                    <Text style={{ color: Colors.secondaryLabel, fontSize: 15 }}>Risque moyen</Text>
                                </View>
                                <Text style={{ fontWeight: '700', color: Colors.systemOrange, fontSize: 17, fontVariant: ['tabular-nums'] }}>
                                    {metrics.medium_risk_count}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.systemYellow }} />
                                    <Text style={{ color: Colors.secondaryLabel, fontSize: 15 }}>Risque faible</Text>
                                </View>
                                <Text style={{ fontWeight: '700', color: Colors.systemYellow, fontSize: 17, fontVariant: ['tabular-nums'] }}>
                                    {metrics.low_risk_count}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Alertes */}
                    <Text style={{ 
                        fontSize: 13, 
                        fontWeight: '700', 
                        textTransform: 'uppercase',
                        color: Colors.secondaryLabel,
                        marginBottom: 8,
                        marginLeft: 4,
                    }}>
                        Alertes de fraude
                    </Text>

                    <View style={{
                        backgroundColor: Colors.secondarySystemGroupedBackground,
                        borderRadius: 12,
                        borderCurve: 'continuous',
                        padding: 16,
                        marginBottom: 24,
                        gap: 12,
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <SymbolView name="clock" size={16} tintColor={Colors.systemOrange} />
                                <Text style={{ color: Colors.secondaryLabel, fontSize: 15 }}>En attente</Text>
                            </View>
                            <Text style={{ fontWeight: '700', color: Colors.systemOrange, fontSize: 17, fontVariant: ['tabular-nums'] }}>
                                {metrics.alerts_pending}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <SymbolView name="checkmark.circle" size={16} tintColor={Colors.systemGreen} />
                                <Text style={{ color: Colors.secondaryLabel, fontSize: 15 }}>Approuvées</Text>
                            </View>
                            <Text style={{ fontWeight: '700', color: Colors.systemGreen, fontSize: 17, fontVariant: ['tabular-nums'] }}>
                                {metrics.alerts_approved}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <SymbolView name="xmark.circle" size={16} tintColor={Colors.systemRed} />
                                <Text style={{ color: Colors.secondaryLabel, fontSize: 15 }}>Rejetées</Text>
                            </View>
                            <Text style={{ fontWeight: '700', color: Colors.systemRed, fontSize: 17, fontVariant: ['tabular-nums'] }}>
                                {metrics.alerts_rejected}
                            </Text>
                        </View>
                        {metrics.max_fraud_score > 0 && (
                            <>
                                <View style={{ height: 1, backgroundColor: Colors.separator, marginVertical: 4 }} />
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ color: Colors.secondaryLabel, fontSize: 13 }}>Score max détecté</Text>
                                    <Text style={{ fontWeight: '700', color: Colors.systemRed, fontSize: 17, fontVariant: ['tabular-nums'] }}>
                                        {metrics.max_fraud_score.toFixed(1)}
                                    </Text>
                                </View>
                            </>
                        )}
                    </View>
                </>
            )}

            <TouchableOpacity
                style={{
                    backgroundColor: Colors.epitechBlue,
                    borderRadius: 14,
                    borderCurve: 'continuous',
                    padding: 16,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    marginBottom: 24,
                }}
                onPress={exportLogs}
                disabled={exporting}
            >
                {exporting ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <>
                        <SymbolView name="square.and.arrow.up" size={20} tintColor="#fff" />
                        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', marginLeft: 8 }}>
                            Exporter les logs (30j)
                        </Text>
                    </>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}
