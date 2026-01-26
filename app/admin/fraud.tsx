import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

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
    const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
    const [showModal, setShowModal] = useState(false);

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

            // Utiliser les fonctions SQL appropriées
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
        if (score >= 80) return { label: 'Critique', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' };
        if (score >= 60) return { label: 'Élevé', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' };
        if (score >= 40) return { label: 'Moyen', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' };
        return { label: 'Faible', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' };
    }

    const renderItem = ({ item }: { item: FraudAlert }) => {
        const risk = getRiskLevel(item.risk_score);
        const isProcessing = processing === item.id;

        return (
            <View className={`bg-white p-5 rounded-2xl mb-4 shadow-sm border ${risk.border}`}>
                {/* Header */}
                <View className="flex-row justify-between items-start mb-4">
                    <View>
                        <Text className="font-bold text-2xl text-gray-900">
                            {item.transactions.amount} EPC
                        </Text>
                        <Text className="text-gray-400 text-sm mt-1">
                            {format(new Date(item.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                        </Text>
                    </View>
                    <View className={`${risk.bg} px-3 py-1.5 rounded-full flex-row items-center`}>
                        <Ionicons name="warning" size={14} color={risk.text.replace('text-', '')} />
                        <Text className={`${risk.text} font-bold text-sm ml-1`}>
                            Risque {item.risk_score}%
                        </Text>
                    </View>
                </View>

                {/* Parties */}
                <View className="bg-gray-50 rounded-xl p-4 mb-4">
                    <View className="flex-row items-center mb-3">
                        <View className="bg-red-100 p-2 rounded-full mr-3">
                            <Ionicons name="arrow-up" size={16} color="#dc2626" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-500 text-xs">Expéditeur</Text>
                            <Text className="text-gray-900 font-medium" numberOfLines={1}>
                                {item.transactions.sender?.full_name || item.transactions.sender?.email}
                            </Text>
                        </View>
                    </View>
                    <View className="flex-row items-center">
                        <View className="bg-green-100 p-2 rounded-full mr-3">
                            <Ionicons name="arrow-down" size={16} color="#16a34a" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-500 text-xs">Destinataire</Text>
                            <Text className="text-gray-900 font-medium" numberOfLines={1}>
                                {item.transactions.receiver?.full_name || item.transactions.receiver?.email}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Informations Enrichies */}
                {(item.transactions.country || item.transactions.provider || item.transactions.transaction_type || item.transactions.fraud_features?.ml_active !== undefined) && (
                    <View className="bg-blue-50 p-4 rounded-xl mb-4 border border-blue-100">
                        <View className="flex-row flex-wrap">
                            {item.transactions.transaction_type && (
                                <View className="mr-4 mb-2">
                                    <Text className="text-blue-600 text-xs font-medium">Type</Text>
                                    <Text className="text-blue-900 text-sm font-bold">{item.transactions.transaction_type}</Text>
                                </View>
                            )}
                            {item.transactions.provider && (
                                <View className="mr-4 mb-2">
                                    <Text className="text-blue-600 text-xs font-medium">Provider</Text>
                                    <Text className="text-blue-900 text-sm font-bold">{item.transactions.provider}</Text>
                                </View>
                            )}
                            {(item.transactions.city || item.transactions.country) && (
                                <View className="mr-4 mb-2">
                                    <Text className="text-blue-600 text-xs font-medium">Localisation</Text>
                                    <Text className="text-blue-900 text-sm font-bold">
                                        {item.transactions.city && item.transactions.country 
                                            ? `${item.transactions.city}, ${item.transactions.country}`
                                            : item.transactions.city || item.transactions.country}
                                    </Text>
                                </View>
                            )}
                            {item.transactions.fraud_features?.ml_active !== undefined && (
                                <View className="mr-4 mb-2">
                                    <Text className="text-blue-600 text-xs font-medium">ML Actif</Text>
                                    <Text className={`text-sm font-bold ${item.transactions.fraud_features.ml_active ? 'text-green-600' : 'text-amber-600'}`}>
                                        {item.transactions.fraud_features.ml_active ? 'Oui' : 'Non'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* Raison */}
                <View className={`${risk.bg} p-4 rounded-xl mb-4`}>
                    <View className="flex-row items-start">
                        <Ionicons name="information-circle" size={18} color="#92400e" style={{ marginTop: 2 }} />
                        <View className="flex-1 ml-2">
                            <Text className="text-amber-800 font-medium text-sm">Raison du signalement</Text>
                            <Text className="text-amber-700 text-sm mt-1">{item.reason}</Text>
                        </View>
                    </View>
                </View>

                {/* Bouton Voir Détails */}
                <TouchableOpacity
                    className="bg-gray-100 py-3 rounded-xl items-center flex-row justify-center mb-3 border border-gray-200"
                    onPress={() => router.push(`/admin/fraud-detail?id=${item.id}`)}
                >
                    <Ionicons name="eye-outline" size={20} color="#374151" />
                    <Text className="text-gray-700 font-semibold ml-2">Voir les détails complets</Text>
                    <Ionicons name="chevron-forward" size={16} color="#9ca3af" style={{ marginLeft: 4 }} />
                </TouchableOpacity>

                {/* Actions */}
                <View className="flex-row gap-3">
                    <TouchableOpacity
                        className={`flex-1 p-4 rounded-xl items-center flex-row justify-center ${isProcessing ? 'bg-gray-200' : 'bg-green-600'}`}
                        onPress={() => handleDecision(item.id, item.transactions.id, 'approved')}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <ActivityIndicator color="#16a34a" size="small" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={20} color="white" />
                                <Text className="text-white font-bold ml-2">Approuver</Text>
                            </>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        className={`flex-1 p-4 rounded-xl items-center flex-row justify-center ${isProcessing ? 'bg-gray-200' : 'bg-red-600'}`}
                        onPress={() => handleDecision(item.id, item.transactions.id, 'rejected')}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <ActivityIndicator color="#dc2626" size="small" />
                        ) : (
                            <>
                                <Ionicons name="close-circle" size={20} color="white" />
                                <Text className="text-white font-bold ml-2">Rejeter</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header stats */}
            <View className="p-4">
                <View className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex-row items-center">
                    <View className="bg-amber-100 p-3 rounded-full mr-4">
                        <Ionicons name="warning" size={24} color="#d97706" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-amber-800 font-bold text-lg">{alerts.length} alerte{alerts.length > 1 ? 's' : ''} en attente</Text>
                        <Text className="text-amber-600 text-sm">Transaction{alerts.length > 1 ? 's' : ''} nécessitant votre attention</Text>
                    </View>
                </View>
            </View>

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#0091D3" />
                </View>
            ) : (
                <FlatList
                    data={alerts}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 16, paddingTop: 0 }}
                    refreshControl={
                        <RefreshControl 
                            refreshing={refreshing} 
                            onRefresh={onRefresh}
                            tintColor="#0091D3"
                        />
                    }
                    ListEmptyComponent={
                        <View className="items-center py-16">
                            <View className="bg-green-100 p-6 rounded-full mb-4">
                                <Ionicons name="shield-checkmark" size={48} color="#16a34a" />
                            </View>
                            <Text className="text-gray-900 font-bold text-xl">Tout est en ordre !</Text>
                            <Text className="text-gray-500 mt-2 text-center px-8">
                                Aucune transaction suspecte en attente de vérification.
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
