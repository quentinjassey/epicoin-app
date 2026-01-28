import { SymbolView } from 'expo-symbols';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Colors } from '@/constants/NativeColors';

export default function PayScreen() {
    const [token, setToken] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        generatePaymentToken();
    }, [refreshKey]);

    async function generatePaymentToken() {
        setToken(null);
        const paymentToken = Crypto.randomUUID();
        setToken(paymentToken);
    }

    function handleRefresh() {
        setRefreshKey(prev => prev + 1);
    }

    if (!token) {
        return (
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: Colors.epitechBlue,
            }}>
                <ActivityIndicator size="large" color="#ffffff" />
            </View>
        );
    }

    return (
        <View style={{
            flex: 1,
            backgroundColor: Colors.epitechBlue,
        }}>
            {/* Header avec bouton retour */}
            <View style={{
                paddingTop: 64,
                paddingHorizontal: 24,
                flexDirection: 'row',
                alignItems: 'center',
            }}>
                <TouchableOpacity 
                    onPress={() => router.back()}
                    style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        padding: 12,
                        borderRadius: 24,
                        borderCurve: 'continuous',
                    }}
                >
                    <SymbolView 
                        name="chevron.left" 
                        size={24}
                        tintColor="#fff"
                    />
                </TouchableOpacity>
                <Text style={{
                    color: '#fff',
                    fontSize: 20,
                    fontWeight: '700',
                    marginLeft: 16,
                }}>
                    Payer
                </Text>
            </View>

            {/* QR Code Card */}
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 24,
            }}>
                <View style={{
                    backgroundColor: '#fff',
                    padding: 32,
                    borderRadius: 24,
                    borderCurve: 'continuous',
                    width: '100%',
                    alignItems: 'center',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                }}>
                    <View style={{
                        backgroundColor: 'rgba(0, 145, 211, 0.1)',
                        padding: 16,
                        borderRadius: 32,
                        borderCurve: 'continuous',
                        marginBottom: 16,
                    }}>
                        <SymbolView 
                            name="qrcode" 
                            size={32}
                            tintColor={Colors.epitechBlue}
                        />
                    </View>
                    
                    <Text style={{
                        fontSize: 24,
                        fontWeight: '700',
                        marginBottom: 8,
                        color: Colors.label,
                        textAlign: 'center',
                    }}>
                        Scanner pour payer
                    </Text>
                    <Text style={{
                        color: Colors.secondaryLabel,
                        marginBottom: 24,
                        textAlign: 'center',
                        paddingHorizontal: 16,
                        fontSize: 15,
                        lineHeight: 20,
                    }}>
                        Présentez ce QR code au distributeur pour payer avec vos EpiCoins.
                    </Text>

                    <View style={{
                        padding: 16,
                        backgroundColor: '#fff',
                        borderRadius: 16,
                        borderCurve: 'continuous',
                        borderWidth: 2,
                        borderColor: Colors.separator,
                        marginBottom: 24,
                    }}>
                        <QRCode
                            value={token}
                            size={200}
                            color="#0091D3"
                            backgroundColor="white"
                        />
                    </View>

                    {/* Token display */}
                    <View style={{
                        backgroundColor: Colors.systemFill,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 20,
                        borderCurve: 'continuous',
                        flexDirection: 'row',
                        alignItems: 'center',
                    }}>
                        <SymbolView 
                            name="key.fill" 
                            size={14}
                            tintColor={Colors.tertiaryLabel}
                        />
                        <Text selectable style={{
                            color: Colors.tertiaryLabel,
                            fontSize: 12,
                            fontFamily: 'SpaceMono',
                            marginLeft: 8,
                        }}>
                            {token.slice(0, 8)}...{token.slice(-4)}
                        </Text>
                    </View>
                </View>

                {/* Refresh button */}
                <TouchableOpacity 
                    onPress={handleRefresh}
                    style={{
                        marginTop: 24,
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        paddingHorizontal: 24,
                        paddingVertical: 12,
                        borderRadius: 20,
                        borderCurve: 'continuous',
                        flexDirection: 'row',
                        alignItems: 'center',
                    }}
                >
                    <SymbolView 
                        name="arrow.clockwise" 
                        size={20}
                        tintColor="#fff"
                    />
                    <Text style={{
                        color: '#fff',
                        fontWeight: '600',
                        marginLeft: 8,
                        fontSize: 15,
                    }}>
                        Générer un nouveau code
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={{
                paddingBottom: 48,
                alignItems: 'center',
            }}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                }}>
                    <SymbolView 
                        name="checkmark.shield.fill" 
                        size={16}
                        tintColor="rgba(255, 255, 255, 0.5)"
                    />
                    <Text style={{
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: 13,
                        marginLeft: 8,
                    }}>
                        Paiement sécurisé EpiPay
                    </Text>
                </View>
            </View>
        </View>
    );
}
