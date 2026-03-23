import Icon from '@/components/Icon';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '@/constants/NativeColors';
import { useAccessibility } from '@/lib/AccessibilityContext';

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
    const { adaptiveColors } = useAccessibility();
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
                color: adaptiveColors.primary,
            };
            case 'top_up': return {
                label: 'Rechargement',
                color: adaptiveColors.success,
            };
            case 'payment': return {
                label: 'Paiement',
                color: adaptiveColors.accent,
            };
            default: return {
                label: type,
                color: Colors.secondaryLabel,
            };
        }
    }

    function getStatusLabel(status: string) {
        switch (status) {
            case 'completed': return {
                label: 'Complété',
                color: adaptiveColors.success,
            };
            case 'pending':
            case 'pending_review': return {
                label: 'En attente',
                color: adaptiveColors.warning,
            };
            case 'failed': return {
                label: 'Échoué',
                color: adaptiveColors.error,
            };
            default: return {
                label: status,
                color: Colors.secondaryLabel,
            };
        }
    }

    function getFraudRiskLevel(score?: number) {
        if (score === undefined || score === null) return {
            label: 'N/A',
            color: Colors.tertiaryLabel,
        };
        if (score <= 30) return {
            label: 'Faible',
            color: adaptiveColors.success,
        };
        if (score <= 70) return {
            label: 'Moyen',
            color: adaptiveColors.warning,
        };
        return {
            label: 'Élevé',
            color: adaptiveColors.error,
        };
    }

    const totalAmount = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);

    return (
        <View style={{ flex: 1, backgroundColor: Colors.white }}>
            {/* Stats */}
            <View style={{ padding: 16, flexDirection: 'row', gap: 12 }}>
                <View style={{
                    flex: 1,
                    backgroundColor: Colors.white,
                    padding: 16,
                    borderRadius: 0,
                    borderWidth: 2,
                    borderColor: Colors.black,
                    shadowColor: Colors.black,
                    shadowOffset: { width: 3, height: 3 },
                    shadowOpacity: 1,
                    shadowRadius: 0,
                }}>
                    <Text style={{ color: Colors.secondaryLabel, fontSize: 13, marginBottom: 4, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
                        Transactions
                    </Text>
                    <Text style={{
                        fontSize: 24,
                        fontWeight: '900',
                        color: Colors.black,
                        fontVariant: ['tabular-nums'],
                    }}>
                        {transactions.length}
                    </Text>
                </View>
                <View style={{
                    flex: 1,
                    backgroundColor: Colors.white,
                    padding: 16,
                    borderRadius: 0,
                    borderWidth: 2,
                    borderColor: Colors.black,
                    shadowColor: Colors.black,
                    shadowOffset: { width: 3, height: 3 },
                    shadowOpacity: 1,
                    shadowRadius: 0,
                }}>
                    <Text style={{ color: Colors.secondaryLabel, fontSize: 13, marginBottom: 4, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
                        Volume total
                    </Text>
                    <Text style={{
                        fontSize: 24,
                        fontWeight: '900',
                        color: adaptiveColors.primary,
                        fontVariant: ['tabular-nums'],
                    }}>
                        {totalAmount.toFixed(0)} EPC
                    </Text>
                </View>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={adaptiveColors.primary} />
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
                            tintColor={adaptiveColors.primary}
                        />
                    }
                    renderItem={({ item }) => {
                        const typeInfo = getTypeLabel(item.type);
                        const statusInfo = getStatusLabel(item.status);
                        const fraudInfo = getFraudRiskLevel(item.fraud_score);
                        const hasML = item.fraud_features && Object.keys(item.fraud_features).length > 0;

                        return (
                            <View style={{
                                backgroundColor: Colors.white,
                                padding: 16,
                                borderRadius: 0,
                                marginBottom: 12,
                                borderWidth: 2,
                                borderColor: Colors.black,
                                shadowColor: Colors.black,
                                shadowOffset: { width: 3, height: 3 },
                                shadowOpacity: 1,
                                shadowRadius: 0,
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                    <View style={{
                                        backgroundColor: Colors.offWhite,
                                        paddingHorizontal: 10,
                                        paddingVertical: 4,
                                        borderRadius: 0,
                                        marginRight: 8,
                                        borderWidth: 2,
                                        borderColor: typeInfo.color,
                                    }}>
                                        <Text style={{
                                            color: typeInfo.color,
                                            fontSize: 11,
                                            fontWeight: '900',
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.5,
                                        }}>
                                            {typeInfo.label}
                                        </Text>
                                    </View>
                                    <View style={{
                                        backgroundColor: Colors.offWhite,
                                        paddingHorizontal: 10,
                                        paddingVertical: 4,
                                        borderRadius: 0,
                                        borderWidth: 2,
                                        borderColor: statusInfo.color,
                                    }}>
                                        <Text style={{
                                            color: statusInfo.color,
                                            fontSize: 11,
                                            fontWeight: '900',
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.5,
                                        }}>
                                            {statusInfo.label}
                                        </Text>
                                    </View>
                                </View>

                                <View style={{ gap: 8 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={{ color: Colors.secondaryLabel, fontSize: 14, fontWeight: '700' }}>Montant</Text>
                                        <Text style={{
                                            fontWeight: '900',
                                            color: adaptiveColors.primary,
                                            fontSize: 16,
                                            fontVariant: ['tabular-nums'],
                                        }}>
                                            {item.amount.toFixed(2)} EPC
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={{ color: Colors.secondaryLabel, fontSize: 14, fontWeight: '700' }}>De</Text>
                                        <Text style={{ color: Colors.black, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
                                            {item.sender?.full_name || 'N/A'}
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={{ color: Colors.secondaryLabel, fontSize: 14, fontWeight: '700' }}>À</Text>
                                        <Text style={{ color: Colors.black, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
                                            {item.receiver?.full_name || 'N/A'}
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={{ color: Colors.secondaryLabel, fontSize: 14, fontWeight: '700' }}>Date</Text>
                                        <Text style={{ color: Colors.black, fontSize: 13, fontWeight: '700' }}>
                                            {format(new Date(item.created_at), "d MMM 'à' HH:mm", { locale: fr })}
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: Colors.secondaryLabel, fontSize: 14, fontWeight: '700' }}>Risque fraude</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            {item.fraud_score !== undefined && item.fraud_score !== null && (
                                                <Text style={{
                                                    color: Colors.black,
                                                    fontSize: 13,
                                                    fontWeight: '900',
                                                    fontVariant: ['tabular-nums'],
                                                }}>
                                                    {item.fraud_score.toFixed(0)}
                                                </Text>
                                            )}
                                            <View style={{
                                                backgroundColor: Colors.offWhite,
                                                paddingHorizontal: 8,
                                                paddingVertical: 2,
                                                borderRadius: 0,
                                                borderWidth: 1,
                                                borderColor: fraudInfo.color,
                                            }}>
                                                <Text style={{
                                                    color: fraudInfo.color,
                                                    fontSize: 11,
                                                    fontWeight: '800',
                                                }}>
                                                    {fraudInfo.label}
                                                </Text>
                                            </View>
                                            {hasML && (
                                                <View style={{
                                                    backgroundColor: Colors.offWhite,
                                                    paddingHorizontal: 6,
                                                    paddingVertical: 2,
                                                    borderRadius: 0,
                                                    borderWidth: 1,
                                                    borderColor: adaptiveColors.accent,
                                                }}>
                                                    <Text style={{
                                                        color: adaptiveColors.accent,
                                                        fontSize: 10,
                                                        fontWeight: '900',
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
                            <Icon name="doc.text" size={48} color={Colors.tertiaryLabel} />
                            <Text style={{
                                color: Colors.black,
                                fontSize: 17,
                                marginTop: 16,
                                fontWeight: '800',
                                textTransform: 'uppercase',
                                letterSpacing: 1,
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
