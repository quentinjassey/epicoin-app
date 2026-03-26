import { Colors } from "@/constants/NativeColors";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useFocusEffect } from "expo-router";
import Icon from "@/components/Icon";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { supabase } from "../../../lib/supabase";
import GlitchIn from '@/components/GlitchIn';
import { useAccessibility } from '@/lib/AccessibilityContext';

type Transaction = {
  id: string;
  type: "transfer" | "topup" | "top_up" | "payment" | "purchase";
  amount: number;
  status: string;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  sender?: { full_name: string; email: string };
  receiver?: { full_name: string; email: string };
  metadata?: any;
};

export default function HistoryScreen() {
  const { adaptiveColors } = useAccessibility();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, []),
  );

  async function fetchTransactions() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
                    id,
                    type,
                    amount,
                    status,
                    created_at,
                    sender_id,
                    receiver_id,
                    metadata,
                    sender:sender_id(full_name, email),
                    receiver:receiver_id(full_name, email)
                `,
        )
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const transformedData = (data || []).map((tx: any) => ({
        ...tx,
        sender: Array.isArray(tx.sender) ? tx.sender[0] : tx.sender,
        receiver: Array.isArray(tx.receiver) ? tx.receiver[0] : tx.receiver,
      }));

      setTransactions(transformedData);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    fetchTransactions();
  }

  function getTransactionIcon(tx: Transaction): {
    name: string;
    color: any;
    bg: string;
  } {
    const isSender = tx.sender_id === currentUserId;
    const isTopUp = tx.type === "topup" || tx.type === "top_up";
    const isPurchase = tx.type === "payment" || tx.type === "purchase";

    if (isTopUp) {
      return {
        name: "plus.circle.fill",
        color: adaptiveColors.success,
        bg: Colors.white,
      };
    }
    if (isPurchase) {
      return {
        name: "cart.fill",
        color: adaptiveColors.error,
        bg: Colors.white,
      };
    }
    if (isSender) {
      return {
        name: "arrow.up.circle.fill",
        color: adaptiveColors.error,
        bg: Colors.white,
      };
    }
    return {
      name: "arrow.down.circle.fill",
      color: adaptiveColors.success,
      bg: Colors.white,
    };
  }

  function getTransactionLabel(tx: Transaction): string {
    const isSender = tx.sender_id === currentUserId;
    const isTopUp = tx.type === "topup" || tx.type === "top_up";
    const isPurchase = tx.type === "payment" || tx.type === "purchase";

    if (isTopUp) {
      const bonus = tx.metadata?.bonus || 0;
      if (bonus > 0) {
        return `Rechargement (+${bonus} bonus)`;
      }
      return "Rechargement";
    }

    if (isPurchase) {
      const productName = tx.metadata?.product_name || "Produit";
      if (tx.status === "pending_review") {
        return `Achat ${productName} (en attente)`;
      }
      if (tx.status === "failed") {
        const refunded = tx.metadata?.refunded;
        return refunded
          ? `Achat ${productName} (remboursé)`
          : `Achat ${productName} (échoué)`;
      }
      return `Achat ${productName}`;
    }

    if (isSender) {
      return `Envoyé à ${tx.receiver?.full_name || "Utilisateur"}`;
    }
    return `Reçu de ${tx.sender?.full_name || "Utilisateur"}`;
  }

  function getAmountDisplay(tx: Transaction): { prefix: string; color: any } {
    const isSender = tx.sender_id === currentUserId;
    const isTopUp = tx.type === "topup" || tx.type === "top_up";
    const isPurchase = tx.type === "payment" || tx.type === "purchase";

    if (isTopUp) {
      return { prefix: "+", color: adaptiveColors.success };
    }

    if (isPurchase) {
      return { prefix: "-", color: adaptiveColors.error };
    }

    if (isSender) {
      return { prefix: "-", color: adaptiveColors.error };
    }
    return { prefix: "+", color: adaptiveColors.success };
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "completed":
        return {
          label: "COMPLETE",
          borderColor: adaptiveColors.success,
          color: adaptiveColors.success,
        };
      case "pending_review":
        return {
          label: "EN ATTENTE",
          borderColor: adaptiveColors.warning,
          color: adaptiveColors.warning,
        };
      case "failed":
        return {
          label: "ECHOUE",
          borderColor: adaptiveColors.error,
          color: adaptiveColors.error,
        };
      default:
        return {
          label: status.toUpperCase(),
          borderColor: Colors.mediumGray,
          color: Colors.mediumGray,
        };
    }
  }

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const icon = getTransactionIcon(item);
    const label = getTransactionLabel(item);
    const amount = getAmountDisplay(item);
    const status = getStatusBadge(item.status);

    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => setSelectedTx(item)}
        activeOpacity={0.8}
        style={{
          backgroundColor: Colors.white,
          padding: 16,
          borderRadius: 0,
          marginBottom: 12,
          borderWidth: 2,
          borderColor: Colors.black,
          shadowColor: Colors.black,
          shadowOffset: { width: 3, height: 3 },
          shadowOpacity: 1,
          shadowRadius: 0,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              backgroundColor: icon.bg,
              padding: 12,
              borderRadius: 0,
              marginRight: 16,
              borderWidth: 2,
              borderColor: Colors.black,
            }}
          >
            <Icon
              name={icon.name}
              size={24}
              color={icon.color}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontWeight: "800",
                color: Colors.black,
                fontSize: 15,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
              numberOfLines={1}
            >
              {label}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <Text
                style={{
                  color: Colors.mediumGray,
                  fontSize: 12,
                  fontWeight: "700",
                  letterSpacing: 0.3,
                }}
              >
                {format(new Date(item.created_at), "d MMM 'à' HH:mm", {
                  locale: fr,
                })}
              </Text>
              {item.status !== "completed" && (
                <View
                  style={{
                    backgroundColor: "transparent",
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 0,
                    marginLeft: 8,
                    borderWidth: 2,
                    borderColor: status.borderColor,
                  }}
                >
                  <Text
                    style={{
                      color: status.color,
                      fontSize: 10,
                      fontWeight: "900",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    {status.label}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <Text
            style={{
              fontWeight: "900",
              fontSize: 16,
              color: amount.color,
              fontVariant: ["tabular-nums"],
              letterSpacing: 0.5,
            }}
          >
            {amount.prefix}
            {item.amount.toFixed(2)} EPC
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: Colors.white,
        }}
      >
        <ActivityIndicator size="large" color={adaptiveColors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: Colors.white,
      }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        padding: 16,
        paddingTop: 16,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={adaptiveColors.primary}
        />
      }
    >
      {/* Title */}
      <GlitchIn delay={0}>
      <Text
        style={{
          fontSize: 34,
          fontWeight: "900",
          color: Colors.black,
          marginBottom: 24,
          paddingHorizontal: 8,
          textTransform: "uppercase",
          letterSpacing: 2,
        }}
      >
        Historique
      </Text>
      </GlitchIn>

      {/* Transactions List */}
      <GlitchIn delay={80}>
      {transactions.length === 0 ? (
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 80,
          }}
        >
          <View
            style={{
              backgroundColor: Colors.offWhite,
              padding: 24,
              borderRadius: 0,
              marginBottom: 16,
              borderWidth: 2,
              borderColor: Colors.black,
              shadowColor: Colors.black,
              shadowOffset: { width: 3, height: 3 },
              shadowOpacity: 1,
              shadowRadius: 0,
            }}
          >
            <Icon
              name="doc.text"
              size={48}
              color={Colors.mediumGray}
            />
          </View>
          <Text
            style={{
              color: Colors.black,
              fontSize: 17,
              fontWeight: "900",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 1.5,
            }}
          >
            Aucune transaction
          </Text>
          <Text
            style={{
              color: Colors.mediumGray,
              textAlign: "center",
              marginTop: 8,
              paddingHorizontal: 32,
              fontSize: 15,
              lineHeight: 20,
              fontWeight: "700",
            }}
          >
            Vos transactions apparaîtront ici une fois que vous aurez effectué
            des opérations.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {transactions.map((item) => renderTransaction({ item }))}
        </View>
      )}
      </GlitchIn>

      {/* Transaction Detail Modal */}
      <Modal
        visible={!!selectedTx}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setSelectedTx(null)}
      >
        {selectedTx && (() => {
          const icon = getTransactionIcon(selectedTx);
          const label = getTransactionLabel(selectedTx);
          const amount = getAmountDisplay(selectedTx);
          const isSender = selectedTx.sender_id === currentUserId;
          const isTopUp = selectedTx.type === "topup" || selectedTx.type === "top_up";
          const isPurchase = selectedTx.type === "payment" || selectedTx.type === "purchase";

          function getTypeLabel(): string {
            if (isTopUp) return "RECHARGEMENT";
            if (isPurchase) return "ACHAT";
            if (isSender) return "TRANSFERT ENVOYE";
            return "TRANSFERT RECU";
          }

          return (
            <View style={{ flex: 1, backgroundColor: Colors.white }}>
              {/* Header */}
              <View style={{
                backgroundColor: icon.color,
                paddingTop: 24,
                paddingBottom: 28,
                paddingHorizontal: 24,
                borderBottomWidth: 3,
                borderBottomColor: Colors.black,
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <Text style={{ color: Colors.white, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 }}>
                    {getTypeLabel()}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedTx(null)} style={{ borderWidth: 2, borderColor: Colors.white, padding: 4 }}>
                    <Icon name="xmark" size={18} color={Colors.white} />
                  </TouchableOpacity>
                </View>

                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: Colors.white, fontSize: 48, fontWeight: '900', fontVariant: ['tabular-nums'], letterSpacing: -2 }}>
                    {amount.prefix}{selectedTx.amount.toFixed(2)}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18, fontWeight: '800', marginTop: 4 }}>EPC</Text>
                </View>
              </View>

              <ScrollView contentContainerStyle={{ padding: 24 }}>
                {/* Description */}
                <View style={{
                  backgroundColor: Colors.offWhite,
                  borderWidth: 2,
                  borderColor: Colors.black,
                  padding: 20,
                  marginBottom: 20,
                  shadowColor: Colors.black,
                  shadowOffset: { width: 3, height: 3 },
                  shadowOpacity: 1,
                  shadowRadius: 0,
                }}>
                  <Text style={{ color: Colors.black, fontSize: 16, fontWeight: '700', lineHeight: 24 }}>
                    {label}
                  </Text>
                </View>

                {/* Details */}
                <View style={{ borderWidth: 2, borderColor: Colors.black, backgroundColor: Colors.white, marginBottom: 20 }}>
                  <View style={{ backgroundColor: Colors.black, paddingHorizontal: 14, paddingVertical: 8 }}>
                    <Text style={{ color: Colors.white, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 }}>Details</Text>
                  </View>

                  <View style={{ padding: 14 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                      <Text style={{ color: Colors.mediumGray, fontWeight: '700', fontSize: 13, textTransform: 'uppercase' }}>Date</Text>
                      <Text style={{ color: Colors.black, fontWeight: '800', fontSize: 13 }}>
                        {format(new Date(selectedTx.created_at), "d MMMM yyyy 'a' HH:mm", { locale: fr })}
                      </Text>
                    </View>

                    <View style={{ height: 1, backgroundColor: Colors.lightGray, marginBottom: 10 }} />

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                      <Text style={{ color: Colors.mediumGray, fontWeight: '700', fontSize: 13, textTransform: 'uppercase' }}>Type</Text>
                      <Text style={{ color: Colors.black, fontWeight: '800', fontSize: 13 }}>{getTypeLabel()}</Text>
                    </View>

                    <View style={{ height: 1, backgroundColor: Colors.lightGray, marginBottom: 10 }} />

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                      <Text style={{ color: Colors.mediumGray, fontWeight: '700', fontSize: 13, textTransform: 'uppercase' }}>Montant</Text>
                      <Text style={{ color: icon.color, fontWeight: '900', fontSize: 18 }}>{amount.prefix}{selectedTx.amount.toFixed(2)} EPC</Text>
                    </View>

                    {selectedTx.sender && (
                      <>
                        <View style={{ height: 1, backgroundColor: Colors.lightGray, marginBottom: 10 }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                          <Text style={{ color: Colors.mediumGray, fontWeight: '700', fontSize: 13, textTransform: 'uppercase' }}>De</Text>
                          <Text style={{ color: Colors.black, fontWeight: '800', fontSize: 13 }}>{selectedTx.sender.full_name}</Text>
                        </View>
                      </>
                    )}

                    {selectedTx.receiver && (
                      <>
                        <View style={{ height: 1, backgroundColor: Colors.lightGray, marginBottom: 10 }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                          <Text style={{ color: Colors.mediumGray, fontWeight: '700', fontSize: 13, textTransform: 'uppercase' }}>A</Text>
                          <Text style={{ color: Colors.black, fontWeight: '800', fontSize: 13 }}>{selectedTx.receiver.full_name}</Text>
                        </View>
                      </>
                    )}

                    {selectedTx.metadata?.product_name && (
                      <>
                        <View style={{ height: 1, backgroundColor: Colors.lightGray, marginBottom: 10 }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                          <Text style={{ color: Colors.mediumGray, fontWeight: '700', fontSize: 13, textTransform: 'uppercase' }}>Produit</Text>
                          <Text style={{ color: Colors.black, fontWeight: '800', fontSize: 13 }}>{selectedTx.metadata.product_name}</Text>
                        </View>
                      </>
                    )}

                    <View style={{ height: 1, backgroundColor: Colors.lightGray, marginBottom: 10 }} />

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: Colors.mediumGray, fontWeight: '700', fontSize: 13, textTransform: 'uppercase' }}>Statut</Text>
                      <View style={{ backgroundColor: icon.color, paddingHorizontal: 10, paddingVertical: 3 }}>
                        <Text style={{ color: Colors.white, fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
                          {selectedTx.status === 'completed' ? 'COMPLETE' : selectedTx.status === 'pending_review' ? 'EN ATTENTE' : selectedTx.status === 'failed' ? 'ECHOUE' : selectedTx.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* TX ID */}
                <Text style={{ color: Colors.quaternaryLabel, fontSize: 10, fontWeight: '600', textAlign: 'center', fontFamily: 'SpaceMono' }}>
                  TX: {selectedTx.id}
                </Text>
              </ScrollView>
            </View>
          );
        })()}
      </Modal>
    </ScrollView>
  );
}
