import { SymbolView } from 'expo-symbols';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
            style={{ flex: 1, backgroundColor: Colors.systemBackground }}
        >
            <ScrollView 
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 24,
                }}
            >
                <View style={{ marginBottom: 32, alignItems: 'center' }}>
                    <View style={{
                        backgroundColor: Colors.epitechBlue,
                        width: 80,
                        height: 80,
                        borderRadius: 20,
                        borderCurve: 'continuous',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 16,
                        boxShadow: '0 4px 12px rgba(0, 145, 211, 0.25)',
                    }}>
                        <SymbolView name="wallet.pass.fill" size={40} tintColor="#fff" />
                    </View>
                    <Text style={{
                        fontSize: 32,
                        fontWeight: '700',
                        color: Colors.label,
                        marginBottom: 4,
                    }}>
                        EpiPay
                    </Text>
                    <Text style={{
                        color: Colors.secondaryLabel,
                        fontSize: 15,
                    }}>
                        Portefeuille digital Epitech
                    </Text>
                </View>

                <View style={{ width: '100%', maxWidth: 400 }}>
                    <Text style={{
                        fontSize: 28,
                        fontWeight: '700',
                        marginBottom: 24,
                        color: Colors.label,
                    }}>
                        Connexion
                    </Text>

                    <View style={{ marginBottom: 16 }}>
                        <Text style={{
                            color: Colors.secondaryLabel,
                            fontWeight: '600',
                            marginBottom: 8,
                            fontSize: 15,
                        }}>
                            Email
                        </Text>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: Colors.secondarySystemBackground,
                            borderRadius: 12,
                            borderCurve: 'continuous',
                            paddingHorizontal: 16,
                        }}>
                            <SymbolView name="envelope.fill" size={20} tintColor={Colors.tertiaryLabel} />
                            <TextInput
                                style={{
                                    flex: 1,
                                    padding: 16,
                                    color: Colors.label,
                                    fontSize: 16,
                                }}
                                placeholder="prenom.nom@epitech.digital"
                                placeholderTextColor={Colors.tertiaryLabel}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>

                    <View style={{ marginBottom: 24 }}>
                        <Text style={{
                            color: Colors.secondaryLabel,
                            fontWeight: '600',
                            marginBottom: 8,
                            fontSize: 15,
                        }}>
                            Mot de passe
                        </Text>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: Colors.secondarySystemBackground,
                            borderRadius: 12,
                            borderCurve: 'continuous',
                            paddingHorizontal: 16,
                        }}>
                            <SymbolView name="lock.fill" size={20} tintColor={Colors.tertiaryLabel} />
                            <TextInput
                                style={{
                                    flex: 1,
                                    padding: 16,
                                    color: Colors.label,
                                    fontSize: 16,
                                }}
                                placeholder="••••••••"
                                placeholderTextColor={Colors.tertiaryLabel}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <SymbolView 
                                    name={showPassword ? 'eye.slash.fill' : 'eye.fill'} 
                                    size={20}
                                    tintColor={Colors.tertiaryLabel}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={{
                            backgroundColor: loading ? Colors.systemFill : Colors.epitechBlue,
                            borderRadius: 12,
                            borderCurve: 'continuous',
                            padding: 16,
                            alignItems: 'center',
                            boxShadow: loading ? 'none' : '0 2px 8px rgba(0, 145, 211, 0.25)',
                            flexDirection: 'row',
                            justifyContent: 'center',
                        }}
                        onPress={signInWithEmail}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={{
                                    color: '#fff',
                                    fontSize: 17,
                                    fontWeight: '700',
                                    marginRight: 8,
                                }}>
                                    Se connecter
                                </Text>
                                <SymbolView name="arrow.right.circle.fill" size={20} tintColor="#fff" />
                            </>
                        )}
                    </TouchableOpacity>

                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'center',
                        marginTop: 24,
                    }}>
                        <Text style={{ color: Colors.secondaryLabel, fontSize: 15 }}>
                            Pas encore de compte ?{' '}
                        </Text>
                        <Link href="/(auth)/sign-up" asChild>
                            <TouchableOpacity>
                                <Text style={{
                                    color: Colors.epitechBlue,
                                    fontWeight: '600',
                                    fontSize: 15,
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
