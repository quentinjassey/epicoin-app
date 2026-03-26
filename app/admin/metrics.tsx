import Icon from '@/components/Icon';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '@/constants/NativeColors';
import { useAccessibility } from '@/lib/AccessibilityContext';

type KPIDashboard = {
    // Activité
    total_transactions: number;
    total_volume: number;
    avg_transaction: number;
    transactions_today: number;
    volume_today: number;
    // Utilisateurs
    total_users: number;
    active_users: number; // users with tx in period
    new_users: number;
    avg_balance: number;
    total_balance: number; // masse monétaire en circulation
    // Croissance
    tx_growth: number; // % vs période précédente
    volume_growth: number;
    user_growth: number;
    // Boutique
    total_purchases: number;
    purchase_volume: number;
    avg_purchase: number;
    top_product: string;
    // Transferts
    total_transfers: number;
    transfer_volume: number;
    avg_transfer: number;
    // Rechargements
    total_topups: number;
    topup_volume_eur: number;
    topup_volume_epc: number;
    // Fraude
    fraud_rate: number;
    alerts_pending: number;
    alerts_total: number;
    avg_fraud_score: number;
    blocked_volume: number;
    // Engagement
    tx_per_user: number;
    retention_rate: number; // % users with >1 tx
};

const brutalistCard = {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.black,
    shadowColor: Colors.black,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    padding: 16,
};

