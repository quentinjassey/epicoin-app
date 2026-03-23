import React, { useState } from 'react';
import {
    Animated,
    Linking,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Colors } from '@/constants/NativeColors';

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
                    <SymbolView
                        name="chevron.right"
                        size={18}
                        tintColor={Colors.epitechBlue}
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
    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: Colors.white }}
            contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
            showsVerticalScrollIndicator={false}
        >
            {/* ── Header ── */}
            <View style={{ alignItems: 'center', marginBottom: 28 }}>
                <View
                    style={{
                        width: 64,
                        height: 64,
                        backgroundColor: Colors.epitechBlue,
                        borderWidth: 2,
                        borderColor: Colors.black,
                        borderRadius: 0,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 14,
                        shadowColor: Colors.black,
                        shadowOffset: { width: 3, height: 3 },
                        shadowOpacity: 1,
                        shadowRadius: 0,
                        elevation: 3,
                    }}
                >
                    <SymbolView
                        name="questionmark.circle.fill"
                        size={32}
                        tintColor={Colors.white}
                    />
                </View>
                <Text
                    style={{
                        fontSize: 24,
                        fontWeight: '900',
                        color: Colors.black,
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                    }}
                >
                    AIDE & SUPPORT
                </Text>
                <Text
                    style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: Colors.mediumGray,
                        textTransform: 'uppercase',
                        letterSpacing: 1.5,
                        marginTop: 4,
                    }}
                >
                    QUESTIONS FREQUENTES
                </Text>
            </View>

            {/* ── FAQ Section ── */}
            <View style={{ marginBottom: 32 }}>
                <Text
                    style={{
                        fontSize: 13,
                        fontWeight: '900',
                        color: Colors.epitechBlue,
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
            <View style={{ marginBottom: 32 }}>
                <Text
                    style={{
                        fontSize: 13,
                        fontWeight: '900',
                        color: Colors.epitechBlue,
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
                            backgroundColor: Colors.epitechBlue,
                            borderWidth: 2,
                            borderColor: Colors.black,
                            borderRadius: 0,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 14,
                        }}
                    >
                        <SymbolView
                            name="envelope.fill"
                            size={20}
                            tintColor={Colors.white}
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
                    <SymbolView
                        name="arrow.up.right"
                        size={16}
                        tintColor={Colors.mediumGray}
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
    );
}
