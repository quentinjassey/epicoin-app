import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { collectTransactionContext, buildTransactionPayload } from '../lib/transactionContext';

type UserProfile = {
    id: string;
    email: string;
    full_name: string;
};

type BiometricType = 'faceid' | 'touchid' | 'fingerprint' | 'none';

export default function SendScreen() {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [authMethod, setAuthMethod] = useState<'biometric' | 'password' | null>(null);
    const [biometricType, setBiometricType] = useState<BiometricType>('none');
    const [password, setPassword] = useState('');
    const [verifying, setVerifying] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (searchQuery.length > 2 && !selectedUser) {
            searchUsers(searchQuery);
        } else {
            setSearchResults([]);
        }
    }, [searchQuery]);

    useEffect(() => {
        checkBiometricAvailability();
    }, []);

    async function checkBiometricAvailability() {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        
        if (hasHardware && isEnrolled) {
            setAuthMethod('biometric');
            
            // Détermine le type de biométrie disponible
            const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
            
            if (Platform.OS === 'ios') {
                if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
                    setBiometricType('faceid');
                } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
                    setBiometricType('touchid');
                }
            } else {
                // Android
                if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
                    setBiometricType('fingerprint');
                }
            }
        } else {
            setAuthMethod('password');
            setBiometricType('none');
        }
    }
    
    function getBiometricLabel(): string {
        switch (biometricType) {
            case 'faceid':
                return 'Face ID';
            case 'touchid':
                return 'Touch ID';
            case 'fingerprint':
                return 'Empreinte digitale';
            default:
                return 'Biométrie';
        }
    }
    
    function getBiometricIcon(): string {
        switch (biometricType) {
            case 'faceid':
                return 'scan';
            case 'touchid':
            case 'fingerprint':
                return 'finger-print';
            default:
                return 'lock-closed';
        }
    }

    async function searchUsers(query: string) {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
            .limit(5);

        if (!error && data) {
            setSearchResults(data);
        }
    }

    function handleSelectUser(user: UserProfile) {
        setSelectedUser(user);
        setSearchQuery(user.email);
        setSearchResults([]);
    }

    function handlePreTransfer() {
        if (!selectedUser || !amount) {
            Alert.alert('Erreur', 'Veuillez sélectionner un destinataire et entrer un montant');
            return;
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            Alert.alert('Erreur', 'Montant invalide');
            return;
        }

        setPassword('');
        setShowConfirmModal(true);
    }

    async function handleConfirm() {
        if (authMethod === 'biometric') {
            const promptMessage = biometricType === 'faceid' 
                ? 'Confirmez le transfert avec Face ID'
                : biometricType === 'touchid'
                ? 'Confirmez le transfert avec Touch ID'
                : 'Confirmez le transfert avec votre empreinte';
                
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage,
                fallbackLabel: 'Utiliser le mot de passe',
                cancelLabel: 'Annuler',
                disableDeviceFallback: true, // Désactive le fallback vers le code iOS
            });

            if (result.success) {
                handleTransfer();
            } else if (result.error === 'user_cancel' || result.error === 'system_cancel') {
                // Ne rien faire si annulé
            } else {
                // Fallback vers mot de passe si la biométrie échoue
                setAuthMethod('password');
            }
        } else {
            // Vérifier le mot de passe
            if (!password) {
                Alert.alert('Erreur', 'Veuillez entrer votre mot de passe');
                return;
            }
            setVerifying(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user && user.email) {
                const { error } = await supabase.auth.signInWithPassword({
                    email: user.email,
                    password: password,
                });

                if (error) {
                    Alert.alert('Erreur', 'Mot de passe incorrect');
                    setVerifying(false);
                } else {
                    setVerifying(false);
                    handleTransfer();
                }
            } else {
                setVerifying(false);
                Alert.alert('Erreur', 'Session utilisateur introuvable');
            }
        }
    }

    async function handleTransfer() {
        setShowConfirmModal(false);
        setLoading(true);

        const parsedAmount = parseFloat(amount);

        try {
            // Récupérer l'utilisateur actuel
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Session utilisateur introuvable');
            }

            // Collecter le contexte de la transaction
            const context = await collectTransactionContext();

            // Construire le payload enrichi pour fraud-detection
            const payload = buildTransactionPayload({
                userId: user.id,
                amount: parsedAmount,
                type: 'transfer',
                recipientEmail: selectedUser?.email,
                recipientId: selectedUser?.id,
                description: `Transfert à ${selectedUser?.full_name || selectedUser?.email}`,
                context,
            });

            // Appeler fraud-detection Edge Function
            const { data: fraudResponse, error: fraudError } = await supabase.functions.invoke('fraud-detection', {
                body: { transaction: payload }
            });

            if (fraudError) {
                console.warn('[Send] Fraud detection unavailable, proceeding without ML:', fraudError);
                // Continue sans fraud detection si l'Edge Function échoue
            }

            // Vérifier si la transaction est bloquée par fraud-detection
            if (fraudResponse?.decision === 'blocked') {
                Alert.alert(
                    'Transaction Bloquée', 
                    fraudResponse.reason || 'Cette transaction a été bloquée par notre système de sécurité.',
                    [{ text: 'OK', onPress: () => router.back() }]
                );
                return;
            }

            // Effectuer le transfert avec les scores de fraude
            const { data, error } = await supabase.rpc('transfer_epicoin', {
                receiver_email: selectedUser?.email,
                amount: parsedAmount,
                fraud_score: fraudResponse?.riskScore || 0,
                fraud_features: fraudResponse?.features || {}
            });

            if (error) throw error;

            if (data && data.success) {
                if (data.status === 'pending_review') {
                    Alert.alert('Vérification de sécurité', 'Votre transaction a été signalée pour vérification de sécurité. Elle sera traitée après approbation par un administrateur.', [
                        { text: 'OK', onPress: () => router.back() }
                    ]);
                } else {
                    Alert.alert('Succès', `${parsedAmount} EPC envoyés à ${selectedUser?.full_name || selectedUser?.email}`, [
                        { text: 'OK', onPress: () => router.back() }
                    ]);
                }
            } else {
                Alert.alert('Erreur', data?.message || 'Le transfert a échoué');
            }
        } catch (error: any) {
            Alert.alert('Erreur', error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <View className="flex-1 bg-white p-6">
            <Text className="text-3xl font-bold mb-2 text-epitech-blue">Envoyer des EpiCoin</Text>
            <Text className="text-gray-500 mb-8 text-base">Transférez des fonds en toute sécurité à un autre étudiant.</Text>

            {/* Recherche de destinataire */}
            <View className="mb-6 z-10">
                <Text className="text-gray-700 font-semibold mb-2">Destinataire</Text>
                <View className="flex-row items-center border border-gray-300 rounded-xl bg-gray-50 px-4 py-3 focus:border-epitech-blue relative">
                    <Ionicons name="search-outline" size={20} color="#6b7280" style={{ marginRight: 10 }} />
                    <TextInput
                        className="flex-1 text-gray-900 text-base"
                        placeholder="Rechercher par nom ou email..."
                        value={searchQuery}
                        onChangeText={(text) => {
                            setSearchQuery(text);
                            setSelectedUser(null);
                        }}
                        autoCapitalize="none"
                        placeholderTextColor="#9ca3af"
                    />
                    {selectedUser && (
                        <TouchableOpacity onPress={() => {
                            setSearchQuery('');
                            setSelectedUser(null);
                        }}>
                            <Ionicons name="close-circle" size={20} color="#9ca3af" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && !selectedUser && (
                    <View className="absolute top-20 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-hidden">
                        <FlatList
                            data={searchResults}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    className="p-3 border-b border-gray-100 active:bg-gray-50"
                                    onPress={() => handleSelectUser(item)}
                                >
                                    <Text className="font-bold text-gray-900">{item.full_name}</Text>
                                    <Text className="text-sm text-gray-500">{item.email}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                )}
            </View>

            {/* Montant */}
            <View className="mb-8">
                <Text className="text-gray-700 font-semibold mb-2">Montant (EPC)</Text>
                <View className="flex-row items-center border border-gray-300 rounded-xl bg-gray-50 px-4 py-3 focus:border-epitech-blue">
                    <Text className="text-gray-500 font-bold mr-2">EPC</Text>
                    <TextInput
                        className="flex-1 text-gray-900 text-2xl font-bold"
                        placeholder="0.00"
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                        placeholderTextColor="#9ca3af"
                    />
                </View>
            </View>

            {/* Bouton d'envoi */}
            <TouchableOpacity
                className={`p-5 rounded-2xl items-center shadow-lg flex-row justify-center ${loading ? 'bg-gray-300' : 'bg-epitech-blue shadow-blue-200'}`}
                onPress={handlePreTransfer}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <>
                        <Ionicons name="send" size={24} color="white" style={{ marginRight: 8 }} />
                        <Text className="text-white font-bold text-xl">Envoyer</Text>
                    </>
                )}
            </TouchableOpacity>

            {/* Confirmation Modal */}
            <Modal
                visible={showConfirmModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowConfirmModal(false)}
            >
                <View className="flex-1 justify-center items-center bg-black/50 p-6">
                    <View className="bg-white rounded-3xl p-6 w-full max-w-sm items-center shadow-2xl">
                        <View className="bg-blue-50 p-4 rounded-full mb-4">
                            <Ionicons name="shield-checkmark" size={32} color="#2563eb" />
                        </View>

                        <Text className="text-xl font-bold text-gray-900 mb-1">Confirmer le transfert</Text>
                        <Text className="text-gray-500 text-center mb-6">Vérifiez les détails ci-dessous.</Text>

                        {/* Destinataire */}
                        <View className="w-full bg-gray-50 p-4 rounded-xl mb-4">
                            <Text className="text-xs text-gray-400 uppercase tracking-wide mb-2">Destinataire</Text>
                            <View className="flex-row items-center">
                                <View className="bg-epitech-blue/10 w-12 h-12 rounded-full items-center justify-center mr-3">
                                    <Ionicons name="person" size={24} color="#2563eb" />
                                </View>
                                <View className="flex-1">
                                    <Text className="font-bold text-gray-900 text-lg" numberOfLines={1}>
                                        {selectedUser?.full_name || 'Utilisateur'}
                                    </Text>
                                    <Text className="text-gray-500 text-sm" numberOfLines={1}>
                                        {selectedUser?.email}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Montant */}
                        <View className="w-full bg-gray-50 p-4 rounded-xl mb-4">
                            <Text className="text-xs text-gray-400 uppercase tracking-wide mb-2">Montant</Text>
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center">
                                    <View className="bg-green-100 w-12 h-12 rounded-full items-center justify-center mr-3">
                                        <Ionicons name="wallet" size={24} color="#16a34a" />
                                    </View>
                                    <Text className="text-gray-500">Vous envoyez</Text>
                                </View>
                                <Text className="text-2xl font-bold text-epitech-blue">{amount} EPC</Text>
                            </View>
                        </View>

                        {/* Méthode d'authentification */}
                        <View className="w-full bg-amber-50 p-4 rounded-xl mb-6 border border-amber-200">
                            <View className="flex-row items-center">
                                <View className="bg-amber-100 w-10 h-10 rounded-full items-center justify-center mr-3">
                                    <Ionicons 
                                        name={authMethod === 'biometric' ? getBiometricIcon() as any : 'key'} 
                                        size={20} 
                                        color="#d97706" 
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-amber-800 font-semibold">
                                        {authMethod === 'biometric' 
                                            ? `Authentification par ${getBiometricLabel()}`
                                            : 'Authentification par mot de passe'
                                        }
                                    </Text>
                                    <Text className="text-amber-600 text-xs">
                                        {authMethod === 'biometric'
                                            ? 'Utilisez votre biométrie pour confirmer'
                                            : 'Entrez votre mot de passe pour confirmer'
                                        }
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Password Input (si biométrie non disponible ou échouée) */}
                        {authMethod === 'password' && (
                            <View className="w-full mb-4">
                                <Text className="text-gray-700 font-semibold mb-2">Mot de passe</Text>
                                <View className="flex-row items-center border border-gray-300 rounded-xl bg-gray-50 px-4 py-3">
                                    <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={{ marginRight: 10 }} />
                                    <TextInput
                                        className="flex-1 text-gray-900 text-base"
                                        placeholder="Entrez votre mot de passe"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                        placeholderTextColor="#9ca3af"
                                        autoCapitalize="none"
                                    />
                                </View>
                            </View>
                        )}

                        <View className="flex-row gap-3 w-full">
                            <TouchableOpacity
                                className="flex-1 bg-gray-100 p-4 rounded-xl items-center"
                                onPress={() => {
                                    setShowConfirmModal(false);
                                    setPassword('');
                                }}
                            >
                                <Text className="text-gray-700 font-bold">Annuler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 bg-epitech-blue p-4 rounded-xl items-center flex-row justify-center"
                                onPress={handleConfirm}
                                disabled={verifying}
                            >
                                {verifying ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons 
                                            name={authMethod === 'biometric' ? getBiometricIcon() as any : 'checkmark-circle'} 
                                            size={20} 
                                            color="white" 
                                            style={{ marginRight: 6 }}
                                        />
                                        <Text className="text-white font-bold">
                                            {authMethod === 'biometric' ? getBiometricLabel() : 'Confirmer'}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

