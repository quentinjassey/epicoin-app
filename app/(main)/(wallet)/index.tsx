import { SymbolView } from 'expo-symbols';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { Colors } from '@/constants/NativeColors';

type Transaction = {
    id: string;
    type: string;
    amount: number;
    status: string;
    created_at: string;
    sender_id: string;
    receiver_id: string;
    sender?: { full_name: string };
    receiver?: { full_name: string };
    metadata?: any;
};

export default function WalletScreen() {
    const [balance, setBalance] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [fullName, setFullName] = useState('');
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            let subscription: any;

            async function setupData() {
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;

                    setCurrentUserId(user.id);

                    await fetchData(user.id);

                    subscription = supabase
                        .channel('profile-balance')
                        .on(
                            'postgres_changes',
                            {
                                event: 'UPDATE',
                                schema: 'public',
                                table: 'profiles',
                                filter: `id=eq.${user.id}`,
                            },
                            (payload) => {
                                setBalance(payload.new.balance);
                            }
                        )
                        .subscribe();

                } catch (e) {
                    console.error(e);
                }
            }

            setupData();

            return () => {
                if (subscription) {
                    subscription.unsubscribe();
                }
            };
        }, [])
    );

    async function fetchData(userId: string) {
        try {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('balance, full_name')
                .eq('id', userId)
                .single();

            if (profileError) throw profileError;

            setBalance(profile.balance);
            setFullName(profile.full_name);

            const { data: transactions, error: txError } = await supabase
                .from('transactions')
                .select(`
                    id, type, amount, status, created_at, sender_id, receiver_id, metadata,
                    sender:sender_id(full_name),
                    receiver:receiver_id(full_name)
                `)
                .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
                .order('created_at', { ascending: false })
                .limit(5);

            if (!txError && transactions) {
                const transformedTx = transactions.map((tx: any) => ({
                    ...tx,
                    sender: Array.isArray(tx.sender) ? tx.sender[0] : tx.sender,
                    receiver: Array.isArray(tx.receiver) ? tx.receiver[0] : tx.receiver
                }));
                setRecentTransactions(transformedTx);
            }
        } catch (error: any) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    async function onRefresh() {
        setRefreshing(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await fetchData(user.id);
        }
    }

    function getTransactionDisplay(tx: Transaction) {
        const isSender = tx.sender_id === currentUserId;
        const isTopUp = tx.type === 'topup' || tx.type === 'top_up';
        const isPurchase = tx.type === 'payment' || tx.type === 'purchase';

        if (isTopUp) {
            const bonus = tx.metadata?.bonus || 0;
            return {
                icon: 'plus.circle.fill',
                color: Colors.systemGreen,
                bg: 'rgba(16, 185, 129, 0.15)',
                label: bonus > 0 ? `Rechargement (+${bonus} bonus)` : 'Rechargement',
                prefix: '+',
                amountColor: Colors.systemGreen,
            };
        }

        if (isPurchase) {
            const productName = tx.metadata?.product_name || 'Produit';
            let label = `Achat ${productName}`;

            if (tx.status === 'pending_review') {
                label += ' (en attente)';
            } else if (tx.status === 'failed') {
                const refunded = tx.metadata?.refunded;
                label += refunded ? ' (remboursé)' : ' (échoué)';
            }

            return {
                icon: 'cart.fill',
                color: Colors.systemOrange,
                bg: 'rgba(245, 158, 11, 0.15)',
                label,
                prefix: '-',
                amountColor: Colors.systemRed,
            };
        }

        if (isSender) {
            let label = `Envoyé à ${tx.receiver?.full_name || 'Utilisateur'}`;
            if (tx.status === 'pending_review') {
                label += ' (en attente)';
            } else if (tx.status === 'failed') {
                label += ' (échoué)';
            }

            return {
                icon: 'arrow.up.circle.fill',
                color: Colors.systemRed,
                bg: 'rgba(239, 68, 68, 0.15)',
                label,
                prefix: '-',
                amountColor: Colors.systemRed,
            };
        }

        let label = `Reçu de ${tx.sender?.full_name || 'Utilisateur'}`;
        if (tx.status === 'pending_review') {
            label += ' (en attente)';
        } else if (tx.status === 'failed') {
            label += ' (échoué)';
        }

        return {
            icon: 'arrow.down.circle.fill',
            color: Colors.systemGreen,
            bg: 'rgba(16, 185, 129, 0.15)',
            label,
            prefix: '+',
            amountColor: Colors.systemGreen,
        };
    }

    function getStatusBadge(status: string) {
        switch (status) {
            case 'completed':
                return { 
                    label: 'Complété', 
                    bg: 'rgba(16, 185, 129, 0.15)', 
                    color: Colors.systemGreen 
                };
            case 'pending_review':
                return { 
                    label: 'En attente', 
                    bg: 'rgba(245, 158, 11, 0.15)', 
                    color: Colors.systemOrange 
                };
            case 'failed':
                return { 
                    label: 'Échoué', 
                    bg: 'rgba(239, 68, 68, 0.15)', 
                    color: Colors.systemRed 
                };
            default:
                return { 
                    label: status, 
                    bg: Colors.systemFill, 
                    color: Colors.secondaryLabel 
                };
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
            style={{
                flex: 1,
                backgroundColor: Colors.systemGroupedBackground,
            }}
            contentContainerStyle={{
                padding: 16,
                gap: 24,
            }}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={Colors.epitechBlue}
                />
            }
        >
            {/* Header */}
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 16,
            }}>
                <View>
                    <Text style={{ 
                        color: Colors.secondaryLabel, 
                        fontSize: 16,
                        marginBottom: 4,
                    }}>
                        Bonjour,
                    </Text>
                    <Text style={{ 
                        fontSize: 28, 
                        fontWeight: '700', 
                        color: Colors.label,
                    }}>
                        {fullName}
                    </Text>
                </View>
                <TouchableOpacity
                    style={{
                        width: 48,
                        height: 48,
                        backgroundColor: Colors.epitechBlue,
                        borderRadius: 24,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    onPress={() => router.push('/(profile)' as any)}
                >
                    <Text style={{ 
                        color: '#fff', 
                        fontWeight: '700', 
                        fontSize: 20,
                    }}>
                        {fullName.charAt(0)}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Balance Card */}
            <View style={{
                backgroundColor: Colors.epitechBlue,
                borderRadius: 24,
                borderCurve: 'continuous',
                padding: 32,
                boxShadow: '0 4px 12px rgba(0, 145, 211, 0.25)',
                overflow: 'hidden',
            }}>
                <View style={{
                    position: 'absolute',
                    right: -40,
                    top: -40,
                    width: 160,
                    height: 160,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 80,
                }} />
                <View style={{
                    position: 'absolute',
                    right: -20,
                    bottom: 0,
                    width: 96,
                    height: 96,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 48,
                }} />

                <Text style={{
                    color: 'rgba(255, 255, 255, 0.75)',
                    fontSize: 13,
                    fontWeight: '600',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                }}>
                    Solde disponible
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <Text style={{
                        color: '#fff',
                        fontSize: 48,
                        fontWeight: '700',
                        marginRight: 8,
                        fontVariant: ['tabular-nums'],
                    }}>
                        {balance?.toFixed(2)}
                    </Text>
                    <Text style={{
                        color: Colors.epitechYellow,
                        fontSize: 24,
                        fontWeight: '700',
                    }}>
                        EPC
                    </Text>
                </View>
            </View>

            {/* Quick Actions */}
            <View>
                <Text style={{
                    fontSize: 20,
                    fontWeight: '700',
                    color: Colors.label,
                    marginBottom: 16,
                }}>
                    Actions rapides
                </Text>
                <View style={{ 
                    flexDirection: 'row', 
                    gap: 12,
                }}>
                    <TouchableOpacity
                        style={{
                            flex: 1,
                            backgroundColor: Colors.secondarySystemGroupedBackground,
                            padding: 16,
                            borderRadius: 16,
                            borderCurve: 'continuous',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        onPress={() => router.push('/top-up')}
                    >
                        <View style={{
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            padding: 12,
                            borderRadius: 24,
                            borderCurve: 'continuous',
                            marginBottom: 8,
                        }}>
                            <SymbolView 
                                name="plus.circle.fill" 
                                size={24}
                                tintColor={Colors.systemGreen}
                            />
                        </View>
                        <Text style={{
                            fontWeight: '600',
                            color: Colors.label,
                            fontSize: 13,
                        }}>
                            Recharger
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{
                            flex: 1,
                            backgroundColor: Colors.secondarySystemGroupedBackground,
                            padding: 16,
                            borderRadius: 16,
                            borderCurve: 'continuous',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        onPress={() => router.push('/pay')}
                    >
                        <View style={{
                            backgroundColor: 'rgba(147, 51, 234, 0.15)',
                            padding: 12,
                            borderRadius: 24,
                            borderCurve: 'continuous',
                            marginBottom: 8,
                        }}>
                            <SymbolView 
                                name="qrcode" 
                                size={24}
                                tintColor={Colors.systemPurple}
                            />
                        </View>
                        <Text style={{
                            fontWeight: '600',
                            color: Colors.label,
                            fontSize: 13,
                        }}>
                            Payer
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{
                            flex: 1,
                            backgroundColor: Colors.secondarySystemGroupedBackground,
                            padding: 16,
                            borderRadius: 16,
                            borderCurve: 'continuous',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        onPress={() => router.push('/send')}
                    >
                        <View style={{
                            backgroundColor: 'rgba(0, 145, 211, 0.15)',
                            padding: 12,
                            borderRadius: 24,
                            borderCurve: 'continuous',
                            marginBottom: 8,
                        }}>
                            <SymbolView 
                                name="paperplane.fill" 
                                size={24}
                                tintColor={Colors.epitechBlue}
                            />
                        </View>
                        <Text style={{
                            fontWeight: '600',
                            color: Colors.label,
                            fontSize: 13,
                        }}>
                            Envoyer
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Recent Transactions */}
            <View>
                <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                }}>
                    <Text style={{
                        fontSize: 20,
                        fontWeight: '700',
                        color: Colors.label,
                    }}>
                        Activité récente
                    </Text>
                    <TouchableOpacity onPress={() => router.push('/(history)' as any)}>
                        <Text style={{
                            color: Colors.epitechBlue,
                            fontWeight: '600',
                            fontSize: 15,
                        }}>
                            Voir tout
                        </Text>
                    </TouchableOpacity>
                </View>

                {recentTransactions.length > 0 ? (
                    <View style={{
                        backgroundColor: Colors.secondarySystemGroupedBackground,
                        borderRadius: 16,
                        borderCurve: 'continuous',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                        overflow: 'hidden',
                    }}>
                        {recentTransactions.map((tx, index) => {
                            const display = getTransactionDisplay(tx);
                            const status = getStatusBadge(tx.status);
                            return (
                                <View
                                    key={tx.id}
                                    style={{
                                        padding: 16,
                                        borderBottomWidth: index < recentTransactions.length - 1 ? 1 : 0,
                                        borderBottomColor: Colors.separator,
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{
                                            backgroundColor: display.bg,
                                            padding: 10,
                                            borderRadius: 20,
                                            borderCurve: 'continuous',
                                            marginRight: 12,
                                        }}>
                                            <SymbolView 
                                                name={display.icon as any} 
                                                size={20}
                                                tintColor={display.color}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{
                                                fontWeight: '600',
                                                color: Colors.label,
                                                fontSize: 15,
                                            }} numberOfLines={1}>
                                                {display.label}
                                            </Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                                <Text style={{
                                                    color: Colors.tertiaryLabel,
                                                    fontSize: 12,
                                                }}>
                                                    {format(new Date(tx.created_at), "d MMM 'à' HH:mm", { locale: fr })}
                                                </Text>
                                                {tx.status !== 'completed' && (
                                                    <View style={{
                                                        backgroundColor: status.bg,
                                                        paddingHorizontal: 8,
                                                        paddingVertical: 2,
                                                        borderRadius: 10,
                                                        borderCurve: 'continuous',
                                                        marginLeft: 8,
                                                    }}>
                                                        <Text style={{
                                                            color: status.color,
                                                            fontSize: 11,
                                                            fontWeight: '600',
                                                        }}>
                                                            {status.label}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                        <Text style={{
                                            fontWeight: '700',
                                            color: display.amountColor,
                                            fontSize: 15,
                                            fontVariant: ['tabular-nums'],
                                        }}>
                                            {display.prefix}{tx.amount.toFixed(2)} EPC
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                ) : (
                    <View style={{
                        backgroundColor: Colors.secondarySystemGroupedBackground,
                        borderRadius: 16,
                        borderCurve: 'continuous',
                        padding: 32,
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                        alignItems: 'center',
                    }}>
                        <View style={{
                            backgroundColor: Colors.systemFill,
                            padding: 16,
                            borderRadius: 32,
                            borderCurve: 'continuous',
                            marginBottom: 12,
                        }}>
                            <SymbolView 
                                name="doc.text" 
                                size={32}
                                tintColor={Colors.tertiaryLabel}
                            />
                        </View>
                        <Text style={{
                            color: Colors.secondaryLabel,
                            textAlign: 'center',
                            fontSize: 15,
                        }}>
                            Aucune transaction récente
                        </Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}
