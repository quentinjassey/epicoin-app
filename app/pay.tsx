import Icon from '@/components/Icon';
import * as Crypto from 'expo-crypto';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Colors } from '@/constants/NativeColors';
import { useAccessibility } from '@/lib/AccessibilityContext';

export default function PayScreen() {
    const { adaptiveColors } = useAccessibility();
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
                backgroundColor: adaptiveColors.primary,
            }}>
                <ActivityIndicator size="large" color={Colors.white} />
            </View>
        );
    }

    return (
        <View style={{
            flex: 1,
            backgroundColor: adaptiveColors.primary,
        }}>

            {/* QR Code Card */}
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 24,
            }}>
                <View style={{
                    backgroundColor: Colors.white,
                    padding: 32,
                    borderRadius: 0,
                    width: '100%',
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: Colors.black,
                    shadowColor: Colors.black,
                    shadowOffset: { width: 4, height: 4 },
                    shadowOpacity: 1,
                    shadowRadius: 0,
                }}>
                    <Text style={{
                        fontSize: 24,
                        fontWeight: '900',
                        marginBottom: 8,
                        color: Colors.black,
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        letterSpacing: 1,
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
                        fontWeight: '700',
                    }}>
                        Présentez ce QR code au distributeur pour payer avec vos EpiCoins.
                    </Text>

                    <View style={{
                        padding: 16,
                        backgroundColor: Colors.white,
                        borderRadius: 0,
                        borderWidth: 2,
                        borderColor: Colors.black,
                        marginBottom: 24,
                    }}>
                        <QRCode
                            value={token}
                            size={200}
                            color={adaptiveColors.primary}
                            backgroundColor="white"
                        />
                    </View>

                    {/* Token display */}
                    <View style={{
                        backgroundColor: Colors.offWhite,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 0,
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderWidth: 2,
                        borderColor: Colors.black,
                    }}>
                        <Icon
                            name="key.fill"
                            size={14}
                            color={Colors.tertiaryLabel}
                        />
                        <Text selectable style={{
                            color: Colors.tertiaryLabel,
                            fontSize: 12,
                            fontFamily: 'SpaceMono',
                            marginLeft: 8,
                            fontWeight: '700',
                        }}>
                            {token.slice(0, 8)}...{token.slice(-4)}
                        </Text>
                    </View>
                </View>

                {/* Refresh button */}
                <TouchableOpacity
                    onPress={handleRefresh}
                    style={{
                        marginTop: 16,
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        paddingHorizontal: 24,
                        paddingVertical: 12,
                        borderRadius: 0,
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderWidth: 2,
                        borderColor: Colors.white,
                    }}
                >
                    <Icon
                        name="arrow.clockwise"
                        size={20}
                        color={Colors.white}
                    />
                    <Text style={{
                        color: Colors.white,
                        fontWeight: '800',
                        marginLeft: 8,
                        fontSize: 15,
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                    }}>
                        Nouveau code
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={{
                paddingBottom: 40,
                marginTop: 16,
                alignItems: 'center',
            }}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                }}>
                    <Icon
                        name="checkmark.shield.fill"
                        size={14}
                        color="rgba(255, 255, 255, 0.5)"
                    />
                    <Text style={{
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: 12,
                        marginLeft: 6,
                        fontWeight: '700',
                    }}>
                        Paiement securise EpiPay
                    </Text>
                </View>
            </View>
        </View>
    );
}
