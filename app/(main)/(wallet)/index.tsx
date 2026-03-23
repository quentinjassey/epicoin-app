import Icon from '@/components/Icon';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import GlitchIn from '@/components/GlitchIn';
import { supabase } from '../../../lib/supabase';
import { Colors } from '@/constants/NativeColors';
import { useAccessibility } from '@/lib/AccessibilityContext';

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
    const { adaptiveColors } = useAccessibility();
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
                color: adaptiveColors.success,
                label: bonus > 0 ? `Rechargement (+${bonus} bonus)` : 'Rechargement',
                prefix: '+',
                amountColor: adaptiveColors.success,
            };
        }

        if (isPurchase) {
            const productName = tx.metadata?.product_name || 'Produit';
            let label = `Achat ${productName}`;
            if (tx.status === 'pending_review') label += ' (en attente)';
            else if (tx.status === 'failed') {
                label += tx.metadata?.refunded ? ' (rembourse)' : ' (echoue)';
            }
            return {
                icon: 'cart.fill',
                color: adaptiveColors.error,
                label,
                prefix: '-',
                amountColor: adaptiveColors.error,
            };
        }

        if (isSender) {
            let label = `Envoye a ${tx.receiver?.full_name || 'Utilisateur'}`;
            if (tx.status === 'pending_review') label += ' (en attente)';
            else if (tx.status === 'failed') label += ' (echoue)';
            return {
                icon: 'arrow.up.circle.fill',
                color: adaptiveColors.error,
                label,
                prefix: '-',
                amountColor: adaptiveColors.error,
            };
        }

        let label = `Recu de ${tx.sender?.full_name || 'Utilisateur'}`;
        if (tx.status === 'pending_review') label += ' (en attente)';
        else if (tx.status === 'failed') label += ' (echoue)';
        return {
            icon: 'arrow.down.circle.fill',
            color: adaptiveColors.success,
            label,
            prefix: '+',
            amountColor: adaptiveColors.success,
        };
    }

    function getStatusBadge(status: string) {
        switch (status) {
            case 'completed':
                return { label: 'COMPLETE', color: adaptiveColors.success };
            case 'pending_review':
                return { label: 'EN ATTENTE', color: adaptiveColors.warning };
            case 'failed':
                return { label: 'ECHOUE', color: adaptiveColors.error };
            default:
                return { label: status.toUpperCase(), color: Colors.mediumGray };
        }
    }

    if (loading) {
        return (
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: Colors.white,
            }}>
                <ActivityIndicator size="large" color={adaptiveColors.primary} />
            </View>
        );
    }

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={{
                flex: 1,
                backgroundColor: Colors.white,
            }}
            contentContainerStyle={{
                padding: 20,
                paddingBottom: 40,
            }}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={adaptiveColors.primary}
                />
            }
        >
            {/* ── Header ── */}
            <GlitchIn delay={0}><View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 8,
                marginBottom: 28,
            }}>
                <Image
                    source={require('../../../assets/images/epipay-logo.png')}
                    style={{ width: 120, height: 40 }}
                    resizeMode="contain"
                />
                <TouchableOpacity
                    style={{
                        width: 40,
                        height: 40,
                        backgroundColor: adaptiveColors.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 2,
                        borderColor: Colors.black,
                    }}
                    onPress={() => router.push('/(profile)' as any)}
                >
                    <Text style={{
                        color: Colors.white,
                        fontWeight: '900',
                        fontSize: 17,
                    }}>
                        {fullName.charAt(0)}
                    </Text>
                </TouchableOpacity>
            </View></GlitchIn>

            {/* ── Greeting ── */}
            <GlitchIn delay={80}><View style={{ marginBottom: 24 }}>
                <Text style={{
                    color: Colors.mediumGray,
                    fontSize: 13,
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                    marginBottom: 4,
                }}>
                    Bonjour
                </Text>
                <Text style={{
                    fontSize: 28,
                    fontWeight: '900',
                    color: Colors.black,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                }}>
                    {fullName}
                </Text>
            </View></GlitchIn>

            {/* ── Balance Card ── */}
            <GlitchIn delay={160}><View style={{
                backgroundColor: adaptiveColors.primary,
                padding: 28,
                borderWidth: 3,
                borderColor: Colors.black,
                marginBottom: 32,
                shadowColor: Colors.black,
                shadowOffset: { width: 6, height: 6 },
                shadowOpacity: 1,
                shadowRadius: 0,
                elevation: 0,
            }}>
                <Text style={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: 11,
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    letterSpacing: 3,
                    marginBottom: 12,
                }}>
                    Solde disponible
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <Text style={{
                        color: Colors.white,
                        fontSize: 52,
                        fontWeight: '900',
                        fontVariant: ['tabular-nums'],
                        letterSpacing: -2,
                    }}>
                        {balance?.toFixed(2)}
                    </Text>
                    <Text style={{
                        color: adaptiveColors.success,
                        fontSize: 22,
                        fontWeight: '900',
                        marginLeft: 8,
                        textTransform: 'uppercase',
                    }}>
                        EPC
                    </Text>
                </View>
            </View></GlitchIn>

            {/* ── Quick Actions ── */}
            <GlitchIn delay={240}><View style={{ marginBottom: 32 }}>
                <Text style={{
                    fontSize: 13,
                    fontWeight: '900',
                    color: Colors.mediumGray,
                    marginBottom: 16,
                    textTransform: 'uppercase',
                    letterSpacing: 3,
                }}>
                    Actions rapides
                </Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    {/* Recharger */}
                    <TouchableOpacity
                        style={{
                            flex: 1,
                            backgroundColor: Colors.offWhite,
                            padding: 20,
                            borderWidth: 2,
                            borderColor: adaptiveColors.success,
                            alignItems: 'center',
                            justifyContent: 'center',
                            shadowColor: Colors.black,
                            shadowOffset: { width: 3, height: 3 },
                            shadowOpacity: 1,
                            shadowRadius: 0,
                        }}
                        onPress={() => router.push('/top-up')}
                    >
                        <Icon
                            name="plus.circle.fill"
                            size={28}
                            color={adaptiveColors.success}
                        />
                        <Text style={{
                            fontWeight: '800',
                            color: Colors.black,
                            fontSize: 10,
                            marginTop: 10,
                            textTransform: 'uppercase',
                            letterSpacing: 0,
                        }}>
                            Recharger
                        </Text>
                    </TouchableOpacity>

                    {/* Payer */}
                    <TouchableOpacity
                        style={{
                            flex: 1,
                            backgroundColor: Colors.offWhite,
                            padding: 20,
                            borderWidth: 2,
                            borderColor: adaptiveColors.warning,
                            alignItems: 'center',
                            justifyContent: 'center',
                            shadowColor: Colors.black,
                            shadowOffset: { width: 3, height: 3 },
                            shadowOpacity: 1,
                            shadowRadius: 0,
                        }}
                        onPress={() => router.push('/pay')}
                    >
                        <Icon
                            name="qrcode"
                            size={28}
                            color={adaptiveColors.warning}
                        />
                        <Text style={{
                            fontWeight: '800',
                            color: Colors.black,
                            fontSize: 11,
                            marginTop: 10,
                            textTransform: 'uppercase',
                            letterSpacing: 1.5,
                        }}>
                            Payer
                        </Text>
                    </TouchableOpacity>

                    {/* Envoyer */}
                    <TouchableOpacity
                        style={{
                            flex: 1,
                            backgroundColor: Colors.offWhite,
                            padding: 20,
                            borderWidth: 2,
                            borderColor: adaptiveColors.info,
                            alignItems: 'center',
                            justifyContent: 'center',
                            shadowColor: Colors.black,
                            shadowOffset: { width: 3, height: 3 },
                            shadowOpacity: 1,
                            shadowRadius: 0,
                        }}
                        onPress={() => router.push('/send')}
                    >
                        <Icon
                            name="paperplane.fill"
                            size={28}
                            color={adaptiveColors.info}
                        />
                        <Text style={{
                            fontWeight: '800',
                            color: Colors.black,
                            fontSize: 11,
                            marginTop: 10,
                            textTransform: 'uppercase',
                            letterSpacing: 1.5,
                        }}>
                            Envoyer
                        </Text>
                    </TouchableOpacity>
                </View>
            </View></GlitchIn>

            {/* ── Recent Transactions ── */}
            <GlitchIn delay={320}><View>
                <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                }}>
                    <Text style={{
                        fontSize: 13,
                        fontWeight: '900',
                        color: Colors.mediumGray,
                        textTransform: 'uppercase',
                        letterSpacing: 3,
                    }}>
                        Activite recente
                    </Text>
                    <TouchableOpacity onPress={() => router.push('/(history)' as any)}>
                        <Text style={{
                            color: adaptiveColors.primary,
                            fontWeight: '800',
                            fontSize: 13,
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                        }}>
                            Voir tout
                        </Text>
                    </TouchableOpacity>
                </View>

                {recentTransactions.length > 0 ? (
                    <View style={{
                        backgroundColor: Colors.white,
                        borderWidth: 2,
                        borderColor: Colors.black,
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
                                        borderBottomWidth: index < recentTransactions.length - 1 ? 2 : 0,
                                        borderBottomColor: Colors.lightGray,
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{
                                            width: 40,
                                            height: 40,
                                            backgroundColor: Colors.offWhite,
                                            borderWidth: 2,
                                            borderColor: display.color,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: 12,
                                        }}>
                                            <Icon
                                                name={display.icon}
                                                size={18}
                                                color={display.color}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{
                                                fontWeight: '700',
                                                color: Colors.black,
                                                fontSize: 14,
                                            }} numberOfLines={1}>
                                                {display.label}
                                            </Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                                <Text style={{
                                                    color: Colors.mediumGray,
                                                    fontSize: 11,
                                                    fontWeight: '600',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: 0.5,
                                                }}>
                                                    {format(new Date(tx.created_at), "d MMM 'a' HH:mm", { locale: fr })}
                                                </Text>
                                                {tx.status !== 'completed' && (
                                                    <View style={{
                                                        borderWidth: 1.5,
                                                        borderColor: status.color,
                                                        paddingHorizontal: 6,
                                                        paddingVertical: 2,
                                                        marginLeft: 8,
                                                    }}>
                                                        <Text style={{
                                                            color: status.color,
                                                            fontSize: 9,
                                                            fontWeight: '900',
                                                            letterSpacing: 1,
                                                        }}>
                                                            {status.label}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                        <Text style={{
                                            fontWeight: '900',
                                            color: display.amountColor,
                                            fontSize: 15,
                                            fontVariant: ['tabular-nums'],
                                        }}>
                                            {display.prefix}{tx.amount.toFixed(2)}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                ) : (
                    <View style={{
                        backgroundColor: Colors.offWhite,
                        borderWidth: 2,
                        borderColor: Colors.black,
                        padding: 40,
                        alignItems: 'center',
                    }}>
                        <View style={{
                            width: 56,
                            height: 56,
                            backgroundColor: Colors.white,
                            borderWidth: 2,
                            borderColor: Colors.mediumGray,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 16,
                        }}>
                            <Icon
                                name="doc.text"
                                size={24}
                                color={Colors.mediumGray}
                            />
                        </View>
                        <Text style={{
                            color: Colors.mediumGray,
                            textAlign: 'center',
                            fontSize: 13,
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: 1.5,
                        }}>
                            Aucune transaction
                        </Text>
                    </View>
                )}
            </View></GlitchIn>
        </ScrollView>
    );
}
