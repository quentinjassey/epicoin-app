import { Colors } from '@/constants/NativeColors';
import { useAccessibility } from '@/lib/AccessibilityContext';
import Icon from '@/components/Icon';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
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
    isIntercampus?: boolean;
    campusName?: string;
    functionsUrl?: string;
    remoteWalletId?: string;
    destinationApiKey?: string;
};

export default function SendScreen() {
    const { adaptiveColors } = useAccessibility();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [balance, setBalance] = useState<number>(0);
    const [searching, setSearching] = useState(false);
    const [federatedSearching, setFederatedSearching] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [campusWalletId, setCampusWalletId] = useState<string | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const router = useRouter();

    useEffect(() => {
        checkBiometric();
        fetchBalance();
        fetchCampusWallet();
    }, []);

    useEffect(() => {
        if (selectedUser) return;

        if (searchQuery.length > 2) {
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

    async function fetchCampusWallet() {
        try {
            const { data } = await supabase
                .from('wallets')
                .select('id')
                .eq('is_active', true)
                .limit(1)
                .single();
            if (data) setCampusWalletId(data.id);
        } catch (error) {
            console.error('Error fetching campus wallet:', error);
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

            const { data: { user } } = await supabase.auth.getUser();
            const local = (data || []).filter(p => p.id !== user?.id);
            setSearchResults(local);

            // Federated lookup si l'email semble complet et aucun résultat local
            const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query.trim());
            if (looksLikeEmail && local.length === 0) {
                setFederatedSearching(true);
                try {
                    const { data: fedResult, error } = await supabase.functions.invoke('federated-lookup', {
                        body: { email: query.trim().toLowerCase() },
                    });
                    if (!error && fedResult?.found && fedResult.type === 'intercampus') {
                        setSearchResults([{
                            id: fedResult.user_id,
                            email: fedResult.email,
                            full_name: fedResult.full_name,
                            isIntercampus: true,
                            campusName: fedResult.campus_name,
                            functionsUrl: fedResult.functions_url,
                            remoteWalletId: fedResult.remote_wallet_id,
                            destinationApiKey: fedResult.destination_api_key,
                        }]);
                    }
                } finally {
                    setFederatedSearching(false);
                }
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

        // Pour un transfert intercampus, afficher la modale de confirmation d'abord
        if (selectedUser.isIntercampus) {
            setShowConfirmModal(true);
            return;
        }

        await executeLocalSend(amountNum);
    }

    async function executeLocalSend(amountNum: number) {
        if (!selectedUser) return;

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
                return;
            }

            const { data: recipient } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', selectedUser.id)
                .single();

            if (!recipient) {
                Alert.alert('Erreur', 'Ce destinataire n\'existe plus');
                setSelectedUser(null);
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
                Alert.alert('Envoyé !', `${amount} EPC → ${selectedUser.full_name}`,
                    [{ text: 'OK', onPress: () => router.back() }]);
            } else {
                Alert.alert('Erreur', data?.message || 'Échec du transfert');
            }
        } catch (error: any) {
            Alert.alert('Erreur', error.message);
        } finally {
            setProcessing(false);
        }
    }

    async function executeIntercampusSend(amountNum: number) {
        if (!selectedUser || !selectedUser.isIntercampus) return;
        setShowConfirmModal(false);

        if (biometricAvailable) {
            const auth = await LocalAuthentication.authenticateAsync({
                promptMessage: `Confirmer ${amount} EPC → ${selectedUser.campusName}`,
            });
            if (!auth.success) return;
        }

        if (!campusWalletId) {
            Alert.alert('Erreur', 'Wallet campus introuvable');
            return;
        }

        setProcessing(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Non connecté');

            const context = await collectTransactionContext();

            const { data, error } = await supabase.functions.invoke('intercampus-send', {
                body: {
                    source_wallet_id: campusWalletId,
                    destination_wallet_id: selectedUser.remoteWalletId,
                    destination_user_id: selectedUser.id,
                    destination_campus_api_url: selectedUser.functionsUrl,
                    destination_api_key: selectedUser.destinationApiKey,
                    amount: amountNum,
                    currency: 'EPC',
                    description: note || `Transfert vers ${selectedUser.full_name}`,
                    enriched_data: {
                        country: context?.country,
                        city: context?.city,
                        device_info: context?.device_info,
                    },
                },
            });

            if (error) throw error;

            if (data?.success) {
                Alert.alert(
                    'Transfert intercampus réussi !',
                    `${amount} EPC envoyés à ${selectedUser.full_name} (${selectedUser.campusName})`,
                    [{ text: 'OK', onPress: () => router.back() }]
                );
            } else {
                Alert.alert('Échec du transfert', data?.message || 'Erreur inconnue');
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
        <>
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
                        <Icon name="dollarsign.circle.fill" size={20} color={adaptiveColors.primary} />
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
                        color: adaptiveColors.primary,
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
                                <Icon name="magnifyingglass" size={18} color={Colors.tertiaryLabel} style={{ marginRight: 8 }} />
                                <TextInput
                                    style={{ flex: 1, fontSize: 17, color: Colors.black }}
                                    placeholder="Nom ou email..."
                                    placeholderTextColor={Colors.tertiaryLabel}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                                {(searching || federatedSearching) && <ActivityIndicator size="small" />}
                            </View>

                            {federatedSearching && (
                                <Text style={{
                                    fontSize: 12,
                                    color: Colors.secondaryLabel,
                                    fontWeight: '700',
                                    textTransform: 'uppercase',
                                    letterSpacing: 1,
                                    marginBottom: 8,
                                }}>
                                    Recherche sur les campus partenaires...
                                </Text>
                            )}

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
                                                backgroundColor: user.isIntercampus ? Colors.neonGreen : adaptiveColors.primary,
                                                borderRadius: 0,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                marginRight: 12,
                                                borderWidth: 2,
                                                borderColor: Colors.black,
                                            }}>
                                                <Text style={{ color: Colors.black, fontSize: 18, fontWeight: '900' }}>
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
                                                {user.isIntercampus && (
                                                    <View style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        marginTop: 2,
                                                    }}>
                                                        <Icon name="globe" size={11} color={adaptiveColors.primary} />
                                                        <Text style={{
                                                            fontSize: 11,
                                                            color: adaptiveColors.primary,
                                                            fontWeight: '800',
                                                            marginLeft: 3,
                                                            textTransform: 'uppercase',
                                                            letterSpacing: 1,
                                                        }}>
                                                            {user.campusName}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                            {user.isIntercampus && (
                                                <Icon name="arrow.right.circle.fill" size={20} color={adaptiveColors.primary} />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </>
                    ) : (
                        <View style={{
                            backgroundColor: selectedUser.isIntercampus ? Colors.black : adaptiveColors.primary,
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
                                backgroundColor: selectedUser.isIntercampus ? Colors.neonGreen : 'rgba(255, 255, 255, 0.25)',
                                borderRadius: 0,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 12,
                                borderWidth: 2,
                                borderColor: selectedUser.isIntercampus ? Colors.black : Colors.white,
                            }}>
                                <Text style={{
                                    color: Colors.black,
                                    fontSize: 20,
                                    fontWeight: '900',
                                }}>
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
                                {selectedUser.isIntercampus && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                        <Icon name="globe" size={11} color={Colors.neonGreen} />
                                        <Text style={{
                                            fontSize: 11,
                                            color: Colors.neonGreen,
                                            fontWeight: '800',
                                            marginLeft: 3,
                                            textTransform: 'uppercase',
                                            letterSpacing: 1,
                                        }}>
                                            {selectedUser.campusName}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <TouchableOpacity onPress={() => setSelectedUser(null)}>
                                <Icon name="xmark.circle.fill" size={28} color="rgba(255, 255, 255, 0.75)" />
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
                                color: adaptiveColors.primary,
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
                                borderColor: adaptiveColors.error,
                            }}>
                                <Icon name="exclamationmark.triangle.fill" size={16} color={adaptiveColors.error} />
                                <Text style={{
                                    fontSize: 13,
                                    color: adaptiveColors.error,
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
                        backgroundColor: canSend && !processing ? adaptiveColors.primary : Colors.lightGray,
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
                            <Icon name="paperplane.fill" size={20} color={canSend ? Colors.white : Colors.tertiaryLabel} />
                            <Text style={{
                                color: canSend ? Colors.white : Colors.tertiaryLabel,
                                fontSize: 17,
                                fontWeight: '900',
                                marginLeft: 8,
                                textTransform: 'uppercase',
                                letterSpacing: 1,
                            }}>
                                {selectedUser?.isIntercampus ? 'Envoyer intercampus' : `Envoyer ${amount ? `${amount} EPC` : ''}`}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                {selectedUser?.isIntercampus && (
                    <Text style={{
                        fontSize: 12,
                        color: Colors.secondaryLabel,
                        textAlign: 'center',
                        marginTop: 12,
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                    }}>
                        Transfert intercampus — le destinataire sera crédité sur son campus.
                    </Text>
                )}

                {biometricAvailable && (
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 16,
                    }}>
                        <Icon name="faceid" size={16} color={Colors.tertiaryLabel} />
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

            {/* Modale de confirmation intercampus */}
            <Modal
                visible={showConfirmModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowConfirmModal(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 24,
                }}>
                    <View style={{
                        backgroundColor: Colors.white,
                        borderWidth: 3,
                        borderColor: Colors.black,
                        shadowColor: Colors.black,
                        shadowOffset: { width: 6, height: 6 },
                        shadowOpacity: 1,
                        shadowRadius: 0,
                        width: '100%',
                        padding: 24,
                    }}>
                        {/* Header */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                            <Icon name="globe" size={22} color={adaptiveColors.primary} />
                            <Text style={{
                                fontSize: 18,
                                fontWeight: '900',
                                color: Colors.black,
                                marginLeft: 10,
                                textTransform: 'uppercase',
                                letterSpacing: 1,
                                flex: 1,
                            }}>
                                Confirmer le transfert
                            </Text>
                        </View>

                        {/* Infos destinataire */}
                        <View style={{
                            backgroundColor: Colors.offWhite,
                            borderWidth: 2,
                            borderColor: Colors.black,
                            padding: 16,
                            marginBottom: 16,
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                <View style={{
                                    width: 44,
                                    height: 44,
                                    backgroundColor: Colors.neonGreen,
                                    borderWidth: 2,
                                    borderColor: Colors.black,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 12,
                                }}>
                                    <Text style={{ fontSize: 20, fontWeight: '900', color: Colors.black }}>
                                        {selectedUser?.full_name.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                                <View>
                                    <Text style={{ fontSize: 17, fontWeight: '900', color: Colors.black }}>
                                        {selectedUser?.full_name}
                                    </Text>
                                    <Text style={{ fontSize: 13, color: Colors.secondaryLabel }}>
                                        {selectedUser?.email}
                                    </Text>
                                </View>
                            </View>
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingTop: 12,
                                borderTopWidth: 1,
                                borderTopColor: Colors.black,
                            }}>
                                <Icon name="globe" size={13} color={adaptiveColors.primary} />
                                <Text style={{
                                    fontSize: 12,
                                    fontWeight: '800',
                                    color: adaptiveColors.primary,
                                    marginLeft: 4,
                                    textTransform: 'uppercase',
                                    letterSpacing: 1,
                                }}>
                                    {selectedUser?.campusName}
                                </Text>
                            </View>
                        </View>

                        {/* Montant */}
                        <View style={{
                            backgroundColor: adaptiveColors.primary,
                            borderWidth: 2,
                            borderColor: Colors.black,
                            padding: 16,
                            alignItems: 'center',
                            marginBottom: 20,
                        }}>
                            <Text style={{
                                fontSize: 36,
                                fontWeight: '900',
                                color: Colors.white,
                                fontVariant: ['tabular-nums'],
                            }}>
                                {amount} EPC
                            </Text>
                        </View>

                        {/* Boutons */}
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                onPress={() => setShowConfirmModal(false)}
                                style={{
                                    flex: 1,
                                    padding: 14,
                                    borderWidth: 2,
                                    borderColor: Colors.black,
                                    alignItems: 'center',
                                    backgroundColor: Colors.white,
                                    shadowColor: Colors.black,
                                    shadowOffset: { width: 3, height: 3 },
                                    shadowOpacity: 1,
                                    shadowRadius: 0,
                                }}
                            >
                                <Text style={{ fontSize: 15, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>
                                    Annuler
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => executeIntercampusSend(parsedAmount)}
                                style={{
                                    flex: 1,
                                    padding: 14,
                                    borderWidth: 2,
                                    borderColor: Colors.black,
                                    alignItems: 'center',
                                    backgroundColor: adaptiveColors.primary,
                                    shadowColor: Colors.black,
                                    shadowOffset: { width: 3, height: 3 },
                                    shadowOpacity: 1,
                                    shadowRadius: 0,
                                }}
                            >
                                <Text style={{ fontSize: 15, fontWeight: '900', color: Colors.white, textTransform: 'uppercase', letterSpacing: 1 }}>
                                    Confirmer
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}
