import Icon from '@/components/Icon';
import { Colors } from '@/constants/NativeColors';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Image,
    Linking,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const CONSENT_ITEMS = [
    {
        id: 'location',
        icon: 'location.fill',
        label: "J'accepte la collecte de ma localisation pour la detection de fraude",
    },
    {
        id: 'device',
        icon: 'lock.fill',
        label: "J'accepte la collecte d'informations sur mon appareil pour securiser mon compte",
    },
    {
        id: 'transactions',
        icon: 'shield.checkered',
        label: "J'accepte l'analyse de mes transactions pour la prevention de fraude",
    },
    {
        id: 'privacy',
        icon: 'doc.text',
        label: "J'ai lu et j'accepte la politique de confidentialite",
        hasLink: true,
    },
    {
        id: 'age',
        icon: 'person.fill',
        label: "Je confirme avoir au moins 16 ans",
    },
];

export default function ConsentScreen() {
    const router = useRouter();
    const [checked, setChecked] = useState<Record<string, boolean>>({});

    const allChecked = CONSENT_ITEMS.every((item) => checked[item.id]);

    function toggleItem(id: string) {
        setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
    }

    function openPrivacyPolicy() {
        // TODO: replace with actual privacy policy URL
        Linking.openURL('https://epipay.app/privacy');
    }

    return (
        <View style={{ flex: 1, backgroundColor: Colors.white }}>
            <ScrollView
                contentContainerStyle={{
                    flexGrow: 1,
                    padding: 24,
                    paddingTop: 80,
                    paddingBottom: 48,
                }}
            >
                {/* Logo */}
                <View style={{ alignItems: 'center', marginBottom: 32 }}>
                    <Image
                        source={require('../../assets/images/epipay-logo.png')}
                        style={{ width: 160, height: 54 }}
                        resizeMode="contain"
                    />
                </View>

                {/* Title */}
                <Text
                    style={{
                        color: Colors.black,
                        fontSize: 24,
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                        textAlign: 'center',
                        marginBottom: 16,
                    }}
                >
                    PROTECTION DE VOS DONNEES
                </Text>

                {/* Subtitle */}
                <Text
                    style={{
                        color: Colors.mediumGray,
                        fontSize: 14,
                        fontWeight: '700',
                        textAlign: 'center',
                        lineHeight: 22,
                        marginBottom: 32,
                        paddingHorizontal: 8,
                    }}
                >
                    EpiPay collecte certaines donnees uniquement pour securiser
                    vos transactions et prevenir la fraude. Nous ne revendons
                    JAMAIS vos donnees.
                </Text>

                {/* Consent items */}
                <View
                    style={{
                        backgroundColor: Colors.white,
                        borderWidth: 3,
                        borderColor: Colors.black,
                        shadowColor: Colors.black,
                        shadowOffset: { width: 4, height: 4 },
                        shadowOpacity: 1,
                        shadowRadius: 0,
                        marginBottom: 32,
                    }}
                >
                    {CONSENT_ITEMS.map((item, index) => (
                        <TouchableOpacity
                            key={item.id}
                            onPress={() => toggleItem(item.id)}
                            activeOpacity={0.7}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                padding: 16,
                                borderBottomWidth:
                                    index < CONSENT_ITEMS.length - 1 ? 2 : 0,
                                borderBottomColor: Colors.lightGray,
                            }}
                        >
                            {/* Checkbox */}
                            <View
                                style={{
                                    width: 28,
                                    height: 28,
                                    borderWidth: 2,
                                    borderColor: Colors.black,
                                    borderRadius: 0,
                                    backgroundColor: checked[item.id]
                                        ? Colors.epitechBlue
                                        : Colors.white,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 14,
                                }}
                            >
                                {checked[item.id] && (
                                    <Icon
                                        name="checkmark"
                                        size={18}
                                        color={Colors.white}
                                    />
                                )}
                            </View>

                            {/* Icon */}
                            <Icon
                                name={item.icon}
                                size={20}
                                color={Colors.epitechBlue}
                                style={{ marginRight: 12 }}
                            />

                            {/* Label */}
                            <View style={{ flex: 1 }}>
                                <Text
                                    style={{
                                        color: Colors.black,
                                        fontSize: 13,
                                        fontWeight: '700',
                                        lineHeight: 20,
                                    }}
                                >
                                    {item.label}
                                </Text>
                                {item.hasLink && (
                                    <TouchableOpacity
                                        onPress={openPrivacyPolicy}
                                    >
                                        <Text
                                            style={{
                                                color: Colors.epitechBlue,
                                                fontSize: 12,
                                                fontWeight: '800',
                                                textDecorationLine: 'underline',
                                                marginTop: 4,
                                                textTransform: 'uppercase',
                                                letterSpacing: 0.5,
                                            }}
                                        >
                                            Lire la politique de confidentialite
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Continue button */}
                <TouchableOpacity
                    style={{
                        backgroundColor: allChecked
                            ? Colors.epitechBlue
                            : Colors.lightGray,
                        padding: 16,
                        alignItems: 'center',
                        borderWidth: 2,
                        borderColor: Colors.black,
                        shadowColor: allChecked ? Colors.black : 'transparent',
                        shadowOffset: { width: 4, height: 4 },
                        shadowOpacity: allChecked ? 1 : 0,
                        shadowRadius: 0,
                    }}
                    onPress={() => router.push('/(auth)/sign-up')}
                    disabled={!allChecked}
                >
                    <Text
                        style={{
                            color: allChecked ? Colors.white : Colors.mediumGray,
                            fontSize: 15,
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            letterSpacing: 2,
                        }}
                    >
                        CONTINUER
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}
