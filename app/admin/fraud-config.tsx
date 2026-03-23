import Icon from '@/components/Icon';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Switch,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { supabase } from '../../lib/supabase';
import { Colors } from '@/constants/NativeColors';

interface FraudConfig {
    ml_weight: number;
    heuristic_weight: number;
    threshold_approve: number;
    threshold_review: number;
}

export default function FraudConfigScreen() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState<FraudConfig>({
        ml_weight: 0.40,
        heuristic_weight: 0.60,
        threshold_approve: 30,
        threshold_review: 70
    });

    useEffect(() => {
        fetchConfig();
    }, []);

    async function fetchConfig() {
        try {
            const { data, error } = await supabase.rpc('get_fraud_config');

            if (error) throw error;

            if (data && data.length > 0) {
                const configData = data[0];
                setConfig({
                    ml_weight: parseFloat(configData.ml_weight),
                    heuristic_weight: parseFloat(configData.heuristic_weight),
                    threshold_approve: configData.threshold_approve,
                    threshold_review: configData.threshold_review
                });
            }
        } catch (error: any) {
            console.error('Error fetching config:', error);
            Alert.alert('Erreur', 'Impossible de charger la configuration');
        } finally {
            setLoading(false);
        }
    }

    async function saveConfig() {
        if (config.ml_weight + config.heuristic_weight !== 1.00) {
            Alert.alert('Erreur', 'La somme des poids ML et heuristique doit être égale à 100%');
            return;
        }

        if (config.threshold_approve >= config.threshold_review) {
            Alert.alert('Erreur', 'Le seuil d\'approbation doit être inférieur au seuil de révision');
            return;
        }

        setSaving(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Utilisateur non authentifié');
            }

            const { data, error } = await supabase.rpc('update_fraud_config', {
                p_ml_weight: config.ml_weight,
                p_heuristic_weight: config.heuristic_weight,
                p_threshold_approve: config.threshold_approve,
                p_threshold_review: config.threshold_review,
                p_admin_id: user.id
            });

            if (error) throw error;

            if (!data.success) {
                throw new Error(data.message || 'Erreur lors de la sauvegarde');
            }

            Alert.alert('Succès', 'Configuration mise à jour avec succès');
            fetchConfig();
        } catch (error: any) {
            console.error('Error saving config:', error);
            Alert.alert('Erreur', error.message);
        } finally {
            setSaving(false);
        }
    }

    function updateMLWeight(value: number) {
        const ml = Math.round(value * 100) / 100;
        const heuristic = Math.round((1 - ml) * 100) / 100;
        setConfig({
            ...config,
            ml_weight: ml,
            heuristic_weight: heuristic
        });
    }

    function resetToDefaults() {
        Alert.alert(
            'Réinitialiser',
            'Voulez-vous vraiment réinitialiser aux valeurs par défaut ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Réinitialiser',
                    style: 'destructive',
                    onPress: () => {
                        setConfig({
                            ml_weight: 0.40,
                            heuristic_weight: 0.60,
                            threshold_approve: 30,
                            threshold_review: 70
                        });
                    }
                }
            ]
        );
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
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={{ flex: 1, backgroundColor: Colors.white }}
            contentContainerStyle={{ padding: 24 }}
        >
            {/* Header */}
            <View style={{
                backgroundColor: Colors.accentMagenta,
                borderRadius: 0,
                padding: 24,
                marginBottom: 24,
                borderWidth: 2,
                borderColor: Colors.black,
                shadowColor: Colors.black,
                shadowOffset: { width: 3, height: 3 },
                shadowOpacity: 1,
                shadowRadius: 0,
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Icon name="slider.horizontal.3" size={24} color={Colors.white} />
                    <Text style={{
                        color: Colors.white,
                        fontWeight: '900',
                        fontSize: 20,
                        marginLeft: 8,
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                    }}>
                        Configuration Fraude
                    </Text>
                </View>
                <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 15, fontWeight: '700' }}>
                    Ajustez les poids et seuils du système de détection
                </Text>
            </View>

            {/* ML vs Heuristic Weight */}
            <View style={{
                backgroundColor: Colors.white,
                borderRadius: 0,
                padding: 20,
                marginBottom: 24,
                borderWidth: 2,
                borderColor: Colors.black,
                shadowColor: Colors.black,
                shadowOffset: { width: 3, height: 3 },
                shadowOpacity: 1,
                shadowRadius: 0,
            }}>
                <Text style={{
                    fontSize: 17,
                    fontWeight: '900',
                    color: Colors.black,
                    marginBottom: 16,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                }}>
                    Pondération ML vs Heuristique
                </Text>

                <View style={{ marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                        <Text style={{ color: Colors.secondaryLabel, fontSize: 15, fontWeight: '700' }}>ML (Machine Learning)</Text>
                        <Text style={{
                            fontWeight: '900',
                            color: Colors.accentMagenta,
                            fontSize: 17,
                            fontVariant: ['tabular-nums'],
                        }}>
                            {(config.ml_weight * 100).toFixed(0)}%
                        </Text>
                    </View>
                    <Slider
                        style={{ width: '100%', height: 40 }}
                        minimumValue={0}
                        maximumValue={1}
                        step={0.05}
                        value={config.ml_weight}
                        onValueChange={updateMLWeight}
                        minimumTrackTintColor={Colors.accentMagenta}
                        maximumTrackTintColor={Colors.offWhite}
                        thumbTintColor={Colors.accentMagenta}
                    />
                </View>

                <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                        <Text style={{ color: Colors.secondaryLabel, fontSize: 15, fontWeight: '700' }}>Heuristique (Règles)</Text>
                        <Text style={{
                            fontWeight: '900',
                            color: Colors.epitechBlue,
                            fontSize: 17,
                            fontVariant: ['tabular-nums'],
                        }}>
                            {(config.heuristic_weight * 100).toFixed(0)}%
                        </Text>
                    </View>
                    <View style={{
                        height: 8,
                        backgroundColor: Colors.offWhite,
                        borderRadius: 0,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: Colors.black,
                    }}>
                        <View style={{
                            height: '100%',
                            width: `${config.heuristic_weight * 100}%`,
                            backgroundColor: Colors.epitechBlue,
                        }} />
                    </View>
                </View>
            </View>

            {/* Thresholds */}
            <View style={{
                backgroundColor: Colors.white,
                borderRadius: 0,
                padding: 20,
                marginBottom: 24,
                borderWidth: 2,
                borderColor: Colors.black,
                shadowColor: Colors.black,
                shadowOffset: { width: 3, height: 3 },
                shadowOpacity: 1,
                shadowRadius: 0,
            }}>
                <Text style={{
                    fontSize: 17,
                    fontWeight: '900',
                    color: Colors.black,
                    marginBottom: 16,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                }}>
                    Seuils de décision
                </Text>

                <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: Colors.secondaryLabel, fontSize: 15, marginBottom: 8, fontWeight: '700' }}>
                        Seuil d'approbation automatique
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TextInput
                            style={{
                                flex: 1,
                                backgroundColor: Colors.offWhite,
                                borderRadius: 0,
                                padding: 12,
                                fontSize: 16,
                                color: Colors.black,
                                fontWeight: '700',
                                fontVariant: ['tabular-nums'],
                                borderWidth: 2,
                                borderColor: Colors.black,
                            }}
                            value={config.threshold_approve.toString()}
                            onChangeText={(text) => setConfig({ ...config, threshold_approve: parseInt(text) || 0 })}
                            keyboardType="number-pad"
                        />
                        <Text style={{ color: Colors.secondaryLabel, fontSize: 15, fontWeight: '700' }}>/ 100</Text>
                    </View>
                    <Text style={{ color: Colors.tertiaryLabel, fontSize: 13, marginTop: 8, fontWeight: '700' }}>
                        Scores inférieurs sont approuvés automatiquement
                    </Text>
                </View>

                <View>
                    <Text style={{ color: Colors.secondaryLabel, fontSize: 15, marginBottom: 8, fontWeight: '700' }}>
                        Seuil de révision manuelle
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TextInput
                            style={{
                                flex: 1,
                                backgroundColor: Colors.offWhite,
                                borderRadius: 0,
                                padding: 12,
                                fontSize: 16,
                                color: Colors.black,
                                fontWeight: '700',
                                fontVariant: ['tabular-nums'],
                                borderWidth: 2,
                                borderColor: Colors.black,
                            }}
                            value={config.threshold_review.toString()}
                            onChangeText={(text) => setConfig({ ...config, threshold_review: parseInt(text) || 0 })}
                            keyboardType="number-pad"
                        />
                        <Text style={{ color: Colors.secondaryLabel, fontSize: 15, fontWeight: '700' }}>/ 100</Text>
                    </View>
                    <Text style={{ color: Colors.tertiaryLabel, fontSize: 13, marginTop: 8, fontWeight: '700' }}>
                        Scores entre {config.threshold_approve} et {config.threshold_review} nécessitent une révision
                    </Text>
                </View>
            </View>

            {/* Visualization */}
            <View style={{
                backgroundColor: Colors.white,
                borderRadius: 0,
                padding: 20,
                marginBottom: 24,
                borderWidth: 2,
                borderColor: Colors.black,
                shadowColor: Colors.black,
                shadowOffset: { width: 3, height: 3 },
                shadowOpacity: 1,
                shadowRadius: 0,
            }}>
                <Text style={{
                    fontSize: 17,
                    fontWeight: '900',
                    color: Colors.black,
                    marginBottom: 16,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                }}>
                    Zones de décision
                </Text>

                <View style={{ gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{
                            width: 12,
                            height: 12,
                            backgroundColor: Colors.success,
                            borderRadius: 0,
                            marginRight: 8,
                            borderWidth: 1,
                            borderColor: Colors.black,
                        }} />
                        <Text style={{ color: Colors.black, fontSize: 14, fontWeight: '700' }}>
                            0 - {config.threshold_approve} : Approbation auto
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{
                            width: 12,
                            height: 12,
                            backgroundColor: Colors.systemOrange,
                            borderRadius: 0,
                            marginRight: 8,
                            borderWidth: 1,
                            borderColor: Colors.black,
                        }} />
                        <Text style={{ color: Colors.black, fontSize: 14, fontWeight: '700' }}>
                            {config.threshold_approve} - {config.threshold_review} : Révision manuelle
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{
                            width: 12,
                            height: 12,
                            backgroundColor: Colors.accentOrange,
                            borderRadius: 0,
                            marginRight: 8,
                            borderWidth: 1,
                            borderColor: Colors.black,
                        }} />
                        <Text style={{ color: Colors.black, fontSize: 14, fontWeight: '700' }}>
                            {config.threshold_review} - 100 : Blocage auto
                        </Text>
                    </View>
                </View>
            </View>

            {/* Actions */}
            <View style={{ gap: 12 }}>
                <TouchableOpacity
                    style={{
                        backgroundColor: Colors.epitechBlue,
                        borderRadius: 0,
                        padding: 16,
                        alignItems: 'center',
                        borderWidth: 2,
                        borderColor: Colors.black,
                        shadowColor: Colors.black,
                        shadowOffset: { width: 3, height: 3 },
                        shadowOpacity: 1,
                        shadowRadius: 0,
                    }}
                    onPress={saveConfig}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color={Colors.white} />
                    ) : (
                        <Text style={{
                            color: Colors.white,
                            fontSize: 17,
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                        }}>
                            Enregistrer la configuration
                        </Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={{
                        backgroundColor: Colors.offWhite,
                        borderRadius: 0,
                        padding: 16,
                        alignItems: 'center',
                        borderWidth: 2,
                        borderColor: Colors.black,
                        shadowColor: Colors.black,
                        shadowOffset: { width: 3, height: 3 },
                        shadowOpacity: 1,
                        shadowRadius: 0,
                    }}
                    onPress={resetToDefaults}
                >
                    <Text style={{
                        color: Colors.black,
                        fontSize: 17,
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                    }}>
                        Réinitialiser aux valeurs par défaut
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}
