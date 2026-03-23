import Icon from '@/components/Icon';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAccessibility, ColorBlindMode } from '@/lib/AccessibilityContext';
import { Colors } from '@/constants/NativeColors';

const COLOR_BLIND_MODES: { key: ColorBlindMode; label: string; description: string }[] = [
    { key: 'none', label: 'AUCUN', description: 'Vision normale des couleurs' },
    { key: 'protanopia', label: 'PROTANOPIE', description: 'Difficulte a percevoir le rouge' },
    { key: 'deuteranopia', label: 'DEUTERANOPIE', description: 'Difficulte a percevoir le vert' },
    { key: 'tritanopia', label: 'TRITANOPIE', description: 'Difficulte a percevoir le bleu' },
    { key: 'achromatopsia', label: 'ACHROMATOPSIE', description: 'Vision en nuances de gris' },
];

const SETTINGS = [
    {
        key: 'largeText',
        icon: 'doc.text',
        label: 'TEXTE AGRANDI',
        description: 'Augmente la taille de tous les textes de l\'application',
        color: Colors.epitechBlue,
    },
    {
        key: 'highContrast',
        icon: 'circle.lefthalf.filled',
        label: 'CONTRASTE ELEVE',
        description: 'Renforce les contrastes pour une meilleure lisibilite',
        color: Colors.accentMagenta,
    },
    {
        key: 'reduceMotion',
        icon: 'sparkles',
        label: 'REDUIRE LES ANIMATIONS',
        description: 'Desactive les effets glitch et les transitions animees',
        color: Colors.accentOrange,
    },
    {
        key: 'boldText',
        icon: 'bold',
        label: 'TEXTE EN GRAS',
        description: 'Rend tous les textes plus epais pour faciliter la lecture',
        color: Colors.success,
    },
];

