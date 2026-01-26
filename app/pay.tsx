import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export default function PayScreen() {
    const [token, setToken] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        generatePaymentToken();
    }, [refreshKey]);

    async function generatePaymentToken() {
        setToken(null);
        // Génère un nouveau token pour le QR code
        const paymentToken = Crypto.randomUUID();
        setToken(paymentToken);
    }

    function handleRefresh() {
        setRefreshKey(prev => prev + 1);
    }

    if (!token) {
        return (
            <View className="flex-1 justify-center items-center bg-epitech-blue">
                <ActivityIndicator size="large" color="#ffffff" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-epitech-blue">
            {/* Header avec bouton retour */}
            <View className="pt-16 px-6 flex-row items-center">
                <TouchableOpacity 
                    onPress={() => router.back()}
                    className="bg-white/20 p-3 rounded-full"
                >
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text className="text-white text-xl font-bold ml-4">Payer</Text>
            </View>

            {/* QR Code Card */}
            <View className="flex-1 justify-center items-center px-6">
                <View className="bg-white p-8 rounded-3xl w-full items-center shadow-2xl">
                    <View className="bg-epitech-blue/10 p-4 rounded-full mb-4">
                        <Ionicons name="qr-code" size={32} color="#0091D3" />
                    </View>
                    
                    <Text className="text-2xl font-bold mb-2 text-gray-900">Scanner pour payer</Text>
                    <Text className="text-gray-500 mb-6 text-center px-4">
                        Présentez ce QR code au distributeur pour payer avec vos EpiCoins.
                    </Text>

                    <View className="p-4 bg-white rounded-2xl shadow-inner border-2 border-gray-100 mb-6">
                        <QRCode
                            value={token}
                            size={200}
                            color="#0091D3"
                            backgroundColor="white"
                        />
                    </View>

                    {/* Token display */}
                    <View className="bg-gray-50 px-4 py-2 rounded-full flex-row items-center">
                        <Ionicons name="key-outline" size={14} color="#9ca3af" />
                        <Text className="text-gray-400 text-xs font-mono ml-2">
                            {token.slice(0, 8)}...{token.slice(-4)}
                        </Text>
                    </View>
                </View>

                {/* Refresh button */}
                <TouchableOpacity 
                    onPress={handleRefresh}
                    className="mt-6 bg-white/20 px-6 py-3 rounded-full flex-row items-center"
                >
                    <Ionicons name="refresh" size={20} color="white" />
                    <Text className="text-white font-semibold ml-2">Générer un nouveau code</Text>
                </TouchableOpacity>
            </View>

            {/* Footer */}
            <View className="pb-12 items-center">
                <View className="flex-row items-center">
                    <Ionicons name="shield-checkmark" size={16} color="#ffffff80" />
                    <Text className="text-white/60 text-sm ml-2">Paiement sécurisé EpiPay</Text>
                </View>
            </View>
        </View>
    );
}
