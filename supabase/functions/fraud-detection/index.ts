import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Seuils de décision par défaut (si config non disponible)
const DEFAULT_RISK_THRESHOLDS = {
  LOW: 30, // 0-30: Approve automatiquement
  MEDIUM: 70, // 31-70: Revue manuelle
  HIGH: 71, // 71-100: Bloquer automatiquement
};

// Poids par défaut (si config non disponible)
const DEFAULT_WEIGHTS = {
  ML: 0.4,
  HEURISTIC: 0.6,
};

// Poids des features enrichis
const FEATURE_WEIGHTS = {
  // Montant et fréquence
  amount_high: 0.18,
  amount_unusual: 0.15,
  frequency_high: 0.15,

  // Comportement utilisateur
  new_recipient: 0.1,
  balance_ratio: 0.08,

  // Géographique (NOUVEAU)
  country_high_risk: 0.12,
  location_changed: 0.08,
  multiple_locations: 0.06,

  // Device (NOUVEAU)
  device_changed: 0.1,
  multiple_devices: 0.05,

  // Temporel (NOUVEAU)
  time_unusual: 0.08,
  velocity_high: 0.07,

  // Provider (NOUVEAU)
  provider_suspicious: 0.05,
  failed_attempts: 0.05,
};

// Pays à haut risque (liste simplifiée - à étendre selon besoins)
const HIGH_RISK_COUNTRIES = ["XX", "YY", "ZZ"]; // Codes ISO à définir selon politique

// Interface enrichie pour les transactions
interface EnrichedTransactionPayload {
  // Identifiants
  transaction_id?: string;
  provider?: string; // 'stripe', 'wallet', 'intercampus'
  provider_tx_id?: string;

  // Acteurs (rétrocompatibilité avec ancien format)
  userId?: string; // Ancien format
  initiator_user_id?: string; // Nouveau format
  source_wallet_id?: string;
  destination_wallet_id?: string;
  recipientId?: string;

  // Financier
  amount: number;
  currency?: string; // 'EPC', 'EUR'

  // Type (support ancien et nouveau format)
  type?: "transfer" | "purchase" | "topup" | "intercampus"; // Ancien
  transaction_type?: "P2P" | "MERCHANT" | "CASHIN" | "CASHOUT" | "INTERCAMPUS"; // Nouveau
  direction?: "outgoing" | "incoming";

  // Timestamps
  created_at?: string;
  provider_created_at?: string;
  executed_at?: string;

  // Localisation (NOUVEAU)
  country?: string;
  city?: string;
  latitude?: number;
  longitude?: number;

  // Contexte (NOUVEAU)
  description?: string;
  device_info?: {
    ip?: string;
    user_agent?: string;
    device_id?: string;
    device_model?: string;
    os_name?: string;
    os_version?: string;
  };

  // Métadonnées
  metadata?: Record<string, any>;
}

interface FraudAnalysis {
  riskScore: number;
  decision: "approve" | "review" | "block";
  reasons: Array<{
    factor: string;
    description: string;
    weight: number;
    severity: "low" | "medium" | "high";
  }>;
  features: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { transaction } = (await req.json()) as {
      transaction: EnrichedTransactionPayload;
    };

    // Support ancien et nouveau format pour userId
    const userId = transaction.initiator_user_id || transaction.userId;

    if (!transaction || !userId || !transaction.amount) {
      throw new Error("Invalid transaction payload");
    }

    console.log("[Fraud Detection Enhanced] Analyzing transaction:", {
      userId,
      amount: transaction.amount,
      type: transaction.type || transaction.transaction_type,
      country: transaction.country,
      provider: transaction.provider,
    });

    // Enrichir les headers si disponibles
    if (req.headers) {
      transaction.device_info = transaction.device_info || {};
      if (!transaction.device_info.ip) {
        transaction.device_info.ip =
          req.headers.get("x-forwarded-for") ||
          req.headers.get("x-real-ip") ||
          undefined;
      }
      if (!transaction.device_info.user_agent) {
        transaction.device_info.user_agent =
          req.headers.get("user-agent") || undefined;
      }
    }

    // Récupérer la configuration dynamique
    const config = await getFraudConfig(supabase);

