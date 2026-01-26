#!/usr/bin/env python3
"""
Test du modèle avec les features EXACTES des logs Supabase
"""

import pickle
import numpy as np
from huggingface_hub import hf_hub_download

# Configuration
REPO_ID = "QuentinJassey/epicoin-fraud-detection-enriched"

print("=" * 80)
print("🧪 Test du Modèle avec Features EXACTES des Logs")
print("=" * 80)
print()

# Charger le modèle INDEPENDENT
print("📥 Chargement du modèle indépendant...")
try:
    model_path = hf_hub_download(repo_id=REPO_ID, filename="fraud_model_independent.pkl")
    scaler_path = hf_hub_download(repo_id=REPO_ID, filename="scaler_independent.pkl")
    
    with open(model_path, 'rb') as f:
        model = pickle.load(f)
    with open(scaler_path, 'rb') as f:
        scaler = pickle.load(f)
    
    print("✅ Modèle INDEPENDENT chargé")
except Exception as e:
    print(f"❌ Erreur chargement modèle independent: {e}")
    print("Tentative avec l'ancien modèle...")
    
    model_path = hf_hub_download(repo_id=REPO_ID, filename="fraud_model_enriched.pkl")
    scaler_path = hf_hub_download(repo_id=REPO_ID, filename="scaler_enriched.pkl")
    
    with open(model_path, 'rb') as f:
        model = pickle.load(f)
    with open(scaler_path, 'rb') as f:
        scaler = pickle.load(f)
    
    print("⚠️  Modèle ENRICHED (ancien) chargé")

print()

# Features EXACTES des logs Supabase
print("📊 Test avec features EXACTES des logs...")
print()

# Transaction 1 : Top-up 115 EPC
features_tx1 = np.array([[
    115,        # amount
    15,         # hour
    1,          # day_of_week
    0,          # execution_delay
    3,          # transaction_type
    1,          # direction
    1,          # country
    136,        # city
    1,          # provider
    0,          # status
    1,          # os_name
    1,          # type_old
    270.95,     # user_avg_amount
    185.33,     # user_std_amount
    18,         # user_tx_count
    0.1,        # user_fraud_ratio
    155.95,     # amount_deviation
    1           # device_tx_count
]])

# Transaction 2 : Achat 500 EPC
features_tx2 = np.array([[
    500,        # amount
    15,         # hour
    1,          # day_of_week
    0.388,      # execution_delay
    2,          # transaction_type
    0,          # direction
    1,          # country
    136,        # city
    2,          # provider
    0,          # status
    1,          # os_name
    1,          # type_old
    263.52,     # user_avg_amount
    183.89,     # user_std_amount
    19,         # user_tx_count
    0.095,      # user_fraud_ratio
    236.48,     # amount_deviation
    1           # device_tx_count
]])

print("1️⃣  Transaction 1 : Top-up 115 EPC")
print(f"   Features (18) : {features_tx1[0][:5]}... (18 au total)")
print()

# Test SANS normalisation (pour voir)
try:
    proba_raw = model.predict_proba(features_tx1)[0][1]
    print(f"   Sans normalisation : {proba_raw:.6f} ({int(proba_raw * 100)}/100)")
except Exception as e:
    print(f"   Sans normalisation : Erreur - {e}")

# Test AVEC normalisation (comme le handler)
features_tx1_scaled = scaler.transform(features_tx1)
print(f"   Features après normalisation : min={features_tx1_scaled.min():.2f}, max={features_tx1_scaled.max():.2f}")
proba_scaled = model.predict_proba(features_tx1_scaled)[0][1]
fraud_score = int(proba_scaled * 100)
print(f"   ✅ Avec normalisation : {proba_scaled:.6f} ({fraud_score}/100)")
print()

print("2️⃣  Transaction 2 : Achat 500 EPC")
print(f"   Features (18) : {features_tx2[0][:5]}... (18 au total)")
print()

# Test SANS normalisation
try:
    proba_raw = model.predict_proba(features_tx2)[0][1]
    print(f"   Sans normalisation : {proba_raw:.6f} ({int(proba_raw * 100)}/100)")
except Exception as e:
    print(f"   Sans normalisation : Erreur - {e}")

# Test AVEC normalisation
features_tx2_scaled = scaler.transform(features_tx2)
print(f"   Features après normalisation : min={features_tx2_scaled.min():.2f}, max={features_tx2_scaled.max():.2f}")
proba_scaled2 = model.predict_proba(features_tx2_scaled)[0][1]
fraud_score2 = int(proba_scaled2 * 100)
print(f"   ✅ Avec normalisation : {proba_scaled2:.6f} ({fraud_score2}/100)")
print()

print("=" * 80)
print("📊 Analyse")
print("=" * 80)
print()

# Comparer avec les logs Supabase
print("Résultats Hugging Face (logs) :")
print("  Transaction 1 : 0.000211 (0/100)")
print("  Transaction 2 : 0.000267 (0/100)")
print()

print("Résultats Locaux (ce test) :")
print(f"  Transaction 1 : {proba_scaled:.6f} ({fraud_score}/100)")
print(f"  Transaction 2 : {proba_scaled2:.6f} ({fraud_score2}/100)")
print()

if abs(proba_scaled - 0.000211) < 0.0001:
    print("✅ Les résultats CORRESPONDENT ! Le modèle sur HF fonctionne correctement.")
    print()
    print("🔍 Le problème est que le modèle retourne vraiment des probabilités")
    print("   très faibles pour ces transactions (ce qui est attendu si elles")
    print("   sont légitimes).")
    print()
    print("💡 Solutions :")
    print("   1. Vérifier que le modèle a bien été entraîné avec 5000 transactions")
    print("   2. Tester avec une transaction VRAIMENT frauduleuse (10000 EPC, etc.)")
    print("   3. Réentraîner le modèle si nécessaire")
else:
    print("❌ Les résultats NE CORRESPONDENT PAS !")
    print()
    print("🔍 Causes possibles :")
    print("   1. Le modèle sur HF n'est pas le bon (pas le *_independent.pkl)")
    print("   2. Le scaler sur HF n'est pas le bon")
    print("   3. Le handler sur HF utilise encore l'ancien modèle")
    print()
    print("💡 Solution : Vérifier les fichiers sur HF :")
    print("   https://huggingface.co/QuentinJassey/epicoin-fraud-detection-enriched/tree/main")

# Vérifier les features importantes du modèle
if hasattr(model, 'feature_importances_'):
    print()
    print("=" * 80)
    print("📊 Top 5 Features Importantes du Modèle")
    print("=" * 80)
    
    feature_names = [
        'amount', 'hour', 'day_of_week', 'execution_delay', 'transaction_type',
        'direction', 'country', 'city', 'provider', 'status', 'os_name',
        'type_old', 'user_avg_amount', 'user_std_amount', 'user_tx_count',
        'user_fraud_ratio', 'amount_deviation', 'device_tx_count'
    ]
    
    importance = model.feature_importances_
    feature_importance = sorted(zip(feature_names, importance), key=lambda x: x[1], reverse=True)
    
    for i, (feat, imp) in enumerate(feature_importance[:5], 1):
        print(f"  {i}. {feat:25s}: {imp:.4f}")

print()
print("=" * 80)
print("✅ Test Terminé")
print("=" * 80)
