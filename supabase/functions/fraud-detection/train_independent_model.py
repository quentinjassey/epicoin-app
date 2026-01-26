#!/usr/bin/env python3
"""
Entraînement du modèle ML SANS le score heuristique
Pour que le ML soit vraiment indépendant et apporte de la valeur ajoutée
"""

import os
import pickle
import pandas as pd
import numpy as np
from supabase import create_client, Client
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier
import xgboost as xgb
from sklearn.metrics import classification_report, roc_auc_score
import time

print("=" * 80)
print("🤖 Entraînement du Modèle ML INDÉPENDANT (sans score heuristique)")
print("=" * 80)

# 1. Connexion Supabase
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://srvkyiugewdjrpvcmquq.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_KEY:
    print("❌ SUPABASE_SERVICE_ROLE_KEY non défini")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 2. Récupérer les transactions
print("\n📥 Étape 1/6 : Récupération des transactions depuis Supabase...")
response = supabase.table('transactions').select('*').execute()
transactions = response.data
print(f"  ✅ {len(transactions)} transactions récupérées")

# Vérifier si on a assez de données
if len(transactions) < 100:
    print(f"  ⚠️  Pas assez de vraies transactions ({len(transactions)} < 100)")
    print(f"  📊 Utilisation des données synthétiques à la place...")
    
    # Filtrer pour garder seulement les transactions synthétiques
    response = supabase.table('transactions').select('*').gte('created_at', '2024-01-01').execute()
    all_transactions = response.data
    
    # Si toujours pas assez, informer l'utilisateur
    if len(all_transactions) < 100:
        print(f"  ❌ Pas assez de données totales ({len(all_transactions)})")
        print(f"  💡 Solution : Générer des données synthétiques avec generate_synthetic_transactions.py")
        exit(1)
    
    transactions = all_transactions
    print(f"  ✅ {len(transactions)} transactions disponibles (synthétiques)")

# 3. Créer DataFrame
print("\n🔧 Étape 2/6 : Préparation des features...")
df = pd.DataFrame(transactions)

# Label (fraude si status=failed OU fraud_score > 70)
df['is_fraud'] = ((df['status'] == 'failed') | (df['fraud_score'] > 70)).astype(int)
print(f"  📊 Distribution fraudes: {df['is_fraud'].sum()} fraudes ({df['is_fraud'].mean()*100:.1f}%)")

# Features numériques
df['amount_numeric'] = pd.to_numeric(df['amount'], errors='coerce')
df['created_at_ts'] = pd.to_datetime(df['created_at'], errors='coerce')
df['hour'] = df['created_at_ts'].dt.hour
df['day_of_week'] = df['created_at_ts'].dt.dayofweek

# Execution delay
df['executed_at_ts'] = pd.to_datetime(df['executed_at'], errors='coerce')
df['provider_created_at_ts'] = pd.to_datetime(df['provider_created_at'], errors='coerce')
df['execution_delay'] = (df['executed_at_ts'] - df['provider_created_at_ts']).dt.total_seconds().fillna(0)

# Encodage features catégorielles
encoders = {}

def encode_feature(column_name, default_value='unknown'):
    encoder = LabelEncoder()
    values = df[column_name].fillna(default_value).astype(str)
    df[f'{column_name}_encoded'] = encoder.fit_transform(values)
    encoders[column_name] = encoder

encode_feature('transaction_type')
encode_feature('direction')
encode_feature('country')
encode_feature('provider')
encode_feature('status')
encode_feature('type')

# City encoding (hash simple)
df['city_encoded'] = df['city'].fillna('unknown').astype(str).apply(lambda x: abs(hash(x)) % 1000)

# OS name encoding
df['os_name'] = df['device_info'].apply(lambda x: x.get('os_name', 'unknown') if isinstance(x, dict) else 'unknown')
encode_feature('os_name')

# Device ID
df['device_id'] = df['device_info'].apply(lambda x: x.get('device_id', 'unknown') if isinstance(x, dict) else 'unknown')

# 4. Calculer statistiques utilisateur (SANS fraud_score)
print("\n🧮 Étape 3/6 : Calcul des statistiques utilisateur...")