export default function AccessibilityScreen() {
    const router = useRouter();
    const { prefs, updatePrefs } = useAccessibility();
    const [saved, setSaved] = useState(false);

    function togglePref(key: string) {
        const newPrefs = { ...prefs, [key]: !prefs[key as keyof typeof prefs] };
        updatePrefs(newPrefs);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }

    function resetPrefs() {
        Alert.alert(
            'Reinitialiser',
            'Remettre tous les parametres d\'accessibilite par defaut ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Reinitialiser',
                    style: 'destructive',
                    onPress: () => {
                        updatePrefs({ largeText: false, highContrast: false, reduceMotion: false, boldText: false });
                        setSaved(true);
                        setTimeout(() => setSaved(false), 2000);
                    },
                },
            ]
        );
    }

    const activeCount = Object.values(prefs).filter(Boolean).length;
    const fontSize = prefs.largeText ? 16 : 13;
    const descFontSize = prefs.largeText ? 14 : 12;
    const headerFontSize = prefs.largeText ? 24 : 20;
    const fontWeight = prefs.boldText ? '900' : '700';

    return (
        <View style={{ flex: 1 }}>
            <View style={{ backgroundColor: Colors.epitechBlue, position: 'absolute', top: 0, left: 0, right: 0, height: 200 }} />
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 48, backgroundColor: Colors.white }}
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
                        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}
                    >
                        <Icon name="chevron.left" size={20} color={Colors.white} />
                        <Text style={{ color: Colors.white, fontWeight: '800', fontSize: 15, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Retour
                        </Text>
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
                            <Icon name="eye.fill" size={28} color={Colors.epitechBlue} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{
                                color: Colors.white,
                                fontSize: headerFontSize,
                                fontWeight: '900',
                                letterSpacing: 1,
                                textTransform: 'uppercase',
                            }}>
                                Accessibilite
                            </Text>
                            <Text style={{
                                color: 'rgba(255,255,255,0.7)',
                                fontSize: descFontSize,
                                fontWeight: fontWeight as any,
                                textTransform: 'uppercase',
                                letterSpacing: 1,
                                marginTop: 4,
                            }}>
                                {activeCount} option{activeCount !== 1 ? 's' : ''} active{activeCount !== 1 ? 's' : ''}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Preview banner */}
                <View style={{
                    marginHorizontal: 24,
                    marginTop: 24,
                    backgroundColor: Colors.offWhite,
                    borderWidth: 2,
                    borderColor: Colors.black,
                    padding: 16,
                    marginBottom: 24,
                }}>
                    <Text style={{
                        color: Colors.black,
                        fontSize: prefs.largeText ? 18 : 14,
                        fontWeight: prefs.boldText ? '900' : '600',
                        textAlign: 'center',
                        ...(prefs.highContrast ? { color: '#000000' } : {}),
                    }}>
                        Apercu : Ce texte s'adapte en temps reel a vos preferences.
                    </Text>
                </View>

                {/* Settings */}
                <View style={{
                    marginHorizontal: 24,
                    borderWidth: 2,
                    borderColor: Colors.black,
                    backgroundColor: Colors.white,
                    shadowColor: Colors.black,
                    shadowOffset: { width: 4, height: 4 },
                    shadowOpacity: 1,
                    shadowRadius: 0,
                    marginBottom: 24,
                }}>
                    {SETTINGS.map((item, index) => (
                        <View
                            key={item.key}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                padding: 16,
                                borderBottomWidth: index < SETTINGS.length - 1 ? 2 : 0,
                                borderBottomColor: Colors.black,
                            }}
                        >
                            <View style={{
                                backgroundColor: Colors.offWhite,
                                padding: 10,
                                borderWidth: 2,
                                borderColor: Colors.black,
                                marginRight: 14,
                            }}>
                                <Icon name={item.icon} size={20} color={item.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{
                                    fontWeight: prefs.boldText ? '900' : '800',
                                    color: prefs.highContrast ? '#000000' : Colors.black,
                                    fontSize: fontSize,
                                    letterSpacing: 0.5,
                                    textTransform: 'uppercase',
                                }}>
                                    {item.label}
                                </Text>
                                <Text style={{
                                    color: prefs.highContrast ? '#333333' : Colors.mediumGray,
                                    fontSize: descFontSize,
                                    fontWeight: prefs.boldText ? '700' : '600',
                                    marginTop: 2,
                                }}>
                                    {item.description}
                                </Text>
                            </View>
                            <Switch
                                value={prefs[item.key as keyof typeof prefs]}
                                onValueChange={() => togglePref(item.key)}
                                trackColor={{ false: Colors.lightGray, true: item.color }}
                            />
                        </View>
                    ))}
                </View>

                {/* Daltonisme */}
                <View style={{ marginHorizontal: 24, marginBottom: 24 }}>
                    <Text style={{
                        color: Colors.black,
                        fontSize: 12,
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                        marginBottom: 12,
                    }}>
                        Daltonisme
                    </Text>
                    <View style={{
                        borderWidth: 2,
                        borderColor: Colors.black,
                        backgroundColor: Colors.white,
                        shadowColor: Colors.black,
                        shadowOffset: { width: 4, height: 4 },
                        shadowOpacity: 1,
                        shadowRadius: 0,
                    }}>
                        {COLOR_BLIND_MODES.map((mode, index) => {
                            const isActive = prefs.colorBlindMode === mode.key;
                            return (
                                <TouchableOpacity
                                    key={mode.key}
                                    onPress={() => {
                                        updatePrefs({ ...prefs, colorBlindMode: mode.key });
                                        setSaved(true);
                                        setTimeout(() => setSaved(false), 2000);
                                    }}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        padding: 14,
                                        borderBottomWidth: index < COLOR_BLIND_MODES.length - 1 ? 2 : 0,
                                        borderBottomColor: Colors.black,
                                        backgroundColor: isActive ? Colors.epitechBlue : Colors.white,
                                    }}
                                >
                                    <View style={{
                                        width: 24,
                                        height: 24,
                                        borderWidth: 2,
                                        borderColor: isActive ? Colors.white : Colors.black,
                                        backgroundColor: isActive ? Colors.white : 'transparent',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: 12,
                                    }}>
                                        {isActive && <Icon name="checkmark" size={16} color={Colors.epitechBlue} />}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{
                                            fontWeight: '800',
                                            color: isActive ? Colors.white : Colors.black,
                                            fontSize: fontSize,
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.5,
                                        }}>
                                            {mode.label}
                                        </Text>
                                        <Text style={{
                                            color: isActive ? 'rgba(255,255,255,0.7)' : Colors.mediumGray,
                                            fontSize: descFontSize,
                                            fontWeight: '600',
                                            marginTop: 2,
                                        }}>
                                            {mode.description}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Saved confirmation */}
                {saved && (
                    <View style={{
                        marginHorizontal: 24,
                        backgroundColor: Colors.success,
                        borderWidth: 2,
                        borderColor: Colors.black,
                        padding: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 24,
                    }}>
                        <Icon name="checkmark.circle.fill" size={18} color={Colors.white} />
                        <Text style={{
                            color: Colors.white,
                            fontWeight: '900',
                            fontSize: 13,
                            marginLeft: 8,
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                        }}>
                            Preferences sauvegardees
                        </Text>
                    </View>
                )}

                {/* Reset button */}
                <View style={{ marginHorizontal: 24, marginBottom: 24 }}>
                    <TouchableOpacity
                        onPress={resetPrefs}
                        style={{
                            backgroundColor: Colors.white,
                            borderWidth: 2,
                            borderColor: Colors.accentOrange,
                            padding: 14,
                            alignItems: 'center',
                            flexDirection: 'row',
                            justifyContent: 'center',
                        }}
                    >
                        <Icon name="arrow.clockwise" size={18} color={Colors.accentOrange} />
                        <Text style={{
                            color: Colors.accentOrange,
                            fontWeight: '900',
                            fontSize: 13,
                            marginLeft: 8,
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                        }}>
                            Reinitialiser
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Info */}
                <View style={{
                    marginHorizontal: 24,
                    backgroundColor: Colors.offWhite,
                    borderWidth: 2,
                    borderColor: Colors.black,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                }}>
                    <Icon name="info.circle.fill" size={18} color={Colors.mediumGray} />
                    <Text style={{
                        color: Colors.mediumGray,
                        fontSize: descFontSize,
                        fontWeight: prefs.boldText ? '700' : '600',
                        marginLeft: 10,
                        flex: 1,
                    }}>
                        Ces parametres sont sauvegardes localement sur votre appareil de maniere securisee.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}
