import React, { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import Icon from '@/components/Icon';
import { Colors } from '@/constants/NativeColors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = {
    visible: boolean;
    title: string;
    body: string;
    type: string;
    onDismiss: () => void;
};

function getIcon(type: string): string {
    switch (type) {
        case 'transfer_received': return 'arrow.down.circle.fill';
        case 'transfer_sent': return 'arrow.up.circle.fill';
        case 'purchase': return 'cart.fill';
        case 'topup': return 'plus.circle.fill';
        case 'fraud_alert': return 'exclamationmark.triangle.fill';
        case 'fraud_resolved': return 'checkmark.shield.fill';
        case 'welcome': return 'person.fill';
        default: return 'bell.badge.fill';
    }
}

function getAccentColor(type: string): string {
    switch (type) {
        case 'transfer_received': return '#00C853';
        case 'transfer_sent': return '#013AFB';
        case 'purchase': return '#ff1ef7';
        case 'topup': return '#00C853';
        case 'fraud_alert': return '#ff5a3a';
        case 'fraud_resolved': return '#00C853';
        default: return '#013AFB';
    }
}

export default function NotifBanner({ visible, title, body, type, onDismiss }: Props) {
    const slideY = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideY, {
                    toValue: 0,
                    tension: 80,
                    friction: 10,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();

            const timer = setTimeout(() => {
                Animated.parallel([
                    Animated.timing(slideY, {
                        toValue: -100,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacity, {
                        toValue: 0,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                ]).start(() => onDismiss());
            }, 5000);

            return () => clearTimeout(timer);
        } else {
            slideY.setValue(-100);
            opacity.setValue(0);
        }
    }, [visible]);

    if (!visible) return null;

    const accent = getAccentColor(type);

    return (
        <Animated.View
            style={{
                position: 'absolute',
                top: 60,
                left: 16,
                right: 16,
                zIndex: 99999,
                elevation: 99999,
                opacity,
                transform: [{ translateY: slideY }],
            }}
        >
            <TouchableOpacity
                activeOpacity={0.95}
                onPress={() => {
                    Animated.parallel([
                        Animated.timing(slideY, { toValue: -100, duration: 200, useNativeDriver: true }),
                        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
                    ]).start(() => onDismiss());
                }}
                style={{
                    backgroundColor: Colors.white,
                    overflow: 'hidden',
                    borderWidth: 2,
                    borderColor: Colors.black,
                    shadowColor: Colors.black,
                    shadowOffset: { width: 4, height: 4 },
                    shadowOpacity: 1,
                    shadowRadius: 0,
                }}
            >
                {/* Accent bar at top */}
                <View style={{
                    height: 3,
                    backgroundColor: '#013AFB',
                }} />

                <View style={{
                    padding: 14,
                    paddingTop: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                }}>
                    {/* Icon */}
                    <View style={{
                        width: 36,
                        height: 36,
                        backgroundColor: '#013AFB',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                    }}>
                        <Icon name={getIcon(type)} size={18} color="#fff" />
                    </View>

                    {/* Content */}
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{
                                color: Colors.black,
                                fontWeight: '900',
                                fontSize: 13,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                flex: 1,
                            }} numberOfLines={1}>
                                {title}
                            </Text>
                            <Text style={{
                                color: Colors.mediumGray,
                                fontSize: 10,
                                fontWeight: '700',
                                marginLeft: 8,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                            }}>
                                NOW
                            </Text>
                        </View>
                        <Text style={{
                            color: Colors.mediumGray,
                            fontSize: 12,
                            fontWeight: '600',
                            marginTop: 3,
                            lineHeight: 17,
                        }} numberOfLines={2}>
                            {body}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}