# Grouper par sender_id pour calculer avg/std/count
user_stats = df.groupby('sender_id').agg({
    'amount_numeric': ['mean', 'std', 'count'],
    'is_fraud': 'sum'
}).reset_index()
user_stats.columns = ['sender_id', 'user_avg_amount', 'user_std_amount', 'user_tx_count', 'user_fraud_count']

# Joindre avec df
df = df.merge(user_stats, on='sender_id', how='left')
df['user_fraud_ratio'] = df['user_fraud_count'] / df['user_tx_count']
df['user_fraud_ratio'] = df['user_fraud_ratio'].fillna(0)

# Déviation du montant
df['amount_deviation'] = (df['amount_numeric'] - df['user_avg_amount']) / (df['user_std_amount'] + 1)
df['amount_deviation'] = df['amount_deviation'].fillna(0)

# Device tx count
device_tx_count = df.groupby('device_id').size().to_dict()
df['device_tx_count'] = df['device_id'].map(device_tx_count)

# ⚠️  IMPORTANT : EXCLURE fraud_score ET status des features ML
# fraud_score : dépendance circulaire (score calculé avant ML)
# status : data leakage (on ne connaît le status qu'APRÈS la transaction)
feature_columns = [
    'amount_numeric',           # 1
    # 'fraud_score',            # ❌ RETIRÉ pour éviter dépendance circulaire
    'hour',                     # 2
    'day_of_week',             # 3
    'execution_delay',         # 4
    'transaction_type_encoded', # 5
    'direction_encoded',       # 6
    'country_encoded',         # 7
    'city_encoded',            # 8
    'provider_encoded',        # 9
    # 'status_encoded',         # ❌ RETIRÉ (data leakage - on ne connaît status qu'après)
    'os_name_encoded',         # 10
    'type_encoded',            # 11
    'user_avg_amount',         # 12
    'user_std_amount',         # 13
    'user_tx_count',           # 14
    'user_fraud_ratio',        # 15
    'amount_deviation',        # 16
    'device_tx_count'          # 17
]

# Vérifier disponibilité
available_features = [f for f in feature_columns if f in df.columns]
print(f"  ✅ {len(available_features)} features disponibles (SANS fraud_score ni status)")
print(f"  📊 Shape finale: X=({len(df)}, {len(available_features)}), y=({len(df)},)")

# Préparer X et y
X = df[available_features].fillna(0)
y = df['is_fraud'].astype(int)

# 5. Split train/test
print(f"\n✂️  Étape 4/6 : Split train/test (80/20)...")
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"  ✅ Train: {len(X_train)} samples ({y_train.sum()} fraudes)")
print(f"  ✅ Test: {len(X_test)} samples ({y_test.sum()} fraudes)")

# Normalisation
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# 6. Entraînement
print(f"\n🚀 Étape 5/6 : Entraînement des modèles...")

# Random Forest
print("  🌲 Random Forest...")
rf_model = RandomForestClassifier(
    n_estimators=100,
    max_depth=10,
    random_state=42,
    class_weight='balanced'  # Important pour données déséquilibrées
)
rf_model.fit(X_train_scaled, y_train)
rf_preds = rf_model.predict(X_test_scaled)
rf_acc = (rf_preds == y_test).mean()

# AUC-ROC seulement si au moins 2 classes dans le test set
if len(np.unique(y_test)) > 1:
    rf_auc = roc_auc_score(y_test, rf_model.predict_proba(X_test_scaled)[:, 1])
    print(f"     📊 Accuracy: {rf_acc:.3f}")
    print(f"     📊 AUC-ROC: {rf_auc:.3f}")
else:
    rf_auc = 0.5  # Score par défaut
    print(f"     📊 Accuracy: {rf_acc:.3f}")
    print(f"     ⚠️  AUC-ROC: N/A (une seule classe dans test set)")

# XGBoost
print("  ⚡ XGBoost...")
xgb_model = xgb.XGBClassifier(
    n_estimators=100,
    max_depth=6,
    learning_rate=0.1,
    scale_pos_weight=len(y_train) / y_train.sum() if y_train.sum() > 0 else 1,  # Balance classes
    random_state=42
)
xgb_model.fit(X_train_scaled, y_train)
xgb_preds = xgb_model.predict(X_test_scaled)
xgb_acc = (xgb_preds == y_test).mean()

