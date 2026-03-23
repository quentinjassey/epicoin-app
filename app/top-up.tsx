import { Colors } from "@/constants/NativeColors";
import { useAccessibility } from '@/lib/AccessibilityContext';
import { StripeProvider, useStripe } from "@stripe/stripe-react-native";
import { router } from "expo-router";
import Icon from "@/components/Icon";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";
import { collectTransactionContext } from "../lib/transactionContext";

const CONVERSION_RATE = 5; // 1€ = 5 EPC
const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

interface TopUpOption {
  id: string;
  euros: number;
  bonus: number;
  popular?: boolean;
  bestValue?: boolean;
}

const TOPUP_OPTIONS: TopUpOption[] = [
  { id: "starter", euros: 5, bonus: 0 },
  { id: "standard", euros: 10, bonus: 5, popular: true },
  { id: "premium", euros: 20, bonus: 15 },
  { id: "ultimate", euros: 50, bonus: 50, bestValue: true },
];

function TopUpContent() {
  const { adaptiveColors } = useAccessibility();
  const [selectedOption, setSelectedOption] = useState<TopUpOption | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  function getBaseEpc(euros: number): number {
    return euros * CONVERSION_RATE;
  }

  function getTotalEpc(euros: number, bonus: number): number {
    return getBaseEpc(euros) + bonus;
  }

  async function handlePayment() {
    if (!selectedOption) return;

    setLoading(true);

    try {
      const context = await collectTransactionContext();
      const totalEpc = getTotalEpc(selectedOption.euros, selectedOption.bonus);

      // Le serveur calcule bonus et epc_amount — on n'envoie que le montant EUR
      const { data, error } = await supabase.functions.invoke(
        "create-payment-intent",
        {
          body: {
            amount: selectedOption.euros,
            context: {
              country: context.location_info.country,
              city: context.location_info.city,
              device_info: context.device_info,
            },
          },
        },
      );

      if (error || !data?.clientSecret) {
        Alert.alert(
          "Erreur",
          "Impossible d'initialiser le paiement. Veuillez réessayer.",
        );
        setLoading(false);
        return;
      }

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "EpiCoin",
        paymentIntentClientSecret: data.clientSecret,
        returnURL: "epicoin://payment-return",
        defaultBillingDetails: {
          name: "Étudiant Epitech",
        },
      });

      if (initError) {
        Alert.alert("Erreur", `Erreur d'initialisation: ${initError.message}`);
        setLoading(false);
        return;
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code !== "Canceled") {
          Alert.alert("Erreur de paiement", presentError.message);
        }
        setLoading(false);
        return;
      }

      console.log(
        "[Top-up] Calling confirm-payment with payment_intent_id:",
        data.id,
      );

      // Retry logic: si le réseau coupe après le paiement Stripe, on retente la confirmation
      const MAX_RETRIES = 3;
      let confirmData = null;
      let confirmError = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const result = await supabase.functions.invoke("confirm-payment", {
          body: { payment_intent_id: data.id },
        });
        confirmData = result.data;
        confirmError = result.error;

        if (!confirmError) break;

        console.warn(
          `[Top-up] Confirm attempt ${attempt}/${MAX_RETRIES} failed:`,
          confirmError.message,
        );

        if (attempt < MAX_RETRIES) {
          // Attente exponentielle: 1s, 2s
          await new Promise((r) => setTimeout(r, attempt * 1000));
        }
      }

      console.log("[Top-up] Confirm payment response:", {
        confirmData,
        confirmError,
      });

      if (confirmError) {
        console.error("[Top-up] Confirm payment error after retries:", confirmError);
        Alert.alert(
          "Paiement en cours de traitement",
          "Votre paiement Stripe a été effectué mais la confirmation a échoué. Vos EPC seront crédités automatiquement. Contactez le support si le problème persiste.",
          [{ text: "OK", onPress: () => router.back() }],
        );
        setLoading(false);
        return;
      }

      // Gérer les différents statuts de transaction
      if (confirmData.status === "pending_review") {
        Alert.alert(
          "Vérification de sécurité",
          "Votre rechargement a été signalé pour vérification. Vous serez notifié une fois validé.",
          [{ text: "OK", onPress: () => router.back() }],
        );
        setLoading(false);
        return;
      }

      if (confirmData.status === "blocked") {
        Alert.alert(
          "Transaction bloquée",
          "Votre transaction a été bloquée pour des raisons de sécurité. Un remboursement a été initié.",
          [{ text: "OK", onPress: () => router.back() }],
        );
        setLoading(false);
        return;
      }

      if (confirmData.status === "error" || !confirmData?.success) {
        Alert.alert(
          "Erreur",
          confirmData.message || "Impossible de confirmer le paiement.",
        );
        setLoading(false);
        return;
      }

      // Transaction réussie
      Alert.alert(
        "Rechargement réussi",
        `${totalEpc} EPC ont été ajoutés à votre compte${selectedOption.bonus > 0 ? ` (dont ${selectedOption.bonus} de bonus)` : ""} !`,
        [{ text: "Super !", onPress: () => router.back() }],
      );
    } catch (error: any) {
      Alert.alert("Erreur", error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: Colors.white }}
      contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
    >
      <View style={{ marginBottom: 32 }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "900",
            color: Colors.black,
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          Recharger votre compte
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: Colors.secondaryLabel,
            lineHeight: 20,
            fontWeight: "700",
          }}
        >
          Choisissez un montant et profitez de bonus exclusifs
        </Text>
      </View>

      <View style={{ gap: 12, marginBottom: 32 }}>
        {TOPUP_OPTIONS.map((option) => {
          const baseEpc = getBaseEpc(option.euros);
          const totalEpc = getTotalEpc(option.euros, option.bonus);
          const isSelected = selectedOption?.id === option.id;

          return (
            <TouchableOpacity
              key={option.id}
              onPress={() => setSelectedOption(option)}
              style={{
                backgroundColor: isSelected
                  ? adaptiveColors.primary
                  : Colors.white,
                borderRadius: 0,
                padding: 20,
                borderWidth: 2,
                borderColor: Colors.black,
                shadowColor: Colors.black,
                shadowOffset: { width: isSelected ? 4 : 3, height: isSelected ? 4 : 3 },
                shadowOpacity: 1,
                shadowRadius: 0,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 32,
                        fontWeight: "900",
                        color: isSelected ? Colors.white : Colors.black,
                        marginRight: 8,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {option.euros}€
                    </Text>
                    {(option.popular || option.bestValue) && (
                      <View
                        style={{
                          backgroundColor: isSelected
                            ? "rgba(255, 255, 255, 0.25)"
                            : adaptiveColors.warning,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 0,
                          borderWidth: 2,
                          borderColor: isSelected ? Colors.white : Colors.black,
                        }}
                      >
                        <Text
                          style={{
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: "900",
                            textTransform: "uppercase",
                            letterSpacing: 1,
                          }}
                        >
                          {option.popular ? "Populaire" : "Meilleure valeur"}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text
                    style={{
                      fontSize: 15,
                      color: isSelected
                        ? "rgba(255, 255, 255, 0.75)"
                        : Colors.secondaryLabel,
                      marginBottom: 4,
                      fontWeight: "700",
                    }}
                  >
                    {baseEpc} EPC{" "}
                    {option.bonus > 0 ? `+ ${option.bonus} bonus` : ""}
                  </Text>

                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "900",
                      color: isSelected
                        ? Colors.epitechYellow
                        : adaptiveColors.primary,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    = {totalEpc} EPC
                  </Text>
                </View>

                {isSelected && (
                  <Icon
                    name="checkmark.circle.fill"
                    size={32}
                    color={Colors.white}
                  />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedOption && (
        <View
          style={{
            backgroundColor: Colors.offWhite,
            borderRadius: 0,
            padding: 20,
            marginBottom: 24,
            borderWidth: 2,
            borderColor: Colors.black,
            shadowColor: Colors.black,
            shadowOffset: { width: 3, height: 3 },
            shadowOpacity: 1,
            shadowRadius: 0,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Icon
              name="info.circle.fill"
              size={20}
              color={adaptiveColors.primary}
            />
            <Text
              style={{
                fontSize: 15,
                fontWeight: "800",
                color: Colors.black,
                marginLeft: 8,
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              Récapitulatif
            </Text>
          </View>
          <View style={{ gap: 8 }}>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ color: Colors.secondaryLabel, fontWeight: "700" }}>Montant</Text>
              <Text
                style={{
                  fontWeight: "800",
                  color: Colors.black,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {selectedOption.euros}€
              </Text>
            </View>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ color: Colors.secondaryLabel, fontWeight: "700" }}>EPC de base</Text>
              <Text
                style={{
                  fontWeight: "800",
                  color: Colors.black,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {getBaseEpc(selectedOption.euros)} EPC
              </Text>
            </View>
            {selectedOption.bonus > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: adaptiveColors.success, fontWeight: "700" }}>Bonus</Text>
                <Text
                  style={{
                    fontWeight: "800",
                    color: adaptiveColors.success,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  +{selectedOption.bonus} EPC
                </Text>
              </View>
            )}
            <View
              style={{
                height: 2,
                backgroundColor: Colors.black,
                marginVertical: 8,
              }}
            />
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text
                style={{ fontSize: 17, fontWeight: "900", color: Colors.black, textTransform: "uppercase" }}
              >
                Total
              </Text>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "900",
                  color: adaptiveColors.primary,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {getTotalEpc(selectedOption.euros, selectedOption.bonus)} EPC
              </Text>
            </View>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={{
          backgroundColor: selectedOption
            ? adaptiveColors.primary
            : Colors.lightGray,
          borderRadius: 0,
          padding: 16,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          borderWidth: 2,
          borderColor: Colors.black,
          shadowColor: Colors.black,
          shadowOffset: { width: 4, height: 4 },
          shadowOpacity: selectedOption ? 1 : 0,
          shadowRadius: 0,
        }}
        onPress={handlePayment}
        disabled={!selectedOption || loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <>
            <Icon name="creditcard.fill" size={20} color={selectedOption ? Colors.white : Colors.tertiaryLabel} />
            <Text
              style={{
                color: selectedOption ? Colors.white : Colors.tertiaryLabel,
                fontSize: 17,
                fontWeight: "900",
                marginLeft: 8,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Payer {selectedOption ? `${selectedOption.euros}€` : ""}
            </Text>
          </>
        )}
      </TouchableOpacity>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 24,
        }}
      >
        <Icon
          name="lock.shield.fill"
          size={16}
          color={Colors.tertiaryLabel}
        />
        <Text
          style={{
            color: Colors.tertiaryLabel,
            fontSize: 13,
            marginLeft: 8,
            fontWeight: "700",
          }}
        >
          Paiement sécurisé par Stripe
        </Text>
      </View>
    </ScrollView>
  );
}

export default function TopUpScreen() {
  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <TopUpContent />
    </StripeProvider>
  );
}
