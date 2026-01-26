#!/usr/bin/env python3
"""
Test du modèle ML avec différents scénarios de fraude
"""

import pickle
import numpy as np
from huggingface_hub import hf_hub_download

# Configuration
REPO_ID = "QuentinJassey/epicoin-fraud-detection-enriched"

print("=" * 80)
print("🧪 Test de Détection de Fraude - Scénarios Variés")
print("=" * 80)

# Charger le modèle
print("\n📥 Chargement du modèle...")
model_path = hf_hub_download(repo_id=REPO_ID, filename="fraud_model_enriched.pkl")
scaler_path = hf_hub_download(repo_id=REPO_ID, filename="scaler_enriched.pkl")

with open(model_path, 'rb') as f:
    model = pickle.load(f)
with open(scaler_path, 'rb') as f:
    scaler = pickle.load(f)

print("✅ Modèle chargé")

# Définir les scénarios de test
scenarios = [
    {
        "name": "Transaction Normale - Top-up 50 EPC",
        "features": [50, 10, 14, 1, 0, 3, 1, 1, 136, 1, 0, 1, 1, 250, 150, 15, 0.05, 200, 1],
        "expected": "légitime"
    },
    {
        "name": "Transaction Normale - Achat 100 EPC",
        "features": [100, 15, 12, 3, 1, 2, 0, 1, 136, 2, 0, 1, 2, 250, 150, 15, 0.05, 150, 1],
        "expected": "légitime"
    },
    {
        "name": "Transaction Suspecte - Montant Élevé 1000 EPC",
        "features": [1000, 40, 14, 1, 0, 2, 0, 1, 136, 2, 0, 1, 2, 250, 150, 15, 0.05, 750, 1],
        "expected": "suspect (moyen)"
    },
    {
        "name": "Transaction Suspecte - Déviation Importante 800 EPC",
        "features": [800, 35, 14, 1, 0, 2, 0, 1, 136, 2, 0, 1, 2, 100, 50, 15, 0.05, 700, 1],
        "expected": "suspect (moyen)"
    },
    {
        "name": "Transaction Suspecte - Score Heuristique Élevé",
        "features": [500, 65, 3, 6, 100, 2, 0, 2, 999, 3, 1, 2, 2, 250, 150, 3, 0.2, 250, 5],
        "expected": "suspect (élevé)"
    },
    {
        "name": "FRAUDE - Montant Énorme 10000 EPC",
        "features": [10000, 95, 3, 6, 300, 4, 0, 2, 999, 3, 1, 2, 2, 100, 50, 2, 0.5, 9900, 10],
        "expected": "FRAUDE"
    },
    {
        "name": "FRAUDE - Nouveau Compte + Montant Élevé",
        "features": [5000, 85, 2, 0, 0, 2, 0, 2, 999, 2, 0, 2, 2, 0, 0, 1, 0, 5000, 1],
        "expected": "FRAUDE"
    },
    {
        "name": "FRAUDE - Vélocité Élevée + Pays Suspect",
        "features": [2000, 75, 3, 6, 200, 2, 0, 10, 999, 3, 1, 2, 2, 200, 100, 30, 0.4, 1800, 15],
        "expected": "FRAUDE"
    }
]

print("\n" + "=" * 80)
print("📊 Résultats des Tests")
print("=" * 80)

results = []

for i, scenario in enumerate(scenarios, 1):
    features = np.array([scenario["features"]])
    features_scaled = scaler.transform(features)
    proba = model.predict_proba(features_scaled)[0][1]
    score = int(proba * 100)
    
    # Déterminer le niveau de risque
    if score >= 70:
        risk_level = "🔴 BLOQUÉ"
    elif score >= 30:
        risk_level = "🟡 REVUE"
    else:
        risk_level = "🟢 APPROUVÉ"
    
    print(f"\n{i}. {scenario['name']}")
    print(f"   Attendu    : {scenario['expected']}")
    print(f"   ML Score   : {score}/100 ({proba:.4f})")
    print(f"   Heuristique: {scenario['features'][1]}/100")
    print(f"   Final      : {int(scenario['features'][1] * 0.6 + score * 0.4)}/100")
    print(f"   Décision   : {risk_level}")
    
    results.append({
        "scenario": scenario['name'],
        "ml_score": score,
        "heuristic": scenario['features'][1],
        "final": int(scenario['features'][1] * 0.6 + score * 0.4)
    })

# Analyse des résultats
print("\n" + "=" * 80)
print("📈 Analyse Globale")
print("=" * 80)

ml_scores = [r['ml_score'] for r in results]
print(f"\nScore ML Min  : {min(ml_scores)}/100")
print(f"Score ML Max  : {max(ml_scores)}/100")
print(f"Score ML Moyen: {sum(ml_scores)/len(ml_scores):.1f}/100")

# Compter les détections
legitimes = sum(1 for s in ml_scores if s < 30)
suspects = sum(1 for s in ml_scores if 30 <= s < 70)
fraudes = sum(1 for s in ml_scores if s >= 70)

print(f"\nRépartition ML:")
print(f"  🟢 Légitimes  : {legitimes}/{len(results)}")
print(f"  🟡 Suspects   : {suspects}/{len(results)}")
print(f"  🔴 Fraudes    : {fraudes}/{len(results)}")

# Vérifier si le modèle varie suffisamment
score_variance = np.var(ml_scores)
print(f"\nVariance des scores ML: {score_variance:.1f}")

if score_variance < 100:
    print("⚠️  ATTENTION : Faible variance → Le modèle distingue peu les transactions")
else:
    print("✅ Bonne variance → Le modèle distingue bien les transactions")

# Vérifier la corrélation avec l'heuristique
heuristic_scores = [r['heuristic'] for r in results]
correlation = np.corrcoef(ml_scores, heuristic_scores)[0, 1]
print(f"\nCorrélation ML vs Heuristique: {correlation:.2f}")

if correlation > 0.9:
    print("⚠️  Le ML suit trop l'heuristique (peu de valeur ajoutée)")
elif correlation > 0.6:
    print("✅ Le ML complète bien l'heuristique")
else:
    print("🔍 Le ML a une approche très différente de l'heuristique")

print("\n" + "=" * 80)
print("✅ Test Terminé")
print("=" * 80)