    // Analyse de fraude enrichie avec configuration dynamique
    const analysis = await analyzeFraudEnriched(
      supabase,
      transaction,
      userId,
      config,
    );

    console.log(
      "[Fraud Detection Enhanced] Risk score:",
      analysis.riskScore,
      "Decision:",
      analysis.decision,
    );

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Fraud Detection Enhanced] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Fonction pour récupérer la configuration dynamique
async function getFraudConfig(supabase: any) {
  try {
    const { data, error } = await supabase.rpc("get_fraud_config");

    if (error || !data || data.length === 0) {
      console.warn(
        "[Fraud Config] Unable to fetch config, using defaults:",
        error?.message,
      );
      return {
        ml_weight: DEFAULT_WEIGHTS.ML,
        heuristic_weight: DEFAULT_WEIGHTS.HEURISTIC,
        threshold_approve: DEFAULT_RISK_THRESHOLDS.LOW,
        threshold_review: DEFAULT_RISK_THRESHOLDS.MEDIUM,
      };
    }

    const config = data[0];
    console.log("[Fraud Config] Using dynamic config:", config);

    return {
      ml_weight: parseFloat(config.ml_weight),
      heuristic_weight: parseFloat(config.heuristic_weight),
      threshold_approve: config.threshold_approve,
      threshold_review: config.threshold_review,
    };
  } catch (error) {
    console.error("[Fraud Config] Error fetching config:", error.message);
    return {
      ml_weight: DEFAULT_WEIGHTS.ML,
      heuristic_weight: DEFAULT_WEIGHTS.HEURISTIC,
      threshold_approve: DEFAULT_RISK_THRESHOLDS.LOW,
      threshold_review: DEFAULT_RISK_THRESHOLDS.MEDIUM,
    };
  }
}

