import Icon from '@/components/Icon';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '@/constants/NativeColors';

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
            router.replace('/(main)/(wallet)' as any);
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: Colors.white }}
        >
            <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 24,
                }}
            >
                {/* Logo */}
                <View style={{ marginBottom: 40, alignItems: 'center' }}>
                    <Image
                        source={require('../../assets/images/epipay-logo.png')}
                        style={{ width: 200, height: 68 }}
                        resizeMode="contain"
                    />
                    <Text style={{
                        color: Colors.mediumGray,
                        fontSize: 13,
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                        marginTop: 12,
                    }}>
                        Portefeuille digital Epitech
                    </Text>
                </View>

                <View style={{ width: '100%', maxWidth: 400 }}>
                    <Text style={{
                        fontSize: 28,
                        fontWeight: '900',
                        marginBottom: 24,
                        color: Colors.black,
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                    }}>
                        Connexion
                    </Text>

                    {/* Email */}
                    <View style={{ marginBottom: 16 }}>
                        <Text style={{
                            color: Colors.mediumGray,
                            fontWeight: '800',
                            marginBottom: 8,
                            fontSize: 11,
                            textTransform: 'uppercase',
                            letterSpacing: 2,
                        }}>
                            Email
                        </Text>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: Colors.offWhite,
                            borderWidth: 2,
                            borderColor: Colors.black,
                            paddingHorizontal: 16,
                        }}>
                            <Icon name="envelope.fill" size={20} color={Colors.mediumGray} />
                            <TextInput
                                style={{
                                    flex: 1,
                                    padding: 16,
                                    color: Colors.black,
                                    fontSize: 16,
                                    fontWeight: '600',
                                }}
                                placeholder="prenom.nom@epitech.digital"
                                placeholderTextColor={Colors.quaternaryLabel}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>

                    {/* Password */}
                    <View style={{ marginBottom: 24 }}>
                        <Text style={{
                            color: Colors.mediumGray,
                            fontWeight: '800',
                            marginBottom: 8,
                            fontSize: 11,
                            textTransform: 'uppercase',
                            letterSpacing: 2,
                        }}>
                            Mot de passe
                        </Text>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: Colors.offWhite,
                            borderWidth: 2,
                            borderColor: Colors.black,
                            paddingHorizontal: 16,
                        }}>
                            <Icon name="lock.fill" size={20} color={Colors.mediumGray} />
                            <TextInput
                                style={{
                                    flex: 1,
                                    padding: 16,
                                    color: Colors.black,
                                    fontSize: 16,
                                    fontWeight: '600',
                                }}
                                placeholder="••••••••"
                                placeholderTextColor={Colors.quaternaryLabel}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoCorrect={false}
                                autoComplete="off"
                                textContentType="oneTimeCode"
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Icon
                                    name={showPassword ? 'eye.slash.fill' : 'eye.fill'}
                                    size={20}
                                    color={Colors.mediumGray}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Submit */}
                    <TouchableOpacity
                        style={{
                            backgroundColor: loading ? Colors.lightGray : Colors.epitechBlue,
                            padding: 16,
                            alignItems: 'center',
                            borderWidth: 2,
                            borderColor: Colors.black,
                            shadowColor: Colors.black,
                            shadowOffset: { width: 4, height: 4 },
                            shadowOpacity: 1,
                            shadowRadius: 0,
                            flexDirection: 'row',
                            justifyContent: 'center',
                        }}
                        onPress={signInWithEmail}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.black} />
                        ) : (
                            <Text style={{
                                color: Colors.white,
                                fontSize: 15,
                                fontWeight: '900',
                                textTransform: 'uppercase',
                                letterSpacing: 2,
                            }}>
                                Se connecter
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Sign up link */}
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'center',
                        marginTop: 24,
                    }}>
                        <Text style={{
                            color: Colors.mediumGray,
                            fontSize: 14,
                            fontWeight: '600',
                        }}>
                            Pas encore de compte ?{' '}
                        </Text>
                        <Link href="/(auth)/sign-up" asChild>
                            <TouchableOpacity>
                                <Text style={{
                                    color: Colors.epitechBlue,
                                    fontWeight: '900',
                                    fontSize: 14,
                                    textTransform: 'uppercase',
                                }}>
                                    S'inscrire
                                </Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
