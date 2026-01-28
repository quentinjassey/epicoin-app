import { SymbolView } from 'expo-symbols';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '@/constants/NativeColors';

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
                'Inscription réussie',
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
            style={{ flex: 1, backgroundColor: Colors.systemBackground }}
        >
            <ScrollView 
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: 'center',
                    padding: 24,
                    paddingVertical: 48,
                }}
            >
                <View style={{ marginBottom: 24, alignItems: 'center' }}>
                    <View style={{
                        backgroundColor: Colors.epitechBlue,
                        width: 64,
                        height: 64,
                        borderRadius: 16,
                        borderCurve: 'continuous',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 12,
                        boxShadow: '0 4px 12px rgba(0, 145, 211, 0.25)',
                    }}>
                        <SymbolView name="wallet.pass.fill" size={32} tintColor="#fff" />
                    </View>
                    <Text style={{
                        fontSize: 24,
                        fontWeight: '700',
                        color: Colors.label,
                        marginBottom: 4,
                    }}>
                        Créer un compte
                    </Text>
                    <Text style={{
                        color: Colors.secondaryLabel,
                        fontSize: 15,
                    }}>
                        Rejoignez l'économie EpiPay
                    </Text>
                </View>

                <View style={{ width: '100%', maxWidth: 400, alignSelf: 'center' }}>
                    <View style={{ marginBottom: 16 }}>
                        <Text style={{
                            color: Colors.secondaryLabel,
                            fontWeight: '600',
                            marginBottom: 8,
                            fontSize: 15,
                        }}>
                            Nom complet
                        </Text>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: Colors.secondarySystemBackground,
                            borderRadius: 12,
                            borderCurve: 'continuous',
                            paddingHorizontal: 16,
                        }}>
                            <SymbolView name="person.fill" size={20} tintColor={Colors.tertiaryLabel} />
                            <TextInput
                                style={{
                                    flex: 1,
                                    padding: 16,
                                    color: Colors.label,
                                    fontSize: 16,
                                }}
                                placeholder="Jean Dupont"
                                placeholderTextColor={Colors.tertiaryLabel}
                                value={fullName}
                                onChangeText={setFullName}
                            />
                        </View>
                    </View>

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

                    <View style={{ marginBottom: 16 }}>
                        <Text style={{
                            color: Colors.secondaryLabel,
                            fontWeight: '600',
                            marginBottom: 8,
                            fontSize: 15,
                        }}>
                            Campus
                        </Text>
                        <TouchableOpacity
                            onPress={() => setShowCampusModal(true)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: Colors.secondarySystemBackground,
                                borderRadius: 12,
                                borderCurve: 'continuous',
                                paddingHorizontal: 16,
                                paddingVertical: 16,
                            }}
                        >
                            <SymbolView name="location.fill" size={20} tintColor={Colors.tertiaryLabel} />
                            <Text style={{
                                flex: 1,
                                marginLeft: 16,
                                color: campus ? Colors.label : Colors.tertiaryLabel,
                                fontSize: 16,
                            }}>
                                {selectedCampus ? `${selectedCampus.icon} ${selectedCampus.name}` : 'Sélectionner un campus'}
                            </Text>
                            <SymbolView name="chevron.down" size={16} tintColor={Colors.tertiaryLabel} />
                        </TouchableOpacity>
                    </View>

                    <View style={{ marginBottom: 16 }}>
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
                                placeholder="Min. 6 caractères"
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

                    <View style={{ marginBottom: 24 }}>
                        <Text style={{
                            color: Colors.secondaryLabel,
                            fontWeight: '600',
                            marginBottom: 8,
                            fontSize: 15,
                        }}>
                            Confirmer le mot de passe
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
                                placeholder="Confirmer"
                                placeholderTextColor={Colors.tertiaryLabel}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                            />
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
                        }}
                        onPress={signUpWithEmail}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={{
                                color: '#fff',
                                fontSize: 17,
                                fontWeight: '700',
                            }}>
                                S'inscrire
                            </Text>
                        )}
                    </TouchableOpacity>

                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'center',
                        marginTop: 24,
                    }}>
                        <Text style={{ color: Colors.secondaryLabel, fontSize: 15 }}>
                            Déjà un compte ?{' '}
                        </Text>
                        <Link href="/(auth)/sign-in" asChild>
                            <TouchableOpacity>
                                <Text style={{
                                    color: Colors.epitechBlue,
                                    fontWeight: '600',
                                    fontSize: 15,
                                }}>
                                    Se connecter
                                </Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            </ScrollView>

            <Modal
                visible={showCampusModal}
                animationType="slide"
                presentationStyle="formSheet"
                onRequestClose={() => setShowCampusModal(false)}
            >
                <View style={{ flex: 1, backgroundColor: Colors.systemGroupedBackground }}>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 16,
                        paddingTop: 24,
                        backgroundColor: Colors.secondarySystemBackground,
                        borderBottomWidth: 1,
                        borderBottomColor: Colors.separator,
                    }}>
                        <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.label }}>
                            Choisir votre campus
                        </Text>
                        <TouchableOpacity onPress={() => setShowCampusModal(false)}>
                            <SymbolView name="xmark.circle.fill" size={28} tintColor={Colors.tertiaryLabel} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
                        {CAMPUSES.map((c) => (
                            <TouchableOpacity
                                key={c.id}
                                onPress={() => {
                                    setCampus(c.name);
                                    setShowCampusModal(false);
                                }}
                                style={{
                                    backgroundColor: campus === c.name 
                                        ? Colors.epitechBlue 
                                        : Colors.secondarySystemGroupedBackground,
                                    borderRadius: 12,
                                    borderCurve: 'continuous',
                                    padding: 16,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ fontSize: 24, marginRight: 12 }}>{c.icon}</Text>
                                <Text style={{
                                    flex: 1,
                                    fontSize: 17,
                                    fontWeight: '600',
                                    color: campus === c.name ? '#fff' : Colors.label,
                                }}>
                                    {c.name}
                                </Text>
                                {campus === c.name && (
                                    <SymbolView name="checkmark.circle.fill" size={24} tintColor="#fff" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}
