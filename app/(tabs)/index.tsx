import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

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

                    // Initial fetch
                    await fetchData(user.id);

                    // Realtime subscription pour le solde
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
            // Fetch profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('balance, full_name')
                .eq('id', userId)
                .single();

            if (profileError) throw profileError;

            setBalance(profile.balance);
            setFullName(profile.full_name);

            // Fetch recent transactions
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
                // Transform data: sender/receiver are arrays, extract first element
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
                icon: 'add-circle',
                color: '#16a34a',
                bg: 'bg-green-100',
                label: bonus > 0 ? `Rechargement (+${bonus} bonus)` : 'Rechargement',
                prefix: '+',
                amountColor: 'text-green-600',
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
                icon: 'cart',
                color: '#f59e0b',
                bg: 'bg-amber-100',
                label,
                prefix: '-',
                amountColor: 'text-red-500',
            };
        }

        // Transfer
        if (isSender) {
            let label = `Envoyé à ${tx.receiver?.full_name || 'Utilisateur'}`;
            if (tx.status === 'pending_review') {
                label += ' (en attente)';
            } else if (tx.status === 'failed') {
                label += ' (échoué)';
            }

            return {
                icon: 'arrow-up-circle',
                color: '#ef4444',
                bg: 'bg-red-100',
                label,
                prefix: '-',
                amountColor: 'text-red-500',
            };
        }

        let label = `Reçu de ${tx.sender?.full_name || 'Utilisateur'}`;
        if (tx.status === 'pending_review') {
            label += ' (en attente)';
        } else if (tx.status === 'failed') {
            label += ' (échoué)';
        }

        return {
            icon: 'arrow-down-circle',
            color: '#16a34a',
            bg: 'bg-green-100',
            label,
            prefix: '+',
            amountColor: 'text-green-600',
        };
    }

    function getStatusBadge(status: string) {
        switch (status) {
            case 'completed':
                return { label: 'Complété', bg: 'bg-green-100', text: 'text-green-700' };
            case 'pending_review':
                return { label: 'En attente', bg: 'bg-amber-100', text: 'text-amber-700' };
            case 'failed':
                return { label: 'Échoué', bg: 'bg-red-100', text: 'text-red-700' };
            default:
                return { label: status, bg: 'bg-gray-100', text: 'text-gray-700' };
        }
    }

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#0091D3" />
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-gray-50"
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor="#0091D3"
                />
            }
        >
            <View className="p-6">
                {/* Header */}
                <View className="mt-8 mb-6 flex-row justify-between items-center">
                    <View>
                        <Text className="text-gray-500 text-base">Bonjour,</Text>
                        <Text className="text-2xl font-bold text-gray-900">{fullName}</Text>
                    </View>
                    <TouchableOpacity
                        className="w-12 h-12 bg-epitech-blue rounded-full items-center justify-center"
                        onPress={() => router.push('/(tabs)/profile')}
                    >
                        <Text className="text-white font-bold text-lg">{fullName.charAt(0)}</Text>
                    </TouchableOpacity>
                </View>

                {/* Balance Card */}
                <View className="bg-epitech-blue rounded-3xl p-8 shadow-xl shadow-blue-200 mb-8 overflow-hidden relative">
                    <View className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-10 rounded-full" />
                    <View className="absolute -right-5 bottom-0 w-24 h-24 bg-white opacity-5 rounded-full" />

                    <Text className="text-blue-100 text-sm font-medium mb-2 uppercase tracking-wider">
                        Solde disponible
                    </Text>
                    <View className="flex-row items-baseline">
                        <Text className="text-white text-5xl font-bold mr-2">
                            {balance?.toFixed(2)}
                        </Text>
                        <Text className="text-epitech-yellow text-2xl font-bold">EPC</Text>
                    </View>
                </View>

                {/* Quick Actions */}
                <Text className="text-lg font-bold text-gray-900 mb-4">Actions rapides</Text>
                <View className="flex-row justify-between gap-3 mb-8">
                    <TouchableOpacity
                        className="flex-1 bg-white p-4 rounded-2xl shadow-sm items-center justify-center border border-gray-100"
                        onPress={() => router.push('/top-up')}
                    >
                        <View className="bg-green-100 p-3 rounded-full mb-2">
                            <Ionicons name="add" size={24} color="#16a34a" />
                        </View>
                        <Text className="font-semibold text-gray-900 text-sm">Recharger</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="flex-1 bg-white p-4 rounded-2xl shadow-sm items-center justify-center border border-gray-100"
                        onPress={() => router.push('/pay')}
                    >
                        <View className="bg-purple-100 p-3 rounded-full mb-2">
                            <Ionicons name="qr-code" size={24} color="#9333ea" />
                        </View>
                        <Text className="font-semibold text-gray-900 text-sm">Payer</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="flex-1 bg-white p-4 rounded-2xl shadow-sm items-center justify-center border border-gray-100"
                        onPress={() => router.push('/send')}
                    >
                        <View className="bg-blue-100 p-3 rounded-full mb-2">
                            <Ionicons name="send" size={24} color="#0091D3" />
                        </View>
                        <Text className="font-semibold text-gray-900 text-sm">Envoyer</Text>
                    </TouchableOpacity>
                </View>

                {/* Recent Transactions */}
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-lg font-bold text-gray-900">Activité récente</Text>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
                        <Text className="text-epitech-blue font-semibold">Voir tout</Text>
                    </TouchableOpacity>
                </View>

                {recentTransactions.length > 0 ? (
                    <View className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        {recentTransactions.map((tx, index) => {
                            const display = getTransactionDisplay(tx);
                            const status = getStatusBadge(tx.status);
                            return (
                                <View
                                    key={tx.id}
                                    className={`p-4 ${index < recentTransactions.length - 1 ? 'border-b border-gray-100' : ''}`}
                                >
                                    <View className="flex-row items-center">
                                        <View className={`${display.bg} p-2.5 rounded-full mr-3`}>
                                            <Ionicons name={display.icon as any} size={20} color={display.color} />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="font-semibold text-gray-900" numberOfLines={1}>
                                                {display.label}
                                            </Text>
                                            <View className="flex-row items-center mt-1">
                                                <Text className="text-gray-400 text-xs">
                                                    {format(new Date(tx.created_at), "d MMM 'à' HH:mm", { locale: fr })}
                                                </Text>
                                                {tx.status !== 'completed' && (
                                                    <View className={`${status.bg} px-2 py-0.5 rounded-full ml-2`}>
                                                        <Text className={`${status.text} text-xs font-medium`}>{status.label}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                        <Text className={`font-bold ${display.amountColor}`}>
                                            {display.prefix}{tx.amount.toFixed(2)} EPC
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                ) : (
                    <View className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 items-center">
                        <View className="bg-gray-100 p-4 rounded-full mb-3">
                            <Ionicons name="receipt-outline" size={32} color="#9ca3af" />
                        </View>
                        <Text className="text-gray-400 text-center">
                            Aucune transaction récente
                        </Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}
