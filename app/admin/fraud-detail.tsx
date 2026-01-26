import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';

interface FraudAlert {
  id: string;
  risk_score: number;
  reason: string;
  fraud_features: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  resolution_notes?: string;
  transaction: {
    id: string;
    amount: number;
    type: string;
    scope?: string;
    transaction_type?: string;
    direction?: string;
    country?: string;
    city?: string;
    provider?: string;
    device_info?: Record<string, any>;
    fraud_score?: number;
    fraud_features?: Record<string, any>;
    sender_email: string;
    sender_name?: string;
    receiver_email?: string;
    receiver_name?: string;
    metadata: Record<string, any>;
  };
}

export default function FraudDetailScreen() {
  const params = useLocalSearchParams();
  const alertId = params.id as string;

  const [alert, setAlert] = useState<FraudAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAlertDetail();
  }, [alertId]);

  const fetchAlertDetail = async () => {
    try {
      setLoading(true);

      // Récupérer l'alerte avec détails transaction enrichis
      const { data: alertData, error: alertError } = await supabase
        .from('fraud_alerts')
        .select(`
          *,
          transaction:transactions(
            id,
            amount,
            type,
            scope,
            transaction_type,
            direction,
            country,
            city,
            provider,
            device_info,
            fraud_score,
            fraud_features,
            metadata,
            sender:sender_id(email, full_name),
            receiver:receiver_id(email, full_name)
          )
        `)
        .eq('id', alertId)
        .single();

      if (alertError) throw alertError;

      // Formater les données
      const formattedAlert = {
        ...alertData,
        transaction: {
          id: alertData.transaction.id,
          amount: parseFloat(alertData.transaction.amount),
          type: alertData.transaction.type,
          scope: alertData.transaction.scope,
          transaction_type: alertData.transaction.transaction_type,
          direction: alertData.transaction.direction,
          country: alertData.transaction.country,
          city: alertData.transaction.city,
          provider: alertData.transaction.provider,
          device_info: alertData.transaction.device_info,
          fraud_score: alertData.transaction.fraud_score,
          fraud_features: alertData.transaction.fraud_features,
          sender_email: alertData.transaction.sender.email,
          sender_name: alertData.transaction.sender.full_name,
          receiver_email: alertData.transaction.receiver?.email,
          receiver_name: alertData.transaction.receiver?.full_name,
          metadata: alertData.transaction.metadata,
        },
      };

      setAlert(formattedAlert);
    } catch (error) {
      console.error('Error fetching alert:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails de l\'alerte');
      router.back();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApprove = () => {
    Alert.alert(
      'Approuver la transaction',
      'Cette transaction sera exécutée immédiatement. Confirmez-vous cette action ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Approuver', 
          style: 'default',
          onPress: () => processDecision('approve')
        }
      ]
    );
  };

  const handleReject = () => {
    Alert.prompt(
      'Rejeter la transaction',
      'Indiquez la raison du rejet (visible par l\'utilisateur) :',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Rejeter', 
          style: 'destructive',
          onPress: (notes?: string) => processDecision('reject', notes)
        }
      ],
      'plain-text',
      '',
      'default'
    );
  };

  const processDecision = async (decision: 'approve' | 'reject', notes?: string) => {
    try {
      setSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const functionName = decision === 'approve' ? 'approve_fraud_alert' : 'reject_fraud_alert';
      const params = decision === 'approve' 
        ? { p_alert_id: alertId, p_admin_id: user.id, p_notes: notes || '' }
        : { p_alert_id: alertId, p_admin_id: user.id, p_notes: notes || 'Rejeté par admin' };

      const { data, error } = await supabase.rpc(functionName, params);

      if (error) throw error;
      if (!data.success) throw new Error(data.message);

      Alert.alert(
        'Succès',
        decision === 'approve' 
          ? 'Transaction approuvée et exécutée avec succès'
          : 'Transaction rejetée',
        [{ text: 'OK', onPress: () => router.back() }]
      );

    } catch (error: any) {
      console.error('Error processing decision:', error);
      Alert.alert('Erreur', error.message || 'Impossible de traiter la décision');
    } finally {
      setSubmitting(false);
    }
  };

  const getRiskLevelColor = (score: number) => {
    if (score >= 71) return '#DC2626'; // red-600
    if (score >= 31) return '#F59E0B'; // amber-500
    return '#10B981'; // green-500
  };

  const getRiskLevelText = (score: number) => {
    if (score >= 71) return 'ÉLEVÉ';
    if (score >= 31) return 'MOYEN';
    return 'FAIBLE';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!alert) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Alerte introuvable</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={fetchAlertDetail} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alerte de Fraude</Text>
        <View style={[styles.statusBadge, { 
          backgroundColor: alert.status === 'pending' ? '#FEF3C7' : alert.status === 'approved' ? '#D1FAE5' : '#FEE2E2'
        }]}>
          <Text style={[styles.statusText, {
            color: alert.status === 'pending' ? '#92400E' : alert.status === 'approved' ? '#065F46' : '#991B1B'
          }]}>
            {alert.status === 'pending' ? 'EN ATTENTE' : alert.status === 'approved' ? 'APPROUVÉE' : 'REJETÉE'}
          </Text>
        </View>
      </View>

      {/* Risk Score */}
      <View style={[styles.riskScoreCard, { borderColor: getRiskLevelColor(alert.risk_score) }]}>
        <View style={styles.riskScoreHeader}>
          <Text style={styles.riskScoreLabel}>Score de Risque</Text>
          <Text style={[styles.riskScoreLevel, { color: getRiskLevelColor(alert.risk_score) }]}>
            {getRiskLevelText(alert.risk_score)}
          </Text>
        </View>
        <Text style={[styles.riskScoreValue, { color: getRiskLevelColor(alert.risk_score) }]}>
          {alert.risk_score}/100
        </Text>
        <View style={styles.riskScoreBar}>
          <View 
            style={[
              styles.riskScoreBarFill, 
              { 
                width: `${alert.risk_score}%`,
                backgroundColor: getRiskLevelColor(alert.risk_score)
              }
            ]} 
          />
        </View>
      </View>

      {/* Transaction Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Détails de la Transaction</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Type :</Text>
          <Text style={styles.detailValue}>
            {alert.transaction.type === 'transfer' ? 'Transfert' : 
             alert.transaction.type === 'purchase' ? 'Achat' : 'Rechargement'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Montant :</Text>
          <Text style={[styles.detailValue, styles.amountValue]}>
            {alert.transaction.amount.toFixed(2)} EPC
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Expéditeur :</Text>
          <View>
            <Text style={styles.detailValue}>{alert.transaction.sender_name || 'N/A'}</Text>
            <Text style={styles.detailValueSmall}>{alert.transaction.sender_email}</Text>
          </View>
        </View>

        {alert.transaction.receiver_email && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Destinataire :</Text>
            <View>
              <Text style={styles.detailValue}>{alert.transaction.receiver_name || 'N/A'}</Text>
              <Text style={styles.detailValueSmall}>{alert.transaction.receiver_email}</Text>
            </View>
          </View>
        )}

        {alert.transaction.scope && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Portée :</Text>
            <Text style={styles.detailValue}>
              {alert.transaction.scope === 'intra_campus' ? 'Intra-campus' : 'Inter-campus'}
            </Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date :</Text>
          <Text style={styles.detailValue}>
            {new Date(alert.created_at).toLocaleString('fr-FR')}
          </Text>
        </View>
      </View>

      {/* Données Enrichies - Localisation & Provider */}
      {(alert.transaction.country || alert.transaction.city || alert.transaction.provider || alert.transaction.transaction_type) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informations Contextuelles</Text>
          
          {alert.transaction.transaction_type && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type Transaction :</Text>
              <Text style={styles.detailValue}>{alert.transaction.transaction_type}</Text>
            </View>
          )}

          {alert.transaction.direction && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Direction :</Text>
              <Text style={styles.detailValue}>
                {alert.transaction.direction === 'incoming' ? 'Entrante' : 'Sortante'}
              </Text>
            </View>
          )}

          {alert.transaction.provider && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Fournisseur :</Text>
              <Text style={styles.detailValue}>{alert.transaction.provider}</Text>
            </View>
          )}

          {(alert.transaction.city || alert.transaction.country) && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Localisation :</Text>
              <Text style={styles.detailValue}>
                {alert.transaction.city && alert.transaction.country 
                  ? `${alert.transaction.city}, ${alert.transaction.country}`
                  : alert.transaction.city || alert.transaction.country || 'N/A'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Informations Appareil */}
      {alert.transaction.device_info && Object.keys(alert.transaction.device_info).length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Appareil Utilisé</Text>
          
          {alert.transaction.device_info.device_model && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Modèle :</Text>
              <Text style={styles.detailValue}>{alert.transaction.device_info.device_model}</Text>
            </View>
          )}

          {alert.transaction.device_info.os_name && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Système :</Text>
              <Text style={styles.detailValue}>
                {alert.transaction.device_info.os_name} {alert.transaction.device_info.os_version || ''}
              </Text>
            </View>
          )}

          {alert.transaction.device_info.device_id && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>ID Appareil :</Text>
              <Text style={[styles.detailValue, styles.detailValueSmall]}>
                {alert.transaction.device_info.device_id.substring(0, 16)}...
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Scores ML */}
      {alert.transaction.fraud_features && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Analyse Machine Learning</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>ML Actif :</Text>
            <Text style={[styles.detailValue, { 
              color: alert.transaction.fraud_features.ml_active ? '#10B981' : '#F59E0B'
            }]}>
              {alert.transaction.fraud_features.ml_active ? 'Oui' : 'Non'}
            </Text>
          </View>

          {alert.transaction.fraud_features.ml_score !== undefined && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Score ML :</Text>
              <Text style={styles.detailValue}>
                {alert.transaction.fraud_features.ml_score.toFixed(2)}
              </Text>
            </View>
          )}

          {alert.transaction.fraud_features.heuristic_score !== undefined && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Score Heuristique :</Text>
              <Text style={styles.detailValue}>
                {alert.transaction.fraud_features.heuristic_score.toFixed(2)}
              </Text>
            </View>
          )}

          {alert.transaction.fraud_score !== undefined && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Score Final :</Text>
              <Text style={[styles.detailValue, styles.amountValue]}>
                {alert.transaction.fraud_score}/100
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Fraud Features (Top 5) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Facteurs de Risque</Text>
        <Text style={styles.cardSubtitle}>Raison principale : {alert.reason}</Text>
        
        {alert.fraud_features && Object.keys(alert.fraud_features).length > 0 && (
          <View style={styles.featuresGrid}>
            {Object.entries(alert.fraud_features)
              .slice(0, 8)
              .map(([key, value]) => (
                <View key={key} style={styles.featureItem}>
                  <Text style={styles.featureKey}>{key.replace(/_/g, ' ')}</Text>
                  <Text style={styles.featureValue}>
                    {typeof value === 'number' ? value.toFixed(2) : String(value)}
                  </Text>
                </View>
              ))}
          </View>
        )}
      </View>

      {/* Review Info (if reviewed) */}
      {alert.status !== 'pending' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informations de Revue</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Révisé le :</Text>
            <Text style={styles.detailValue}>
              {alert.reviewed_at ? new Date(alert.reviewed_at).toLocaleString('fr-FR') : 'N/A'}
            </Text>
          </View>

          {alert.resolution_notes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Notes :</Text>
              <Text style={styles.notesText}>{alert.resolution_notes}</Text>
            </View>
          )}
        </View>
      )}

      {/* Actions (if pending) */}
      {alert.status === 'pending' && (
        <View style={styles.actionsCard}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.rejectButton]}
            onPress={handleReject}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>❌ Rejeter</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.approveButton]}
            onPress={handleApprove}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>✅ Approuver</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Transaction ID */}
      <Text style={styles.transactionId}>
        ID Transaction : {alert.transaction.id}
      </Text>
      <Text style={styles.transactionId}>
        ID Alerte : {alert.id}
      </Text>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  riskScoreCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 3,
  },
  riskScoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  riskScoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  riskScoreLevel: {
    fontSize: 14,
    fontWeight: '700',
  },
  riskScoreValue: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 12,
  },
  riskScoreBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  riskScoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    width: '35%',
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    width: '65%',
    textAlign: 'right',
  },
  detailValueSmall: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 2,
  },
  amountValue: {
    fontSize: 18,
    color: '#3B82F6',
  },
  featuresGrid: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  featureKey: {
    fontSize: 13,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  featureValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  notesBox: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  actionsCard: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    backgroundColor: '#DC2626',
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  transactionId: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 4,
  },
});

