import { SymbolView } from 'expo-symbols';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '@/constants/NativeColors';

type FraudAlert = {
    id: string;
    risk_score: number;
    reason: string;
    status: string;
    created_at: string;
    fraud_features: Record<string, any>;
    transactions: any;
};

export default function FraudDetailScreen() {
    const { id } = useLocalSearchParams();
    const [alert, setAlert] = useState<FraudAlert | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (id) {
            fetchAlert();
        }
    }, [id]);

    async function fetchAlert() {
        try {
            const { data, error } = await supabase
                .from('fraud_alerts')
                .select(`
                    *,
                    transactions (
                        id,
                        amount,
                        type,
                        status,
                        created_at,
                        sender:sender_id(email, full_name),
                        receiver:receiver_id(email, full_name)
                    )
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            setAlert(data);
        } catch (error: any) {
            Alert.alert('Erreur', error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    async function handleDecision(decision: 'approved' | 'rejected') {
        if (!alert) return;

        setSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Non authentifié');

            const functionName = decision === 'approved' ? 'approve_fraud_alert' : 'reject_fraud_alert';
            const { data, error } = await supabase.rpc(functionName, {
                p_alert_id: alert.id,
                p_admin_id: user.id,
                p_notes: decision === 'approved' ? 'Approuvé manuellement' : 'Rejeté manuellement'
            });

            if (error) throw error;

            Alert.alert(
                'Succès',
                `Transaction ${decision === 'approved' ? 'approuvée' : 'rejetée'}`,
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error: any) {
            Alert.alert('Erreur', error.message);
        } finally {
            setSubmitting(false);
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

    if (!alert) {
        return (
            <View style={{ flex: 1, backgroundColor: Colors.white, padding: 24 }}>
                <Text style={{ color: Colors.secondaryLabel, textAlign: 'center', fontWeight: '700' }}>
                    Alerte introuvable
                </Text>
            </View>
        );
    }

    const riskColor = alert.risk_score >= 80
        ? Colors.accentOrange
        : alert.risk_score >= 60
        ? Colors.systemOrange
        : Colors.systemYellow;

    const mlScore = alert.fraud_features?.ml_score ?? 0;
    const heuristicScore = alert.fraud_features?.heuristic_score ?? alert.fraud_features?.heuristic_score_raw ?? 0;
    const factors = alert.fraud_features?.risk_factors || {};
    const reasons = alert.fraud_features?.reasons || [];

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={{ flex: 1, backgroundColor: Colors.white }}
            contentContainerStyle={{ padding: 24 }}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => { setRefreshing(true); fetchAlert(); }}
                    tintColor={Colors.epitechBlue}
                />
            }
        >
            {/* Risk Score */}
            <View style={{
                backgroundColor: Colors.white,
                borderRadius: 0,
                padding: 24,
                marginBottom: 24,
                alignItems: 'center',
                borderWidth: 2,
                borderColor: Colors.black,
                shadowColor: Colors.black,
                shadowOffset: { width: 3, height: 3 },
                shadowOpacity: 1,
                shadowRadius: 0,
            }}>
                <SymbolView
                    name="exclamationmark.triangle.fill"
                    size={48}
                    tintColor={riskColor}
                    style={{ marginBottom: 16 }}
                />
                <Text style={{ fontSize: 15, color: Colors.secondaryLabel, marginBottom: 8, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Score de risque global
                </Text>
                <Text style={{
                    fontSize: 56,
                    fontWeight: '900',
                    color: riskColor,
                    fontVariant: ['tabular-nums'],
                }}>
                    {alert.risk_score}/100
                </Text>

                {/* Progress bar */}
                <View style={{
                    width: '100%',
                    height: 12,
                    backgroundColor: Colors.offWhite,
                    borderRadius: 0,
                    overflow: 'hidden',
                    marginTop: 16,
                    borderWidth: 1,
                    borderColor: Colors.black,
                }}>
                    <View style={{
                        width: `${alert.risk_score}%`,
                        height: '100%',
                        backgroundColor: riskColor,
                    }} />
                </View>
            </View>

            {/* Scores détaillés ML vs Heuristique */}
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
                    Détails des scores
                </Text>

                <View style={{ gap: 16 }}>
                    <View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text style={{ color: Colors.secondaryLabel, fontWeight: '700' }}>Machine Learning (ML)</Text>
                            <Text style={{
                                fontWeight: '900',
                                color: Colors.accentMagenta,
                                fontSize: 17,
                                fontVariant: ['tabular-nums'],
                            }}>
                                {mlScore.toFixed(1)}/100
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
                                width: `${mlScore}%`,
                                height: '100%',
                                backgroundColor: Colors.accentMagenta,
                            }} />
                        </View>
                    </View>

                    <View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text style={{ color: Colors.secondaryLabel, fontWeight: '700' }}>Heuristique (Règles)</Text>
                            <Text style={{
                                fontWeight: '900',
                                color: Colors.epitechBlue,
                                fontSize: 17,
                                fontVariant: ['tabular-nums'],
                            }}>
                                {heuristicScore.toFixed(1)}/100
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
                                width: `${heuristicScore}%`,
                                height: '100%',
                                backgroundColor: Colors.epitechBlue,
                            }} />
                        </View>
                    </View>
                </View>
            </View>

            {/* Détails de l'analyse */}
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
                    Détails de l'analyse
                </Text>
                <View style={{ gap: 8 }}>
                    {/* Montant et balance */}
                    {alert.fraud_features?.user_balance !== undefined && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                            <Text style={{ color: Colors.secondaryLabel, fontWeight: '700' }}>Solde utilisateur</Text>
                            <Text style={{ color: Colors.black, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
                                {alert.fraud_features.user_balance.toFixed(2)} EPC
                            </Text>
                        </View>
                    )}
                    {alert.fraud_features?.amount_to_balance_ratio !== undefined && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                            <Text style={{ color: Colors.secondaryLabel, fontWeight: '700' }}>Ratio montant/solde</Text>
                            <Text style={{
                                color: alert.fraud_features.amount_to_balance_ratio > 0.8 ? Colors.accentOrange : Colors.black,
                                fontWeight: '800',
                                fontVariant: ['tabular-nums']
                            }}>
                                {(alert.fraud_features.amount_to_balance_ratio * 100).toFixed(0)}%
                            </Text>
                        </View>
                    )}

                    {/* Activité utilisateur */}
                    {alert.fraud_features?.transaction_count_24h !== undefined && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                            <Text style={{ color: Colors.secondaryLabel, fontWeight: '700' }}>Transactions 24h</Text>
                            <Text style={{
                                color: alert.fraud_features.transaction_count_24h > 10 ? Colors.systemOrange : Colors.black,
                                fontWeight: '800',
                                fontVariant: ['tabular-nums']
                            }}>
                                {alert.fraud_features.transaction_count_24h}
                            </Text>
                        </View>
                    )}
                    {alert.fraud_features?.transaction_count_30d !== undefined && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                            <Text style={{ color: Colors.secondaryLabel, fontWeight: '700' }}>Transactions 30j</Text>
                            <Text style={{ color: Colors.black, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
                                {alert.fraud_features.transaction_count_30d}
                            </Text>
                        </View>
                    )}

                    {/* Âge du compte */}
                    {alert.fraud_features?.user_age_days !== undefined && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                            <Text style={{ color: Colors.secondaryLabel, fontWeight: '700' }}>Âge du compte</Text>
                            <Text style={{
                                color: alert.fraud_features.user_age_days < 7 ? Colors.systemOrange : Colors.black,
                                fontWeight: '800'
                            }}>
                                {alert.fraud_features.user_age_days} jour{alert.fraud_features.user_age_days > 1 ? 's' : ''}
                            </Text>
                        </View>
                    )}

                    {/* Géographie */}
                    {alert.fraud_features?.country && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                            <Text style={{ color: Colors.secondaryLabel, fontWeight: '700' }}>Pays</Text>
                            <Text style={{ color: Colors.black, fontWeight: '800' }}>
                                {alert.fraud_features.country}
                            </Text>
                        </View>
                    )}

                    {/* Device */}
                    {alert.fraud_features?.device_id && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                            <Text style={{ color: Colors.secondaryLabel, fontWeight: '700' }}>Device ID</Text>
                            <Text style={{ color: Colors.tertiaryLabel, fontSize: 12, fontFamily: 'monospace', fontWeight: '700' }}>
                                {alert.fraud_features.device_id.slice(0, 12)}...
                            </Text>
                        </View>
                    )}

                    {/* Heure */}
                    {alert.fraud_features?.transaction_hour !== undefined && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                            <Text style={{ color: Colors.secondaryLabel, fontWeight: '700' }}>Heure de la transaction</Text>
                            <Text style={{
                                color: (alert.fraud_features.transaction_hour >= 2 && alert.fraud_features.transaction_hour <= 6)
                                    ? Colors.systemOrange
                                    : Colors.black,
                                fontWeight: '800',
                                fontVariant: ['tabular-nums']
                            }}>
                                {alert.fraud_features.transaction_hour}h
                            </Text>
                        </View>
                    )}

                    {/* Moyenne utilisateur */}
                    {alert.fraud_features?.user_avg_amount !== undefined && alert.fraud_features?.user_avg_amount > 0 && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                            <Text style={{ color: Colors.secondaryLabel, fontWeight: '700' }}>Montant moyen utilisateur</Text>
                            <Text style={{ color: Colors.black, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
                                {alert.fraud_features.user_avg_amount.toFixed(2)} EPC
                            </Text>
                        </View>
                    )}

                    {/* ML actif */}
                    {alert.fraud_features?.ml_active !== undefined && (
                        <View style={{
                            marginTop: 12,
                            paddingTop: 12,
                            borderTopWidth: 2,
                            borderTopColor: Colors.black
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <SymbolView
                                    name={alert.fraud_features.ml_active ? "checkmark.circle.fill" : "xmark.circle.fill"}
                                    size={16}
                                    tintColor={alert.fraud_features.ml_active ? Colors.success : Colors.systemOrange}
                                />
                                <Text style={{ color: Colors.secondaryLabel, fontSize: 14, fontWeight: '700' }}>
                                    Modèle ML : {alert.fraud_features.ml_active ? 'Actif' : 'Inactif (règles uniquement)'}
                                </Text>
                            </View>
                            {alert.fraud_features.ml_model_id && (
                                <Text style={{
                                    color: Colors.tertiaryLabel,
                                    fontSize: 11,
                                    marginTop: 4,
                                    fontFamily: 'monospace',
                                    fontWeight: '700',
                                }}>
                                    {alert.fraud_features.ml_model_id}
                                </Text>
                            )}
                        </View>
                    )}
                </View>
            </View>

            {/* Transaction Details */}
            {alert.transactions && (
                <View style={{
                    backgroundColor: Colors.white,
                    borderRadius: 0,
                    padding: 20,
                    marginBottom: 24,
                    gap: 12,
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
                        marginBottom: 8,
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                    }}>
                        Détails de la transaction
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: Colors.secondaryLabel, fontWeight: '700' }}>Montant</Text>
                        <Text style={{
                            fontWeight: '900',
                            color: Colors.black,
                            fontSize: 17,
                            fontVariant: ['tabular-nums'],
                        }}>
                            {alert.transactions.amount?.toFixed(2)} EPC
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: Colors.secondaryLabel, fontWeight: '700' }}>Type</Text>
                        <Text style={{ color: Colors.black, fontWeight: '800' }}>
                            {alert.transactions.type}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: Colors.secondaryLabel, fontWeight: '700' }}>Statut</Text>
                        <Text style={{ color: Colors.black, fontWeight: '800' }}>
                            {alert.transactions.status}
                        </Text>
                    </View>
                    {alert.transactions.sender && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: Colors.secondaryLabel, fontWeight: '700' }}>Émetteur</Text>
                            <View style={{ flex: 1, alignItems: 'flex-end', marginLeft: 16 }}>
                                <Text style={{ color: Colors.black, fontWeight: '800' }} numberOfLines={1}>
                                    {alert.transactions.sender?.full_name || 'N/A'}
                                </Text>
                                <Text style={{ color: Colors.tertiaryLabel, fontSize: 12, fontWeight: '700' }}>
                                    {alert.transactions.sender?.email}
                                </Text>
                            </View>
                        </View>
                    )}
                    {alert.transactions.receiver && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: Colors.secondaryLabel, fontWeight: '700' }}>Destinataire</Text>
                            <View style={{ flex: 1, alignItems: 'flex-end', marginLeft: 16 }}>
                                <Text style={{ color: Colors.black, fontWeight: '800' }} numberOfLines={1}>
                                    {alert.transactions.receiver?.full_name || 'N/A'}
                                </Text>
                                <Text style={{ color: Colors.tertiaryLabel, fontSize: 12, fontWeight: '700' }}>
                                    {alert.transactions.receiver?.email}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            )}

            {/* Reasons détaillées */}
            {reasons.length > 0 && (
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                        <SymbolView
                            name="exclamationmark.triangle.fill"
                            size={20}
                            tintColor={Colors.systemOrange}
                            style={{ marginRight: 8 }}
                        />
                        <Text style={{
                            fontSize: 17,
                            fontWeight: '900',
                            color: Colors.black,
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                        }}>
                            Raisons détectées ({reasons.length})
                        </Text>
                    </View>

                    <View style={{ gap: 12 }}>
                        {reasons.map((reason: any, index: number) => {
                            const severityColor =
                                reason.severity === 'high' ? Colors.accentOrange :
                                reason.severity === 'medium' ? Colors.systemOrange :
                                Colors.systemYellow;

                            const severityIcon =
                                reason.severity === 'high' ? 'exclamationmark.circle.fill' :
                                reason.severity === 'medium' ? 'exclamationmark.triangle.fill' :
                                'info.circle.fill';

                            return (
                                <View key={index} style={{
                                    backgroundColor: Colors.offWhite,
                                    padding: 16,
                                    borderRadius: 0,
                                    borderLeftWidth: 4,
                                    borderLeftColor: severityColor,
                                    borderWidth: 2,
                                    borderColor: Colors.black,
                                }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <SymbolView
                                            name={severityIcon}
                                            size={18}
                                            tintColor={severityColor}
                                            style={{ marginRight: 8, marginTop: 2 }}
                                        />
                                        <View style={{ flex: 1 }}>
                                            <Text style={{
                                                fontSize: 15,
                                                fontWeight: '800',
                                                color: Colors.black,
                                                marginBottom: 4,
                                            }}>
                                                {reason.description}
                                            </Text>
                                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                                                <View style={{
                                                    backgroundColor: Colors.white,
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 4,
                                                    borderRadius: 0,
                                                    borderWidth: 1,
                                                    borderColor: Colors.black,
                                                }}>
                                                    <Text style={{
                                                        fontSize: 12,
                                                        color: Colors.secondaryLabel,
                                                        fontWeight: '800',
                                                    }}>
                                                        Poids: {(reason.weight * 100).toFixed(0)}%
                                                    </Text>
                                                </View>
                                                <View style={{
                                                    backgroundColor: Colors.white,
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 4,
                                                    borderRadius: 0,
                                                    borderWidth: 1,
                                                    borderColor: Colors.black,
                                                }}>
                                                    <Text style={{
                                                        fontSize: 12,
                                                        color: severityColor,
                                                        fontWeight: '800',
                                                        textTransform: 'capitalize',
                                                    }}>
                                                        {reason.severity === 'high' ? 'Élevé' :
                                                         reason.severity === 'medium' ? 'Moyen' : 'Faible'}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>
            )}

            {/* Reason texte (fallback si pas de reasons détaillées) */}
            {reasons.length === 0 && alert.reason && (
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <SymbolView
                            name="info.circle.fill"
                            size={20}
                            tintColor={Colors.epitechBlue}
                            style={{ marginRight: 8 }}
                        />
                        <Text style={{
                            fontSize: 17,
                            fontWeight: '900',
                            color: Colors.black,
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                        }}>
                            Justification de l'alerte
                        </Text>
                    </View>
                    <Text style={{ color: Colors.secondaryLabel, fontSize: 15, lineHeight: 22, fontWeight: '700' }}>
                        {alert.reason}
                    </Text>
                </View>
            )}

            {/* Actions */}
            {alert.status === 'pending' && (
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity
                        style={{
                            flex: 1,
                            backgroundColor: Colors.success,
                            borderRadius: 0,
                            padding: 16,
                            alignItems: 'center',
                            flexDirection: 'row',
                            justifyContent: 'center',
                            borderWidth: 2,
                            borderColor: Colors.black,
                            shadowColor: Colors.black,
                            shadowOffset: { width: 3, height: 3 },
                            shadowOpacity: 1,
                            shadowRadius: 0,
                        }}
                        onPress={() => handleDecision('approved')}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color={Colors.white} />
                        ) : (
                            <>
                                <SymbolView name="checkmark.circle.fill" size={20} tintColor={Colors.white} />
                                <Text style={{ color: Colors.white, fontSize: 17, fontWeight: '900', marginLeft: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Approuver
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{
                            flex: 1,
                            backgroundColor: Colors.accentOrange,
                            borderRadius: 0,
                            padding: 16,
                            alignItems: 'center',
                            flexDirection: 'row',
                            justifyContent: 'center',
                            borderWidth: 2,
                            borderColor: Colors.black,
                            shadowColor: Colors.black,
                            shadowOffset: { width: 3, height: 3 },
                            shadowOpacity: 1,
                            shadowRadius: 0,
                        }}
                        onPress={() => handleDecision('rejected')}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color={Colors.white} />
                        ) : (
                            <>
                                <SymbolView name="xmark.circle.fill" size={20} tintColor={Colors.white} />
                                <Text style={{ color: Colors.white, fontSize: 17, fontWeight: '900', marginLeft: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Rejeter
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
}
