import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Colors } from '@/constants/NativeColors';

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
      return Colors.accentOrange;
    case 'medium':
      return Colors.systemOrange;
    case 'low':
      return Colors.success;
  }
};

const getSeverityIcon = (severity: 'low' | 'medium' | 'high') => {
  switch (severity) {
    case 'high':
      return '!!';
    case 'medium':
      return '!';
    case 'low':
      return 'i';
  }
};

const getStatusInfo = (status: 'pending_review' | 'blocked') => {
  if (status === 'blocked') {
    return {
      title: 'TRANSACTION REFUSEE',
      subtitle: 'Cette transaction a été bloquée pour protéger votre compte',
      color: Colors.accentOrange,
    };
  } else {
    return {
      title: 'TRANSACTION EN ATTENTE',
      subtitle: 'Un administrateur validera cette transaction sous 24h',
      color: Colors.systemOrange,
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
          <Text style={styles.detailLabel}>MONTANT :</Text>
          <Text style={styles.detailValue}>{amount.toFixed(2)} EPC</Text>
        </View>
        {recipient && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>DESTINATAIRE :</Text>
            <Text style={styles.detailValue}>{recipient}</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>SCORE DE RISQUE :</Text>
          <Text style={[styles.detailValue, { color: statusInfo.color, fontWeight: '900' }]}>
            {fraudScore}/100
          </Text>
        </View>
      </View>

      {/* Fraud Reasons */}
      {reasons && reasons.length > 0 && (
        <View style={styles.reasonsSection}>
          <Text style={styles.reasonsTitle}>RAISONS DETECTEES :</Text>
          {reasons.slice(0, 3).map((reason, index) => (
            <View key={index} style={styles.reasonItem}>
              <View style={styles.reasonHeader}>
                <View style={[styles.severityBadge, { borderColor: getSeverityColor(reason.severity) }]}>
                  <Text style={[styles.severityText, { color: getSeverityColor(reason.severity) }]}>
                    {getSeverityIcon(reason.severity)}
                  </Text>
                </View>
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
          <Text style={styles.secondaryButtonText}>EN SAVOIR PLUS</Text>
        </TouchableOpacity>

        {onContestDecision && (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleContestDecision}
          >
            <Text style={styles.primaryButtonText}>CONTESTER</Text>
          </TouchableOpacity>
        )}

        {onDismiss && status === 'pending_review' && (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={onDismiss}
          >
            <Text style={styles.primaryButtonText}>COMPRIS</Text>
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
    backgroundColor: Colors.white,
    borderRadius: 0,
    borderWidth: 2,
    padding: 20,
    margin: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.secondaryLabel,
    lineHeight: 20,
    fontWeight: '700',
  },
  detailsSection: {
    backgroundColor: Colors.offWhite,
    borderRadius: 0,
    padding: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.black,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.secondaryLabel,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.black,
    fontWeight: '800',
  },
  reasonsSection: {
    marginBottom: 16,
  },
  reasonsTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.black,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  reasonItem: {
    marginBottom: 8,
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  severityBadge: {
    width: 22,
    height: 22,
    borderRadius: 0,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 0,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '900',
  },
  reasonDescription: {
    fontSize: 13,
    color: Colors.black,
    lineHeight: 18,
    fontWeight: '700',
  },
  explanationBox: {
    backgroundColor: Colors.offWhite,
    borderRadius: 0,
    padding: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.systemOrange,
  },
  explanationText: {
    fontSize: 13,
    color: Colors.black,
    lineHeight: 18,
    fontWeight: '700',
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
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.black,
    shadowColor: Colors.black,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  primaryButton: {
    backgroundColor: Colors.epitechBlue,
  },
  secondaryButton: {
    backgroundColor: Colors.white,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  secondaryButtonText: {
    color: Colors.black,
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transactionId: {
    fontSize: 11,
    color: Colors.tertiaryLabel,
    textAlign: 'center',
    fontWeight: '700',
    fontFamily: 'monospace',
  },
});