export default function MetricsScreen() {
    const { adaptiveColors } = useAccessibility();
    const [kpis, setKpis] = useState<KPIDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [period, setPeriod] = useState(7);

    useEffect(() => {
        fetchKPIs();
    }, [period]);

    async function fetchKPIs() {
        setLoading(true);
        try {
            const now = new Date();
            const periodStart = new Date(now.getTime() - period * 24 * 60 * 60 * 1000);
            const prevPeriodStart = new Date(periodStart.getTime() - period * 24 * 60 * 60 * 1000);
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            // Fetch all data in parallel
            const [txResult, prevTxResult, todayTxResult, usersResult, newUsersResult, alertsResult, productsResult] = await Promise.all([
                // Current period transactions
                supabase.from('transactions').select('amount, type, status, sender_id, receiver_id, fraud_score, metadata').gte('created_at', periodStart.toISOString()),
                // Previous period transactions (for growth)
                supabase.from('transactions').select('amount, type').gte('created_at', prevPeriodStart.toISOString()).lt('created_at', periodStart.toISOString()),
                // Today's transactions
                supabase.from('transactions').select('amount').gte('created_at', todayStart.toISOString()),
                // All users
                supabase.from('profiles').select('id, balance, created_at'),
                // New users in period
                supabase.from('profiles').select('id').gte('created_at', periodStart.toISOString()),
                // Fraud alerts
                supabase.from('fraud_alerts').select('status, risk_score, transaction_id').gte('created_at', periodStart.toISOString()),
                // Products for top product
                supabase.from('products').select('name, stock_quantity'),
            ]);

            const txs = txResult.data || [];
            const prevTxs = prevTxResult.data || [];
            const todayTxs = todayTxResult.data || [];
            const users = usersResult.data || [];
            const newUsers = newUsersResult.data || [];
            const alerts = alertsResult.data || [];

            // Activité
            const totalVolume = txs.reduce((s, t) => s + parseFloat(t.amount || '0'), 0);
            const prevVolume = prevTxs.reduce((s, t) => s + parseFloat(t.amount || '0'), 0);
            const todayVolume = todayTxs.reduce((s, t) => s + parseFloat(t.amount || '0'), 0);

            // Par type
            const purchases = txs.filter(t => t.type === 'purchase' || t.type === 'payment');
            const transfers = txs.filter(t => t.type === 'transfer');
            const topups = txs.filter(t => t.type === 'topup' || t.type === 'top_up');

            const purchaseVol = purchases.reduce((s, t) => s + parseFloat(t.amount || '0'), 0);
            const transferVol = transfers.reduce((s, t) => s + parseFloat(t.amount || '0'), 0);
            const topupVol = topups.reduce((s, t) => s + parseFloat(t.amount || '0'), 0);

            // Top product
            const productCounts: Record<string, number> = {};
            purchases.forEach(t => {
                const name = t.metadata?.product_name || 'Inconnu';
                productCounts[name] = (productCounts[name] || 0) + 1;
            });
            const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

            // Users actifs (unique senders/receivers)
            const activeUserIds = new Set<string>();
            txs.forEach(t => { if (t.sender_id) activeUserIds.add(t.sender_id); if (t.receiver_id) activeUserIds.add(t.receiver_id); });

            // Balances
            const totalBalance = users.reduce((s, u) => s + parseFloat(u.balance || '0'), 0);
            const avgBalance = users.length > 0 ? totalBalance / users.length : 0;

            // Croissance
            const txGrowth = prevTxs.length > 0 ? ((txs.length - prevTxs.length) / prevTxs.length) * 100 : 0;
            const volGrowth = prevVolume > 0 ? ((totalVolume - prevVolume) / prevVolume) * 100 : 0;

            // Users with previous period
            const prevNewUsersResult = await supabase.from('profiles').select('id').gte('created_at', prevPeriodStart.toISOString()).lt('created_at', periodStart.toISOString());
            const prevNewUsers = prevNewUsersResult.data || [];
            const userGrowth = prevNewUsers.length > 0 ? ((newUsers.length - prevNewUsers.length) / prevNewUsers.length) * 100 : 0;

            // Fraude
            const blockedTxs = txs.filter(t => t.status === 'failed' && t.fraud_score > 50);
            const blockedVol = blockedTxs.reduce((s, t) => s + parseFloat(t.amount || '0'), 0);
            const fraudScores = txs.filter(t => t.fraud_score > 0).map(t => t.fraud_score);
            const avgFraudScore = fraudScores.length > 0 ? fraudScores.reduce((s, v) => s + v, 0) / fraudScores.length : 0;
            const fraudRate = txs.length > 0 ? (blockedTxs.length / txs.length) * 100 : 0;

            // Engagement
            const txPerUser = activeUserIds.size > 0 ? txs.length / activeUserIds.size : 0;
            const usersWithMultipleTx = new Map<string, number>();
            txs.forEach(t => {
                if (t.sender_id) usersWithMultipleTx.set(t.sender_id, (usersWithMultipleTx.get(t.sender_id) || 0) + 1);
            });
            const retainedUsers = Array.from(usersWithMultipleTx.values()).filter(c => c > 1).length;
            const retentionRate = usersWithMultipleTx.size > 0 ? (retainedUsers / usersWithMultipleTx.size) * 100 : 0;

            setKpis({
                total_transactions: txs.length,
                total_volume: totalVolume,
                avg_transaction: txs.length > 0 ? totalVolume / txs.length : 0,
                transactions_today: todayTxs.length,
                volume_today: todayVolume,
                total_users: users.length,
                active_users: activeUserIds.size,
                new_users: newUsers.length,
                avg_balance: avgBalance,
                total_balance: totalBalance,
                tx_growth: txGrowth,
                volume_growth: volGrowth,
                user_growth: userGrowth,
                total_purchases: purchases.length,
                purchase_volume: purchaseVol,
                avg_purchase: purchases.length > 0 ? purchaseVol / purchases.length : 0,
                top_product: topProduct,
                total_transfers: transfers.length,
                transfer_volume: transferVol,
                avg_transfer: transfers.length > 0 ? transferVol / transfers.length : 0,
                total_topups: topups.length,
                topup_volume_eur: topupVol / 5, // 1€ = 5 EPC
                topup_volume_epc: topupVol,
                fraud_rate: fraudRate,
                alerts_pending: alerts.filter(a => a.status === 'pending').length,
                alerts_total: alerts.length,
                avg_fraud_score: avgFraudScore,
                blocked_volume: blockedVol,
                tx_per_user: txPerUser,
                retention_rate: retentionRate,
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
            const periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const [txResult, alertResult] = await Promise.all([
                supabase.from('transactions').select('*').gte('created_at', periodStart.toISOString()),
                supabase.from('fraud_alerts').select('*').gte('created_at', periodStart.toISOString()),
            ]);

            const exportData = {
                export_date: new Date().toISOString(),
                period: '30_days',
                kpis,
                transactions: txResult.data || [],
                fraud_alerts: alertResult.data || [],
            };

            const fileName = `epipay_kpi_export_${Date.now()}.json`;
            const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
            await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(exportData, null, 2));

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri);
            }
        } catch (error: any) {
            Alert.alert('Erreur', error.message);
        } finally {
            setExporting(false);
        }
    }

    function GrowthBadge({ value }: { value: number }) {
        const isPositive = value >= 0;
        return (
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isPositive ? adaptiveColors.success : adaptiveColors.error,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderWidth: 1,
                borderColor: Colors.black,
            }}>
                <Icon name={isPositive ? 'arrow.up.circle.fill' : 'arrow.down.circle.fill'} size={12} color={Colors.white} />
                <Text style={{ color: Colors.white, fontSize: 11, fontWeight: '900', marginLeft: 4 }}>
                    {isPositive ? '+' : ''}{value.toFixed(1)}%
                </Text>
            </View>
        );
    }

    function KPICard({ label, value, unit, color, growth }: { label: string; value: string; unit?: string; color?: string; growth?: number }) {
        return (
            <View style={{ ...brutalistCard, flex: 1 }}>
                <Text style={{ color: Colors.secondaryLabel, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                    {label}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: color || Colors.black, fontVariant: ['tabular-nums'] }}>
                        {value}
                    </Text>
                    {unit && <Text style={{ fontSize: 13, fontWeight: '800', color: Colors.mediumGray, marginLeft: 4 }}>{unit}</Text>}
                </View>
                {growth !== undefined && (
                    <View style={{ marginTop: 6 }}>
                        <GrowthBadge value={growth} />
                    </View>
                )}
            </View>
        );
    }

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.white }}>
                <ActivityIndicator size="large" color={adaptiveColors.primary} />
            </View>
        );
    }

    if (!kpis) return null;

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={{ flex: 1, backgroundColor: Colors.white }}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        >
            {/* Période */}
            <View style={{
                flexDirection: 'row', gap: 8, marginBottom: 16,
                backgroundColor: Colors.offWhite, padding: 4, borderWidth: 2, borderColor: Colors.black,
            }}>
                {[7, 30, 90].map((days) => (
                    <TouchableOpacity
                        key={days}
                        style={{
                            flex: 1, paddingVertical: 8, paddingHorizontal: 12,
                            backgroundColor: period === days ? adaptiveColors.primary : 'transparent',
                            borderWidth: period === days ? 2 : 0, borderColor: Colors.black,
                        }}
                        onPress={() => setPeriod(days)}
                    >
                        <Text style={{ color: period === days ? Colors.white : Colors.black, fontWeight: '900', textAlign: 'center', fontSize: 15, textTransform: 'uppercase' }}>
                            {days}j
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* ── ACTIVITE GLOBALE ── */}
            <Text style={{ fontSize: 12, fontWeight: '900', color: Colors.black, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                Activite globale
            </Text>
            <View style={{ gap: 10, marginBottom: 20 }}>
                <View style={{ ...brutalistCard }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                            <Text style={{ color: Colors.secondaryLabel, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>Transactions totales</Text>
                            <Text style={{ fontSize: 36, fontWeight: '900', color: Colors.black, fontVariant: ['tabular-nums'] }}>{kpis.total_transactions}</Text>
                        </View>
                        <GrowthBadge value={kpis.tx_growth} />
                    </View>
                    <View style={{ height: 2, backgroundColor: Colors.lightGray, marginVertical: 10 }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: Colors.mediumGray, fontWeight: '700', fontSize: 13 }}>Aujourd'hui</Text>
                        <Text style={{ fontWeight: '900', color: adaptiveColors.primary, fontSize: 15 }}>{kpis.transactions_today} tx ({kpis.volume_today.toFixed(0)} EPC)</Text>
                    </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <KPICard label="Volume total" value={kpis.total_volume.toFixed(0)} unit="EPC" color={adaptiveColors.primary} growth={kpis.volume_growth} />
                    <KPICard label="Moyenne / TX" value={kpis.avg_transaction.toFixed(1)} unit="EPC" />
                </View>
            </View>

            {/* ── UTILISATEURS ── */}
            <Text style={{ fontSize: 12, fontWeight: '900', color: Colors.black, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                Utilisateurs
            </Text>
            <View style={{ gap: 10, marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <KPICard label="Total users" value={kpis.total_users.toString()} color={adaptiveColors.primary} />
                    <KPICard label="Actifs" value={kpis.active_users.toString()} color={adaptiveColors.success} />
                    <KPICard label="Nouveaux" value={kpis.new_users.toString()} color={adaptiveColors.accent} growth={kpis.user_growth} />
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <KPICard label="Solde moyen" value={kpis.avg_balance.toFixed(0)} unit="EPC" />
                    <KPICard label="Masse monetaire" value={kpis.total_balance.toFixed(0)} unit="EPC" color={adaptiveColors.primary} />
                </View>
            </View>

            {/* ── ENGAGEMENT ── */}
            <Text style={{ fontSize: 12, fontWeight: '900', color: Colors.black, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                Engagement
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                <KPICard label="TX / Utilisateur" value={kpis.tx_per_user.toFixed(1)} />
                <KPICard label="Taux retention" value={kpis.retention_rate.toFixed(0)} unit="%" color={kpis.retention_rate > 50 ? adaptiveColors.success : adaptiveColors.warning} />
            </View>

            {/* ── BOUTIQUE ── */}
            <Text style={{ fontSize: 12, fontWeight: '900', color: Colors.black, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                Boutique
            </Text>
            <View style={{ gap: 10, marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <KPICard label="Achats" value={kpis.total_purchases.toString()} />
                    <KPICard label="Volume achats" value={kpis.purchase_volume.toFixed(0)} unit="EPC" color={adaptiveColors.accent} />
                </View>
                <View style={{ ...brutalistCard, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Text style={{ color: Colors.secondaryLabel, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>Produit le plus vendu</Text>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: Colors.black, marginTop: 4 }}>{kpis.top_product}</Text>
                    </View>
                    <Icon name="cart.fill" size={24} color={adaptiveColors.accent} />
                </View>
            </View>

            {/* ── TRANSFERTS P2P ── */}
            <Text style={{ fontSize: 12, fontWeight: '900', color: Colors.black, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                Transferts P2P
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                <KPICard label="Transferts" value={kpis.total_transfers.toString()} />
                <KPICard label="Volume" value={kpis.transfer_volume.toFixed(0)} unit="EPC" color={adaptiveColors.primary} />
                <KPICard label="Moy. transfert" value={kpis.avg_transfer.toFixed(1)} unit="EPC" />
            </View>

            {/* ── RECHARGEMENTS ── */}
            <Text style={{ fontSize: 12, fontWeight: '900', color: Colors.black, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                Rechargements (Stripe)
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                <KPICard label="Rechargements" value={kpis.total_topups.toString()} />
                <KPICard label="CA Stripe" value={kpis.topup_volume_eur.toFixed(0)} unit="EUR" color={adaptiveColors.success} />
                <KPICard label="EPC emis" value={kpis.topup_volume_epc.toFixed(0)} unit="EPC" />
            </View>

            {/* ── FRAUDE & SECURITE ── */}
            <Text style={{ fontSize: 12, fontWeight: '900', color: Colors.black, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                Fraude & securite
            </Text>
            <View style={{ gap: 10, marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <KPICard label="Taux fraude" value={kpis.fraud_rate.toFixed(1)} unit="%" color={kpis.fraud_rate > 5 ? adaptiveColors.error : adaptiveColors.success} />
                    <KPICard label="Score moyen" value={kpis.avg_fraud_score.toFixed(0)} unit="/100" color={kpis.avg_fraud_score > 50 ? adaptiveColors.warning : adaptiveColors.success} />
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <KPICard label="Alertes en attente" value={kpis.alerts_pending.toString()} color={kpis.alerts_pending > 0 ? adaptiveColors.warning : adaptiveColors.success} />
                    <KPICard label="Volume bloque" value={kpis.blocked_volume.toFixed(0)} unit="EPC" color={adaptiveColors.error} />
                </View>
            </View>

            {/* Export */}
            <TouchableOpacity
                style={{
                    backgroundColor: adaptiveColors.primary,
                    padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
                    marginBottom: 24, borderWidth: 2, borderColor: Colors.black,
                    shadowColor: Colors.black, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0,
                }}
                onPress={exportLogs}
                disabled={exporting}
            >
                {exporting ? <ActivityIndicator color={Colors.white} /> : (
                    <>
                        <Icon name="square.and.arrow.up" size={20} color={Colors.white} />
                        <Text style={{ color: Colors.white, fontSize: 15, fontWeight: '900', marginLeft: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Exporter les KPI + logs
                        </Text>
                    </>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}
