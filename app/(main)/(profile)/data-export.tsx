import Icon from '@/components/Icon';
import { Colors } from '@/constants/NativeColors';
import { useAccessibility } from '@/lib/AccessibilityContext';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../../lib/supabase';

const DATA_CATEGORIES = [
    {
        icon: 'person.fill' as const,
        label: 'PROFIL',
        description: 'Nom, email, campus',
    },
    {
        icon: 'arrow.left.arrow.right' as const,
        label: 'TRANSACTIONS',
        description: 'Historique complet',
    },
    {
        icon: 'gearshape.fill' as const,
        label: 'PREFERENCES',
        description: 'Parametres du compte',
    },
];

export default function DataExportScreen() {
    const router = useRouter();
    const { adaptiveColors } = useAccessibility();
    const [exporting, setExporting] = useState(false);
    const [exported, setExported] = useState(false);

    async function handleExport() {
        setExporting(true);
        setExported(false);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Utilisateur non connecte');

            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError) throw profileError;

            const { data: transactionsData, error: transactionsError } = await supabase
                .from('transactions')
                .select('*')
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                .order('created_at', { ascending: false });

            if (transactionsError) throw transactionsError;

            const exportData = {
                exported_at: new Date().toISOString(),
                user_id: user.id,
                email: user.email,
                profile: profileData,
                transactions: transactionsData || [],
                preferences: {
                    email_notifications: profileData?.email_notifications ?? null,
                    push_notifications: profileData?.push_notifications ?? null,
                },
            };

            const jsonString = JSON.stringify(exportData, null, 2);
            const fileUri = `${FileSystem.documentDirectory}epicoin-data-export.json`;

            await FileSystem.writeAsStringAsync(fileUri, jsonString, {
                encoding: FileSystem.EncodingType.UTF8,
            });

            await Sharing.shareAsync(fileUri, {
                mimeType: 'application/json',
                dialogTitle: 'Exporter mes donnees',
                UTI: 'public.json',
            });

            setExported(true);
        } catch (error) {
            console.error('Export error:', error);
        } finally {
            setExporting(false);
        }
    }

    return (
        <View style={{ flex: 1, backgroundColor: Colors.white }}>
            <View style={{ backgroundColor: adaptiveColors.primary, position: 'absolute', top: 0, left: 0, right: 0, height: 200 }} />
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 48, backgroundColor: Colors.white }}
            >
                {/* Header */}
                <View style={{
                    backgroundColor: adaptiveColors.primary,
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
                        <Text style={{ color: Colors.white, fontWeight: '800', fontSize: 15, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Retour</Text>
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{
                            backgroundColor: Colors.white,
                            padding: 12,
                            borderRadius: 0,
                            borderWidth: 2,
                            borderColor: Colors.black,
                            marginRight: 16,
                            shadowColor: Colors.black,
                            shadowOffset: { width: 3, height: 3 },
                            shadowOpacity: 1,
                            shadowRadius: 0,
                        }}>
                            <Icon name="checkmark.shield.fill" size={28} color={adaptiveColors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{
                                color: Colors.white,
                                fontSize: 20,
                                fontWeight: '900',
                                letterSpacing: 1,
                                textTransform: 'uppercase',
                            }}>
                                EXPORT DE VOS DONNEES
                            </Text>
                            <Text style={{
                                color: 'rgba(255,255,255,0.7)',
                                fontSize: 12,
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: 1,
                                marginTop: 4,
                            }}>
                                Reglement RGPD
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Description */}
                <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
                    <View style={{
                        backgroundColor: Colors.offWhite,
                        borderRadius: 0,
                        borderWidth: 3,
                        borderColor: Colors.black,
                        shadowColor: Colors.black,
                        shadowOffset: { width: 4, height: 4 },
                        shadowOpacity: 1,
                        shadowRadius: 0,
                        padding: 20,
                    }}>
                        <Text style={{
                            color: Colors.black,
                            fontSize: 14,
                            fontWeight: '700',
                            lineHeight: 22,
                        }}>
                            Conformement au RGPD, vous pouvez exporter l'ensemble de vos donnees personnelles.
                        </Text>
                    </View>
                </View>

                {/* Data categories */}
                <View style={{ paddingHorizontal: 24, marginTop: 32 }}>
                    <Text style={{
                        color: Colors.black,
                        fontSize: 13,
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        marginBottom: 12,
                        letterSpacing: 2,
                    }}>
                        DONNEES EXPORTEES
                    </Text>

                    <View style={{
                        backgroundColor: Colors.white,
                        borderRadius: 0,
                        borderWidth: 3,
                        borderColor: Colors.black,
                        shadowColor: Colors.black,
                        shadowOffset: { width: 4, height: 4 },
                        shadowOpacity: 1,
                        shadowRadius: 0,
                        overflow: 'hidden',
                    }}>
                        {DATA_CATEGORIES.map((category, index) => (
                            <View
                                key={index}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    padding: 16,
                                    borderBottomWidth: index < DATA_CATEGORIES.length - 1 ? 2 : 0,
                                    borderBottomColor: Colors.black,
                                }}
                            >
                                <View style={{
                                    backgroundColor: Colors.offWhite,
                                    padding: 10,
                                    borderRadius: 0,
                                    borderWidth: 2,
                                    borderColor: Colors.black,
                                    marginRight: 14,
                                }}>
                                    <Icon
                                        name={category.icon}
                                        size={20}
                                        color={adaptiveColors.primary}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{
                                        fontWeight: '800',
                                        color: Colors.black,
                                        fontSize: 14,
                                        letterSpacing: 1,
                                        textTransform: 'uppercase',
                                    }}>
                                        {category.label}
                                    </Text>
                                    <Text style={{
                                        color: Colors.mediumGray,
                                        fontSize: 12,
                                        fontWeight: '700',
                                        marginTop: 2,
                                    }}>
                                        {category.description}
                                    </Text>
                                </View>
                                <Icon
                                    name="checkmark.circle.fill"
                                    size={20}
                                    color={adaptiveColors.primary}
                                />
                            </View>
                        ))}
                    </View>
                </View>

                {/* Success message */}
                {exported && (
                    <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
                        <View style={{
                            backgroundColor: Colors.offWhite,
                            borderWidth: 2,
                            borderColor: Colors.success,
                            borderRadius: 0,
                            padding: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                        }}>
                            <Icon
                                name="checkmark.circle.fill"
                                size={18}
                                color={Colors.success}
                            />
                            <Text style={{
                                color: Colors.success,
                                fontWeight: '700',
                                fontSize: 13,
                                marginLeft: 8,
                                flex: 1,
                            }}>
                                Vos donnees ont ete exportees avec succes.
                            </Text>
                        </View>
                    </View>
                )}

                {/* Export button */}
                <View style={{ paddingHorizontal: 24, marginTop: 32 }}>
                    <TouchableOpacity
                        style={{
                            backgroundColor: adaptiveColors.primary,
                            borderRadius: 0,
                            padding: 18,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 2,
                            borderColor: Colors.black,
                            shadowColor: Colors.black,
                            shadowOffset: { width: 4, height: 4 },
                            shadowOpacity: 1,
                            shadowRadius: 0,
                            opacity: exporting ? 0.7 : 1,
                        }}
                        onPress={handleExport}
                        disabled={exporting}
                    >
                        {exporting ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <ActivityIndicator color={Colors.white} style={{ marginRight: 10 }} />
                                <Text style={{
                                    color: Colors.white,
                                    fontWeight: '900',
                                    fontSize: 15,
                                    textTransform: 'uppercase',
                                    letterSpacing: 1.5,
                                }}>
                                    EXPORT EN COURS...
                                </Text>
                            </View>
                        ) : (
                            <Text style={{
                                color: Colors.white,
                                fontWeight: '900',
                                fontSize: 15,
                                textTransform: 'uppercase',
                                letterSpacing: 1.5,
                            }}>
                                EXPORTER MES DONNEES
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}
