import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

const CAMPUSES = [
    { id: 'paris', name: 'Paris', icon: '🗼' },
    { id: 'lyon', name: 'Lyon', icon: '🦁' },
    { id: 'bordeaux', name: 'Bordeaux', icon: '🍷' },
    { id: 'lille', name: 'Lille', icon: '⚜️' },
    { id: 'marseille', name: 'Marseille', icon: '☀️' },
    { id: 'montpellier', name: 'Montpellier', icon: '🌴' },
    { id: 'nancy', name: 'Nancy', icon: '🏛️' },
    { id: 'nantes', name: 'Nantes', icon: '🐘' },
    { id: 'nice', name: 'Nice', icon: '🏖️' },
    { id: 'rennes', name: 'Rennes', icon: '🦊' },
    { id: 'strasbourg', name: 'Strasbourg', icon: '🥨' },
    { id: 'toulouse', name: 'Toulouse', icon: '🚀' },
];

export default function SignUp() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [campus, setCampus] = useState('');
    const [showCampusModal, setShowCampusModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    async function signUpWithEmail() {
        // Validation
        if (!fullName || !email || !password || !confirmPassword || !campus) {
            Alert.alert('Erreur', 'Veuillez remplir tous les champs');
            return;
        }

        if (!email.endsWith('@epitech.digital')) {
            Alert.alert('Accès restreint', 'Seuls les emails @epitech.digital sont autorisés.');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    campus: campus,
                },
            },
        });

        if (error) {
            Alert.alert('Erreur', error.message);
            setLoading(false);
        } else {
            Alert.alert(
                'Inscription réussie ! 🎉', 
                'Vérifiez votre boîte mail pour confirmer votre compte.',
                [{ text: 'OK', onPress: () => router.replace('/(auth)/sign-in') }]
            );
            setLoading(false);
        }
    }

    const selectedCampus = CAMPUSES.find(c => c.name === campus);

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
        >
            <ScrollView className="flex-1 bg-white" contentContainerStyle={{ flexGrow: 1 }}>
                <View className="flex-1 justify-center items-center p-6 py-12">
                    {/* Header */}
                    <View className="mb-6 items-center">
                        <View className="bg-epitech-blue w-16 h-16 rounded-2xl items-center justify-center mb-3 shadow-lg shadow-blue-200">
                            <Ionicons name="wallet" size={32} color="white" />
                        </View>
                        <Text className="text-2xl font-bold text-gray-900">Créer un compte</Text>
                        <Text className="text-gray-500 mt-1">Rejoignez l'économie EpiPay</Text>
                    </View>

                    <View className="w-full max-w-sm">
                        {/* Full Name */}
                        <View className="mb-4">
                            <Text className="text-gray-600 font-medium mb-2">Nom complet</Text>
                            <View className="flex-row items-center border border-gray-300 rounded-xl bg-gray-50 px-4">
                                <Ionicons name="person-outline" size={20} color="#9ca3af" />
                                <TextInput
                                    className="flex-1 p-4 text-gray-900"
                                    placeholder="Jean Dupont"
                                    value={fullName}
                                    onChangeText={setFullName}
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>
                        </View>

                        {/* Email */}
                        <View className="mb-4">
                            <Text className="text-gray-600 font-medium mb-2">Email Epitech</Text>
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

                        {/* Campus */}
                        <View className="mb-4">
                            <Text className="text-gray-600 font-medium mb-2">Campus</Text>
                            <TouchableOpacity
                                className="flex-row items-center border border-gray-300 rounded-xl bg-gray-50 px-4 py-4"
                                onPress={() => setShowCampusModal(true)}
                            >
                                <Ionicons name="location-outline" size={20} color="#9ca3af" />
                                <Text className={`flex-1 ml-3 ${campus ? 'text-gray-900' : 'text-gray-400'}`}>
                                    {selectedCampus ? `${selectedCampus.icon} ${selectedCampus.name}` : 'Sélectionner votre campus'}
                                </Text>
                                <Ionicons name="chevron-down" size={20} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>

                        {/* Password */}
                        <View className="mb-4">
                            <Text className="text-gray-600 font-medium mb-2">Mot de passe</Text>
                            <View className="flex-row items-center border border-gray-300 rounded-xl bg-gray-50 px-4">
                                <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
                                <TextInput
                                    className="flex-1 p-4 text-gray-900"
                                    placeholder="Minimum 6 caractères"
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

                        {/* Confirm Password */}
                        <View className="mb-6">
                            <Text className="text-gray-600 font-medium mb-2">Confirmer le mot de passe</Text>
                            <View className="flex-row items-center border border-gray-300 rounded-xl bg-gray-50 px-4">
                                <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
                                <TextInput
                                    className="flex-1 p-4 text-gray-900"
                                    placeholder="Retapez votre mot de passe"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showPassword}
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>
                        </View>

                        {/* Submit */}
                        <TouchableOpacity
                            className={`rounded-xl p-4 items-center shadow-lg flex-row justify-center ${loading ? 'bg-gray-300' : 'bg-epitech-blue shadow-blue-200'}`}
                            onPress={signUpWithEmail}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="person-add-outline" size={22} color="white" style={{ marginRight: 8 }} />
                                    <Text className="text-white font-bold text-lg">S'inscrire</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Sign in link */}
                        <View className="flex-row justify-center mt-6">
                            <Text className="text-gray-600">Déjà un compte ? </Text>
                            <Link href="/(auth)/sign-in" asChild>
                                <TouchableOpacity>
                                    <Text className="text-epitech-blue font-bold">Se connecter</Text>
                                </TouchableOpacity>
                            </Link>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Campus Modal */}
            <Modal
                visible={showCampusModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowCampusModal(false)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl max-h-[70%]">
                        <View className="flex-row justify-between items-center p-6 border-b border-gray-100">
                            <Text className="text-xl font-bold text-gray-900">Choisir un campus</Text>
                            <TouchableOpacity 
                                onPress={() => setShowCampusModal(false)}
                                className="bg-gray-100 p-2 rounded-full"
                            >
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="px-4">
                            {CAMPUSES.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    className={`p-4 border-b border-gray-100 flex-row items-center ${campus === item.name ? 'bg-blue-50' : ''}`}
                                    onPress={() => {
                                        setCampus(item.name);
                                        setShowCampusModal(false);
                                    }}
                                >
                                    <Text className="text-2xl mr-3">{item.icon}</Text>
                                    <Text className={`text-lg flex-1 ${campus === item.name ? 'text-epitech-blue font-bold' : 'text-gray-700'}`}>
                                        {item.name}
                                    </Text>
                                    {campus === item.name && (
                                        <Ionicons name="checkmark-circle" size={24} color="#0091D3" />
                                    )}
                                </TouchableOpacity>
                            ))}
                            <View className="h-8" />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}
