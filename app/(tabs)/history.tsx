import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';

type Transaction = {
    id: string;
    type: 'transfer' | 'topup' | 'top_up' | 'payment' | 'purchase';
    amount: number;
    status: string;
    created_at: string;
    sender_id: string;
    receiver_id: string;
    sender?: { full_name: string; email: string };
    receiver?: { full_name: string; email: string };
    metadata?: any;
};

export default function HistoryScreen() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            fetchTransactions();
        }, [])
    );

    async function fetchTransactions() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            
            setCurrentUserId(user.id);

            const { data, error } = await supabase
                .from('transactions')
                .select(`
                    id,
                    type,
                    amount,
                    status,
                    created_at,
                    sender_id,
                    receiver_id,
                    metadata,
                    sender:sender_id(full_name, email),
                    receiver:receiver_id(full_name, email)
                `)
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            
            // Transform data: sender/receiver are arrays, extract first element
            const transformedData = (data || []).map((tx: any) => ({
                ...tx,
                sender: Array.isArray(tx.sender) ? tx.sender[0] : tx.sender,
                receiver: Array.isArray(tx.receiver) ? tx.receiver[0] : tx.receiver
            }));
            
            setTransactions(transformedData);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    function onRefresh() {
        setRefreshing(true);
        fetchTransactions();
    }

    function getTransactionIcon(tx: Transaction): { name: string; color: string; bg: string } {
        const isSender = tx.sender_id === currentUserId;
        const isTopUp = tx.type === 'topup' || tx.type === 'top_up';
        const isPurchase = tx.type === 'payment' || tx.type === 'purchase';
        
        if (isTopUp) {
            return { name: 'add-circle', color: '#16a34a', bg: 'bg-green-100' };
        }
        if (isPurchase) {
            return { name: 'cart', color: '#f59e0b', bg: 'bg-amber-100' };
        }
        // transfer
        if (isSender) {
            return { name: 'arrow-up-circle', color: '#ef4444', bg: 'bg-red-100' };
        }
        return { name: 'arrow-down-circle', color: '#16a34a', bg: 'bg-green-100' };
    }

    function getTransactionLabel(tx: Transaction): string {
        const isSender = tx.sender_id === currentUserId;
        const isTopUp = tx.type === 'topup' || tx.type === 'top_up';
        const isPurchase = tx.type === 'payment' || tx.type === 'purchase';
        
        if (isTopUp) {
            const bonus = tx.metadata?.bonus || 0;
            if (bonus > 0) {
                return `Rechargement (+${bonus} bonus)`;
            }
            return 'Rechargement';
        }
        
        if (isPurchase) {
            const productName = tx.metadata?.product_name || 'Produit';
            // Ajouter le statut si en attente ou échoué
            if (tx.status === 'pending') {
                return `Achat ${productName} (en attente)`;
            }
            if (tx.status === 'failed') {
                const refunded = tx.metadata?.refunded;
                return refunded ? `Achat ${productName} (remboursé)` : `Achat ${productName} (échoué)`;
            }
            return `Achat ${productName}`;
        }
        
        // Transfer
        if (isSender) {
            return `Envoyé à ${tx.receiver?.full_name || 'Utilisateur'}`;
        }
        return `Reçu de ${tx.sender?.full_name || 'Utilisateur'}`;
    }

    function getAmountDisplay(tx: Transaction): { prefix: string; color: string } {
        const isSender = tx.sender_id === currentUserId;
        const isTopUp = tx.type === 'topup' || tx.type === 'top_up';
        const isPurchase = tx.type === 'payment' || tx.type === 'purchase';
        
        // Top-up : toujours positif (argent reçu)
        if (isTopUp) {
            return { prefix: '+', color: 'text-green-600' };
        }
        
        // Achat : toujours négatif (argent dépensé)
        if (isPurchase) {
            return { prefix: '-', color: 'text-red-500' };
        }
        
        // Transfert : négatif si on envoie, positif si on reçoit
        if (isSender) {
            return { prefix: '-', color: 'text-red-500' };
        }
        return { prefix: '+', color: 'text-green-600' };
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

    const renderTransaction = ({ item }: { item: Transaction }) => {
        const icon = getTransactionIcon(item);
        const label = getTransactionLabel(item);
        const amount = getAmountDisplay(item);
        const status = getStatusBadge(item.status);

        return (
            <View className="bg-white p-4 rounded-2xl mb-3 shadow-sm border border-gray-100">
                <View className="flex-row items-center">
                    <View className={`${icon.bg} p-3 rounded-full mr-4`}>
                        <Ionicons name={icon.name as any} size={24} color={icon.color} />
                    </View>
                    
                    <View className="flex-1">
                        <Text className="font-semibold text-gray-900" numberOfLines={1}>
                            {label}
                        </Text>
                        <View className="flex-row items-center mt-1">
                            <Text className="text-gray-400 text-xs">
                                {format(new Date(item.created_at), "d MMM 'à' HH:mm", { locale: fr })}
                            </Text>
                            {item.status !== 'completed' && (
                                <View className={`${status.bg} px-2 py-0.5 rounded-full ml-2`}>
                                    <Text className={`${status.text} text-xs font-medium`}>{status.label}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                    
                    <Text className={`font-bold text-lg ${amount.color}`}>
                        {amount.prefix}{item.amount.toFixed(2)} EPC
                    </Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#0091D3" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            <View className="p-6 pb-2">
                <Text className="text-3xl font-bold text-gray-900">Historique</Text>
                <Text className="text-gray-500 mt-1">Vos transactions récentes</Text>
            </View>

            <FlatList
                data={transactions}
                renderItem={renderTransaction}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16, paddingTop: 8 }}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={onRefresh}
                        tintColor="#0091D3"
                    />
                }
                ListEmptyComponent={
                    <View className="items-center justify-center py-20">
                        <View className="bg-gray-100 p-6 rounded-full mb-4">
                            <Ionicons name="receipt-outline" size={48} color="#9ca3af" />
                        </View>
                        <Text className="text-gray-500 text-lg font-medium">Aucune transaction</Text>
                        <Text className="text-gray-400 text-center mt-2 px-8">
                            Vos transactions apparaîtront ici une fois que vous aurez effectué des opérations.
                        </Text>
                    </View>
                }
            />
        </View>
    );
}


