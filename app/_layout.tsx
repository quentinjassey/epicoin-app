import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Session } from '@supabase/supabase-js';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { supabase } from '../lib/supabase';

export {
    ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
    initialRouteName: '(main)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [loaded, error] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
        ...FontAwesome.font,
    });

    useEffect(() => {
        if (error) throw error;
    }, [error]);

    useEffect(() => {
        if (loaded) {
            SplashScreen.hideAsync();
        }
    }, [loaded]);

    if (!loaded) {
        return null;
    }

    return <RootLayoutNav />;
}

function RootLayoutNav() {
    const colorScheme = useColorScheme();
    const segments = useSegments();
    const router = useRouter();
    const [session, setSession] = useState<Session | null>(null);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setInitialized(true);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!initialized) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (session && inAuthGroup) {
            router.replace('/(main)/(wallet)' as any);
        } else if (!session && !inAuthGroup) {
            router.replace('/(auth)/sign-in');
        }
    }, [session, segments, initialized]);

    // Epitech Brutalist Theme — light mode
    const EpitechTheme = {
        ...DefaultTheme,
        colors: {
            ...DefaultTheme.colors,
            primary: '#013AFB',
            background: '#FFFFFF',
            card: '#FFFFFF',
            text: '#181818',
            border: '#181818',
            notification: '#013AFB',
        },
    };

    return (
        <ThemeProvider value={EpitechTheme}>
            <StatusBar style="dark" translucent backgroundColor="transparent" />
            <Stack screenOptions={{ contentStyle: { backgroundColor: '#FFFFFF' } }}>
                <Stack.Screen name="(main)" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="admin" options={{ headerShown: false }} />
                <Stack.Screen
                    name="send"
                    options={{
                        presentation: 'formSheet',
                        sheetGrabberVisible: true,
                        sheetAllowedDetents: [0.9],
                        title: 'Envoyer',
                        headerTintColor: '#00ff97',
                    }}
                />
                <Stack.Screen
                    name="pay"
                    options={{
                        presentation: 'formSheet',
                        sheetGrabberVisible: true,
                        sheetAllowedDetents: [0.85],
                        title: 'Payer',
                        headerShown: false,
                    }}
                />
                <Stack.Screen
                    name="top-up"
                    options={{
                        presentation: 'formSheet',
                        sheetGrabberVisible: true,
                        sheetAllowedDetents: [0.85],
                        title: 'Recharger',
                        headerTintColor: '#00ff97',
                    }}
                />
            </Stack>
        </ThemeProvider>
    );
}
