import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

interface FraudReason {
  factor: string;
  description: string;
  weight: number;
  severity: 'low' | 'medium' | 'high';
}

interface FraudAlertProps {
  status: 'pending_review' | 'blocked';
  fraudScore: number;
  amount: number;
  recipient?: string;
  reasons: FraudReason[];
  transactionId: string;
  onContestDecision?: () => void;
  onDismiss?: () => void;
}

const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
  switch (severity) {
    case 'high':
      return '#DC2626'; // red-600
    case 'medium':
      return '#F59E0B'; // amber-500
    case 'low':
      return '#10B981'; // green-500
  }
};

const getSeverityIcon = (severity: 'low' | 'medium' | 'high') => {
  switch (severity) {
    case 'high':
      return '🔴';
    case 'medium':
      return '🟡';
    case 'low':
      return '🔵';
  }
};

const getStatusInfo = (status: 'pending_review' | 'blocked') => {
  if (status === 'blocked') {
    return {
      icon: '❌',
      title: 'Transaction refusée',
      subtitle: 'Cette transaction a été bloquée pour protéger votre compte',
      color: '#DC2626',
    };
  } else {
    return {
      icon: '⚠️',
      title: 'Transaction en attente de vérification',
      subtitle: 'Un administrateur validera cette transaction sous 24h',
      color: '#F59E0B',
    };
  }
};

export default function FraudAlert({
  status,
  fraudScore,
  amount,
  recipient,
  reasons,
  transactionId,
  onContestDecision,
  onDismiss,
}: FraudAlertProps) {
  const statusInfo = getStatusInfo(status);

  const handleLearnMore = () => {
    Alert.alert(
      'Détection de fraude',
      'Notre système utilise l\'intelligence artificielle pour analyser chaque transaction et détecter les comportements inhabituels.\n\n' +
      'Cela nous permet de protéger votre compte contre:\n' +
      '• Les transactions frauduleuses\n' +
      '• L\'usurpation d\'identité\n' +
      '• Les montants inhabituels\n' +
      '• Les tentatives de blanchiment\n\n' +
      'Si vous pensez qu\'il s\'agit d\'une erreur, vous pouvez contester cette décision.',
      [{ text: 'Compris', style: 'default' }]
    );
  };

  const handleContestDecision = () => {
    Alert.alert(
      'Contester la décision',
      'Votre contestation sera examinée par notre équipe dans les plus brefs délais.\n\n' +
      'Vous recevrez une notification dès qu\'une décision aura été prise.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Confirmer la contestation', 
          style: 'default',
          onPress: onContestDecision
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { borderColor: statusInfo.color }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.icon}>{statusInfo.icon}</Text>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: statusInfo.color }]}>
            {statusInfo.title}
          </Text>
          <Text style={styles.subtitle}>{statusInfo.subtitle}</Text>
        </View>
      </View>

      {/* Transaction Details */}
      <View style={styles.detailsSection}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Montant :</Text>
          <Text style={styles.detailValue}>{amount.toFixed(2)} EPC</Text>
        </View>
        {recipient && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Destinataire :</Text>
            <Text style={styles.detailValue}>{recipient}</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Score de risque :</Text>
          <Text style={[styles.detailValue, { color: statusInfo.color, fontWeight: '600' }]}>
            {fraudScore}/100
          </Text>
        </View>
      </View>

      {/* Fraud Reasons */}
      {reasons && reasons.length > 0 && (
        <View style={styles.reasonsSection}>
          <Text style={styles.reasonsTitle}>Raisons détectées :</Text>
          {reasons.slice(0, 3).map((reason, index) => (
            <View key={index} style={styles.reasonItem}>
              <View style={styles.reasonHeader}>
                <Text style={styles.reasonIcon}>{getSeverityIcon(reason.severity)}</Text>
                <Text style={[styles.reasonDescription, { flex: 1 }]}>
                  {reason.description}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Explanation */}
      <View style={styles.explanationBox}>
        <Text style={styles.explanationText}>
          {status === 'blocked'
            ? 'Cette vérification protège votre compte contre les transactions frauduleuses et inhabituelles.'
            : 'Cette vérification protège votre compte. Un administrateur examinera cette transaction et vous notifiera de sa décision sous 24h.'}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={handleLearnMore}
        >
          <Text style={styles.secondaryButtonText}>En savoir plus</Text>
        </TouchableOpacity>

        {onContestDecision && (
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]} 
            onPress={handleContestDecision}
          >
            <Text style={styles.primaryButtonText}>Contester</Text>
          </TouchableOpacity>
        )}

        {onDismiss && status === 'pending_review' && (
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]} 
            onPress={onDismiss}
          >
            <Text style={styles.primaryButtonText}>Compris</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Transaction ID (for support) */}
      <Text style={styles.transactionId}>ID Transaction : {transactionId.slice(0, 8)}...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 40,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  detailsSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  reasonsSection: {
    marginBottom: 16,
  },
  reasonsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  reasonItem: {
    marginBottom: 8,
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  reasonIcon: {
    fontSize: 14,
    marginRight: 8,
    marginTop: 2,
  },
  reasonDescription: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  explanationBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  explanationText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  transactionId: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

