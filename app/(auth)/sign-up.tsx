import Icon from '@/components/Icon';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
            Alert.alert('Acces restreint', 'Seuls les emails @epitech.digital sont autorises.');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caracteres');
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
                'Inscription reussie',
                'Verifiez votre boite mail pour confirmer votre compte.',
                [{ text: 'OK', onPress: () => router.replace('/(auth)/sign-in') }]
            );
            setLoading(false);
        }
    }

    const selectedCampus = CAMPUSES.find(c => c.name === campus);

    const inputLabelStyle = {
        color: Colors.mediumGray,
        fontWeight: '800' as const,
        marginBottom: 8,
        fontSize: 11,
        textTransform: 'uppercase' as const,
        letterSpacing: 2,
    };

    const inputContainerStyle = {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        backgroundColor: Colors.offWhite,
        borderWidth: 2,
        borderColor: Colors.black,
        paddingHorizontal: 16,
    };

    const inputStyle = {
        flex: 1,
        padding: 16,
        color: Colors.black,
        fontSize: 16,
        fontWeight: '600' as const,
    };

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
                    padding: 24,
                    paddingVertical: 48,
                }}
            >
                {/* Logo */}
                <View style={{ marginBottom: 32, alignItems: 'center' }}>
                    <Image
                        source={require('../../assets/images/epipay-logo.png')}
                        style={{ width: 160, height: 54 }}
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
                        Creer un compte
                    </Text>
                </View>

                <View style={{ width: '100%', maxWidth: 400, alignSelf: 'center' }}>
                    {/* Nom complet */}
                    <View style={{ marginBottom: 16 }}>
                        <Text style={inputLabelStyle}>Nom complet</Text>
                        <View style={inputContainerStyle}>
                            <Icon name="person.fill" size={20} color={Colors.mediumGray} />
                            <TextInput
                                style={inputStyle}
                                placeholder="Jean Dupont"
                                placeholderTextColor={Colors.quaternaryLabel}
                                value={fullName}
                                onChangeText={setFullName}
                            />
                        </View>
                    </View>

                    {/* Email */}
                    <View style={{ marginBottom: 16 }}>
                        <Text style={inputLabelStyle}>Email</Text>
                        <View style={inputContainerStyle}>
                            <Icon name="envelope.fill" size={20} color={Colors.mediumGray} />
                            <TextInput
                                style={inputStyle}
                                placeholder="prenom.nom@epitech.digital"
                                placeholderTextColor={Colors.quaternaryLabel}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>

                    {/* Campus */}
                    <View style={{ marginBottom: 16 }}>
                        <Text style={inputLabelStyle}>Campus</Text>
                        <TouchableOpacity
                            onPress={() => setShowCampusModal(true)}
                            style={{
                                ...inputContainerStyle,
                                paddingVertical: 16,
                            }}
                        >
                            <Icon name="location.fill" size={20} color={Colors.mediumGray} />
                            <Text style={{
                                flex: 1,
                                marginLeft: 16,
                                color: campus ? Colors.black : Colors.quaternaryLabel,
                                fontSize: 16,
                                fontWeight: '600',
                            }}>
                                {selectedCampus ? `${selectedCampus.icon} ${selectedCampus.name}` : 'Selectionner un campus'}
                            </Text>
                            <Icon name="chevron.down" size={16} color={Colors.mediumGray} />
                        </TouchableOpacity>
                    </View>

                    {/* Mot de passe */}
                    <View style={{ marginBottom: 16 }}>
                        <Text style={inputLabelStyle}>Mot de passe</Text>
                        <View style={inputContainerStyle}>
                            <Icon name="lock.fill" size={20} color={Colors.mediumGray} />
                            <TextInput
                                style={inputStyle}
                                placeholder="Min. 6 caracteres"
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

                    {/* Confirmer */}
                    <View style={{ marginBottom: 24 }}>
                        <Text style={inputLabelStyle}>Confirmer le mot de passe</Text>
                        <View style={inputContainerStyle}>
                            <Icon name="lock.fill" size={20} color={Colors.mediumGray} />
                            <TextInput
                                style={inputStyle}
                                placeholder="Confirmer"
                                placeholderTextColor={Colors.quaternaryLabel}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                                autoCorrect={false}
                                autoComplete="off"
                                textContentType="oneTimeCode"
                            />
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
                        }}
                        onPress={signUpWithEmail}
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
                                S'inscrire
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Login link */}
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'center',
                        marginTop: 24,
                    }}>
                        <Text style={{ color: Colors.mediumGray, fontSize: 14, fontWeight: '600' }}>
                            Deja un compte ?{' '}
                        </Text>
                        <Link href="/(auth)/sign-in" asChild>
                            <TouchableOpacity>
                                <Text style={{
                                    color: Colors.epitechBlue,
                                    fontWeight: '900',
                                    fontSize: 14,
                                    textTransform: 'uppercase',
                                }}>
                                    Se connecter
                                </Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            </ScrollView>

            {/* Campus Modal */}
            <Modal
                visible={showCampusModal}
                animationType="slide"
                presentationStyle="formSheet"
                onRequestClose={() => setShowCampusModal(false)}
            >
                <View style={{ flex: 1, backgroundColor: Colors.offWhite }}>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 16,
                        paddingTop: 24,
                        backgroundColor: Colors.white,
                        borderBottomWidth: 2,
                        borderBottomColor: Colors.black,
                    }}>
                        <Text style={{
                            fontSize: 18,
                            fontWeight: '900',
                            color: Colors.black,
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                        }}>
                            Choisir votre campus
                        </Text>
                        <TouchableOpacity onPress={() => setShowCampusModal(false)}>
                            <Icon name="xmark.circle.fill" size={28} color={Colors.mediumGray} />
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
                                        : Colors.white,
                                    borderWidth: 2,
                                    borderColor: campus === c.name ? Colors.epitechBlue : Colors.black,
                                    padding: 16,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ fontSize: 24, marginRight: 12 }}>{c.icon}</Text>
                                <Text style={{
                                    flex: 1,
                                    fontSize: 16,
                                    fontWeight: '700',
                                    color: campus === c.name ? Colors.white : Colors.black,
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                }}>
                                    {c.name}
                                </Text>
                                {campus === c.name && (
                                    <Icon name="checkmark.circle.fill" size={24} color={Colors.white} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}
