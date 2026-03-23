import React from 'react';
import { ViewStyle } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAccessibility } from '@/lib/AccessibilityContext';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withSequence,
    withDelay,
    Easing,
} from 'react-native-reanimated';

const GLITCH_COLORS = ['rgba(1,58,251,0.5)', 'rgba(0,255,151,0.5)', 'rgba(255,30,247,0.5)', 'rgba(255,90,58,0.5)'];

type Props = {
    children: React.ReactNode;
    delay?: number;
    style?: ViewStyle;
};

export default function GlitchIn({ children, delay = 0, style }: Props) {
    const { prefs } = useAccessibility();
    const opacity = useSharedValue(0);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(14);
    const scaleX = useSharedValue(1);
    // RGB split layers
    const splitLeft = useSharedValue(0);
    const splitRight = useSharedValue(0);
    const splitOpacity = useSharedValue(0);
    const colorIndex = React.useRef(Math.floor(Math.random() * GLITCH_COLORS.length));

    function playGlitch() {
        colorIndex.current = Math.floor(Math.random() * GLITCH_COLORS.length);

        // Reset all
        opacity.value = 0;
        translateX.value = 0;
        translateY.value = 14;
        scaleX.value = 1;
        splitLeft.value = 0;
        splitRight.value = 0;
        splitOpacity.value = 0;

        // Main element: fast flicker then spring in
        opacity.value = withDelay(
            delay,
            withSequence(
                withTiming(0.6, { duration: 30 }),
                withTiming(0, { duration: 15 }),
                withTiming(0.8, { duration: 25 }),
                withTiming(0.2, { duration: 15 }),
                withTiming(1, { duration: 40 }),
            )
        );

        // Horizontal jitter then spring snap
        translateX.value = withDelay(
            delay,
            withSequence(
                withTiming(-16, { duration: 35, easing: Easing.linear }),
                withTiming(10, { duration: 25, easing: Easing.linear }),
                withTiming(-6, { duration: 20, easing: Easing.linear }),
                withSpring(0, { stiffness: 1200, damping: 80, mass: 1 }),
            )
        );

        // Slide up with spring
        translateY.value = withDelay(
            delay,
            withSpring(0, { stiffness: 800, damping: 60, mass: 1.5 })
        );

        // Width distortion snap
        scaleX.value = withDelay(
            delay,
            withSequence(
                withTiming(1.06, { duration: 30 }),
                withTiming(0.96, { duration: 25 }),
                withSpring(1, { stiffness: 1500, damping: 100, mass: 1 }),
            )
        );

        // RGB split: left and right offset then snap back
        splitLeft.value = withDelay(
            delay,
            withSequence(
                withTiming(-8, { duration: 40, easing: Easing.linear }),
                withTiming(-4, { duration: 20 }),
                withSpring(0, { stiffness: 1200, damping: 80, mass: 1 }),
            )
        );

        splitRight.value = withDelay(
            delay,
            withSequence(
                withTiming(8, { duration: 40, easing: Easing.linear }),
                withTiming(4, { duration: 20 }),
                withSpring(0, { stiffness: 1200, damping: 80, mass: 1 }),
            )
        );

        // Split layers flash
        splitOpacity.value = withDelay(
            delay,
            withSequence(
                withTiming(0.4, { duration: 35 }),
                withTiming(0.25, { duration: 25 }),
                withTiming(0, { duration: 80, easing: Easing.out(Easing.quad) }),
            )
        );
    }

    useFocusEffect(
        React.useCallback(() => {
            if (prefs.reduceMotion) {
                // Skip animation, just show immediately
                opacity.value = 1;
                translateX.value = 0;
                translateY.value = 0;
                scaleX.value = 1;
                splitOpacity.value = 0;
                return;
            }
            playGlitch();
        }, [prefs.reduceMotion])
    );

    const mainStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scaleX: scaleX.value },
        ],
    }));

    const leftSplitStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: splitLeft.value }],
        opacity: splitOpacity.value,
    }));

    const rightSplitStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: splitRight.value }],
        opacity: splitOpacity.value,
    }));

    const glitchColor = GLITCH_COLORS[colorIndex.current];
    const altColor = GLITCH_COLORS[(colorIndex.current + 2) % GLITCH_COLORS.length];

    return (
        <Animated.View style={[{ position: 'relative' }, style]}>
            {/* Left RGB split ghost */}
            <Animated.View
                pointerEvents="none"
                style={[
                    {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: glitchColor,
                    },
                    leftSplitStyle,
                ]}
            />
            {/* Right RGB split ghost */}
            <Animated.View
                pointerEvents="none"
                style={[
                    {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: altColor,
                    },
                    rightSplitStyle,
                ]}
            />
            {/* Main content */}
            <Animated.View style={mainStyle}>
                {children}
            </Animated.View>
        </Animated.View>
    );
}
