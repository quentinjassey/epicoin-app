import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function SignIn() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    async function signInWithEmail() {
        if (!email || !password) {
            Alert.alert('Erreur', 'Veuillez remplir tous les champs');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            Alert.alert('Erreur', error.message);
            setLoading(false);
        } else {
            router.replace('/(tabs)');
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
        >
            <View className="flex-1 justify-center items-center bg-white p-6">
                {/* Logo */}
                <View className="mb-8 items-center">
                    <View className="bg-epitech-blue w-20 h-20 rounded-2xl items-center justify-center mb-4 shadow-lg shadow-blue-200">
                        <Ionicons name="wallet" size={40} color="white" />
                    </View>
                    <Text className="text-3xl font-bold text-gray-900">EpiPay</Text>
                    <Text className="text-gray-500 mt-1">Portefeuille digital Epitech</Text>
                </View>

                <View className="w-full max-w-sm">
                    <Text className="text-2xl font-bold mb-6 text-gray-900">Connexion</Text>

                    {/* Email */}
                    <View className="mb-4">
                        <Text className="text-gray-600 font-medium mb-2">Email</Text>
                        <View className="flex-row items-center border border-gray-300 rounded-xl bg-gray-50 px-4">
                            <Ionicons name="mail-outline" size={20} color="#9ca3af" />
                            <TextInput
                                className="flex-1 p-4 text-gray-900"
                                placeholder="prenom.nom@epitech.digital"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                placeholderTextColor="#9ca3af"
                            />
                        </View>
                    </View>

                    {/* Password */}
                    <View className="mb-6">
                        <Text className="text-gray-600 font-medium mb-2">Mot de passe</Text>
                        <View className="flex-row items-center border border-gray-300 rounded-xl bg-gray-50 px-4">
                            <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
                            <TextInput
                                className="flex-1 p-4 text-gray-900"
                                placeholder="••••••••"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                placeholderTextColor="#9ca3af"
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons 
                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                                    size={20} 
                                    color="#9ca3af" 
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Submit */}
                    <TouchableOpacity
                        className={`rounded-xl p-4 items-center shadow-lg flex-row justify-center ${loading ? 'bg-gray-300' : 'bg-epitech-blue shadow-blue-200'}`}
                        onPress={signInWithEmail}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="log-in-outline" size={22} color="white" style={{ marginRight: 8 }} />
                                <Text className="text-white font-bold text-lg">Se connecter</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Sign up link */}
                    <View className="flex-row justify-center mt-8">
                        <Text className="text-gray-600">Pas encore de compte ? </Text>
                        <Link href="/(auth)/sign-up" asChild>
                            <TouchableOpacity>
                                <Text className="text-epitech-blue font-bold">S'inscrire</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}
