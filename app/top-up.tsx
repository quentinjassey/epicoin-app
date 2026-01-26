import { Ionicons } from '@expo/vector-icons';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { collectTransactionContext } from '../lib/transactionContext';

const CONVERSION_RATE = 5; // 1€ = 5 EPC

interface TopUpOption {
    id: string;
    euros: number;
    bonus: number;
    popular?: boolean;
    bestValue?: boolean;
}

const TOPUP_OPTIONS: TopUpOption[] = [
    { 
        id: 'starter', 
        euros: 5, 
        bonus: 0 
    },
    { 
        id: 'standard', 
        euros: 10, 
        bonus: 5,
        popular: true 
    },
    { 
        id: 'premium', 
        euros: 20, 
        bonus: 15 
    },
    { 
        id: 'ultimate', 
        euros: 50, 
        bonus: 50,
        bestValue: true 
    },
];

function TopUpContent() {
    const [selectedOption, setSelectedOption] = useState<TopUpOption | null>(null);
    const [loading, setLoading] = useState(false);
    const { initPaymentSheet, presentPaymentSheet } = useStripe();

    function getBaseEpc(euros: number): number {
        return euros * CONVERSION_RATE;
    }

    function getTotalEpc(euros: number, bonus: number): number {
        return getBaseEpc(euros) + bonus;
    }

    async function handlePayment() {
        if (!selectedOption) return;

        setLoading(true);

        try {
            // Collecter le contexte
            const context = await collectTransactionContext();

            const totalEpc = getTotalEpc(selectedOption.euros, selectedOption.bonus);

            // Créer le Payment Intent avec le bonus
            const { data, error } = await supabase.functions.invoke('create-payment-intent', {
                body: { 
                    amount: selectedOption.euros,
                    bonus: selectedOption.bonus,
                    epc_amount: totalEpc,
                    context: {
                        country: context.location_info.country,
                        city: context.location_info.city,
                        device_info: context.device_info,
                    }
                },
            });

            if (error || !data?.clientSecret) {
                Alert.alert('Erreur', 'Impossible d\'initialiser le paiement. Veuillez réessayer.');
                setLoading(false);
                return;
            }

            // Initialiser Stripe Payment Sheet
            const { error: initError } = await initPaymentSheet({
                merchantDisplayName: 'EpiCoin',
                paymentIntentClientSecret: data.clientSecret,
                defaultBillingDetails: {
                    name: 'Étudiant Epitech',
                },
                appearance: {
                    colors: {
                        primary: '#0091D3',
                    },
                },
            });

            if (initError) {
                Alert.alert('Erreur', initError.message);
                setLoading(false);
                return;
            }

            // Présenter le Payment Sheet
            const { error: presentError } = await presentPaymentSheet();

            if (presentError) {
                if (presentError.code !== 'Canceled') {
                    Alert.alert('Paiement échoué', presentError.message);
                }
                setLoading(false);
                return;
            }

            // Confirmer le paiement
            const { data: confirmData, error: confirmError } = await supabase.functions.invoke('confirm-payment', {
                body: { payment_intent_id: data.id },
            });

            if (confirmError) {
                console.error('Confirm error:', confirmError);
                Alert.alert(
                    'Vérification échouée', 
                    'Le paiement a réussi mais la vérification a échoué. Contactez le support si votre solde n\'est pas crédité.'
                );
                setLoading(false);
                return;
            }

            // Gérer les différents statuts
            if (confirmData) {
                if (confirmData.status === 'blocked') {
                    Alert.alert(
                        '🚨 Transaction Bloquée',
                        'Cette transaction a été bloquée par notre système de sécurité. Un remboursement sera initié.',
                        [{ text: 'Compris', onPress: () => router.back() }]
                    );
                } else if (confirmData.status === 'pending_review') {
                    Alert.alert(
                        '⚠️ Vérification Requise',
                        `Votre rechargement de ${totalEpc} EPC est en attente de vérification de sécurité. Vous serez notifié une fois validé.`,
                        [{ text: 'Compris', onPress: () => router.back() }]
                    );
                } else if (confirmData.status === 'completed' || confirmData.success) {
                    Alert.alert(
                        '✅ Rechargement Réussi !',
                        `${totalEpc} EPC ont été ajoutés à votre portefeuille.`,
                        [{ text: 'Super !', onPress: () => router.back() }]
                    );
                } else {
                    Alert.alert(
                        'Erreur',
                        confirmData.message || 'Une erreur est survenue. Contactez le support si nécessaire.',
                        [{ text: 'OK', onPress: () => router.back() }]
                    );
                }
            }

        } catch (error: any) {
            console.error('Top-up error:', error);
            Alert.alert(
                'Erreur',
                'Une erreur est survenue. Contactez le support si votre solde n\'est pas crédité.'
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <ScrollView className="flex-1 bg-gradient-to-b from-blue-50 to-white">
            <View className="p-6">
                {/* Header */}
                <View className="mb-6">
                    <Text className="text-3xl font-bold text-gray-900 mb-2">Recharger</Text>
                    <Text className="text-gray-500 text-base">
                        Choisissez le montant à ajouter à votre portefeuille
                    </Text>
                </View>

                {/* Conversion Info */}
                <View className="bg-blue-50 rounded-2xl p-4 mb-6 border border-blue-100">
                    <View className="flex-row items-center">
                        <View className="bg-blue-100 p-2 rounded-full mr-3">
                            <Ionicons name="information-circle" size={24} color="#0091D3" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-blue-900 font-semibold">Taux de conversion</Text>
                            <Text className="text-blue-700">1€ = {CONVERSION_RATE} EPC</Text>
                        </View>
                    </View>
                </View>

                {/* Options de rechargement */}
                <View className="space-y-3">
                    {TOPUP_OPTIONS.map((option) => {
                        const isSelected = selectedOption?.id === option.id;
                        const baseEpc = getBaseEpc(option.euros);
                        const totalEpc = getTotalEpc(option.euros, option.bonus);
                        const savings = option.bonus > 0 ? ((option.bonus / baseEpc) * 100).toFixed(0) : 0;

                        return (
                            <TouchableOpacity
                                key={option.id}
                                className={`rounded-2xl border-2 p-5 ${
                                    isSelected 
                                        ? 'border-epitech-blue bg-blue-50' 
                                        : 'border-gray-200 bg-white'
                                }`}
                                onPress={() => setSelectedOption(option)}
                                activeOpacity={0.7}
                            >
                                {/* Badge Popular / Best Value */}
                                {(option.popular || option.bestValue) && (
                                    <View className="absolute -top-2 -right-2 z-10">
                                        <View className={`${option.bestValue ? 'bg-green-500' : 'bg-orange-500'} px-3 py-1 rounded-full`}>
                                            <Text className="text-white text-xs font-bold">
                                                {option.bestValue ? '🔥 MEILLEUR' : '⭐ POPULAIRE'}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                <View className="flex-row items-center justify-between">
                                    {/* Prix en € */}
                                    <View className="flex-1">
                                        <Text className={`text-4xl font-bold ${isSelected ? 'text-epitech-blue' : 'text-gray-900'}`}>
                                            {option.euros}€
                                        </Text>
                                        <Text className="text-gray-500 text-sm mt-1">
                                            à payer
                                        </Text>
                                    </View>

                                    {/* Flèche */}
                                    <View className="mx-4">
                                        <Ionicons 
                                            name="arrow-forward" 
                                            size={32} 
                                            color={isSelected ? '#0091D3' : '#9CA3AF'} 
                                        />
                                    </View>

                                    {/* Montant EPC */}
                                    <View className="flex-1 items-end">
                                        <Text className={`text-4xl font-bold ${isSelected ? 'text-epitech-blue' : 'text-gray-900'}`}>
                                            {totalEpc}
                                        </Text>
                                        <Text className={`text-sm font-semibold mt-1 ${isSelected ? 'text-epitech-blue' : 'text-gray-600'}`}>
                                            EPC reçus
                                        </Text>
                                    </View>
                                </View>

                                {/* Détails du bonus */}
                                {option.bonus > 0 && (
                                    <View className="mt-4 pt-4 border-t border-gray-200">
                                        <View className="flex-row items-center justify-between">
                                            <View className="flex-1">
                                                <Text className="text-gray-600 text-sm">Montant de base</Text>
                                                <Text className="text-gray-900 font-medium">{baseEpc} EPC</Text>
                                            </View>
                                            <View className="mx-2">
                                                <Ionicons name="add" size={16} color="#10B981" />
                                            </View>
                                            <View className="flex-1 items-end">
                                                <Text className="text-green-600 text-sm font-semibold">Bonus +{savings}%</Text>
                                                <Text className="text-green-600 font-bold">+{option.bonus} EPC</Text>
                                            </View>
                                        </View>
                                    </View>
                                )}

                                {/* Radio button */}
                                <View className="absolute top-5 right-5">
                                    <View className={`w-6 h-6 rounded-full border-2 ${
                                        isSelected 
                                            ? 'border-epitech-blue bg-epitech-blue' 
                                            : 'border-gray-300 bg-white'
                                    } items-center justify-center`}>
                                        {isSelected && (
                                            <View className="w-3 h-3 rounded-full bg-white" />
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Récapitulatif */}
                {selectedOption && (
                    <View className="mt-6 bg-gray-50 rounded-2xl p-5 border border-gray-200">
                        <Text className="text-gray-900 font-bold text-lg mb-4">Récapitulatif</Text>
                        
                        <View className="flex-row justify-between mb-3">
                            <Text className="text-gray-600">Vous payez</Text>
                            <Text className="text-gray-900 font-bold text-lg">{selectedOption.euros}€</Text>
                        </View>

                        <View className="flex-row justify-between mb-3">
                            <Text className="text-gray-600">Vous recevez</Text>
                            <Text className="text-epitech-blue font-bold text-xl">
                                {getTotalEpc(selectedOption.euros, selectedOption.bonus)} EPC
                            </Text>
                        </View>

                        {selectedOption.bonus > 0 && (
                            <View className="flex-row justify-between pt-3 border-t border-gray-300">
                                <Text className="text-green-600 font-medium">Dont bonus offert</Text>
                                <Text className="text-green-600 font-bold">+{selectedOption.bonus} EPC 🎁</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Bouton Payer */}
                <TouchableOpacity
                    className={`mt-6 p-5 rounded-2xl items-center shadow-lg flex-row justify-center ${
                        !selectedOption || loading 
                            ? 'bg-gray-300' 
                            : 'bg-epitech-blue'
                    }`}
                    disabled={!selectedOption || loading}
                    onPress={handlePayment}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" size="large" />
                    ) : (
                        <>
                            <Ionicons name="card-outline" size={28} color="white" style={{ marginRight: 10 }} />
                            <Text className="text-white font-bold text-xl">
                                {selectedOption 
                                    ? `Payer ${selectedOption.euros}€` 
                                    : 'Choisissez un montant'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Sécurité */}
                <View className="mt-6 flex-row items-center justify-center">
                    <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                    <Text className="text-gray-500 ml-2">Paiement 100% sécurisé par Stripe</Text>
                </View>

                <View className="mt-2 flex-row items-center justify-center">
                    <Ionicons name="lock-closed" size={16} color="#9CA3AF" />
                    <Text className="text-gray-400 text-sm ml-2">Vos données sont protégées</Text>
                </View>
            </View>
        </ScrollView>
    );
}

export default function TopUpScreen() {
    return (
        <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''}>
            <TopUpContent />
        </StripeProvider>
    );
}