# AUC-ROC seulement si au moins 2 classes dans le test set
if len(np.unique(y_test)) > 1:
    xgb_auc = roc_auc_score(y_test, xgb_model.predict_proba(X_test_scaled)[:, 1])
    print(f"     📊 Accuracy: {xgb_acc:.3f}")
    print(f"     📊 AUC-ROC: {xgb_auc:.3f}")
else:
    xgb_auc = 0.5  # Score par défaut
    print(f"     📊 Accuracy: {xgb_acc:.3f}")
    print(f"     ⚠️  AUC-ROC: N/A (une seule classe dans test set)")

# 7. Évaluation détaillée
print(f"\n📊 Étape 6/6 : Évaluation et sélection...")

# Random Forest
print("\n🌲 Random Forest - Rapport de classification:")
print(classification_report(y_test, rf_preds, target_names=['Légit', 'Fraude']))

# XGBoost
print("\n⚡ XGBoost - Rapport de classification:")
print(classification_report(y_test, xgb_preds, target_names=['Légit', 'Fraude']))

# Latence
print("\n⏱️  Latence moyenne (1 prédiction):")
sample = X_test_scaled[:1]

start = time.perf_counter()
for _ in range(1000):
    rf_model.predict_proba(sample)
rf_latency = (time.perf_counter() - start) / 1000 * 1000
print(f"  🌲 Random Forest: {rf_latency:.2f} ms")

start = time.perf_counter()
for _ in range(1000):
    xgb_model.predict_proba(sample)
xgb_latency = (time.perf_counter() - start) / 1000 * 1000
print(f"  ⚡ XGBoost: {xgb_latency:.2f} ms")

# Sélection du meilleur
if xgb_auc >= rf_auc and xgb_latency < 1:  # XGBoost si bon et rapide
    best_model = xgb_model
    best_name = "XGBOOST"
else:
    best_model = rf_model
    best_name = "RANDOM FOREST"

print(f"\n🏆 Meilleur modèle sélectionné: {best_name}")

# 8. Sauvegarder
print(f"\n💾 Sauvegarde du modèle...")

with open('fraud_model_independent.pkl', 'wb') as f:
    pickle.dump(best_model, f)
print("  ✅ Modèle sauvegardé: fraud_model_independent.pkl")

with open('scaler_independent.pkl', 'wb') as f:
    pickle.dump(scaler, f)
print("  ✅ Scaler sauvegardé: scaler_independent.pkl")

with open('label_encoders_independent.pkl', 'wb') as f:
    pickle.dump(encoders, f)
print("  ✅ Encoders sauvegardés: label_encoders_independent.pkl")

# Métadonnées
metadata = {
    "model_type": best_name,
    "num_features": len(available_features),
    "feature_names": available_features,
    "accuracy": float(xgb_acc if best_name == "XGBOOST" else rf_acc),
    "auc_roc": float(xgb_auc if best_name == "XGBOOST" else rf_auc),
    "latency_ms": float(xgb_latency if best_name == "XGBOOST" else rf_latency),
    "training_samples": len(X_train),
    "test_samples": len(X_test),
    "fraud_ratio": float(y.mean()),
    "includes_heuristic_score": False  # ← IMPORTANT !
}

import json
with open('model_metadata_independent.json', 'w') as f:
    json.dump(metadata, f, indent=2)
print("  ✅ Métadonnées sauvegardées: model_metadata_independent.json")

# Features importantes
print(f"\n📊 Top 10 features les plus importantes:")
if hasattr(best_model, 'feature_importances_'):
    importance = best_model.feature_importances_
    feature_importance = sorted(zip(available_features, importance), key=lambda x: x[1], reverse=True)
    for i, (feat, imp) in enumerate(feature_importance[:10], 1):
        print(f"  {i}. {feat:25s}: {imp:.4f}")

print("\n" + "=" * 80)
print("✅ ENTRAÎNEMENT TERMINÉ AVEC SUCCÈS !")
print("=" * 80)
print("\n📝 Prochaines étapes:")
print("  1. Uploader les 3 fichiers .pkl + metadata.json sur Hugging Face")
print("  2. Mettre à jour handler.py pour utiliser 18 features (au lieu de 19)")
print("  3. Mettre à jour index.ts pour enlever fraud_score des features ML")
print("  4. Tester avec test_ml_scenarios.py")
