import React, { useEffect } from 'react';
import { Text, View, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    withSequence,
    Easing,
    runOnJS,
} from 'react-native-reanimated';
import Icon from '@/components/Icon';
import { Colors } from '@/constants/NativeColors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = {
    visible: boolean;
    title: string;
    body: string;
    type: string;
    onDismiss: () => void;
    primaryColor?: string;
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

export default function InAppNotification({ visible, title, body, type, onDismiss, primaryColor = '#013AFB' }: Props) {
    const translateY = useSharedValue(-120);
    const opacity = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            // Slide in
            translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.back(1.2)) });
            opacity.value = withTiming(1, { duration: 200 });

            // Auto dismiss after 5s
            translateY.value = withDelay(5000,
                withTiming(-120, { duration: 250, easing: Easing.in(Easing.quad) })
            );
            opacity.value = withDelay(5000,
                withTiming(0, { duration: 250 })
            );

            const timer = setTimeout(() => {
                onDismiss();
            }, 5300);

            return () => clearTimeout(timer);
        }
    }, [visible]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        opacity: opacity.value,
    }));

    function handleDismiss() {
        translateY.value = withTiming(-120, { duration: 200, easing: Easing.in(Easing.quad) });
        opacity.value = withTiming(0, { duration: 200 });
        setTimeout(onDismiss, 250);
    }

    if (!visible) return null;

    return (
        <Animated.View
            style={[
                {
                    position: 'absolute',
                    top: 50,
                    left: 12,
                    right: 12,
                    zIndex: 9999,
                },
                animatedStyle,
            ]}
        >
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleDismiss}
                style={{
                    backgroundColor: Colors.white,
                    borderWidth: 2,
                    borderColor: Colors.black,
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    shadowColor: Colors.black,
                    shadowOffset: { width: 4, height: 4 },
                    shadowOpacity: 1,
                    shadowRadius: 0,
                }}
            >
                <View style={{
                    backgroundColor: primaryColor,
                    padding: 8,
                    borderWidth: 2,
                    borderColor: Colors.black,
                    marginRight: 12,
                }}>
                    <Icon name={getIcon(type)} size={20} color={Colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{
                        fontWeight: '900',
                        fontSize: 13,
                        color: Colors.black,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                    }} numberOfLines={1}>
                        {title}
                    </Text>
                    <Text style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: Colors.mediumGray,
                        marginTop: 2,
                    }} numberOfLines={2}>
                        {body}
                    </Text>
                </View>
                <View style={{
                    width: 3,
                    height: '100%',
                    backgroundColor: primaryColor,
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                }} />
            </TouchableOpacity>
        </Animated.View>
    );
}
