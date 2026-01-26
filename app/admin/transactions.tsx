import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';

type Transaction = {
    id: string;
    type: 'transfer' | 'top_up' | 'payment';
    amount: number;
    status: string;
    created_at: string;
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
                    *,
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
            case 'transfer': return { label: 'Transfert', bg: 'bg-blue-100', text: 'text-blue-700' };
            case 'top_up': return { label: 'Rechargement', bg: 'bg-green-100', text: 'text-green-700' };
            case 'payment': return { label: 'Paiement', bg: 'bg-purple-100', text: 'text-purple-700' };
            default: return { label: type, bg: 'bg-gray-100', text: 'text-gray-700' };
        }
    }

    function getStatusLabel(status: string) {
        switch (status) {
            case 'completed': return { label: 'Complété', bg: 'bg-green-100', text: 'text-green-700' };
            case 'pending_review': return { label: 'En attente', bg: 'bg-amber-100', text: 'text-amber-700' };
            case 'failed': return { label: 'Échoué', bg: 'bg-red-100', text: 'text-red-700' };
            default: return { label: status, bg: 'bg-gray-100', text: 'text-gray-700' };
        }
    }

    const totalAmount = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);

    return (
        <View className="flex-1 bg-gray-50">
            {/* Stats */}
            <View className="p-4 flex-row gap-3">
                <View className="flex-1 bg-white p-4 rounded-xl border border-gray-100">
                    <Text className="text-gray-500 text-sm">Transactions</Text>
                    <Text className="text-2xl font-bold text-gray-900">{transactions.length}</Text>
                </View>
                <View className="flex-1 bg-white p-4 rounded-xl border border-gray-100">
                    <Text className="text-gray-500 text-sm">Volume total</Text>
                    <Text className="text-2xl font-bold text-epitech-blue">{totalAmount.toFixed(0)} EPC</Text>
                </View>
            </View>

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#0091D3" />
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
                            tintColor="#0091D3"
                        />
                    }
                    renderItem={({ item }) => {
                        const type = getTypeLabel(item.type);
                        const status = getStatusLabel(item.status);
                        
                        return (
                            <View className="bg-white p-4 rounded-xl mb-3 shadow-sm border border-gray-100">
                                <View className="flex-row justify-between items-start mb-3">
                                    <View className="flex-row gap-2">
                                        <View className={`${type.bg} px-2 py-1 rounded-full`}>
                                            <Text className={`${type.text} text-xs font-medium`}>{type.label}</Text>
                                        </View>
                                        <View className={`${status.bg} px-2 py-1 rounded-full`}>
                                            <Text className={`${status.text} text-xs font-medium`}>{status.label}</Text>
                                        </View>
                                    </View>
                                    <Text className="text-gray-400 text-xs">
                                        {format(new Date(item.created_at), "d MMM 'à' HH:mm", { locale: fr })}
                                    </Text>
                                </View>

                                <View className="flex-row justify-between items-center">
                                    <View className="flex-1 mr-4">
                                        <View className="flex-row items-center mb-1">
                                            <Ionicons name="arrow-up-circle-outline" size={16} color="#9ca3af" />
                                            <Text className="text-gray-600 text-sm ml-1" numberOfLines={1}>
                                                {item.sender?.full_name || item.sender?.email || 'Système'}
                                            </Text>
                                        </View>
                                        <View className="flex-row items-center">
                                            <Ionicons name="arrow-down-circle-outline" size={16} color="#9ca3af" />
                                            <Text className="text-gray-600 text-sm ml-1" numberOfLines={1}>
                                                {item.receiver?.full_name || item.receiver?.email || 'Système'}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text className="text-xl font-bold text-epitech-blue">
                                        {item.amount?.toFixed(2)} EPC
                                    </Text>
                                </View>
                            </View>
                        );
                    }}
                    ListEmptyComponent={
                        <View className="items-center py-12">
                            <Ionicons name="receipt-outline" size={48} color="#d1d5db" />
                            <Text className="text-gray-400 mt-4">Aucune transaction</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
