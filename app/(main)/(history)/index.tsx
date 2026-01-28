import { Colors } from "@/constants/NativeColors";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Text,
    View
} from "react-native";
import { supabase } from "../../../lib/supabase";

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
        color: Colors.systemGreen,
        bg: "rgba(16, 185, 129, 0.15)",
      };
    }
    if (isPurchase) {
      return {
        name: "cart.fill",
        color: Colors.systemOrange,
        bg: "rgba(245, 158, 11, 0.15)",
      };
    }
    if (isSender) {
      return {
        name: "arrow.up.circle.fill",
        color: Colors.systemRed,
        bg: "rgba(239, 68, 68, 0.15)",
      };
    }
    return {
      name: "arrow.down.circle.fill",
      color: Colors.systemGreen,
      bg: "rgba(16, 185, 129, 0.15)",
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
      return { prefix: "+", color: Colors.systemGreen };
    }

    if (isPurchase) {
      return { prefix: "-", color: Colors.systemRed };
    }

    if (isSender) {
      return { prefix: "-", color: Colors.systemRed };
    }
    return { prefix: "+", color: Colors.systemGreen };
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "completed":
        return {
          label: "Complété",
          bg: "rgba(16, 185, 129, 0.15)",
          color: Colors.systemGreen,
        };
      case "pending_review":
        return {
          label: "En attente",
          bg: "rgba(245, 158, 11, 0.15)",
          color: Colors.systemOrange,
        };
      case "failed":
        return {
          label: "Échoué",
          bg: "rgba(239, 68, 68, 0.15)",
          color: Colors.systemRed,
        };
      default:
        return {
          label: status,
          bg: Colors.systemFill,
          color: Colors.secondaryLabel,
        };
    }
  }

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const icon = getTransactionIcon(item);
    const label = getTransactionLabel(item);
    const amount = getAmountDisplay(item);
    const status = getStatusBadge(item.status);

    return (
      <View
        key={item.id}
        style={{
          backgroundColor: Colors.secondarySystemGroupedBackground,
          padding: 16,
          borderRadius: 16,
          borderCurve: "continuous",
          marginBottom: 12,
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              backgroundColor: icon.bg,
              padding: 12,
              borderRadius: 24,
              borderCurve: "continuous",
              marginRight: 16,
            }}
          >
            <SymbolView
              name={icon.name as any}
              size={24}
              tintColor={icon.color}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontWeight: "600",
                color: Colors.label,
                fontSize: 15,
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
                  color: Colors.tertiaryLabel,
                  fontSize: 12,
                }}
              >
                {format(new Date(item.created_at), "d MMM 'à' HH:mm", {
                  locale: fr,
                })}
              </Text>
              {item.status !== "completed" && (
                <View
                  style={{
                    backgroundColor: status.bg,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 10,
                    borderCurve: "continuous",
                    marginLeft: 8,
                  }}
                >
                  <Text
                    style={{
                      color: status.color,
                      fontSize: 11,
                      fontWeight: "600",
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
              fontWeight: "700",
              fontSize: 16,
              color: amount.color,
              fontVariant: ["tabular-nums"],
            }}
          >
            {amount.prefix}
            {item.amount.toFixed(2)} EPC
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: Colors.systemGroupedBackground,
        }}
      >
        <ActivityIndicator size="large" color={Colors.epitechBlue} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: Colors.systemGroupedBackground,
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
          tintColor={Colors.epitechBlue}
        />
      }
    >
      {/* Title */}
      <Text
        style={{
          fontSize: 34,
          fontWeight: "700",
          color: Colors.label,
          marginBottom: 24,
          paddingHorizontal: 8,
        }}
      >
        Historique
      </Text>

      {/* Transactions List */}
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
              backgroundColor: Colors.systemFill,
              padding: 24,
              borderRadius: 48,
              borderCurve: "continuous",
              marginBottom: 16,
            }}
          >
            <SymbolView
              name="doc.text"
              size={48}
              tintColor={Colors.tertiaryLabel}
            />
          </View>
          <Text
            style={{
              color: Colors.secondaryLabel,
              fontSize: 17,
              fontWeight: "600",
              marginBottom: 8,
            }}
          >
            Aucune transaction
          </Text>
          <Text
            style={{
              color: Colors.tertiaryLabel,
              textAlign: "center",
              marginTop: 8,
              paddingHorizontal: 32,
              fontSize: 15,
              lineHeight: 20,
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
    </ScrollView>
  );
}
