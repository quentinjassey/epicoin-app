import Icon from '@/components/Icon';
import { Colors } from '@/constants/NativeColors';
import { useAccessibility } from '@/lib/AccessibilityContext';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Image,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ConsentScreen() {
    const { adaptiveColors } = useAccessibility();
    const router = useRouter();
    const [accepted, setAccepted] = useState(false);

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
                <Text style={{
                    color: Colors.black,
                    fontSize: 24,
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                    textAlign: 'center',
                    marginBottom: 16,
                }}>
                    Protection de vos donnees
                </Text>

                {/* Content card */}
                <View style={{
                    backgroundColor: Colors.white,
                    borderWidth: 2,
                    borderColor: Colors.black,
                    shadowColor: Colors.black,
                    shadowOffset: { width: 4, height: 4 },
                    shadowOpacity: 1,
                    shadowRadius: 0,
                    padding: 20,
                    marginBottom: 24,
                }}>
                    <Text style={{
                        color: Colors.black,
                        fontSize: 14,
                        fontWeight: '600',
                        lineHeight: 22,
                        marginBottom: 20,
                    }}>
                        EpiPay collecte certaines donnees uniquement pour securiser vos transactions et prevenir la fraude. Nous ne revendons JAMAIS vos donnees.
                    </Text>

                    {/* What we collect */}
                    <Text style={{
                        color: Colors.black,
                        fontSize: 12,
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                        marginBottom: 12,
                    }}>
                        Ce que nous collectons
                    </Text>

                    <View style={{ gap: 12, marginBottom: 20 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                            <Icon name="location.fill" size={16} color={adaptiveColors.primary} style={{ marginRight: 10, marginTop: 2 }} />
                            <Text style={{ flex: 1, color: Colors.black, fontSize: 13, fontWeight: '600', lineHeight: 20 }}>
                                <Text style={{ fontWeight: '800' }}>Localisation</Text> — Coordonnees GPS ou geolocalisation IP lors des transactions pour detecter les activites suspectes.
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                            <Icon name="lock.fill" size={16} color={adaptiveColors.primary} style={{ marginRight: 10, marginTop: 2 }} />
                            <Text style={{ flex: 1, color: Colors.black, fontSize: 13, fontWeight: '600', lineHeight: 20 }}>
                                <Text style={{ fontWeight: '800' }}>Appareil</Text> — Modele et systeme d'exploitation pour identifier les connexions inhabituelles.
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                            <Icon name="shield.checkered" size={16} color={adaptiveColors.primary} style={{ marginRight: 10, marginTop: 2 }} />
                            <Text style={{ flex: 1, color: Colors.black, fontSize: 13, fontWeight: '600', lineHeight: 20 }}>
                                <Text style={{ fontWeight: '800' }}>Transactions</Text> — Analyse des patterns pour la prevention de fraude en temps reel.
                            </Text>
                        </View>
                    </View>

                    {/* Why */}
                    <Text style={{
                        color: Colors.black,
                        fontSize: 12,
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                        marginBottom: 12,
                    }}>
                        Pourquoi
                    </Text>

                    <Text style={{
                        color: Colors.black,
                        fontSize: 13,
                        fontWeight: '600',
                        lineHeight: 20,
                        marginBottom: 20,
                    }}>
                        Ces donnees servent exclusivement a proteger votre compte. Aucune donnee n'est vendue, partagee a des fins publicitaires ou utilisee en dehors de la securisation de vos transactions.
                    </Text>

                    {/* Your rights */}
                    <Text style={{
                        color: Colors.black,
                        fontSize: 12,
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                        marginBottom: 12,
                    }}>
                        Vos droits
                    </Text>

                    <Text style={{
                        color: Colors.black,
                        fontSize: 13,
                        fontWeight: '600',
                        lineHeight: 20,
                        marginBottom: 20,
                    }}>
                        Vous pouvez a tout moment exporter vos donnees, supprimer votre compte ou contacter notre DPO a dpo@epipay.epitech.digital. Vos donnees sont hebergees a Frankfurt (Allemagne, UE).
                    </Text>

                    {/* Age */}
                    <View style={{
                        backgroundColor: Colors.offWhite,
                        borderWidth: 2,
                        borderColor: Colors.black,
                        padding: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                    }}>
                        <Icon name="person.fill" size={16} color={adaptiveColors.primary} style={{ marginRight: 10 }} />
                        <Text style={{ flex: 1, color: Colors.black, fontSize: 13, fontWeight: '700' }}>
                            Vous devez avoir au moins 16 ans pour utiliser EpiPay.
                        </Text>
                    </View>
                </View>

                {/* Privacy policy link */}
                <TouchableOpacity
                    onPress={() => router.push('/(auth)/privacy-policy')}
                    style={{
                        borderWidth: 2,
                        borderColor: adaptiveColors.primary,
                        padding: 14,
                        alignItems: 'center',
                        marginBottom: 24,
                    }}
                >
                    <Text style={{
                        color: adaptiveColors.primary,
                        fontSize: 13,
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                    }}>
                        Lire la politique de confidentialite
                    </Text>
                </TouchableOpacity>

                {/* Single checkbox */}
                <TouchableOpacity
                    onPress={() => setAccepted(!accepted)}
                    activeOpacity={0.7}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 24,
                        padding: 16,
                        borderWidth: 2,
                        borderColor: Colors.black,
                        backgroundColor: accepted ? Colors.offWhite : Colors.white,
                    }}
                >
                    <View style={{
                        width: 28,
                        height: 28,
                        borderWidth: 2,
                        borderColor: Colors.black,
                        backgroundColor: accepted ? adaptiveColors.primary : Colors.white,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 14,
                    }}>
                        {accepted && (
                            <Icon name="checkmark" size={18} color={Colors.white} />
                        )}
                    </View>
                    <Text style={{
                        flex: 1,
                        color: Colors.black,
                        fontSize: 13,
                        fontWeight: '700',
                        lineHeight: 20,
                    }}>
                        J'ai lu et j'accepte les conditions ci-dessus, la politique de confidentialite, et je confirme avoir au moins 16 ans.
                    </Text>
                </TouchableOpacity>

                {/* Continue button */}
                <TouchableOpacity
                    style={{
                        backgroundColor: accepted ? adaptiveColors.primary : Colors.lightGray,
                        padding: 16,
                        alignItems: 'center',
                        borderWidth: 2,
                        borderColor: Colors.black,
                        shadowColor: accepted ? Colors.black : 'transparent',
                        shadowOffset: { width: 4, height: 4 },
                        shadowOpacity: accepted ? 1 : 0,
                        shadowRadius: 0,
                    }}
                    onPress={() => router.push('/(auth)/sign-up')}
                    disabled={!accepted}
                >
                    <Text style={{
                        color: accepted ? Colors.white : Colors.mediumGray,
                        fontSize: 15,
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                    }}>
                        Continuer
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}
