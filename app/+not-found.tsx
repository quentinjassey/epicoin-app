import { Ionicons } from '@expo/vector-icons';
import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFoundScreen() {
    return (
        <>
            <Stack.Screen options={{ title: 'Page introuvable' }} />
            <View className="flex-1 items-center justify-center bg-gray-50 p-6">
                <View className="bg-gray-100 p-6 rounded-full mb-6">
                    <Ionicons name="alert-circle-outline" size={64} color="#9ca3af" />
                </View>
                
                <Text className="text-2xl font-bold text-gray-900 mb-2">
                    Page introuvable
                </Text>
                <Text className="text-gray-500 text-center mb-8">
                    Cette page n'existe pas ou a été déplacée.
                </Text>

                <Link href="/" className="bg-epitech-blue px-6 py-4 rounded-xl">
                    <Text className="text-white font-bold text-lg">
                        Retour à l'accueil
                    </Text>
                </Link>
            </View>
        </>
    );
}
