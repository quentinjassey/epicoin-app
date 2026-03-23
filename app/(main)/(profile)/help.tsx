import React, { useState } from 'react';
import {
    Animated,
    Linking,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from '@/components/Icon';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/NativeColors';
import { useAccessibility } from '@/lib/AccessibilityContext';

type FAQItem = {
    question: string;
    answer: string;
};

const FAQ_DATA: FAQItem[] = [
    {
        question: 'Comment recharger mon compte ?',
        answer:
            'Allez dans Wallet > Recharger et choisissez un montant. Le paiement se fait par carte via Stripe.',
    },
    {
        question: 'Comment envoyer des EPC ?',
        answer:
            'Depuis le Wallet, appuyez sur Envoyer, recherchez un utilisateur et entrez le montant.',
    },
    {
        question: 'Comment acheter en boutique ?',
        answer:
            'Allez dans Boutique, selectionnez un produit et confirmez avec Face ID ou votre mot de passe.',
    },
    {
        question: 'Que faire si une transaction echoue ?',
        answer:
            'Verifiez votre solde et reessayez. Si le probleme persiste, contactez le support.',
    },
    {
        question: 'Comment changer mon mot de passe ?',
        answer: 'Allez dans Profil > Securite > Changer le mot de passe.',
    },
];

function FAQItemCard({ item }: { item: FAQItem }) {
    const { adaptiveColors } = useAccessibility();
    const [expanded, setExpanded] = useState(false);
    const [rotation] = useState(new Animated.Value(0));

    const toggle = () => {
        Animated.timing(rotation, {
            toValue: expanded ? 0 : 1,
            duration: 200,
            useNativeDriver: true,
        }).start();
        setExpanded(!expanded);
    };

    const rotateInterpolation = rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '90deg'],
    });

    return (
        <View
            style={{
                backgroundColor: Colors.white,
                borderWidth: 2,
                borderColor: Colors.black,
                borderRadius: 0,
                marginBottom: 12,
                shadowColor: Colors.black,
                shadowOffset: { width: 4, height: 4 },
                shadowOpacity: 1,
                shadowRadius: 0,
                elevation: 4,
            }}
        >
            <TouchableOpacity
                onPress={toggle}
                activeOpacity={0.7}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                }}
            >
                <Text
                    style={{
                        flex: 1,
                        fontSize: 15,
                        fontWeight: '800',
                        color: Colors.black,
                        letterSpacing: 0.3,
                    }}
                >
                    {item.question}
                </Text>
                <Animated.View style={{ transform: [{ rotate: rotateInterpolation }] }}>
                    <Icon
                        name="chevron.right"
                        size={18}
                        color={adaptiveColors.primary}
                    />
                </Animated.View>
            </TouchableOpacity>

            {expanded && (
                <View
                    style={{
                        paddingHorizontal: 16,
                        paddingBottom: 16,
                        borderTopWidth: 2,
                        borderTopColor: Colors.lightGray,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 14,
                            fontWeight: '500',
                            color: Colors.mediumGray,
                            lineHeight: 21,
                            marginTop: 12,
                        }}
                    >
                        {item.answer}
                    </Text>
                </View>
            )}
        </View>
    );
}

export default function HelpScreen() {
    const router = useRouter();
    const { adaptiveColors } = useAccessibility();

    return (
        <View style={{ flex: 1 }}>
        <View style={{ backgroundColor: adaptiveColors.primary, position: 'absolute', top: 0, left: 0, right: 0, height: 200 }} />
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 60, backgroundColor: Colors.white }}
            showsVerticalScrollIndicator={false}
        >
            {/* ── Header ── */}
            <View style={{
                backgroundColor: adaptiveColors.primary,
                paddingTop: 70,
                paddingBottom: 32,
                paddingHorizontal: 24,
                borderBottomWidth: 3,
                borderBottomColor: Colors.black,
                marginBottom: 28,
            }}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}
                >
                    <Icon name="chevron.left" size={20} color={Colors.white} />
                    <Text style={{ color: Colors.white, fontWeight: '800', fontSize: 15, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Retour</Text>
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{
                        backgroundColor: Colors.white,
                        padding: 12,
                        borderWidth: 2,
                        borderColor: Colors.black,
                        marginRight: 16,
                        shadowColor: Colors.black,
                        shadowOffset: { width: 3, height: 3 },
                        shadowOpacity: 1,
                        shadowRadius: 0,
                    }}>
                        <Icon
                            name="questionmark.circle.fill"
                            size={28}
                            color={adaptiveColors.primary}
                        />
                </View>
                <View>
                    <Text style={{ fontSize: 22, fontWeight: '900', color: Colors.white, textTransform: 'uppercase', letterSpacing: 1 }}>
                        Aide & Support
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>
                        FAQ et contact
                    </Text>
                </View>
                </View>
            </View>

            {/* ── FAQ Section ── */}
            <View style={{ marginBottom: 32, paddingHorizontal: 20 }}>
                <Text
                    style={{
                        fontSize: 13,
                        fontWeight: '900',
                        color: adaptiveColors.primary,
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                        marginBottom: 14,
                    }}
                >
                    FAQ
                </Text>
                {FAQ_DATA.map((item, index) => (
                    <FAQItemCard key={index} item={item} />
                ))}
            </View>

            {/* ── Contact Section ── */}
            <View style={{ marginBottom: 32, paddingHorizontal: 20 }}>
                <Text
                    style={{
                        fontSize: 13,
                        fontWeight: '900',
                        color: adaptiveColors.primary,
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                        marginBottom: 14,
                    }}
                >
                    CONTACT
                </Text>
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() =>
                        Linking.openURL('mailto:support@epipay.epitech.digital')
                    }
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: Colors.offWhite,
                        borderWidth: 2,
                        borderColor: Colors.black,
                        borderRadius: 0,
                        padding: 16,
                        shadowColor: Colors.black,
                        shadowOffset: { width: 4, height: 4 },
                        shadowOpacity: 1,
                        shadowRadius: 0,
                        elevation: 4,
                    }}
                >
                    <View
                        style={{
                            width: 40,
                            height: 40,
                            backgroundColor: adaptiveColors.primary,
                            borderWidth: 2,
                            borderColor: Colors.black,
                            borderRadius: 0,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 14,
                        }}
                    >
                        <Icon
                            name="envelope.fill"
                            size={20}
                            color={Colors.white}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text
                            style={{
                                fontSize: 11,
                                fontWeight: '800',
                                color: Colors.mediumGray,
                                textTransform: 'uppercase',
                                letterSpacing: 1.5,
                                marginBottom: 2,
                            }}
                        >
                            EMAIL
                        </Text>
                        <Text
                            style={{
                                fontSize: 15,
                                fontWeight: '700',
                                color: Colors.black,
                            }}
                        >
                            support@epipay.epitech.digital
                        </Text>
                    </View>
                    <Icon
                        name="arrow.up.right"
                        size={16}
                        color={Colors.mediumGray}
                    />
                </TouchableOpacity>
            </View>

            {/* ── App Version ── */}
            <View style={{ alignItems: 'center', marginTop: 8 }}>
                <Text
                    style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: Colors.mediumGray,
                        textTransform: 'uppercase',
                        letterSpacing: 1.5,
                    }}
                >
                    EpiPay v1.0.0
                </Text>
            </View>
        </ScrollView>
        </View>
    );
}
