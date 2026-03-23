import Icon from '@/components/Icon';
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
import { supabase } from '../../../lib/supabase';
import { Colors } from '@/constants/NativeColors';

const CAMPUSES = [
    'Paris',
    'Lyon',
    'Bordeaux',
    'Lille',
    'Marseille',
    'Montpellier',
    'Nancy',
    'Nantes',
    'Nice',
    'Rennes',
    'Strasbourg',
    'Toulouse',
];

export default function PersonalInfoScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [campus, setCampus] = useState('');
    const [showCampusPicker, setShowCampusPicker] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    async function fetchProfile() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, email, campus')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            setEmail(data.email || '');
            setFullName(data.full_name || '');
            setCampus(data.campus || '');
        } catch (error) {
            console.error('Error fetching profile:', error);
            Alert.alert('Erreur', 'Impossible de charger vos informations.');
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        if (!fullName.trim()) {
            Alert.alert('Erreur', 'Le nom complet ne peut pas être vide.');
            return;
        }
        if (!campus) {
            Alert.alert('Erreur', 'Veuillez sélectionner un campus.');
            return;
        }

        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName.trim(),
                    campus: campus,
                })
                .eq('id', user.id);

            if (error) throw error;

            Alert.alert('Succès', 'Vos informations ont été mises à jour.');
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Erreur', 'Impossible de sauvegarder vos informations.');
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: Colors.white,
            }}>
                <ActivityIndicator size="large" color={Colors.epitechBlue} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
        <View style={{ backgroundColor: Colors.epitechBlue, position: 'absolute', top: 0, left: 0, right: 0, height: 200 }} />
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
                paddingBottom: 48,
                backgroundColor: Colors.white,
            }}
        >
            {/* Header */}
            <View style={{
                backgroundColor: Colors.epitechBlue,
                paddingTop: 70,
                paddingBottom: 32,
                paddingHorizontal: 24,
                borderBottomWidth: 3,
                borderBottomColor: Colors.black,
            }}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 24,
                    }}
                >
                    <Icon
                        name="chevron.left"
                        size={20}
                        color={Colors.white}
                    />
                    <Text style={{
                        color: Colors.white,
                        fontWeight: '800',
                        fontSize: 16,
                        marginLeft: 8,
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                    }}>
                        RETOUR
                    </Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{
                        backgroundColor: Colors.white,
                        padding: 12,
                        borderRadius: 0,
                        borderWidth: 3,
                        borderColor: Colors.black,
                        shadowColor: Colors.black,
                        shadowOffset: { width: 4, height: 4 },
                        shadowOpacity: 1,
                        shadowRadius: 0,
                        marginRight: 16,
                    }}>
                        <Icon
                            name="person.circle"
                            size={28}
                            color={Colors.epitechBlue}
                        />
                    </View>
                    <View>
                        <Text style={{
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: '900',
                            letterSpacing: 1,
                            textTransform: 'uppercase',
                        }}>
                            INFORMATIONS
                        </Text>
                        <Text style={{
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: '700',
                            opacity: 0.8,
                            letterSpacing: 0.5,
                        }}>
                            PERSONNELLES
                        </Text>
                    </View>
                </View>
            </View>

            {/* Form */}
            <View style={{ paddingHorizontal: 24, marginTop: 24 }}>

                {/* Full Name */}
                <View style={{ marginBottom: 24 }}>
                    <Text style={{
                        color: Colors.black,
                        fontSize: 13,
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                        marginBottom: 8,
                    }}>
                        NOM COMPLET
                    </Text>
                    <View style={{
                        backgroundColor: Colors.white,
                        borderWidth: 2,
                        borderColor: Colors.black,
                        borderRadius: 0,
                        shadowColor: Colors.black,
                        shadowOffset: { width: 3, height: 3 },
                        shadowOpacity: 1,
                        shadowRadius: 0,
                    }}>
                        <TextInput
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="Votre nom complet"
                            placeholderTextColor={Colors.mediumGray}
                            style={{
                                padding: 16,
                                fontSize: 16,
                                fontWeight: '700',
                                color: Colors.black,
                            }}
                        />
                    </View>
                </View>

                {/* Email (read-only) */}
                <View style={{ marginBottom: 24 }}>
                    <Text style={{
                        color: Colors.black,
                        fontSize: 13,
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                        marginBottom: 8,
                    }}>
                        EMAIL
                    </Text>
                    <View style={{
                        backgroundColor: Colors.offWhite,
                        borderWidth: 2,
                        borderColor: Colors.lightGray,
                        borderRadius: 0,
                    }}>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: 16,
                        }}>
                            <Icon
                                name="lock.fill"
                                size={16}
                                color={Colors.mediumGray}
                            />
                            <Text style={{
                                fontSize: 16,
                                fontWeight: '700',
                                color: Colors.mediumGray,
                                marginLeft: 10,
                                flex: 1,
                            }}>
                                {email}
                            </Text>
                        </View>
                    </View>
                    <Text style={{
                        color: Colors.mediumGray,
                        fontSize: 11,
                        fontWeight: '700',
                        marginTop: 6,
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                    }}>
                        L'EMAIL NE PEUT PAS ÊTRE MODIFIÉ
                    </Text>
                </View>

                {/* Campus */}
                <View style={{ marginBottom: 32 }}>
                    <Text style={{
                        color: Colors.black,
                        fontSize: 13,
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                        marginBottom: 8,
                    }}>
                        CAMPUS
                    </Text>
                    <TouchableOpacity
                        onPress={() => setShowCampusPicker(!showCampusPicker)}
                        style={{
                            backgroundColor: Colors.white,
                            borderWidth: 2,
                            borderColor: Colors.black,
                            borderRadius: 0,
                            padding: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            shadowColor: Colors.black,
                            shadowOffset: { width: 3, height: 3 },
                            shadowOpacity: 1,
                            shadowRadius: 0,
                        }}
                    >
                        <Text style={{
                            fontSize: 16,
                            fontWeight: '700',
                            color: campus ? Colors.black : Colors.mediumGray,
                        }}>
                            {campus || 'Sélectionner un campus'}
                        </Text>
                        <Icon
                            name={showCampusPicker ? 'chevron.up' : 'chevron.down'}
                            size={14}
                            color={Colors.black}
                        />
                    </TouchableOpacity>

                    {showCampusPicker && (
                        <View style={{
                            borderWidth: 2,
                            borderTopWidth: 0,
                            borderColor: Colors.black,
                            borderRadius: 0,
                            backgroundColor: Colors.white,
                            shadowColor: Colors.black,
                            shadowOffset: { width: 3, height: 3 },
                            shadowOpacity: 1,
                            shadowRadius: 0,
                        }}>
                            {CAMPUSES.map((item, index) => (
                                <TouchableOpacity
                                    key={item}
                                    onPress={() => {
                                        setCampus(item);
                                        setShowCampusPicker(false);
                                    }}
                                    style={{
                                        padding: 14,
                                        paddingHorizontal: 16,
                                        borderBottomWidth: index < CAMPUSES.length - 1 ? 1 : 0,
                                        borderBottomColor: Colors.lightGray,
                                        backgroundColor: campus === item ? Colors.offWhite : Colors.white,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                    }}
                                >
                                    <Text style={{
                                        fontSize: 15,
                                        fontWeight: campus === item ? '900' : '700',
                                        color: campus === item ? Colors.epitechBlue : Colors.black,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                    }}>
                                        {item}
                                    </Text>
                                    {campus === item && (
                                        <Icon
                                            name="checkmark"
                                            size={16}
                                            color={Colors.epitechBlue}
                                        />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving}
                    style={{
                        backgroundColor: Colors.epitechBlue,
                        borderWidth: 3,
                        borderColor: Colors.black,
                        borderRadius: 0,
                        padding: 18,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        shadowColor: Colors.black,
                        shadowOffset: { width: 4, height: 4 },
                        shadowOpacity: 1,
                        shadowRadius: 0,
                        opacity: saving ? 0.7 : 1,
                    }}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                        <>
                            <Icon
                                name="checkmark.circle.fill"
                                size={22}
                                color={Colors.white}
                            />
                            <Text style={{
                                color: Colors.white,
                                fontWeight: '900',
                                fontSize: 16,
                                marginLeft: 10,
                                textTransform: 'uppercase',
                                letterSpacing: 1.5,
                            }}>
                                SAUVEGARDER
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
        </View>
    );
}
