import { SymbolView } from 'expo-symbols';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../../lib/supabase';
import { Colors } from '@/constants/NativeColors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_KEY = 'epipay_biometric_enabled';

export default function SecurityScreen() {
    // ── Password state ──
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    // ── Biometric state ──
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricType, setBiometricType] = useState<string>('Biométrie');
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [biometricLoading, setBiometricLoading] = useState(true);

    useEffect(() => {
        checkBiometricSupport();
    }, []);

    async function checkBiometricSupport() {
        try {
            const compatible = await LocalAuthentication.hasHardwareAsync();
            const enrolled = await LocalAuthentication.isEnrolledAsync();
            setBiometricAvailable(compatible && enrolled);

            if (compatible) {
                const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
                if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
                    setBiometricType('Face ID');
                } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
                    setBiometricType('Touch ID');
                }
            }

            const stored = await AsyncStorage.getItem(BIOMETRIC_KEY);
            setBiometricEnabled(stored === 'true');
        } catch (error) {
            console.error('Biometric check error:', error);
        } finally {
            setBiometricLoading(false);
        }
    }

    async function handleToggleBiometric(value: boolean) {
        if (value) {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: `Activer ${biometricType}`,
                cancelLabel: 'Annuler',
                disableDeviceFallback: false,
            });

            if (result.success) {
                setBiometricEnabled(true);
                await AsyncStorage.setItem(BIOMETRIC_KEY, 'true');
            }
        } else {
            setBiometricEnabled(false);
            await AsyncStorage.setItem(BIOMETRIC_KEY, 'false');
        }
    }

    function validatePasswords(): boolean {
        setPasswordError('');
        setPasswordSuccess('');

        if (!currentPassword.trim()) {
            setPasswordError('Le mot de passe actuel est requis.');
            return false;
        }
        if (newPassword.length < 6) {
            setPasswordError('Le nouveau mot de passe doit contenir au moins 6 caractères.');
            return false;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('Les mots de passe ne correspondent pas.');
            return false;
        }
        if (currentPassword === newPassword) {
            setPasswordError('Le nouveau mot de passe doit être différent de l\'actuel.');
            return false;
        }
        return true;
    }

    async function handleChangePassword() {
        if (!validatePasswords()) return;

        setPasswordLoading(true);
        setPasswordError('');
        setPasswordSuccess('');

        try {
            // Get current user email
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) {
                setPasswordError('Impossible de récupérer votre compte.');
                return;
            }

            // Verify current password
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: currentPassword,
            });

            if (signInError) {
                setPasswordError('Le mot de passe actuel est incorrect.');
                return;
            }

            // Update password
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (updateError) {
                setPasswordError(updateError.message);
                return;
            }

            setPasswordSuccess('Mot de passe modifié avec succès.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            setPasswordError(error.message || 'Une erreur est survenue.');
        } finally {
            setPasswordLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: Colors.white }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                style={{ flex: 1, backgroundColor: Colors.white }}
                contentContainerStyle={{ paddingBottom: 48 }}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View style={{
                    backgroundColor: Colors.epitechBlue,
                    paddingTop: 100,
                    paddingBottom: 32,
                    paddingHorizontal: 24,
                    borderBottomWidth: 3,
                    borderBottomColor: Colors.black,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{
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
                        }}>
                            <SymbolView
                                name="shield.checkered"
                                size={28}
                                tintColor={Colors.epitechBlue}
                            />
                        </View>
                        <View>
                            <Text style={{
                                color: Colors.white,
                                fontSize: 28,
                                fontWeight: '900',
                                letterSpacing: 1,
                                textTransform: 'uppercase',
                            }}>
                                SÉCURITÉ
                            </Text>
                            <Text style={{
                                color: Colors.white,
                                fontSize: 14,
                                fontWeight: '700',
                                opacity: 0.8,
                                marginTop: 2,
                            }}>
                                Mot de passe & biométrie
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ── Change password section ── */}
                <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
                    <Text style={{
                        color: Colors.black,
                        fontSize: 13,
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        marginBottom: 12,
                        letterSpacing: 2,
                    }}>
                        CHANGER LE MOT DE PASSE
                    </Text>

                    <View style={{
                        backgroundColor: Colors.white,
                        borderRadius: 0,
                        borderWidth: 3,
                        borderColor: Colors.black,
                        shadowColor: Colors.black,
                        shadowOffset: { width: 4, height: 4 },
                        shadowOpacity: 1,
                        shadowRadius: 0,
                        padding: 20,
                    }}>
                        {/* Current password */}
                        <Text style={{
                            color: Colors.black,
                            fontSize: 12,
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            letterSpacing: 1.5,
                            marginBottom: 8,
                        }}>
                            MOT DE PASSE ACTUEL
                        </Text>
                        <View style={{
                            borderWidth: 2,
                            borderColor: Colors.black,
                            borderRadius: 0,
                            marginBottom: 16,
                        }}>
                            <TextInput
                                style={{
                                    padding: 14,
                                    fontSize: 16,
                                    fontWeight: '700',
                                    color: Colors.black,
                                    backgroundColor: Colors.offWhite,
                                }}
                                secureTextEntry
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                placeholder="••••••••"
                                placeholderTextColor={Colors.mediumGray}
                                autoCapitalize="none"
                            />
                        </View>

                        {/* New password */}
                        <Text style={{
                            color: Colors.black,
                            fontSize: 12,
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            letterSpacing: 1.5,
                            marginBottom: 8,
                        }}>
                            NOUVEAU MOT DE PASSE
                        </Text>
                        <View style={{
                            borderWidth: 2,
                            borderColor: Colors.black,
                            borderRadius: 0,
                            marginBottom: 16,
                        }}>
                            <TextInput
                                style={{
                                    padding: 14,
                                    fontSize: 16,
                                    fontWeight: '700',
                                    color: Colors.black,
                                    backgroundColor: Colors.offWhite,
                                }}
                                secureTextEntry
                                value={newPassword}
                                onChangeText={setNewPassword}
                                placeholder="Min. 6 caractères"
                                placeholderTextColor={Colors.mediumGray}
                                autoCapitalize="none"
                            />
                        </View>

                        {/* Confirm password */}
                        <Text style={{
                            color: Colors.black,
                            fontSize: 12,
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            letterSpacing: 1.5,
                            marginBottom: 8,
                        }}>
                            CONFIRMER LE MOT DE PASSE
                        </Text>
                        <View style={{
                            borderWidth: 2,
                            borderColor: Colors.black,
                            borderRadius: 0,
                            marginBottom: 20,
                        }}>
                            <TextInput
                                style={{
                                    padding: 14,
                                    fontSize: 16,
                                    fontWeight: '700',
                                    color: Colors.black,
                                    backgroundColor: Colors.offWhite,
                                }}
                                secureTextEntry
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholder="Retaper le mot de passe"
                                placeholderTextColor={Colors.mediumGray}
                                autoCapitalize="none"
                            />
                        </View>

                        {/* Error message */}
                        {passwordError !== '' && (
                            <View style={{
                                backgroundColor: Colors.offWhite,
                                borderWidth: 2,
                                borderColor: Colors.accentOrange,
                                borderRadius: 0,
                                padding: 12,
                                marginBottom: 16,
                                flexDirection: 'row',
                                alignItems: 'center',
                            }}>
                                <SymbolView
                                    name="exclamationmark.triangle.fill"
                                    size={18}
                                    tintColor={Colors.accentOrange}
                                />
                                <Text style={{
                                    color: Colors.accentOrange,
                                    fontWeight: '700',
                                    fontSize: 13,
                                    marginLeft: 8,
                                    flex: 1,
                                }}>
                                    {passwordError}
                                </Text>
                            </View>
                        )}

                        {/* Success message */}
                        {passwordSuccess !== '' && (
                            <View style={{
                                backgroundColor: Colors.offWhite,
                                borderWidth: 2,
                                borderColor: Colors.success,
                                borderRadius: 0,
                                padding: 12,
                                marginBottom: 16,
                                flexDirection: 'row',
                                alignItems: 'center',
                            }}>
                                <SymbolView
                                    name="checkmark.circle.fill"
                                    size={18}
                                    tintColor={Colors.success}
                                />
                                <Text style={{
                                    color: Colors.success,
                                    fontWeight: '700',
                                    fontSize: 13,
                                    marginLeft: 8,
                                    flex: 1,
                                }}>
                                    {passwordSuccess}
                                </Text>
                            </View>
                        )}

                        {/* Submit button */}
                        <TouchableOpacity
                            style={{
                                backgroundColor: Colors.epitechBlue,
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
                                opacity: passwordLoading ? 0.7 : 1,
                            }}
                            onPress={handleChangePassword}
                            disabled={passwordLoading}
                        >
                            {passwordLoading ? (
                                <ActivityIndicator color={Colors.white} />
                            ) : (
                                <Text style={{
                                    color: Colors.white,
                                    fontWeight: '900',
                                    fontSize: 15,
                                    textTransform: 'uppercase',
                                    letterSpacing: 1.5,
                                }}>
                                    MODIFIER LE MOT DE PASSE
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Biometric section ── */}
                <View style={{ paddingHorizontal: 24, marginTop: 32 }}>
                    <Text style={{
                        color: Colors.black,
                        fontSize: 13,
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        marginBottom: 12,
                        letterSpacing: 2,
                    }}>
                        AUTHENTIFICATION BIOMÉTRIQUE
                    </Text>

                    <View style={{
                        backgroundColor: Colors.white,
                        borderRadius: 0,
                        borderWidth: 3,
                        borderColor: Colors.black,
                        shadowColor: Colors.black,
                        shadowOffset: { width: 4, height: 4 },
                        shadowOpacity: 1,
                        shadowRadius: 0,
                        padding: 20,
                    }}>
                        {biometricLoading ? (
                            <ActivityIndicator size="small" color={Colors.epitechBlue} />
                        ) : biometricAvailable ? (
                            <>
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                        <View style={{
                                            backgroundColor: Colors.offWhite,
                                            padding: 12,
                                            borderRadius: 0,
                                            borderWidth: 2,
                                            borderColor: Colors.black,
                                            marginRight: 14,
                                        }}>
                                            <SymbolView
                                                name={biometricType === 'Face ID' ? 'faceid' : 'touchid'}
                                                size={24}
                                                tintColor={Colors.epitechBlue}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{
                                                fontWeight: '800',
                                                color: Colors.black,
                                                fontSize: 15,
                                                letterSpacing: 0.5,
                                                textTransform: 'uppercase',
                                            }}>
                                                {biometricType}
                                            </Text>
                                            <Text style={{
                                                color: Colors.mediumGray,
                                                fontSize: 13,
                                                fontWeight: '700',
                                                marginTop: 2,
                                            }}>
                                                {biometricEnabled ? 'Activé' : 'Désactivé'}
                                            </Text>
                                        </View>
                                    </View>
                                    <Switch
                                        value={biometricEnabled}
                                        onValueChange={handleToggleBiometric}
                                        trackColor={{
                                            false: Colors.lightGray,
                                            true: Colors.epitechBlue,
                                        }}
                                        thumbColor={Colors.white}
                                    />
                                </View>

                                <View style={{
                                    marginTop: 16,
                                    paddingTop: 16,
                                    borderTopWidth: 2,
                                    borderTopColor: Colors.lightGray,
                                }}>
                                    <Text style={{
                                        color: Colors.mediumGray,
                                        fontSize: 12,
                                        fontWeight: '700',
                                        lineHeight: 18,
                                    }}>
                                        Utilisez {biometricType} pour vous authentifier rapidement lors de la connexion et de la validation des paiements.
                                    </Text>
                                </View>
                            </>
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{
                                    backgroundColor: Colors.offWhite,
                                    padding: 12,
                                    borderRadius: 0,
                                    borderWidth: 2,
                                    borderColor: Colors.lightGray,
                                    marginRight: 14,
                                }}>
                                    <SymbolView
                                        name="faceid"
                                        size={24}
                                        tintColor={Colors.mediumGray}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{
                                        fontWeight: '800',
                                        color: Colors.mediumGray,
                                        fontSize: 14,
                                        letterSpacing: 0.5,
                                        textTransform: 'uppercase',
                                    }}>
                                        NON DISPONIBLE
                                    </Text>
                                    <Text style={{
                                        color: Colors.mediumGray,
                                        fontSize: 12,
                                        fontWeight: '700',
                                        marginTop: 2,
                                    }}>
                                        Aucune biométrie configurée sur cet appareil.
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {/* ── Security tips ── */}
                <View style={{ paddingHorizontal: 24, marginTop: 32 }}>
                    <Text style={{
                        color: Colors.black,
                        fontSize: 13,
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        marginBottom: 12,
                        letterSpacing: 2,
                    }}>
                        CONSEILS DE SÉCURITÉ
                    </Text>

                    <View style={{
                        backgroundColor: Colors.offWhite,
                        borderRadius: 0,
                        borderWidth: 3,
                        borderColor: Colors.black,
                        shadowColor: Colors.black,
                        shadowOffset: { width: 4, height: 4 },
                        shadowOpacity: 1,
                        shadowRadius: 0,
                        overflow: 'hidden',
                    }}>
                        {[
                            {
                                icon: 'lock.fill' as const,
                                text: 'Utilisez un mot de passe unique d\'au moins 6 caractères',
                            },
                            {
                                icon: 'key.fill' as const,
                                text: 'Ne partagez jamais vos identifiants EpiPay',
                            },
                            {
                                icon: 'iphone.and.arrow.forward' as const,
                                text: 'Activez la biométrie pour sécuriser vos transactions',
                            },
                        ].map((tip, index) => (
                            <View
                                key={index}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    padding: 14,
                                    borderBottomWidth: index < 2 ? 2 : 0,
                                    borderBottomColor: Colors.black,
                                }}
                            >
                                <SymbolView
                                    name={tip.icon as any}
                                    size={16}
                                    tintColor={Colors.epitechBlue}
                                />
                                <Text style={{
                                    color: Colors.black,
                                    fontSize: 13,
                                    fontWeight: '700',
                                    marginLeft: 12,
                                    flex: 1,
                                }}>
                                    {tip.text}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
