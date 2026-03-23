import React, { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence,
    withDelay,
    Easing,
} from 'react-native-reanimated';

type Props = {
    children: React.ReactNode;
    delay?: number;
    style?: ViewStyle;
};

export default function GlitchIn({ children, delay = 0, style }: Props) {
    const opacity = useSharedValue(0);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(8);
    const scaleX = useSharedValue(1);
    const clipRight = useSharedValue(0);

    useEffect(() => {
        // Glitch flicker
        opacity.value = withDelay(
            delay,
            withSequence(
                withTiming(0.4, { duration: 40 }),
                withTiming(0, { duration: 20 }),
                withTiming(0.7, { duration: 30 }),
                withTiming(0.3, { duration: 20 }),
                withTiming(1, { duration: 60, easing: Easing.out(Easing.quad) }),
            )
        );

        // Horizontal glitch offset
        translateX.value = withDelay(
            delay,
            withSequence(
                withTiming(-12, { duration: 40, easing: Easing.linear }),
                withTiming(8, { duration: 30, easing: Easing.linear }),
                withTiming(-4, { duration: 25, easing: Easing.linear }),
                withTiming(0, { duration: 50, easing: Easing.out(Easing.quad) }),
            )
        );

        // Slide up
        translateY.value = withDelay(
            delay,
            withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) })
        );

        // Width glitch
        scaleX.value = withDelay(
            delay,
            withSequence(
                withTiming(1.03, { duration: 40 }),
                withTiming(0.98, { duration: 30 }),
                withTiming(1, { duration: 60, easing: Easing.out(Easing.quad) }),
            )
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scaleX: scaleX.value },
        ],
    }));

    return (
        <Animated.View style={[style, animatedStyle]}>
            {children}
        </Animated.View>
    );
}
