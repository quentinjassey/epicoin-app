import Icon from '@/components/Icon';
import { Colors } from '@/constants/NativeColors';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../../lib/supabase';

const DELETED_ITEMS = [
    'Nom et prenom',
    'Adresse email',
    'Campus',
    'Solde EpiCoins',
    'Preferences',
];

const ANONYMIZED_ITEMS = [
    'Historique des transactions (montants conserves, identite supprimee)',
];

export default function DeleteAccountScreen() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleDeleteAccount() {
        if (!password.trim()) {
            Alert.alert('Erreur', 'Veuillez entrer votre mot de passe pour confirmer.');
            return;
        }

        Alert.alert(
            'Supprimer mon compte',
            'Cette action est irreversible. Toutes vos donnees personnelles seront definitivement supprimees. Etes-vous sur ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: performDeletion,
                },
            ]
        );
    }

    async function performDeletion() {
        setLoading(true);
        try {
            // Verify current password
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) {
                Alert.alert('Erreur', 'Impossible de recuperer votre compte.');
                setLoading(false);
                return;
            }

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password,
            });

            if (signInError) {
                Alert.alert('Erreur', 'Mot de passe incorrect.');
                setLoading(false);
                return;
            }

            // Call the RPC to delete user account
            const { error: rpcError } = await supabase.rpc('delete_user_account');

            if (rpcError) {
                // RPC doesn't exist yet — show fallback message
                Alert.alert(
                    'Information',
                    'Fonctionnalite en cours de deploiement. Veuillez contacter le support pour supprimer votre compte.'
                );
                setLoading(false);
                return;
            }

            // Sign out and redirect
            await supabase.auth.signOut();
            router.replace('/(auth)/sign-in');
        } catch (error: any) {
            Alert.alert('Erreur', error.message || 'Une erreur est survenue.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: Colors.white }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={{ flex: 1 }}>
                <View
                    style={{
                        backgroundColor: Colors.epitechBlue,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 200,
                    }}
                />
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{
                        paddingBottom: 48,
                        backgroundColor: Colors.white,
                    }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <View
                        style={{
                            backgroundColor: Colors.epitechBlue,
                            paddingTop: 70,
                            paddingBottom: 32,
                            paddingHorizontal: 24,
                            borderBottomWidth: 3,
                            borderBottomColor: Colors.black,
                        }}
                    >
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginBottom: 20,
                            }}
                        >
                            <Icon
                                name="chevron.left"
                                size={20}
                                color={Colors.white}
                            />
                            <Text
                                style={{
                                    color: Colors.white,
                                    fontWeight: '800',
                                    fontSize: 15,
                                    marginLeft: 4,
                                    textTransform: 'uppercase',
                                    letterSpacing: 1,
                                }}
                            >
                                Retour
                            </Text>
                        </TouchableOpacity>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View
                                style={{
                                    backgroundColor: Colors.white,
                                    padding: 12,
                                    borderRadius: 0,
                                    borderWidth: 2,
                                    borderColor: Colors.black,
                                    marginRight: 16,
                                    shadowColor: Colors.black,
                                    shadowOffset: { width: 3, height: 3 },
                                    shadowOpacity: 1,
                                    shadowRadius: 0,
                                }}
                            >
                                <Icon
                                    name="exclamationmark.triangle.fill"
                                    size={28}
                                    color={Colors.accentOrange}
                                />
                            </View>
                            <View>
                                <Text
                                    style={{
                                        color: Colors.white,
                                        fontSize: 24,
                                        fontWeight: '900',
                                        letterSpacing: 1,
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    SUPPRIMER
                                </Text>
                                <Text
                                    style={{
                                        color: Colors.white,
                                        fontSize: 14,
                                        fontWeight: '700',
                                        opacity: 0.8,
                                        marginTop: 2,
                                    }}
                                >
                                    Suppression de compte
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Warning */}
                    <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
                        <View
                            style={{
                                backgroundColor: Colors.offWhite,
                                borderWidth: 3,
                                borderColor: Colors.accentOrange,
                                borderRadius: 0,
                                padding: 20,
                                shadowColor: Colors.black,
                                shadowOffset: { width: 4, height: 4 },
                                shadowOpacity: 1,
                                shadowRadius: 0,
                                flexDirection: 'row',
                                alignItems: 'flex-start',
                            }}
                        >
                            <Icon
                                name="exclamationmark.triangle.fill"
                                size={24}
                                color={Colors.accentOrange}
                                style={{ marginRight: 12, marginTop: 2 }}
                            />
                            <Text
                                style={{
                                    flex: 1,
                                    color: Colors.black,
                                    fontSize: 14,
                                    fontWeight: '700',
                                    lineHeight: 22,
                                }}
                            >
                                La suppression de votre compte est irreversible.
                                Vos donnees personnelles seront supprimees et vos
                                transactions anonymisees.
                            </Text>
                        </View>
                    </View>

                    {/* What will be deleted */}
                    <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
                        <Text
                            style={{
                                color: Colors.black,
                                fontSize: 13,
                                fontWeight: '900',
                                textTransform: 'uppercase',
                                marginBottom: 12,
                                letterSpacing: 2,
                            }}
                        >
                            SUPPRIME
                        </Text>
                        <View
                            style={{
                                backgroundColor: Colors.white,
                                borderWidth: 3,
                                borderColor: Colors.black,
                                shadowColor: Colors.black,
                                shadowOffset: { width: 4, height: 4 },
                                shadowOpacity: 1,
                                shadowRadius: 0,
                            }}
                        >
                            {DELETED_ITEMS.map((item, index) => (
                                <View
                                    key={item}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        padding: 14,
                                        borderBottomWidth:
                                            index < DELETED_ITEMS.length - 1
                                                ? 2
                                                : 0,
                                        borderBottomColor: Colors.lightGray,
                                    }}
                                >
                                    <Icon
                                        name="xmark.circle.fill"
                                        size={18}
                                        color={Colors.accentOrange}
                                    />
                                    <Text
                                        style={{
                                            color: Colors.black,
                                            fontSize: 14,
                                            fontWeight: '700',
                                            marginLeft: 12,
                                            flex: 1,
                                        }}
                                    >
                                        {item}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* What will be anonymized */}
                    <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
                        <Text
                            style={{
                                color: Colors.black,
                                fontSize: 13,
                                fontWeight: '900',
                                textTransform: 'uppercase',
                                marginBottom: 12,
                                letterSpacing: 2,
                            }}
                        >
                            ANONYMISE
                        </Text>
                        <View
                            style={{
                                backgroundColor: Colors.white,
                                borderWidth: 3,
                                borderColor: Colors.black,
                                shadowColor: Colors.black,
                                shadowOffset: { width: 4, height: 4 },
                                shadowOpacity: 1,
                                shadowRadius: 0,
                            }}
                        >
                            {ANONYMIZED_ITEMS.map((item, index) => (
                                <View
                                    key={item}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        padding: 14,
                                        borderBottomWidth:
                                            index < ANONYMIZED_ITEMS.length - 1
                                                ? 2
                                                : 0,
                                        borderBottomColor: Colors.lightGray,
                                    }}
                                >
                                    <Icon
                                        name="shield.checkered"
                                        size={18}
                                        color={Colors.epitechBlue}
                                    />
                                    <Text
                                        style={{
                                            color: Colors.black,
                                            fontSize: 14,
                                            fontWeight: '700',
                                            marginLeft: 12,
                                            flex: 1,
                                        }}
                                    >
                                        {item}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Password confirmation */}
                    <View style={{ paddingHorizontal: 24, marginTop: 32 }}>
                        <Text
                            style={{
                                color: Colors.black,
                                fontSize: 13,
                                fontWeight: '900',
                                textTransform: 'uppercase',
                                marginBottom: 12,
                                letterSpacing: 2,
                            }}
                        >
                            CONFIRMER VOTRE IDENTITE
                        </Text>
                        <View
                            style={{
                                backgroundColor: Colors.white,
                                borderWidth: 3,
                                borderColor: Colors.black,
                                shadowColor: Colors.black,
                                shadowOffset: { width: 4, height: 4 },
                                shadowOpacity: 1,
                                shadowRadius: 0,
                                padding: 20,
                            }}
                        >
                            <Text
                                style={{
                                    color: Colors.black,
                                    fontSize: 12,
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    letterSpacing: 1.5,
                                    marginBottom: 8,
                                }}
                            >
                                MOT DE PASSE ACTUEL
                            </Text>
                            <View
                                style={{
                                    borderWidth: 2,
                                    borderColor: Colors.black,
                                    borderRadius: 0,
                                    marginBottom: 20,
                                }}
                            >
                                <TextInput
                                    style={{
                                        padding: 14,
                                        fontSize: 16,
                                        fontWeight: '700',
                                        color: Colors.black,
                                        backgroundColor: Colors.offWhite,
                                    }}
                                    secureTextEntry
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="Entrez votre mot de passe"
                                    placeholderTextColor={Colors.mediumGray}
                                    autoCapitalize="none"
                                />
                            </View>

                            {/* Delete button */}
                            <TouchableOpacity
                                style={{
                                    backgroundColor: loading
                                        ? Colors.lightGray
                                        : Colors.accentOrange,
                                    borderRadius: 0,
                                    padding: 16,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderWidth: 2,
                                    borderColor: Colors.black,
                                    shadowColor: Colors.black,
                                    shadowOffset: { width: 4, height: 4 },
                                    shadowOpacity: 1,
                                    shadowRadius: 0,
                                }}
                                onPress={handleDeleteAccount}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color={Colors.white} />
                                ) : (
                                    <Text
                                        style={{
                                            color: Colors.white,
                                            fontWeight: '900',
                                            fontSize: 15,
                                            textTransform: 'uppercase',
                                            letterSpacing: 1.5,
                                        }}
                                    >
                                        SUPPRIMER MON COMPTE
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </KeyboardAvoidingView>
    );
}
