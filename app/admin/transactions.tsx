import { SymbolView } from 'expo-symbols';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '@/constants/NativeColors';

type Transaction = {
    id: string;
    type: 'transfer' | 'top_up' | 'payment';
    amount: number;
    status: string;
    created_at: string;
    fraud_score?: number;
    fraud_features?: Record<string, any>;
    sender?: { email: string; full_name: string };
    receiver?: { email: string; full_name: string };
};

export default function AdminTransactions() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchTransactions();
    }, []);

    async function fetchTransactions() {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select(`
                    id,
                    type,
                    amount,
                    status,
                    created_at,
                    fraud_score,
                    fraud_features,
                    sender:sender_id(email, full_name),
                    receiver:receiver_id(email, full_name)
                `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            setTransactions(data || []);
        } catch (error: any) {
            Alert.alert('Erreur', error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    function onRefresh() {
        setRefreshing(true);
        fetchTransactions();
    }

    function getTypeLabel(type: string) {
        switch (type) {
            case 'transfer': return { 
                label: 'Transfert', 
                bg: 'rgba(59, 130, 246, 0.15)', 
                color: Colors.systemBlue 
            };
            case 'top_up': return { 
                label: 'Rechargement', 
                bg: 'rgba(16, 185, 129, 0.15)', 
                color: Colors.systemGreen 
            };
            case 'payment': return { 
                label: 'Paiement', 
                bg: 'rgba(139, 92, 246, 0.15)', 
                color: Colors.systemPurple 
            };
            default: return { 
                label: type, 
                bg: Colors.systemFill, 
                color: Colors.secondaryLabel 
            };
        }
    }

    function getStatusLabel(status: string) {
        switch (status) {
            case 'completed': return { 
                label: 'Complété', 
                bg: 'rgba(16, 185, 129, 0.15)', 
                color: Colors.systemGreen 
            };
            case 'pending': 
            case 'pending_review': return { 
                label: 'En attente', 
                bg: 'rgba(245, 158, 11, 0.15)', 
                color: Colors.systemOrange 
            };
            case 'failed': return { 
                label: 'Échoué', 
                bg: 'rgba(239, 68, 68, 0.15)', 
                color: Colors.systemRed 
            };
            default: return { 
                label: status, 
                bg: Colors.systemFill, 
                color: Colors.secondaryLabel 
            };
        }
    }

    function getFraudRiskLevel(score?: number) {
        if (score === undefined || score === null) return { 
            label: 'N/A', 
            bg: Colors.systemFill, 
            color: Colors.tertiaryLabel 
        };
        if (score <= 30) return { 
            label: 'Faible', 
            bg: 'rgba(16, 185, 129, 0.15)', 
            color: Colors.systemGreen 
        };
        if (score <= 70) return { 
            label: 'Moyen', 
            bg: 'rgba(245, 158, 11, 0.15)', 
            color: Colors.systemOrange 
        };
        return { 
            label: 'Élevé', 
            bg: 'rgba(239, 68, 68, 0.15)', 
            color: Colors.systemRed 
        };
    }

    const totalAmount = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);

    return (
        <View style={{ flex: 1, backgroundColor: Colors.systemGroupedBackground }}>
            {/* Stats */}
            <View style={{ padding: 16, flexDirection: 'row', gap: 12 }}>
                <View style={{
                    flex: 1,
                    backgroundColor: Colors.secondarySystemGroupedBackground,
                    padding: 16,
                    borderRadius: 12,
                    borderCurve: 'continuous',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                }}>
                    <Text style={{ color: Colors.secondaryLabel, fontSize: 13, marginBottom: 4 }}>
                        Transactions
                    </Text>
                    <Text style={{
                        fontSize: 24,
                        fontWeight: '700',
                        color: Colors.label,
                        fontVariant: ['tabular-nums'],
                    }}>
                        {transactions.length}
                    </Text>
                </View>
                <View style={{
                    flex: 1,
                    backgroundColor: Colors.secondarySystemGroupedBackground,
                    padding: 16,
                    borderRadius: 12,
                    borderCurve: 'continuous',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                }}>
                    <Text style={{ color: Colors.secondaryLabel, fontSize: 13, marginBottom: 4 }}>
                        Volume total
                    </Text>
                    <Text style={{
                        fontSize: 24,
                        fontWeight: '700',
                        color: Colors.epitechBlue,
                        fontVariant: ['tabular-nums'],
                    }}>
                        {totalAmount.toFixed(0)} EPC
                    </Text>
                </View>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={Colors.epitechBlue} />
                </View>
            ) : (
                <FlatList
                    data={transactions}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 16, paddingTop: 0 }}
                    refreshControl={
                        <RefreshControl 
                            refreshing={refreshing} 
                            onRefresh={onRefresh}
                            tintColor={Colors.epitechBlue}
                        />
                    }
                    renderItem={({ item }) => {
                        const typeInfo = getTypeLabel(item.type);
                        const statusInfo = getStatusLabel(item.status);
                        const fraudInfo = getFraudRiskLevel(item.fraud_score);
                        const hasML = item.fraud_features && Object.keys(item.fraud_features).length > 0;

                        return (
                            <View style={{
                                backgroundColor: Colors.secondarySystemGroupedBackground,
                                padding: 16,
                                borderRadius: 12,
                                borderCurve: 'continuous',
                                marginBottom: 12,
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                    <View style={{
                                        backgroundColor: typeInfo.bg,
                                        paddingHorizontal: 10,
                                        paddingVertical: 4,
                                        borderRadius: 8,
                                        borderCurve: 'continuous',
                                        marginRight: 8,
                                    }}>
                                        <Text style={{
                                            color: typeInfo.color,
                                            fontSize: 11,
                                            fontWeight: '700',
                                            textTransform: 'uppercase',
                                        }}>
                                            {typeInfo.label}
                                        </Text>
                                    </View>
                                    <View style={{
                                        backgroundColor: statusInfo.bg,
                                        paddingHorizontal: 10,
                                        paddingVertical: 4,
                                        borderRadius: 8,
                                        borderCurve: 'continuous',
                                    }}>
                                        <Text style={{
                                            color: statusInfo.color,
                                            fontSize: 11,
                                            fontWeight: '700',
                                        }}>
                                            {statusInfo.label}
                                        </Text>
                                    </View>
                                </View>

                                <View style={{ gap: 8 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={{ color: Colors.secondaryLabel, fontSize: 14 }}>Montant</Text>
                                        <Text style={{
                                            fontWeight: '700',
                                            color: Colors.epitechBlue,
                                            fontSize: 16,
                                            fontVariant: ['tabular-nums'],
                                        }}>
                                            {item.amount.toFixed(2)} EPC
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={{ color: Colors.secondaryLabel, fontSize: 14 }}>De</Text>
                                        <Text style={{ color: Colors.label, fontSize: 13 }} numberOfLines={1}>
                                            {item.sender?.full_name || 'N/A'}
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={{ color: Colors.secondaryLabel, fontSize: 14 }}>À</Text>
                                        <Text style={{ color: Colors.label, fontSize: 13 }} numberOfLines={1}>
                                            {item.receiver?.full_name || 'N/A'}
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={{ color: Colors.secondaryLabel, fontSize: 14 }}>Date</Text>
                                        <Text style={{ color: Colors.label, fontSize: 13 }}>
                                            {format(new Date(item.created_at), "d MMM 'à' HH:mm", { locale: fr })}
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: Colors.secondaryLabel, fontSize: 14 }}>Risque fraude</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            {item.fraud_score !== undefined && item.fraud_score !== null && (
                                                <Text style={{
                                                    color: Colors.label,
                                                    fontSize: 13,
                                                    fontWeight: '700',
                                                    fontVariant: ['tabular-nums'],
                                                }}>
                                                    {item.fraud_score.toFixed(0)}
                                                </Text>
                                            )}
                                            <View style={{
                                                backgroundColor: fraudInfo.bg,
                                                paddingHorizontal: 8,
                                                paddingVertical: 2,
                                                borderRadius: 6,
                                                borderCurve: 'continuous',
                                            }}>
                                                <Text style={{
                                                    color: fraudInfo.color,
                                                    fontSize: 11,
                                                    fontWeight: '600',
                                                }}>
                                                    {fraudInfo.label}
                                                </Text>
                                            </View>
                                            {hasML && (
                                                <View style={{
                                                    backgroundColor: 'rgba(139, 92, 246, 0.15)',
                                                    paddingHorizontal: 6,
                                                    paddingVertical: 2,
                                                    borderRadius: 6,
                                                    borderCurve: 'continuous',
                                                }}>
                                                    <Text style={{
                                                        color: Colors.systemPurple,
                                                        fontSize: 10,
                                                        fontWeight: '700',
                                                    }}>
                                                        ML
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            </View>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={{
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 80,
                        }}>
                            <SymbolView name="doc.text" size={48} tintColor={Colors.tertiaryLabel} />
                            <Text style={{
                                color: Colors.secondaryLabel,
                                fontSize: 17,
                                marginTop: 16,
                            }}>
                                Aucune transaction
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
