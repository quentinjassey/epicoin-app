#!/usr/bin/env python3
"""
Script de test du modèle ML en local
Télécharge le modèle depuis Hugging Face et teste avec les vraies features
"""

import pickle
import numpy as np
from huggingface_hub import hf_hub_download

# Configuration
REPO_ID = "QuentinJassey/epicoin-fraud-detection-enriched"
MODEL_FILE = "fraud_model_enriched.pkl"
SCALER_FILE = "scaler_enriched.pkl"
ENCODERS_FILE = "label_encoders_enriched.pkl"

print("=" * 80)
print("🧪 Test du Modèle ML en Local")
print("=" * 80)

# 1. Télécharger les fichiers depuis Hugging Face
print("\n📥 Téléchargement du modèle depuis Hugging Face...")
model_path = hf_hub_download(repo_id=REPO_ID, filename=MODEL_FILE)
scaler_path = hf_hub_download(repo_id=REPO_ID, filename=SCALER_FILE)
encoders_path = hf_hub_download(repo_id=REPO_ID, filename=ENCODERS_FILE)
print(f"✅ Modèle téléchargé : {model_path}")

# 2. Charger le modèle, scaler et encoders
print("\n📂 Chargement du modèle...")
with open(model_path, 'rb') as f:
    model = pickle.load(f)

with open(scaler_path, 'rb') as f:
    scaler = pickle.load(f)

with open(encoders_path, 'rb') as f:
    encoders = pickle.load(f)

print(f"✅ Modèle chargé : {type(model)}")
print(f"✅ Scaler chargé : {type(scaler)}")

# 3. Vérifier le scaler
print("\n🔬 Analyse du Scaler...")
print(f"Scaler mean_ : {scaler.mean_}")
print(f"Scaler scale_ : {scaler.scale_}")
print(f"Scaler var_ : {scaler.var_}")

# Vérifier si certaines features ont une variance nulle (problème !)
zero_var_features = np.where(scaler.scale_ < 0.01)[0]
if len(zero_var_features) > 0:
    print(f"\n⚠️  PROBLÈME : {len(zero_var_features)} features ont une variance quasi-nulle !")
    print(f"Features problématiques : {zero_var_features}")
else:
    print("✅ Toutes les features ont une variance suffisante")

# 4. Tester avec les features des logs Supabase
print("\n" + "=" * 80)
print("🧪 Test avec Features Réelles des Logs Supabase")
print("=" * 80)

# Features de la transaction 1 : Top-up 300 EPC
features_tx1 = np.array([
    [300, 30, 14, 1, 0, 3, 1, 1, 136, 1, 0, 1, 1, 269.42, 190.02, 17, 0.105, 30.58, 1]
])

# Features de la transaction 2 : Achat 500 EPC
features_tx2 = np.array([
    [500, 45, 14, 1, 2.288, 2, 0, 1, 136, 2, 0, 1, 1, 256.61, 187.07, 16, 0.111, 243.39, 1]
])

# Features d'une transaction clairement frauduleuse (test)
features_fraud = np.array([
    [10000, 95, 3, 6, 300, 4, 0, 2, 999, 3, 1, 2, 2, 100, 50, 2, 0.5, 9900, 10]
])

print("\n1️⃣  Test Transaction 1 (Top-up 300 EPC)")
print(f"Features brutes : {features_tx1[0][:5]}... (19 au total)")

# Test SANS normalisation (pour voir)
proba_raw = model.predict_proba(features_tx1)[0][1]
print(f"❌ Sans normalisation : {proba_raw:.6f} (probablement faux)")

# Test AVEC normalisation
features_tx1_scaled = scaler.transform(features_tx1)
proba_scaled = model.predict_proba(features_tx1_scaled)[0][1]
print(f"✅ Avec normalisation : {proba_scaled:.6f}")
print(f"   Score ML : {int(proba_scaled * 100)}/100")

print("\n2️⃣  Test Transaction 2 (Achat 500 EPC)")
print(f"Features brutes : {features_tx2[0][:5]}... (19 au total)")
features_tx2_scaled = scaler.transform(features_tx2)
proba_scaled2 = model.predict_proba(features_tx2_scaled)[0][1]
print(f"✅ Avec normalisation : {proba_scaled2:.6f}")
print(f"   Score ML : {int(proba_scaled2 * 100)}/100")

print("\n3️⃣  Test Transaction Frauduleuse (10000 EPC, score heuristique 95)")
print(f"Features brutes : {features_fraud[0][:5]}... (19 au total)")
features_fraud_scaled = scaler.transform(features_fraud)
proba_fraud = model.predict_proba(features_fraud_scaled)[0][1]
print(f"✅ Avec normalisation : {proba_fraud:.6f}")
print(f"   Score ML : {int(proba_fraud * 100)}/100")

# 5. Comparaison
print("\n" + "=" * 80)
print("📊 Analyse des Résultats")
print("=" * 80)

print(f"\nTransaction 1 (légitime) : {proba_scaled:.6f}")
print(f"Transaction 2 (moyenne)  : {proba_scaled2:.6f}")
print(f"Transaction 3 (fraude)   : {proba_fraud:.6f}")

if proba_scaled == proba_scaled2 == proba_fraud:
    print("\n❌ PROBLÈME CONFIRMÉ : Le modèle retourne la MÊME probabilité pour toutes les transactions !")
    print("\n🔍 Causes possibles :")
    print("   1. Le scaler a des variances nulles → toutes les features normalisées sont identiques")
    print("   2. Le modèle a été sur-entraîné sur des données trop homogènes")
    print("   3. Une erreur dans la normalisation")
    print("\n✅ SOLUTION : Réentraîner le modèle avec des données plus variées")
else:
    print("\n✅ Le modèle FONCTIONNE : Il retourne des probabilités différentes !")
    print("\n🔍 Le problème est donc dans l'API Hugging Face (handler.py)")

# 6. Vérifier la distribution des features normalisées
print("\n" + "=" * 80)
print("🔬 Distribution des Features Normalisées")
print("=" * 80)

print("\nTransaction 1 normalisée :")
print(f"Min : {features_tx1_scaled.min():.4f}")
print(f"Max : {features_tx1_scaled.max():.4f}")
print(f"Mean: {features_tx1_scaled.mean():.4f}")
print(f"Std : {features_tx1_scaled.std():.4f}")

print("\nTransaction 2 normalisée :")
print(f"Min : {features_tx2_scaled.min():.4f}")
print(f"Max : {features_tx2_scaled.max():.4f}")
print(f"Mean: {features_tx2_scaled.mean():.4f}")
print(f"Std : {features_tx2_scaled.std():.4f}")

# Vérifier si les features normalisées sont identiques
if np.allclose(features_tx1_scaled, features_tx2_scaled, atol=0.1):
    print("\n⚠️  Les features normalisées sont PRESQUE IDENTIQUES malgré des features brutes différentes !")
    print("→ Le scaler écrase les différences → Le modèle ne peut pas distinguer les transactions")
else:
    print("\n✅ Les features normalisées sont DIFFÉRENTES → Le modèle devrait pouvoir les distinguer")

print("\n" + "=" * 80)
print("✅ Test Terminé")
print("=" * 80)
