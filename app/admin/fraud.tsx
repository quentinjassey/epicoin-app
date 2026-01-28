import { SymbolView } from 'expo-symbols';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '@/constants/NativeColors';

type FraudAlert = {
    id: string;
    risk_score: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    fraud_features: Record<string, any>;
    transactions: {
        id: string;
        amount: number;
        transaction_type?: string;
        direction?: string;
        country?: string;
        city?: string;
        provider?: string;
        fraud_score?: number;
        fraud_features?: Record<string, any>;
        sender: { email: string; full_name: string };
        receiver: { email: string; full_name: string };
    };
};

export default function FraudAlertsScreen() {
    const [alerts, setAlerts] = useState<FraudAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        fetchAlerts();
    }, []);

    async function fetchAlerts() {
        try {
            const { data, error } = await supabase
                .from('fraud_alerts')
                .select(`
                    *,
                    transactions (
                        id,
                        amount,
                        transaction_type,
                        direction,
                        country,
                        city,
                        provider,
                        fraud_score,
                        fraud_features,
                        sender:sender_id(email, full_name),
                        receiver:receiver_id(email, full_name)
                    )
                `)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAlerts(data as any);
        } catch (error: any) {
            Alert.alert('Erreur', error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    function onRefresh() {
        setRefreshing(true);
        fetchAlerts();
    }

    async function handleDecision(alertId: string, transactionId: string, decision: 'approved' | 'rejected') {
        const actionLabel = decision === 'approved' ? 'approuver' : 'rejeter';
        
        Alert.alert(
            decision === 'approved' ? 'Approuver la transaction' : 'Rejeter la transaction',
            `Êtes-vous sûr de vouloir ${actionLabel} cette transaction ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: decision === 'approved' ? 'Approuver' : 'Rejeter',
                    style: decision === 'approved' ? 'default' : 'destructive',
                    onPress: () => processDecision(alertId, transactionId, decision)
                }
            ]
        );
    }

    async function processDecision(alertId: string, transactionId: string, decision: 'approved' | 'rejected') {
        setProcessing(alertId);
        
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Utilisateur non authentifié');
            }

            const functionName = decision === 'approved' ? 'approve_fraud_alert' : 'reject_fraud_alert';
            const { data, error } = await supabase.rpc(functionName, {
                p_alert_id: alertId,
                p_admin_id: user.id,
                p_notes: decision === 'approved' 
                    ? 'Transaction approuvée manuellement' 
                    : 'Transaction rejetée manuellement'
            });

            if (error) throw error;
            
            if (!data.success) {
                throw new Error(data.message || 'Erreur lors du traitement');
            }

            Alert.alert(
                'Succès', 
                decision === 'approved' 
                    ? 'Transaction approuvée et exécutée avec succès' 
                    : 'Transaction rejetée et utilisateur remboursé si nécessaire'
            );
            fetchAlerts();
        } catch (error: any) {
            Alert.alert('Erreur', error.message);
        } finally {
            setProcessing(null);
        }
    }

    function getRiskLevel(score: number) {
        if (score >= 80) return { 
            label: 'Critique', 
            bg: 'rgba(239, 68, 68, 0.15)', 
            color: Colors.systemRed 
        };
        if (score >= 60) return { 
            label: 'Élevé', 
            bg: 'rgba(245, 158, 11, 0.15)', 
            color: Colors.systemOrange 
        };
        if (score >= 40) return { 
            label: 'Moyen', 
            bg: 'rgba(251, 191, 36, 0.15)', 
            color: Colors.systemYellow 
        };
        return { 
            label: 'Faible', 
            bg: 'rgba(16, 185, 129, 0.15)', 
            color: Colors.systemGreen 
        };
    }

    const renderItem = ({ item }: { item: FraudAlert }) => {
        const risk = getRiskLevel(item.risk_score);
        const isProcessing = processing === item.id;

        return (
            <View style={{
                backgroundColor: Colors.secondarySystemGroupedBackground,
                padding: 16,
                borderRadius: 16,
                borderCurve: 'continuous',
                marginBottom: 12,
                borderWidth: 2,
                borderColor: risk.color,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            }}>
                <TouchableOpacity
                    onPress={() => router.push(`/admin/fraud-detail?id=${item.id}`)}
                    style={{ marginBottom: 16 }}
                >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{
                            backgroundColor: risk.bg,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 12,
                            borderCurve: 'continuous',
                        }}>
                            <Text style={{
                                color: risk.color,
                                fontSize: 13,
                                fontWeight: '700',
                                textTransform: 'uppercase',
                            }}>
                                {risk.label}
                            </Text>
                        </View>
                        <Text style={{
                            fontSize: 24,
                            fontWeight: '700',
                            color: risk.color,
                            fontVariant: ['tabular-nums'],
                        }}>
                            {item.risk_score}/100
                        </Text>
                    </View>

                    <View style={{ gap: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: Colors.secondaryLabel, fontSize: 14 }}>Montant</Text>
                            <Text style={{ fontWeight: '700', color: Colors.label, fontSize: 15, fontVariant: ['tabular-nums'] }}>
                                {item.transactions.amount.toFixed(2)} EPC
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: Colors.secondaryLabel, fontSize: 14 }}>De</Text>
                            <Text style={{ color: Colors.label, fontSize: 14 }}>
                                {item.transactions.sender?.full_name || 'N/A'}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: Colors.secondaryLabel, fontSize: 14 }}>À</Text>
                            <Text style={{ color: Colors.label, fontSize: 14 }}>
                                {item.transactions.receiver?.full_name || 'N/A'}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: Colors.secondaryLabel, fontSize: 14 }}>Date</Text>
                            <Text style={{ color: Colors.label, fontSize: 14 }}>
                                {format(new Date(item.created_at), "d MMM 'à' HH:mm", { locale: fr })}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <TouchableOpacity
                        style={{
                            flex: 1,
                            backgroundColor: Colors.systemGreen,
                            borderRadius: 12,
                            borderCurve: 'continuous',
                            padding: 12,
                            alignItems: 'center',
                            flexDirection: 'row',
                            justifyContent: 'center',
                        }}
                        onPress={() => handleDecision(item.id, item.transactions.id, 'approved')}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <SymbolView name="checkmark.circle.fill" size={18} tintColor="#fff" />
                                <Text style={{ color: '#fff', fontWeight: '700', marginLeft: 8, fontSize: 15 }}>
                                    Approuver
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{
                            flex: 1,
                            backgroundColor: Colors.systemRed,
                            borderRadius: 12,
                            borderCurve: 'continuous',
                            padding: 12,
                            alignItems: 'center',
                            flexDirection: 'row',
                            justifyContent: 'center',
                        }}
                        onPress={() => handleDecision(item.id, item.transactions.id, 'rejected')}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <SymbolView name="xmark.circle.fill" size={18} tintColor="#fff" />
                                <Text style={{ color: '#fff', fontWeight: '700', marginLeft: 8, fontSize: 15 }}>
                                    Rejeter
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

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
        <View style={{ flex: 1, backgroundColor: Colors.systemGroupedBackground }}>
            <FlatList
                data={alerts}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={{ padding: 16 }}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={onRefresh}
                        tintColor={Colors.epitechBlue}
                    />
                }
                ListEmptyComponent={
                    <View style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 80,
                    }}>
                        <View style={{
                            backgroundColor: Colors.systemFill,
                            padding: 24,
                            borderRadius: 48,
                            borderCurve: 'continuous',
                            marginBottom: 16,
                        }}>
                            <SymbolView name="checkmark.shield.fill" size={48} tintColor={Colors.systemGreen} />
                        </View>
                        <Text style={{
                            color: Colors.secondaryLabel,
                            fontSize: 17,
                            fontWeight: '600',
                        }}>
                            Aucune alerte en attente
                        </Text>
                    </View>
                }
            />
        </View>
    );
}
