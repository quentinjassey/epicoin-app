import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { 
    ActivityIndicator, 
    Alert, 
    ScrollView, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    View 
} from 'react-native';
import Slider from '@react-native-community/slider';
import { supabase } from '../../lib/supabase';

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
        // Validation
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
            fetchConfig(); // Recharger pour vérifier
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
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#0091D3" />
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-gray-50">
            <View className="p-6">
                {/* Header */}
                <View className="bg-purple-600 rounded-2xl p-6 mb-6">
                    <View className="flex-row items-center mb-2">
                        <Ionicons name="settings" size={24} color="white" />
                        <Text className="text-white font-bold text-xl ml-2">
                            Configuration du système de fraude
                        </Text>
                    </View>
                    <Text className="text-purple-100">
                        Personnalisez les paramètres de détection et les seuils de décision
                    </Text>
                </View>

                {/* Poids ML vs Heuristique */}
                <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
                    <View className="flex-row items-center mb-4">
                        <View className="bg-blue-100 p-2.5 rounded-full mr-3">
                            <Ionicons name="analytics" size={20} color="#2563eb" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-lg font-bold text-gray-900">
                                Répartition des scores
                            </Text>
                            <Text className="text-gray-500 text-sm">
                                Équilibre entre Machine Learning et règles heuristiques
                            </Text>
                        </View>
                    </View>

                    {/* Visualisation des poids */}
                    <View className="mb-6">
                        <View className="flex-row justify-between mb-3">
                            <View className="flex-1 mr-2">
                                <View className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                                    <Text className="text-blue-600 text-xs font-medium mb-1">
                                        Machine Learning
                                    </Text>
                                    <Text className="text-blue-900 text-2xl font-bold">
                                        {Math.round(config.ml_weight * 100)}%
                                    </Text>
                                </View>
                            </View>
                            <View className="flex-1 ml-2">
                                <View className="bg-green-50 p-4 rounded-xl border border-green-200">
                                    <Text className="text-green-600 text-xs font-medium mb-1">
                                        Règles Heuristiques
                                    </Text>
                                    <Text className="text-green-900 text-2xl font-bold">
                                        {Math.round(config.heuristic_weight * 100)}%
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Slider pour ajuster */}
                        <View className="bg-gray-50 p-4 rounded-xl">
                            <Text className="text-gray-700 font-medium mb-2">
                                Ajuster la répartition
                            </Text>
                            <Slider
                                style={{ width: '100%', height: 40 }}
                                minimumValue={0}
                                maximumValue={1}
                                step={0.05}
                                value={config.ml_weight}
                                onValueChange={updateMLWeight}
                                minimumTrackTintColor="#2563eb"
                                maximumTrackTintColor="#16a34a"
                                thumbTintColor="#9333ea"
                            />
                            <View className="flex-row justify-between mt-1">
                                <Text className="text-xs text-gray-500">100% ML</Text>
                                <Text className="text-xs text-gray-500">100% Heuristique</Text>
                            </View>
                        </View>

                        {/* Recommandation */}
                        <View className="bg-amber-50 p-3 rounded-xl mt-3 border border-amber-200">
                            <View className="flex-row items-start">
                                <Ionicons name="bulb" size={16} color="#d97706" style={{ marginTop: 2 }} />
                                <Text className="text-amber-800 text-xs ml-2 flex-1">
                                    <Text className="font-bold">Recommandation :</Text> 40% ML / 60% Heuristique 
                                    offre un bon équilibre entre précision et explicabilité.
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Seuils de décision */}
                <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
                    <View className="flex-row items-center mb-4">
                        <View className="bg-orange-100 p-2.5 rounded-full mr-3">
                            <Ionicons name="speedometer" size={20} color="#ea580c" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-lg font-bold text-gray-900">
                                Seuils de décision
                            </Text>
                            <Text className="text-gray-500 text-sm">
                                Définissez à partir de quel score une transaction est considérée comme frauduleuse
                            </Text>
                        </View>
                    </View>

                    {/* Visualisation des zones */}
                    <View className="mb-4">
                        <View className="h-12 flex-row rounded-xl overflow-hidden mb-3">
                            <View 
                                className="bg-green-500 justify-center items-center" 
                                style={{ width: `${config.threshold_approve}%` }}
                            >
                                <Text className="text-white text-xs font-bold">Approuvé</Text>
                            </View>
                            <View 
                                className="bg-amber-500 justify-center items-center" 
                                style={{ width: `${config.threshold_review - config.threshold_approve}%` }}
                            >
                                <Text className="text-white text-xs font-bold">Révision</Text>
                            </View>
                            <View 
                                className="bg-red-500 justify-center items-center" 
                                style={{ width: `${100 - config.threshold_review}%` }}
                            >
                                <Text className="text-white text-xs font-bold">Bloqué</Text>
                            </View>
                        </View>

                        {/* Seuil d'approbation */}
                        <View className="mb-4">
                            <View className="flex-row justify-between items-center mb-2">
                                <Text className="text-gray-700 font-medium">
                                    Seuil d'approbation automatique
                                </Text>
                                <View className="bg-green-100 px-3 py-1.5 rounded-full">
                                    <Text className="text-green-700 font-bold">
                                        0-{config.threshold_approve}
                                    </Text>
                                </View>
                            </View>
                            <Slider
                                style={{ width: '100%', height: 40 }}
                                minimumValue={0}
                                maximumValue={config.threshold_review - 5}
                                step={5}
                                value={config.threshold_approve}
                                onValueChange={(value) => setConfig({ ...config, threshold_approve: value })}
                                minimumTrackTintColor="#16a34a"
                                maximumTrackTintColor="#d1d5db"
                                thumbTintColor="#16a34a"
                            />
                            <Text className="text-xs text-gray-500 mt-1">
                                Les transactions avec un score inférieur ou égal à {config.threshold_approve} seront 
                                <Text className="font-bold text-green-600"> approuvées automatiquement</Text>
                            </Text>
                        </View>

                        {/* Seuil de révision */}
                        <View className="mb-4">
                            <View className="flex-row justify-between items-center mb-2">
                                <Text className="text-gray-700 font-medium">
                                    Seuil de révision manuelle
                                </Text>
                                <View className="bg-amber-100 px-3 py-1.5 rounded-full">
                                    <Text className="text-amber-700 font-bold">
                                        {config.threshold_approve + 1}-{config.threshold_review}
                                    </Text>
                                </View>
                            </View>
                            <Slider
                                style={{ width: '100%', height: 40 }}
                                minimumValue={config.threshold_approve + 5}
                                maximumValue={95}
                                step={5}
                                value={config.threshold_review}
                                onValueChange={(value) => setConfig({ ...config, threshold_review: value })}
                                minimumTrackTintColor="#f59e0b"
                                maximumTrackTintColor="#d1d5db"
                                thumbTintColor="#f59e0b"
                            />
                            <Text className="text-xs text-gray-500 mt-1">
                                Les transactions entre {config.threshold_approve + 1} et {config.threshold_review} nécessiteront 
                                <Text className="font-bold text-amber-600"> une révision manuelle</Text>
                            </Text>
                        </View>

                        {/* Zone de blocage (automatique) */}
                        <View className="bg-red-50 p-3 rounded-xl border border-red-200">
                            <View className="flex-row items-center mb-1">
                                <Ionicons name="shield-checkmark" size={16} color="#dc2626" />
                                <Text className="text-red-700 font-bold text-sm ml-2">
                                    Zone de blocage automatique
                                </Text>
                            </View>
                            <Text className="text-red-600 text-xs">
                                Les transactions avec un score supérieur à {config.threshold_review} seront 
                                <Text className="font-bold"> bloquées automatiquement</Text>
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Actions */}
                <View className="flex-row gap-3 mb-6">
                    <TouchableOpacity
                        className="flex-1 bg-gray-200 py-4 rounded-xl items-center flex-row justify-center"
                        onPress={resetToDefaults}
                    >
                        <Ionicons name="refresh" size={20} color="#374151" />
                        <Text className="text-gray-700 font-bold ml-2">Réinitialiser</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className={`flex-1 py-4 rounded-xl items-center flex-row justify-center ${
                            saving ? 'bg-gray-400' : 'bg-purple-600'
                        }`}
                        onPress={saveConfig}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <>
                                <Ionicons name="save" size={20} color="white" />
                                <Text className="text-white font-bold ml-2">Enregistrer</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Info */}
                <View className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <View className="flex-row items-start">
                        <Ionicons name="information-circle" size={20} color="#2563eb" style={{ marginTop: 1 }} />
                        <View className="flex-1 ml-3">
                            <Text className="text-blue-900 font-bold mb-1">À propos de cette configuration</Text>
                            <Text className="text-blue-800 text-xs leading-5">
                                Ces paramètres affectent tous les calculs de score de fraude en temps réel. 
                                Les modifications seront appliquées immédiatement aux nouvelles transactions.
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}