async function analyzeFraudEnriched(
  supabase: any,
  transaction: EnrichedTransactionPayload,
  userId: string,
  config: {
    ml_weight: number;
    heuristic_weight: number;
    threshold_approve: number;
    threshold_review: number;
  },
): Promise<FraudAnalysis> {
  const reasons: FraudAnalysis["reasons"] = [];
  let riskScore = 0;
  const features: Record<string, any> = {};

  // 1. Récupérer profil utilisateur
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("balance, campus, created_at")
    .eq("id", userId)
    .single();

  if (!userProfile) {
    throw new Error("User profile not found");
  }

  features.user_balance = parseFloat(userProfile.balance);
  features.user_campus = userProfile.campus;
  features.user_age_days = Math.floor(
    (Date.now() - new Date(userProfile.created_at).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  // 2. Récupérer historique transactions (dernières 30 jours)
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data: recentTransactions } = await supabase
    .from("transactions")
    .select("*")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .gte("created_at", thirtyDaysAgo)
    .order("created_at", { ascending: false })
    .limit(100);

  features.transaction_count_30d = recentTransactions?.length || 0;

  // Calcul des statistiques utilisateur pour le ML
  if (recentTransactions && recentTransactions.length > 0) {
    const amounts = recentTransactions
      .map((tx) => tx.amount)
      .filter((a) => a > 0);

    if (amounts.length > 0) {
      // Moyenne des montants
      features.user_avg_amount =
        amounts.reduce((sum, a) => sum + a, 0) / amounts.length;

      // Écart-type des montants
      const variance =
        amounts.reduce(
          (sum, a) => sum + Math.pow(a - features.user_avg_amount, 2),
          0,
        ) / amounts.length;
      features.user_std_amount = Math.sqrt(variance);

      // Déviation du montant actuel
      features.amount_deviation = Math.abs(
        transaction.amount - features.user_avg_amount,
      );

      // Nombre de transactions utilisateur (pour ML)
      features.user_tx_count = amounts.length;

      // Ratio de fraude utilisateur (nombre de transactions échouées/bloquées)
      const fraudCount = recentTransactions.filter(
        (tx) => tx.status === "failed" || tx.fraud_score > 70,
      ).length;
      features.user_fraud_ratio = fraudCount / recentTransactions.length;
    } else {
      features.user_avg_amount = 0;
      features.user_std_amount = 0;
      features.amount_deviation = 0;
      features.user_tx_count = 0;
      features.user_fraud_ratio = 0;
    }
  } else {
    features.user_avg_amount = 0;
    features.user_std_amount = 0;
    features.amount_deviation = 0;
    features.user_tx_count = 0;
    features.user_fraud_ratio = 0;
  }

  // ==================== RÈGLES HEURISTIQUES ENRICHIES ====================

  // 3. Analyse des montants (avec seuils par type)
  const transactionType =
    transaction.transaction_type || mapOldTypeToNew(transaction.type);
  const amountThresholds = getAmountThresholds(transactionType);

  if (transaction.amount > amountThresholds.high) {
    const points = 25;
    riskScore += points;
    reasons.push({
      factor: "amount_high",
      description: `Montant très élevé (${transaction.amount} > ${amountThresholds.high} pour type ${transactionType})`,
      weight: FEATURE_WEIGHTS.amount_high,
      severity: "high",
    });
    features.amount_high = 1;
  } else if (transaction.amount > amountThresholds.medium) {
    const points = 15;
    riskScore += points;
    reasons.push({
      factor: "amount_medium",
      description: `Montant élevé (${transaction.amount} > ${amountThresholds.medium})`,
      weight: FEATURE_WEIGHTS.amount_high * 0.6,
      severity: "medium",
    });
    features.amount_high = 0.6;
  }

  // 4. Ratio montant/solde
  const amountToBalanceRatio =
    userProfile.balance > 0 ? transaction.amount / userProfile.balance : 1;
  features.amount_to_balance_ratio = amountToBalanceRatio;

  if (amountToBalanceRatio > 0.8) {
    const points = 20;
    riskScore += points;
    reasons.push({
      factor: "balance_ratio",
      description: `Montant représente ${(amountToBalanceRatio * 100).toFixed(0)}% du solde`,
      weight: FEATURE_WEIGHTS.balance_ratio,
      severity: "high",
    });
  }

  // 5. Fréquence des transactions (velocity)
  const last24h =
    recentTransactions?.filter(
      (tx) =>
        new Date(tx.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000,
    ) || [];
  features.transaction_count_24h = last24h.length;

  if (last24h.length > 20) {
    const points = 20;
    riskScore += points;
    reasons.push({
      factor: "frequency_high",
      description: `${last24h.length} transactions en 24h (vélocité élevée)`,
      weight: FEATURE_WEIGHTS.frequency_high,
      severity: "high",
    });
  } else if (last24h.length > 10) {
    const points = 10;
    riskScore += points;
    reasons.push({
      factor: "frequency_medium",
      description: `${last24h.length} transactions en 24h`,
      weight: FEATURE_WEIGHTS.frequency_high * 0.5,
      severity: "medium",
    });
  }

  // 6. NOUVEAU: Analyse géographique
  if (transaction.country) {
    features.country = transaction.country;

    // Pays à haut risque
    if (HIGH_RISK_COUNTRIES.includes(transaction.country)) {
      const points = 15;
      riskScore += points;
      reasons.push({
        factor: "country_high_risk",
        description: `Transaction depuis un pays à haut risque (${transaction.country})`,
        weight: FEATURE_WEIGHTS.country_high_risk,
        severity: "high",
      });
      features.country_high_risk = 1;
    }

    // Changement de pays récent
    const lastCountry = recentTransactions?.find((tx) => tx.country)?.country;
    if (lastCountry && lastCountry !== transaction.country) {
      const lastTxTime = recentTransactions?.find(
        (tx) => tx.country,
      )?.created_at;
      const hoursSince = lastTxTime
        ? (Date.now() - new Date(lastTxTime).getTime()) / (1000 * 60 * 60)
        : 999;

      if (hoursSince < 6) {
        const points = 12;
        riskScore += points;
        reasons.push({
          factor: "location_changed",
          description: `Changement de pays récent (${lastCountry} → ${transaction.country} en ${hoursSince.toFixed(1)}h)`,
          weight: FEATURE_WEIGHTS.location_changed,
          severity: "medium",
        });
        features.location_changed = 1;
      }
    }

    // Multiple localisations récentes
    const uniqueCountries = new Set(
      recentTransactions
        ?.filter(
          (tx) =>
            tx.created_at >
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        )
        .map((tx) => tx.country)
        .filter(Boolean),
    );
    features.unique_countries_7d = uniqueCountries.size;

    if (uniqueCountries.size > 3) {
      const points = 10;
      riskScore += points;
      reasons.push({
        factor: "multiple_locations",
        description: `Transactions depuis ${uniqueCountries.size} pays différents en 7 jours`,
        weight: FEATURE_WEIGHTS.multiple_locations,
        severity: "medium",
      });
    }
  }

  // 7. NOUVEAU: Analyse device
  if (transaction.device_info?.device_id) {
    features.device_id = transaction.device_info.device_id;

    // Changement d'appareil
    const lastDeviceId = recentTransactions?.find(
      (tx) => tx.device_info?.device_id,
    )?.device_info?.device_id;
    if (lastDeviceId && lastDeviceId !== transaction.device_info.device_id) {
      const lastDeviceTime = recentTransactions?.find(
        (tx) => tx.device_info?.device_id,
      )?.created_at;
      const hoursSince = lastDeviceTime
        ? (Date.now() - new Date(lastDeviceTime).getTime()) / (1000 * 60 * 60)
        : 999;

      if (hoursSince < 24) {
        const points = 12;
        riskScore += points;
        reasons.push({
          factor: "device_changed",
          description: `Changement d'appareil récent (${hoursSince.toFixed(1)}h)`,
          weight: FEATURE_WEIGHTS.device_changed,
          severity: "medium",
        });
        features.device_changed = 1;
      }
    }

    // Multiple devices
    const uniqueDevices = new Set(
      recentTransactions
        ?.filter(
          (tx) =>
            tx.created_at >
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        )
        .map((tx) => tx.device_info?.device_id)
        .filter(Boolean),
    );
    features.unique_devices_7d = uniqueDevices.size;

    if (uniqueDevices.size > 3) {
      const points = 10;
      riskScore += points;
      reasons.push({
        factor: "multiple_devices",
        description: `${uniqueDevices.size} appareils différents utilisés en 7 jours`,
        weight: FEATURE_WEIGHTS.multiple_devices,
        severity: "medium",
      });
    }
  }

  // 8. NOUVEAU: Analyse temporelle enrichie
  const currentHour = new Date().getHours();
  features.transaction_hour = currentHour;

  // Transactions à heures inhabituelles (2h-6h du matin)
  if (currentHour >= 2 && currentHour <= 6) {
    const nightTxCount =
      recentTransactions?.filter((tx) => {
        const hour = new Date(tx.created_at).getHours();
        return hour >= 2 && hour <= 6;
      }).length || 0;

    if (nightTxCount < 3) {
      // Inhabituel si l'utilisateur ne fait pas souvent ça
      const points = 8;
      riskScore += points;
      reasons.push({
        factor: "time_unusual",
        description: `Transaction à heure inhabituelle (${currentHour}h)`,
        weight: FEATURE_WEIGHTS.time_unusual,
        severity: "low",
      });
    }
  }

  // 9. NOUVEAU: Analyse provider
  if (transaction.provider) {
    features.provider = transaction.provider;

    // Rechercher transactions échouées récentes sur ce provider
    const failedOnProvider =
      recentTransactions?.filter(
        (tx) =>
          tx.provider === transaction.provider &&
          tx.status === "failed" &&
          new Date(tx.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000,
      ).length || 0;

    features.failed_attempts_24h = failedOnProvider;

    if (failedOnProvider >= 3) {
      const points = 15;
      riskScore += points;
      reasons.push({
        factor: "failed_attempts",
        description: `${failedOnProvider} tentatives échouées récentes sur ${transaction.provider}`,
        weight: FEATURE_WEIGHTS.failed_attempts,
        severity: "high",
      });
    }
  }

  // 10. NOUVEAU: Analyse de direction (money mule detection)
  if (transaction.direction) {
    features.direction = transaction.direction;

    if (transaction.direction === "incoming") {
      const incomingCount24h = last24h.filter(
        (tx) => tx.direction === "incoming",
      ).length;
      const totalAmount24h = last24h
        .filter((tx) => tx.direction === "incoming")
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

      features.incoming_count_24h = incomingCount24h;
      features.incoming_amount_24h = totalAmount24h;

      // Trop de incoming en peu de temps (money mule pattern)
      if (incomingCount24h > 10 && totalAmount24h > 5000) {
        const points = 18;
        riskScore += points;
        reasons.push({
          factor: "money_mule_pattern",
          description: `Pattern suspect: ${incomingCount24h} réceptions (${totalAmount24h} EPC) en 24h`,
          weight: 0.15,
          severity: "high",
        });
      }
    }
  }

  // 11. Nouveau destinataire (pour P2P)
  if (transaction.recipientId && transaction.type === "transfer") {
    const previousToRecipient =
      recentTransactions?.filter(
        (tx) => tx.receiver_id === transaction.recipientId,
      ).length || 0;

    features.previous_tx_to_recipient = previousToRecipient;

    if (previousToRecipient === 0) {
      const points = 10;
      riskScore += points;
      reasons.push({
        factor: "new_recipient",
        description: "Premier transfert vers ce destinataire",
        weight: FEATURE_WEIGHTS.new_recipient,
        severity: "medium",
      });
    }
  }

  // 12. Compte jeune (nouveau)
  if (features.user_age_days < 7) {
    const points = 12;
    riskScore += points;
    reasons.push({
      factor: "account_new",
      description: `Compte créé il y a ${features.user_age_days} jours`,
      weight: 0.1,
      severity: "medium",
    });
  }

  // 13. Appeler modèle ML externe (Hugging Face) - avec features enrichies
  // Sauvegarder le score heuristique brut avant mélange
  const heuristicScoreRaw = riskScore;
  features.heuristic_score_raw = heuristicScoreRaw;

  try {
    const mlFeatures = buildMLFeatures(
      transaction,
      features,
      userProfile,
      riskScore,
    );
    const mlScore = await callMLModel(mlFeatures);

    // NOUVEAU: Enrichir les logs ML pour traçabilité complète
    features.ml_score = mlScore;
    features.ml_active = true;
    features.ml_model_endpoint =
      Deno.env.get("HUGGINGFACE_ENDPOINT_URL") || "Inference API";
    features.ml_model_id =
      Deno.env.get("HUGGINGFACE_MODEL_ID") ||
      "QuentinJassey/epicoin-fraud-detection-enriched";
    features.ml_features_sent = mlFeatures; // Les 17 features envoyées au modèle (sans fraud_score ni status)
    features.ml_timestamp = new Date().toISOString();

    // Mixer score règles + ML avec les poids configurés dynamiquement
    // Le modèle ML fonctionne bien pour détecter les fraudes évidentes
    // Pour les transactions normales, il est conservateur (0.1-1% fraude) ce qui est correct
    riskScore = Math.round(
      heuristicScoreRaw * config.heuristic_weight + mlScore * config.ml_weight,
    );
    features.final_score = riskScore;
    features.ml_weight = config.ml_weight;
    features.heuristic_weight = config.heuristic_weight;

    console.log(
      "[ML] Scores - Heuristic:",
      heuristicScoreRaw,
      "ML:",
      mlScore,
      "Final:",
      riskScore,
    );
    console.log(
      "[ML] Weights used - ML:",
      config.ml_weight,
      "Heuristic:",
      config.heuristic_weight,
    );
    console.log(
      "[Fraud Detection Enhanced] ML model active, mixed score:",
      riskScore,
    );
  } catch (error) {
    console.warn(
      "[Fraud Detection Enhanced] ML model unavailable, using rules only:",
      error.message,
    );
    features.ml_active = false;
    features.ml_error = error.message;
    features.heuristic_score_raw = heuristicScoreRaw;
    features.final_score = riskScore;
  }

  // 14. Décision finale avec seuils configurables
  let decision: FraudAnalysis["decision"];
  if (riskScore <= config.threshold_approve) {
    decision = "approve";
  } else if (riskScore <= config.threshold_review) {
    decision = "review";
  } else {
    decision = "block";
  }

  console.log(
    "[Fraud Decision] Thresholds - Approve:",
    config.threshold_approve,
    "Review:",
    config.threshold_review,
  );
  console.log(
    "[Fraud Decision] Final decision:",
    decision,
    "with score:",
    riskScore,
  );

  // S'assurer que le score est entre 0 et 100
  riskScore = Math.max(0, Math.min(100, riskScore));

  // Trier et garder top 5 raisons
  const topReasons = reasons.sort((a, b) => b.weight - a.weight).slice(0, 5);

  // IMPORTANT: Sauvegarder les reasons dans features pour traçabilité complète
  features.reasons = topReasons;
  features.heuristic_score = heuristicScoreRaw; // Score heuristique final (pas raw)
  features.decision = decision;
  features.decision_thresholds = {
    approve: config.threshold_approve,
    review: config.threshold_review,
  };

  return {
    riskScore,
    decision,
    reasons: topReasons,
    features,
  };
}

// Helper: Mapper anciens types vers nouveaux types normalisés
function mapOldTypeToNew(oldType?: string): string {
  const mapping: Record<string, string> = {
    topup: "CASHIN",
    transfer: "P2P",
    purchase: "MERCHANT",
    intercampus: "INTERCAMPUS",
  };
  return oldType ? mapping[oldType] || oldType : "P2P";
}

// Helper: Obtenir les seuils de montant par type de transaction
function getAmountThresholds(transactionType?: string) {
  const thresholds: Record<string, { high: number; medium: number }> = {
    CASHIN: { high: 5000, medium: 2000 },
    P2P: { high: 1000, medium: 500 },
    MERCHANT: { high: 500, medium: 200 },
    INTERCAMPUS: { high: 2000, medium: 1000 },
    CASHOUT: { high: 2000, medium: 1000 },
  };
  return thresholds[transactionType || "P2P"] || thresholds["P2P"];
}

// Helper: Construire features pour le modèle ML INDÉPENDANT (sans fraud_score ni status)
function buildMLFeatures(
  transaction: EnrichedTransactionPayload,
  features: Record<string, any>,
  userProfile: any,
  riskScore: number,
) {
  // Créer le vecteur de 17 features (SANS fraud_score heuristique ni status)
  // Le modèle indépendant apprend des patterns sans biais circulaire ni data leakage
  const now = new Date();
  const created = transaction.created_at
    ? new Date(transaction.created_at)
    : now;
  const executed = transaction.executed_at
    ? new Date(transaction.executed_at)
    : now;

  const mlFeatures = [
    // 1. amount_numeric
    transaction.amount || 0,

    // ❌ RETIRÉ : fraud_score (pour éviter dépendance circulaire)

    // 2. hour
    created.getHours(),

    // 3. day_of_week (0 = lundi, 6 = dimanche)
    created.getDay(),

    // 4. execution_delay (en secondes)
    Math.abs(executed.getTime() - created.getTime()) / 1000,

    // 5. transaction_type_encoded
    encodeTransactionType(
      transaction.transaction_type || mapOldTypeToNew(transaction.type),
    ),

    // 6. direction_encoded (0 = outgoing, 1 = incoming)
    transaction.direction === "incoming" ? 1 : 0,

    // 7. country_encoded
    encodeCountry(transaction.country),

    // 8. city_encoded (simplification : utiliser un hash du nom de ville)
    encodeCitySimple(transaction.city),

    // 9. provider_encoded
    encodeProvider(transaction.provider),

    // ❌ RETIRÉ : status (data leakage - on ne connaît status qu'APRÈS la transaction)

    // 10. os_name_encoded
    encodeOSName(transaction.device_info?.os_name),

    // 11. type_encoded (0 = topup, 1 = transfer, 2 = purchase)
    encodeTypeOld(transaction.type),

    // 12. user_avg_amount
    features.user_avg_amount || 0,

    // 13. user_std_amount
    features.user_std_amount || 0,

    // 14. user_tx_count
    features.transaction_count_24h || features.user_tx_count || 0,

    // 15. user_fraud_ratio
    features.user_fraud_ratio || 0,

    // 16. amount_deviation
    features.amount_deviation || 0,

    // 17. device_tx_count
    features.device_tx_count || 1,
  ];

  // LOG DÉTAILLÉ pour debug (17 features)
  console.log(
    "[ML Features] Détails (17 features - sans fraud_score ni status):",
    {
      amount: mlFeatures[0],
      hour: mlFeatures[1],
      day_of_week: mlFeatures[2],
      execution_delay: mlFeatures[3],
      transaction_type: mlFeatures[4],
      direction: mlFeatures[5],
      country: mlFeatures[6],
      city: mlFeatures[7],
      provider: mlFeatures[8],
      // status: RETIRÉ (data leakage)
      os_name: mlFeatures[9],
      type_old: mlFeatures[10],
      user_avg_amount: mlFeatures[11],
      user_std_amount: mlFeatures[12],
      user_tx_count: mlFeatures[13],
      user_fraud_ratio: mlFeatures[14],
      amount_deviation: mlFeatures[15],
      device_tx_count: mlFeatures[16],
    },
  );

  return mlFeatures;
}

// Encodage pour ML
function encodeTransactionType(type?: string): number {
  const encoding: Record<string, number> = {
    P2P: 1,
    MERCHANT: 2,
    CASHIN: 3,
    CASHOUT: 4,
    INTERCAMPUS: 5,
  };
  return encoding[type || "P2P"] || 1;
}

function encodeCountry(country?: string): number {
  // Encoder les pays (simplification - en production utiliser un encoding plus sophistiqué)
  if (!country) return 0;
  if (HIGH_RISK_COUNTRIES.includes(country)) return 2;
  return 1;
}

function encodeProvider(provider?: string): number {
  const encoding: Record<string, number> = {
    stripe: 1,
    wallet: 2,
    intercampus: 3,
  };
  return encoding[provider || "wallet"] || 2;
}

function encodeCitySimple(city?: string): number {
  // Simplification : hash du nom de ville en nombre
  if (!city) return 0;
  let hash = 0;
  for (let i = 0; i < city.length; i++) {
    hash = (hash << 5) - hash + city.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash % 1000); // Limiter à 0-999
}

function encodeStatus(status?: string): number {
  const encoding: Record<string, number> = {
    completed: 0,
    pending: 1,
    failed: 2,
  };
  return encoding[status || "completed"] || 0;
}

function encodeOSName(osName?: string): number {
  if (!osName) return 0;
  const encoding: Record<string, number> = {
    iOS: 1,
    Android: 2,
    Windows: 3,
    macOS: 4,
    Linux: 5,
    unknown: 0,
  };
  return encoding[osName] || 0;
}

function encodeTypeOld(type?: string): number {
  const encoding: Record<string, number> = {
    topup: 0,
    transfer: 1,
    purchase: 2,
    intercampus: 3,
  };
  return encoding[type || "transfer"] || 1;
}

// Appel au modèle ML enrichi (Hugging Face)
async function callMLModel(features: number[]): Promise<number> {
  const HF_API_KEY = Deno.env.get("HUGGINGFACE_API_KEY");
  const HF_ENDPOINT_URL = Deno.env.get("HUGGINGFACE_ENDPOINT_URL");
  const HF_MODEL_ID =
    Deno.env.get("HUGGINGFACE_MODEL_ID") ||
    "QuentinJassey/epicoin-fraud-detection-enriched";

  // Utiliser l'Inference Endpoint si disponible, sinon l'API Inference standard
  const HF_MODEL_URL =
    HF_ENDPOINT_URL ||
    `https://api-inference.huggingface.co/models/${HF_MODEL_ID}`;

  if (!HF_API_KEY) {
    throw new Error("HUGGINGFACE_API_KEY not configured");
  }

  console.log(
    "[ML] Using endpoint:",
    HF_ENDPOINT_URL ? "Dedicated Endpoint" : "Inference API",
  );

  console.log(
    "[ML] Calling Hugging Face with 17 features (SANS fraud_score ni status):",
    features.length,
  );

  const response = await fetch(HF_MODEL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: features, // Array de 19 nombres
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[ML] Hugging Face error:", response.status, errorText);
    throw new Error(`ML model returned ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  console.log("[ML] Hugging Face response:", JSON.stringify(result));

  // Le modèle enrichi retourne : { fraud_score: number, fraud_probability: number, is_fraud: boolean }
  const fraudScore = result?.fraud_score || result[0]?.fraud_score || 0;

  return fraudScore;
}
