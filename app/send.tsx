import { Colors } from '@/constants/NativeColors';
import { SymbolView } from 'expo-symbols';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { collectTransactionContext, buildTransactionPayload } from '../lib/transactionContext';

type UserProfile = {
    id: string;
    email: string;
    full_name: string;
};

export default function SendScreen() {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [balance, setBalance] = useState<number>(0);
    const [searching, setSearching] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const router = useRouter();

    useEffect(() => {
        checkBiometric();
        fetchBalance();
    }, []);

    useEffect(() => {
        if (searchQuery.length > 2 && !selectedUser) {
            const timer = setTimeout(() => searchUsers(searchQuery), 300);
            return () => clearTimeout(timer);
        } else {
            setSearchResults([]);
        }
    }, [searchQuery, selectedUser]);

    async function checkBiometric() {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricAvailable(hasHardware && isEnrolled);
    }

    async function fetchBalance() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
            if (data) setBalance(data.balance || 0);
        } catch (error) {
            console.error('Error fetching balance:', error);
        }
    }

    async function searchUsers(query: string) {
        setSearching(true);
        try {
            const { data } = await supabase
                .from('profiles')
                .select('id, email, full_name')
                .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
                .limit(5);

            if (data) {
                const { data: { user } } = await supabase.auth.getUser();
                setSearchResults(data.filter(p => p.id !== user?.id));
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setSearching(false);
        }
    }

    async function handleSend() {
        if (!selectedUser) {
            Alert.alert('Erreur', 'Sélectionnez un destinataire');
            return;
        }

        const amountNum = Math.round(parseFloat(amount) * 100) / 100;
        if (!amount || isNaN(amountNum) || amountNum < 0.01) {
            Alert.alert('Erreur', 'Entrez un montant valide (minimum 0.01 EPC)');
            return;
        }

        if (amountNum > balance) {
            Alert.alert('Erreur', `Solde insuffisant (${balance.toFixed(2)} EPC)`);
            return;
        }

        // Authentification biométrique si disponible
        if (biometricAvailable) {
            const auth = await LocalAuthentication.authenticateAsync({
                promptMessage: `Confirmer ${amount} EPC`,
            });
            if (!auth.success) return;
        }

        setProcessing(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Non connecté');

            if (selectedUser.id === user.id) {
                Alert.alert('Erreur', 'Vous ne pouvez pas vous envoyer des EPC à vous-même');
                setProcessing(false);
                return;
            }

            // Re-vérifier que le destinataire existe toujours
            const { data: recipient } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', selectedUser.id)
                .single();

            if (!recipient) {
                Alert.alert('Erreur', 'Ce destinataire n\'existe plus');
                setSelectedUser(null);
                setProcessing(false);
                return;
            }

            const context = await collectTransactionContext();
            const payload = buildTransactionPayload({
                userId: user.id,
                amount: amountNum,
                type: 'transfer',
                recipientId: selectedUser.id,
                description: note || `Transfert vers ${selectedUser.full_name}`,
                context,
                metadata: {
                    receiver_name: selectedUser.full_name,
                    receiver_email: selectedUser.email,
                    note: note || undefined,
                },
            });

            const { data: fraudResponse } = await supabase.functions.invoke('fraud-detection', {
                body: { transaction: payload }
            });

            if (fraudResponse?.decision === 'blocked') {
                Alert.alert('Transaction bloquée', fraudResponse.reason || 'Raison de sécurité');
                setProcessing(false);
                return;
            }

            const { data, error } = await supabase.rpc('transfer_epicoin', {
                receiver_email: selectedUser.email,
                amount: amountNum,
                fraud_score: fraudResponse?.riskScore || 0,
                fraud_features: fraudResponse?.features || {}
            });

            if (error) throw error;

            if (data?.success) {
                Alert.alert(
                    'Envoyé !',
                    `${amount} EPC → ${selectedUser.full_name}`,
                    [{ text: 'OK', onPress: () => router.back() }]
                );
            } else {
                Alert.alert('Erreur', data?.message || 'Échec du transfert');
            }
        } catch (error: any) {
            Alert.alert('Erreur', error.message);
        } finally {
            setProcessing(false);
        }
    }

    const parsedAmount = Math.round(parseFloat(amount) * 100) / 100;
    const canSend = selectedUser && amount && parsedAmount >= 0.01 && parsedAmount <= balance;

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={{ flex: 1, backgroundColor: Colors.white }}
            contentContainerStyle={{ padding: 24, paddingTop: 24, paddingBottom: 54 }}
            keyboardShouldPersistTaps="handled"
        >
            {/* Carte Solde */}
            <View style={{
                backgroundColor: Colors.offWhite,
                borderRadius: 0,
                padding: 20,
                marginBottom: 24,
                borderWidth: 2,
                borderColor: Colors.black,
                shadowColor: Colors.black,
                shadowOffset: { width: 4, height: 4 },
                shadowOpacity: 1,
                shadowRadius: 0,
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <SymbolView name="dollarsign.circle.fill" size={20} tintColor={Colors.epitechBlue} />
                    <Text style={{
                        fontSize: 13,
                        fontWeight: '800',
                        color: Colors.secondaryLabel,
                        marginLeft: 8,
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                    }}>
                        Solde disponible
                    </Text>
                </View>
                <Text style={{
                    fontSize: 32,
                    fontWeight: '900',
                    color: Colors.epitechBlue,
                    fontVariant: ['tabular-nums'],
                }}>
                    {balance.toFixed(2)} EPC
                </Text>
            </View>

            {/* Section Destinataire */}
            <View style={{ marginBottom: 24 }}>
                <Text style={{
                    fontSize: 15,
                    fontWeight: '800',
                    color: Colors.black,
                    marginBottom: 12,
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                }}>
                    Destinataire
                </Text>

                {!selectedUser ? (
                    <>
                        <View style={{
                            backgroundColor: Colors.white,
                            borderRadius: 0,
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 12,
                            paddingVertical: 12,
                            marginBottom: 8,
                            borderWidth: 2,
                            borderColor: Colors.black,
                        }}>
                            <SymbolView name="magnifyingglass" size={18} tintColor={Colors.tertiaryLabel} style={{ marginRight: 8 }} />
                            <TextInput
                                style={{ flex: 1, fontSize: 17, color: Colors.black }}
                                placeholder="Nom ou email..."
                                placeholderTextColor={Colors.tertiaryLabel}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCapitalize="none"
                            />
                            {searching && <ActivityIndicator size="small" />}
                        </View>

                        {searchResults.length > 0 && (
                            <View style={{
                                backgroundColor: Colors.white,
                                borderRadius: 0,
                                overflow: 'hidden',
                                borderWidth: 2,
                                borderColor: Colors.black,
                                shadowColor: Colors.black,
                                shadowOffset: { width: 3, height: 3 },
                                shadowOpacity: 1,
                                shadowRadius: 0,
                            }}>
                                {searchResults.map((user, i) => (
                                    <TouchableOpacity
                                        key={user.id}
                                        onPress={() => {
                                            setSelectedUser(user);
                                            setSearchQuery('');
                                            setSearchResults([]);
                                        }}
                                        style={{
                                            padding: 12,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            borderBottomWidth: i < searchResults.length - 1 ? 2 : 0,
                                            borderBottomColor: Colors.black,
                                        }}
                                    >
                                        <View style={{
                                            width: 40,
                                            height: 40,
                                            backgroundColor: Colors.epitechBlue,
                                            borderRadius: 0,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: 12,
                                            borderWidth: 2,
                                            borderColor: Colors.black,
                                        }}>
                                            <Text style={{ color: Colors.white, fontSize: 18, fontWeight: '900' }}>
                                                {user.full_name.charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.black }}>
                                                {user.full_name}
                                            </Text>
                                            <Text style={{ fontSize: 13, color: Colors.secondaryLabel }}>
                                                {user.email}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </>
                ) : (
                    <View style={{
                        backgroundColor: Colors.epitechBlue,
                        borderRadius: 0,
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderWidth: 2,
                        borderColor: Colors.black,
                        shadowColor: Colors.black,
                        shadowOffset: { width: 4, height: 4 },
                        shadowOpacity: 1,
                        shadowRadius: 0,
                    }}>
                        <View style={{
                            width: 48,
                            height: 48,
                            backgroundColor: 'rgba(255, 255, 255, 0.25)',
                            borderRadius: 0,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12,
                            borderWidth: 2,
                            borderColor: Colors.white,
                        }}>
                            <Text style={{ color: Colors.white, fontSize: 20, fontWeight: '900' }}>
                                {selectedUser.full_name.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 17, fontWeight: '900', color: Colors.white }}>
                                {selectedUser.full_name}
                            </Text>
                            <Text style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.75)' }}>
                                {selectedUser.email}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setSelectedUser(null)}>
                            <SymbolView name="xmark.circle.fill" size={28} tintColor="rgba(255, 255, 255, 0.75)" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Section Montant */}
            <View style={{ marginBottom: 24 }}>
                <Text style={{
                    fontSize: 15,
                    fontWeight: '800',
                    color: Colors.black,
                    marginBottom: 12,
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                }}>
                    Montant
                </Text>
                <View style={{
                    backgroundColor: Colors.white,
                    borderRadius: 0,
                    padding: 20,
                    borderWidth: 2,
                    borderColor: Colors.black,
                    shadowColor: Colors.black,
                    shadowOffset: { width: 4, height: 4 },
                    shadowOpacity: 1,
                    shadowRadius: 0,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TextInput
                            style={{
                                flex: 1,
                                fontSize: 40,
                                fontWeight: '900',
                                color: Colors.black,
                                fontVariant: ['tabular-nums'],
                            }}
                            placeholder="0"
                            placeholderTextColor={Colors.tertiaryLabel}
                            value={amount}
                            onChangeText={(text) => {
                                const sanitized = text.replace(/[^0-9.]/g, '');
                                if (sanitized.split('.').length > 2) return;
                                const parts = sanitized.split('.');
                                if (parts[1] && parts[1].length > 2) return;
                                setAmount(sanitized);
                            }}
                            keyboardType="decimal-pad"
                        />
                        <Text style={{
                            fontSize: 24,
                            fontWeight: '900',
                            color: Colors.epitechBlue,
                            marginLeft: 8,
                        }}>
                            EPC
                        </Text>
                    </View>
                    {amount && parseFloat(amount) > balance && (
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginTop: 12,
                            backgroundColor: Colors.offWhite,
                            padding: 12,
                            borderRadius: 0,
                            borderWidth: 2,
                            borderColor: Colors.accentOrange,
                        }}>
                            <SymbolView name="exclamationmark.triangle.fill" size={16} tintColor={Colors.accentOrange} />
                            <Text style={{
                                fontSize: 13,
                                color: Colors.accentOrange,
                                marginLeft: 8,
                                fontWeight: '800',
                                textTransform: 'uppercase',
                                letterSpacing: 1,
                            }}>
                                Solde insuffisant
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Section Note */}
            <View style={{ marginBottom: 32 }}>
                <Text style={{
                    fontSize: 15,
                    fontWeight: '800',
                    color: Colors.black,
                    marginBottom: 12,
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                }}>
                    Note (optionnel)
                </Text>
                <View style={{
                    backgroundColor: Colors.white,
                    borderRadius: 0,
                    padding: 16,
                    borderWidth: 2,
                    borderColor: Colors.black,
                    shadowColor: Colors.black,
                    shadowOffset: { width: 3, height: 3 },
                    shadowOpacity: 1,
                    shadowRadius: 0,
                }}>
                    <TextInput
                        style={{
                            fontSize: 16,
                            color: Colors.black,
                            minHeight: 80,
                            textAlignVertical: 'top',
                        }}
                        placeholder="Ajouter une note..."
                        placeholderTextColor={Colors.tertiaryLabel}
                        value={note}
                        onChangeText={setNote}
                        multiline
                        maxLength={100}
                    />
                    <Text style={{
                        fontSize: 12,
                        color: Colors.tertiaryLabel,
                        textAlign: 'right',
                        marginTop: 8,
                        fontWeight: '700',
                    }}>
                        {note.length}/100
                    </Text>
                </View>
            </View>

            {/* Bouton Envoyer */}
            <TouchableOpacity
                style={{
                    backgroundColor: canSend && !processing ? Colors.epitechBlue : Colors.lightGray,
                    borderRadius: 0,
                    padding: 18,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: Colors.black,
                    shadowColor: Colors.black,
                    shadowOffset: { width: 4, height: 4 },
                    shadowOpacity: canSend && !processing ? 1 : 0,
                    shadowRadius: 0,
                }}
                onPress={handleSend}
                disabled={!canSend || processing}
            >
                {processing ? (
                    <ActivityIndicator color={Colors.white} />
                ) : (
                    <>
                        <SymbolView name="paperplane.fill" size={20} tintColor={canSend ? Colors.white : Colors.tertiaryLabel} />
                        <Text style={{
                            color: canSend ? Colors.white : Colors.tertiaryLabel,
                            fontSize: 17,
                            fontWeight: '900',
                            marginLeft: 8,
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                        }}>
                            Envoyer {amount ? `${amount} EPC` : ''}
                        </Text>
                    </>
                )}
            </TouchableOpacity>

            {biometricAvailable && (
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 16,
                }}>
                    <SymbolView name="faceid" size={16} tintColor={Colors.tertiaryLabel} />
                    <Text style={{
                        color: Colors.tertiaryLabel,
                        fontSize: 13,
                        marginLeft: 8,
                        fontWeight: '700',
                    }}>
                        Authentification biométrique activée
                    </Text>
                </View>
            )}
        </ScrollView>
    );
}
